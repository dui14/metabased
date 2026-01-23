interface CacheItem<T> {
  data: T;
  expiry: number;
  createdAt: number;
}

interface CacheOptions {
  ttl?: number;  // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

// Default TTL: 5 phút
const DEFAULT_TTL = 5 * 60 * 1000;

// Cache storage
const cache = new Map<string, CacheItem<unknown>>();

// Cache statistics for monitoring
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
};

/**
 * Lấy data từ cache
 */
export function getCache<T>(key: string): T | null {
  const item = cache.get(key) as CacheItem<T> | undefined;
  
  if (!item) {
    cacheStats.misses++;
    return null;
  }
  
  // Check if expired
  if (Date.now() > item.expiry) {
    cache.delete(key);
    cacheStats.misses++;
    return null;
  }
  
  cacheStats.hits++;
  return item.data;
}

/**
 * Set data vào cache
 */
export function setCache<T>(key: string, data: T, options: CacheOptions = {}): void {
  const ttl = options.ttl || DEFAULT_TTL;
  
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
    createdAt: Date.now(),
  });
  
  cacheStats.sets++;
}

/**
 * Xóa một key khỏi cache
 */
export function deleteCache(key: string): boolean {
  const result = cache.delete(key);
  if (result) {
    cacheStats.deletes++;
  }
  return result;
}

/**
 * Xóa nhiều keys theo pattern (prefix)
 */
export function deleteCacheByPrefix(prefix: string): number {
  let count = 0;
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      count++;
    }
  }
  cacheStats.deletes += count;
  return count;
}

/**
 * Clear toàn bộ cache
 */
export function clearCache(): void {
  cache.clear();
  cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
}

/**
 * Lấy cache statistics
 */
export function getCacheStats() {
  return {
    ...cacheStats,
    size: cache.size,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2) + '%'
      : '0%',
  };
}

/**
 * Wrapper function: Lấy từ cache hoặc fetch data mới
 * Sử dụng pattern "stale-while-revalidate"
 */
export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache first
  const cached = getCache<T>(key);
  
  if (cached !== null) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetcher();
  
  // Store in cache
  setCache(key, data, options);
  
  return data;
}

// Cache Keys Constants
export const CACHE_KEYS = {
  // Posts
  POSTS_FEED: 'posts:feed',
  POST_DETAIL: (id: string) => `posts:detail:${id}`,
  USER_POSTS: (userId: string) => `posts:user:${userId}`,
  
  // Users  
  USER_PROFILE: (id: string) => `users:profile:${id}`,
  USER_BY_WALLET: (wallet: string) => `users:wallet:${wallet}`,
  TRENDING_USERS: 'users:trending',
  DISCOVER_USERS: 'users:discover',
  
  // NFTs
  NFTS_LIST: 'nfts:list',
  NFT_DETAIL: (id: string) => `nfts:detail:${id}`,
  NFT_LISTINGS: 'nfts:listings',
  
  // Follows
  USER_FOLLOWERS: (userId: string) => `follows:followers:${userId}`,
  USER_FOLLOWING: (userId: string) => `follows:following:${userId}`,
  
  // Notifications
  USER_NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
} as const;

// Cache TTL Presets (milliseconds)
export const CACHE_TTL = {
  SHORT: 30 * 1000,           // 30 giây - cho data thay đổi thường xuyên
  MEDIUM: 5 * 60 * 1000,      // 5 phút - mặc định
  LONG: 15 * 60 * 1000,       // 15 phút - cho data ít thay đổi
  VERY_LONG: 60 * 60 * 1000,  // 1 giờ - cho static data
} as const;

// Auto cleanup expired entries (mỗi 10 phút)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const entries = Array.from(cache.entries());
    for (const [key, item] of entries) {
      if (now > (item as CacheItem<unknown>).expiry) {
        cache.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export default {
  get: getCache,
  set: setCache,
  delete: deleteCache,
  deleteByPrefix: deleteCacheByPrefix,
  clear: clearCache,
  stats: getCacheStats,
  cacheOrFetch,
  KEYS: CACHE_KEYS,
  TTL: CACHE_TTL,
};
