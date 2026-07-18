// @ts-nocheck
// Simple module-level in-memory cache with TTL.
// Survives component unmounts (it's a module singleton) so navigating
// between pages reuses data instead of refetching on every mount.

type Entry<T> = { data: T; ts: number };
const store = new Map<string, Entry<any>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function getCache<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > ttl) {
    store.delete(key);
    return null;
  }
  return e.data as T;
}

export function setCache<T>(key: string, data: T) {
  store.set(key, { data, ts: Date.now() });
}

export function invalidateCache(key: string) {
  store.delete(key);
}

export function clearAllCache() {
  store.clear();
}
