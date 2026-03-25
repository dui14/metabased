import { createServer } from 'http';
import { parse } from 'url';
import nextEnv from '@next/env';
import next from 'next';
import { WebSocketServer } from 'ws';
import pg from 'pg';

const { Pool } = pg;
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const wsPort = parseInt(process.env.WS_PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const pool = new Pool({
  host: process.env.LOCAL_DB_HOST,
  port: parseInt(process.env.LOCAL_DB_PORT || '5432', 10),
  user: process.env.LOCAL_DB_USER,
  password: process.env.LOCAL_DB_PASSWORD,
  database: process.env.LOCAL_DB_NAME,
});

const conversationRooms = new Map();
const userConnections = new Map();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  const wss = new WebSocketServer({ port: wsPort });

  pool
    .connect()
    .then(async (client) => {
      await client.query('LISTEN notification_events');

      client.on('notification', (msg) => {
        if (msg.channel !== 'notification_events' || !msg.payload) {
          return;
        }

        try {
          const payload = JSON.parse(msg.payload);
          const userId = payload?.user_id;

          if (!userId) {
            return;
          }

          const targetWs = userConnections.get(userId);
          if (targetWs && targetWs.readyState === 1) {
            targetWs.send(JSON.stringify({
              type: payload.event || 'notification:new',
              notification_id: payload.notification_id,
              notification_type: payload.type,
            }));
          }
        } catch (error) {
          console.error('Error handling notification event:', error);
        }
      });

      client.on('error', (error) => {
        console.error('Notification listener error:', error);
      });
    })
    .catch((error) => {
      console.error('Failed to start notification listener:', error);
    });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'auth':
            if (data.user_id) {
              userConnections.set(data.user_id, ws);
              ws.userId = data.user_id;
            }
            break;

          case 'join':
            if (data.conversation_id) {
              if (!conversationRooms.has(data.conversation_id)) {
                conversationRooms.set(data.conversation_id, new Set());
              }
              conversationRooms.get(data.conversation_id).add(ws);
              ws.currentConversation = data.conversation_id;
            }
            break;

          case 'leave':
            if (ws.currentConversation) {
              const room = conversationRooms.get(ws.currentConversation);
              if (room) {
                room.delete(ws);
              }
              ws.currentConversation = null;
            }
            break;

          case 'message':
            if (data.conversation_id && data.message) {
              const room = conversationRooms.get(data.conversation_id);
              if (room) {
                room.forEach((client) => {
                  if (client !== ws && client.readyState === 1) {
                    client.send(JSON.stringify({
                      type: 'message',
                      message: data.message,
                    }));
                  }
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      if (ws.currentConversation) {
        const room = conversationRooms.get(ws.currentConversation);
        if (room) {
          room.delete(ws);
        }
      }

      if (ws.userId) {
        userConnections.delete(ws.userId);
      }

      console.log('Client disconnected from WebSocket');
    });
  });

  console.log(`> WebSocket server ready on ws://${hostname}:${wsPort}`);
});
