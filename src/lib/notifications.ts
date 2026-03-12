import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase';

const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'nft_sold'
  | 'nft_offer'
  | 'system';

export interface NotificationActor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string | null;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: NotificationActor | null;
}

export interface ListNotificationsOptions {
  filter?: 'all' | 'unread';
  limit?: number;
  offset?: number;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title?: string | null;
  message?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  actorId?: string | null;
}

type SupabaseNotificationRow = Omit<NotificationRecord, 'actor'> & {
  actor: NotificationActor[] | NotificationActor | null;
};

function normalizeSupabaseNotification(row: SupabaseNotificationRow): NotificationRecord {
  const actor = Array.isArray(row.actor) ? (row.actor[0] || null) : (row.actor || null);
  return {
    ...row,
    actor,
  };
}

async function getLocalDbQuery() {
  const { query } = await import('@/lib/db');
  return query;
}

function getSupabaseClient() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw new Error('Database not configured');
  }
  return supabase;
}

export async function getUserIdByWallet(walletAddress: string): Promise<string | null> {
  if (!walletAddress) return null;

  if (USE_LOCAL_DB) {
    const query = await getLocalDbQuery();
    const result = await query('SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1) LIMIT 1', [walletAddress]);
    return result.rows[0]?.id || null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id || null;
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRecord | null> {
  if (!input.userId) return null;

  if (USE_LOCAL_DB) {
    const query = await getLocalDbQuery();
    const result = await query<NotificationRecord>(
      `INSERT INTO notifications
        (user_id, type, title, message, reference_id, reference_type, actor_id, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING *`,
      [
        input.userId,
        input.type,
        input.title ?? null,
        input.message ?? null,
        input.referenceId ?? null,
        input.referenceType ?? null,
        input.actorId ?? null,
      ]
    );
    return result.rows[0] || null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title ?? null,
      message: input.message ?? null,
      reference_id: input.referenceId ?? null,
      reference_type: input.referenceType ?? null,
      actor_id: input.actorId ?? null,
      is_read: false,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return (data as NotificationRecord) || null;
}

export async function listNotifications(
  userId: string,
  options: ListNotificationsOptions = {}
): Promise<NotificationRecord[]> {
  const filter = options.filter ?? 'all';
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  if (USE_LOCAL_DB) {
    const query = await getLocalDbQuery();
    const values: Array<string | number | boolean> = [userId, limit, offset];
    let unreadClause = '';

    if (filter === 'unread') {
      unreadClause = 'AND n.is_read = false';
    }

    const result = await query<NotificationRecord>(
      `SELECT
         n.id,
         n.user_id,
         n.type,
         n.title,
         n.message,
         n.reference_id,
         n.reference_type,
         n.actor_id,
         n.is_read,
         n.created_at,
         CASE
           WHEN a.id IS NULL THEN NULL
           ELSE json_build_object(
             'id', a.id,
             'username', a.username,
             'display_name', a.display_name,
             'avatar_url', a.avatar_url
           )
         END AS actor
       FROM notifications n
       LEFT JOIN users a ON a.id = n.actor_id
       WHERE n.user_id = $1
         ${unreadClause}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      values
    );

    return result.rows || [];
  }

  const supabase = getSupabaseClient();

  let queryBuilder = supabase
    .from('notifications')
    .select(
      `
      id,
      user_id,
      type,
      title,
      message,
      reference_id,
      reference_type,
      actor_id,
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
    .eq('user_id', userId);

  if (filter === 'unread') {
    queryBuilder = queryBuilder.eq('is_read', false);
  }

  const { data, error } = await queryBuilder
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const rows = (data || []) as SupabaseNotificationRow[];
  return rows.map(normalizeSupabaseNotification);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  if (USE_LOCAL_DB) {
    const query = await getLocalDbQuery();
    const result = await query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    );
    return result.rows.length > 0;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  if (USE_LOCAL_DB) {
    const query = await getLocalDbQuery();
    const result = await query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return result.rowCount || 0;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select('id');

  if (error) {
    throw error;
  }

  return data?.length || 0;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (USE_LOCAL_DB) {
    const query = await getLocalDbQuery();
    const result = await query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return result.rows[0]?.count || 0;
  }

  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }

  return count || 0;
}