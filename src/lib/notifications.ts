import { createServerSupabaseClient, createServerSupabaseFallbackClient } from '@/lib/supabase';
import { CACHE_KEYS, CACHE_TTL, deleteCacheByPrefix, getCache, setCache } from '@/lib/cache';
import { getClient, isUsingLocalDb, query } from '@/lib/db';

export type NotificationType = 'follow' | 'like' | 'repost' | 'comment' | 'message';

export interface NotificationActor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string | null;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
  actor: NotificationActor | null;
}

export interface NotificationCursor {
  created_at: string;
  id: string;
}

export interface CreateNotificationInput {
  userId: string;
  actorId: string | null;
  type: NotificationType;
  title?: string | null;
  message?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
}

const UNREAD_CACHE_PREFIX = 'notifications:unread:';

function getUnreadCacheKey(userId: string) {
  return `${UNREAD_CACHE_PREFIX}${userId}`;
}

function sanitizeText(value?: string | null): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function invalidateNotificationCaches(userId: string) {
  deleteCacheByPrefix(CACHE_KEYS.USER_NOTIFICATIONS(userId));
  deleteCacheByPrefix(getUnreadCacheKey(userId));
}

function encodeCursor(cursor: NotificationCursor | null): string | null {
  if (!cursor) {
    return null;
  }

  const raw = JSON.stringify(cursor);
  return Buffer.from(raw, 'utf8').toString('base64url');
}

function decodeCursor(cursor?: string | null): NotificationCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as NotificationCursor;

    if (!parsed?.created_at || !parsed?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildListCacheKey(userId: string, limit: number, cursor: string | null) {
  return `${CACHE_KEYS.USER_NOTIFICATIONS(userId)}:v2:${limit}:${cursor || 'first'}`;
}

function mapLocalNotificationRow(row: any): NotificationItem {
  return {
    id: row.id,
    user_id: row.user_id,
    actor_id: row.actor_id,
    type: row.type,
    title: row.title,
    message: row.message,
    reference_id: row.reference_id,
    reference_type: row.reference_type,
    is_read: row.is_read,
    created_at: row.created_at,
    actor: row.actor_id
      ? {
          id: row.actor_profile_id,
          username: row.actor_username,
          display_name: row.actor_display_name,
          avatar_url: row.actor_avatar_url,
        }
      : null,
  };
}

function mapSupabaseNotificationRow(row: any): NotificationItem {
  return {
    id: row.id,
    user_id: row.user_id,
    actor_id: row.actor_id,
    type: row.type,
    title: row.title,
    message: row.message,
    reference_id: row.reference_id,
    reference_type: row.reference_type,
    is_read: row.is_read,
    created_at: row.created_at,
    actor: row.actor || null,
  };
}

async function publishLocalNotificationEvent(client: any, payload: {
  userId: string;
  notificationId: string;
  type: string;
}) {
  await client.query(
    `SELECT pg_notify('notification_events', $1)`,
    [JSON.stringify({
      event: 'notification:new',
      user_id: payload.userId,
      notification_id: payload.notificationId,
      type: payload.type,
    })]
  );
}

export async function createNotification(input: CreateNotificationInput): Promise<{ created: boolean; notificationId?: string }> {
  const normalizedTitle = sanitizeText(input.title);
  const normalizedMessage = sanitizeText(input.message);
  const normalizedReferenceType = sanitizeText(input.referenceType);
  const normalizedReferenceId = sanitizeText(input.referenceId);

  if (!input.userId) {
    return { created: false };
  }

  if (input.actorId && input.actorId === input.userId) {
    return { created: false };
  }

  if (isUsingLocalDb()) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const duplicateResult = await client.query(
        `SELECT id
         FROM notifications
         WHERE user_id = $1
           AND actor_id IS NOT DISTINCT FROM $2
           AND type = $3
           AND reference_type IS NOT DISTINCT FROM $4
           AND reference_id IS NOT DISTINCT FROM NULLIF($5, '')::uuid
           AND created_at >= NOW() - INTERVAL '5 minutes'
         ORDER BY created_at DESC
         LIMIT 1`,
        [
          input.userId,
          input.actorId,
          input.type,
          normalizedReferenceType,
          normalizedReferenceId || '',
        ]
      );

      if (duplicateResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return { created: false };
      }

      const insertResult = await client.query(
        `INSERT INTO notifications (
           user_id,
           actor_id,
           type,
           title,
           message,
           reference_type,
           reference_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::uuid)
         RETURNING id`,
        [
          input.userId,
          input.actorId,
          input.type,
          normalizedTitle,
          normalizedMessage,
          normalizedReferenceType,
          normalizedReferenceId || '',
        ]
      );

      const notificationId = insertResult.rows[0]?.id as string | undefined;

      if (notificationId) {
        await publishLocalNotificationEvent(client, {
          userId: input.userId,
          notificationId,
          type: input.type,
        });
      }

      await client.query('COMMIT');
      invalidateNotificationCaches(input.userId);
      return { created: true, notificationId };
    } catch (error: any) {
      await client.query('ROLLBACK');

      if (error?.code === '22P02') {
        return { created: false };
      }

      throw error;
    } finally {
      client.release();
    }
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { created: false };
  }

  const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  let duplicateQuery = supabase
    .from('notifications')
    .select('id')
    .eq('user_id', input.userId)
    .eq('type', input.type)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(1);

  if (input.actorId) {
    duplicateQuery = duplicateQuery.eq('actor_id', input.actorId);
  } else {
    duplicateQuery = duplicateQuery.is('actor_id', null);
  }

  if (normalizedReferenceType) {
    duplicateQuery = duplicateQuery.eq('reference_type', normalizedReferenceType);
  } else {
    duplicateQuery = duplicateQuery.is('reference_type', null);
  }

  if (normalizedReferenceId) {
    duplicateQuery = duplicateQuery.eq('reference_id', normalizedReferenceId);
  } else {
    duplicateQuery = duplicateQuery.is('reference_id', null);
  }

  const { data: duplicateRows } = await duplicateQuery;
  if ((duplicateRows?.length || 0) > 0) {
    return { created: false };
  }

  const { data: inserted, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      actor_id: input.actorId,
      type: input.type,
      title: normalizedTitle,
      message: normalizedMessage,
      reference_type: normalizedReferenceType,
      reference_id: normalizedReferenceId,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  invalidateNotificationCaches(input.userId);
  return { created: Boolean(inserted?.id), notificationId: inserted?.id };
}

export async function getNotificationUnreadCount(userId: string): Promise<number> {
  const cacheKey = getUnreadCacheKey(userId);
  const cached = getCache<number>(cacheKey);
  if (cached != null) {
    return cached;
  }

  let unreadCount = 0;

  if (isUsingLocalDb()) {
    try {
      const result = await query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM notifications
         WHERE user_id = $1
           AND is_read = false`,
        [userId]
      );
      unreadCount = result.rows[0]?.count || 0;
    } catch (error) {
      console.error('Local DB unread count failed, falling back to Supabase:', error);

      const fallbackSupabase = createServerSupabaseFallbackClient();
      if (!fallbackSupabase) {
        setCache(cacheKey, 0, { ttl: CACHE_TTL.SHORT });
        return 0;
      }

      const { count } = await fallbackSupabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      unreadCount = count || 0;
    }
  } else {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return 0;
    }

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    unreadCount = count || 0;
  }

  setCache(cacheKey, unreadCount, { ttl: CACHE_TTL.SHORT });
  return unreadCount;
}

export async function getNotificationsList(input: {
  userId: string;
  cursor?: string | null;
  limit: number;
}): Promise<{ items: NotificationItem[]; next_cursor: string | null; unread_count: number }> {
  const safeLimit = Math.max(1, Math.min(50, input.limit));
  const parsedCursor = decodeCursor(input.cursor || null);
  const cacheKey = buildListCacheKey(input.userId, safeLimit, input.cursor || null);
  const cached = getCache<{ items: NotificationItem[]; next_cursor: string | null; unread_count: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  let items: NotificationItem[] = [];
  let nextCursor: string | null = null;

  if (isUsingLocalDb()) {
    const params: any[] = [input.userId];
    let cursorSql = '';

    if (parsedCursor) {
      params.push(parsedCursor.created_at);
      params.push(parsedCursor.id);
      cursorSql = `
        AND (
          n.created_at < $2
          OR (n.created_at = $2 AND n.id < $3)
        )
      `;
    }

    params.push(safeLimit + 1);
    const limitParamIndex = params.length;

    const listResult = await query(
      `SELECT
         n.id,
         n.user_id,
         n.actor_id,
         n.type,
         n.title,
         n.message,
         n.reference_id::text AS reference_id,
         n.reference_type,
         n.is_read,
         n.created_at,
         a.id AS actor_profile_id,
         a.username AS actor_username,
         a.display_name AS actor_display_name,
         a.avatar_url AS actor_avatar_url
       FROM notifications n
       LEFT JOIN users a ON a.id = n.actor_id
       WHERE n.user_id = $1
       ${cursorSql}
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT $${limitParamIndex}`,
      params
    );

    const rows = listResult.rows;
    const hasNext = rows.length > safeLimit;
    const selected = hasNext ? rows.slice(0, safeLimit) : rows;
    items = selected.map(mapLocalNotificationRow);

    if (hasNext && selected.length > 0) {
      const last = selected[selected.length - 1];
      nextCursor = encodeCursor({
        created_at: last.created_at,
        id: last.id,
      });
    }
  } else {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return { items: [], next_cursor: null, unread_count: 0 };
    }

    let queryBuilder = supabase
      .from('notifications')
      .select(
        `
          id,
          user_id,
          actor_id,
          type,
          title,
          message,
          reference_id,
          reference_type,
          is_read,
          created_at,
          actor:users!notifications_actor_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `
      )
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(safeLimit + 1);

    if (parsedCursor) {
      queryBuilder = queryBuilder.lt('created_at', parsedCursor.created_at);
    }

    const { data, error } = await queryBuilder;
    if (error) {
      throw error;
    }

    const rows = data || [];
    const hasNext = rows.length > safeLimit;
    const selected = hasNext ? rows.slice(0, safeLimit) : rows;
    items = selected.map(mapSupabaseNotificationRow);

    if (hasNext && selected.length > 0) {
      const last = selected[selected.length - 1] as any;
      nextCursor = encodeCursor({
        created_at: last.created_at,
        id: last.id,
      });
    }
  }

  const unreadCount = await getNotificationUnreadCount(input.userId);
  const payload = {
    items,
    next_cursor: nextCursor,
    unread_count: unreadCount,
  };

  setCache(cacheKey, payload, { ttl: CACHE_TTL.SHORT });
  return payload;
}

export async function markNotificationAsRead(input: {
  userId: string;
  notificationId: string;
}): Promise<'updated' | 'already_read' | 'not_found' | 'forbidden'> {
  if (isUsingLocalDb()) {
    const foundResult = await query<{ user_id: string; is_read: boolean }>(
      `SELECT user_id, is_read
       FROM notifications
       WHERE id = $1
       LIMIT 1`,
      [input.notificationId]
    );

    if (foundResult.rows.length === 0) {
      return 'not_found';
    }

    const found = foundResult.rows[0];
    if (found.user_id !== input.userId) {
      return 'forbidden';
    }

    if (found.is_read) {
      return 'already_read';
    }

    await query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1`,
      [input.notificationId]
    );

    invalidateNotificationCaches(input.userId);
    return 'updated';
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return 'not_found';
  }

  const { data: found } = await supabase
    .from('notifications')
    .select('id, user_id, is_read')
    .eq('id', input.notificationId)
    .single();

  if (!found) {
    return 'not_found';
  }

  if (found.user_id !== input.userId) {
    return 'forbidden';
  }

  if (found.is_read) {
    return 'already_read';
  }

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', input.notificationId);

  invalidateNotificationCaches(input.userId);
  return 'updated';
}

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  if (isUsingLocalDb()) {
    const result = await query<{ id: string }>(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1
         AND is_read = false
       RETURNING id`,
      [userId]
    );

    invalidateNotificationCaches(userId);
    return result.rowCount || 0;
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return 0;
  }

  const { data } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select('id');

  invalidateNotificationCaches(userId);
  return data?.length || 0;
}