import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { Pool } from 'pg';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const wsPort = parseInt(process.env.WS_PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const pool = new Pool({
  host: process.env.LOCAL_DB_HOST,
  port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
  user: process.env.LOCAL_DB_USER,
  password: process.env.LOCAL_DB_PASSWORD,
  database: process.env.LOCAL_DB_NAME,
});

const conversationRooms = new Map<string, Set<any>>();
const userConnections = new Map<string, any>();

// Helper: broadcast message tới tất cả connected clients
function broadcastToAll(message: object, excludeWs?: any) {
  const payload = JSON.stringify(message);
  userConnections.forEach((ws) => {
    if (ws !== excludeWs && ws.readyState === 1) {
      ws.send(payload);
    }
  });
}

// Helper: set online status trong DB
async function setUserOnlineStatus(userId: string, isOnline: boolean) {
  try {
    if (isOnline) {
      await pool.query(
        `UPDATE users SET is_online = true WHERE id = $1`,
        [userId]
      );
    } else {
      await pool.query(
        `UPDATE users SET is_online = false, last_seen_at = NOW() WHERE id = $1`,
        [userId]
      );
    }
  } catch (error) {
    console.error('Error updating online status:', error);
  }
}

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
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
          const userId = payload?.user_id as string | undefined;

          if (!userId) {
            return;
          }

          const targetWs = userConnections.get(userId);
          if (targetWs && targetWs.readyState === 1) {
            targetWs.send(
              JSON.stringify({
                type: payload.event || 'notification:new',
                notification_id: payload.notification_id,
                notification_type: payload.type,
              })
            );
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

    // Heartbeat tracking: stale connections timeout sau 60s
    (ws as any).isAlive = true;
    (ws as any).lastHeartbeat = Date.now();

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'auth':
            if (data.user_id) {
              userConnections.set(data.user_id, ws);
              (ws as any).userId = data.user_id;

              // Set online trong DB + broadcast
              await setUserOnlineStatus(data.user_id, true);
              broadcastToAll({ type: 'user:online', user_id: data.user_id }, ws);

              // Gửi danh sách online users cho client mới
              const onlineUserIds = Array.from(userConnections.keys());
              ws.send(JSON.stringify({
                type: 'presence:sync',
                online_users: onlineUserIds,
              }));
            }
            break;

          case 'heartbeat':
            // Client gửi heartbeat để duy trì connection
            (ws as any).isAlive = true;
            (ws as any).lastHeartbeat = Date.now();
            ws.send(JSON.stringify({ type: 'heartbeat:ack' }));
            break;

          case 'join':
            if (data.conversation_id) {
              if (!conversationRooms.has(data.conversation_id)) {
                conversationRooms.set(data.conversation_id, new Set());
              }
              conversationRooms.get(data.conversation_id)!.add(ws);
              (ws as any).currentConversation = data.conversation_id;
            }
            break;

          case 'leave':
            if ((ws as any).currentConversation) {
              const room = conversationRooms.get((ws as any).currentConversation);
              if (room) {
                room.delete(ws);
              }
              (ws as any).currentConversation = null;
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

    ws.on('close', async () => {
      // Rời conversation room
      if ((ws as any).currentConversation) {
        const room = conversationRooms.get((ws as any).currentConversation);
        if (room) {
          room.delete(ws);
        }
      }

      // Set offline + broadcast
      if ((ws as any).userId) {
        const userId = (ws as any).userId;
        userConnections.delete(userId);
        await setUserOnlineStatus(userId, false);
        broadcastToAll({ type: 'user:offline', user_id: userId });
      }

      console.log('Client disconnected from WebSocket');
    });
  });

  // Heartbeat interval: kiểm tra stale connections mỗi 45s
  setInterval(() => {
    const now = Date.now();
    wss.clients.forEach((ws: any) => {
      // Nếu không nhận heartbeat trong 60s → đóng connection
      if (now - (ws.lastHeartbeat || 0) > 60000) {
        console.log('Terminating stale connection:', ws.userId);
        ws.terminate();
        return;
      }
    });
  }, 45000);

  console.log(`> WebSocket server ready on ws://${hostname}:${wsPort}`);
});
