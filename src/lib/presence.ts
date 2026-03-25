const ONLINE_WINDOW_MS = 45 * 1000;

type PresenceEntry = {
  lastSeenAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __metabasedPresenceStore: Map<string, PresenceEntry> | undefined;
}

function getPresenceStore() {
  if (!global.__metabasedPresenceStore) {
    global.__metabasedPresenceStore = new Map<string, PresenceEntry>();
  }

  return global.__metabasedPresenceStore;
}

function cleanupExpiredEntries() {
  const now = Date.now();
  const store = getPresenceStore();

  for (const [userId, entry] of Array.from(store.entries())) {
    if (now - entry.lastSeenAt > ONLINE_WINDOW_MS * 2) {
      store.delete(userId);
    }
  }
}

export function markUserOnline(userId: string) {
  if (!userId) return;
  cleanupExpiredEntries();
  getPresenceStore().set(userId, { lastSeenAt: Date.now() });
}

export function getPresenceForUsers(userIds: string[]) {
  cleanupExpiredEntries();
  const now = Date.now();
  const store = getPresenceStore();

  return userIds.reduce<Record<string, { is_online: boolean; last_seen_at: string | null }>>((acc, userId) => {
    const entry = store.get(userId);
    const isOnline = Boolean(entry && now - entry.lastSeenAt <= ONLINE_WINDOW_MS);

    acc[userId] = {
      is_online: isOnline,
      last_seen_at: entry ? new Date(entry.lastSeenAt).toISOString() : null,
    };

    return acc;
  }, {});
}
