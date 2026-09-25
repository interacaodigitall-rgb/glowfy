/**
 * Cloud Database Service - Connected to PostgreSQL (Cloud SQL / Supabase Architecture)
 * Provides fast relational queries, local caching, and offline resilience.
 */

export function normalizeTenantId(rawIdOrSlug?: string | null): string {
  if (!rawIdOrSlug) return 'mr-navalha';
  const clean = String(rawIdOrSlug).trim().toLowerCase();
  if (clean.includes('navalha')) {
    return 'mr-navalha';
  }
  if (clean.includes('diva')) {
    return 'diva-nails';
  }
  if (clean.includes('glow')) {
    return 'glow-glam';
  }
  if (clean.includes('aura')) {
    return 'aura-spa';
  }
  return clean.replace(/[^a-z0-9_-]/g, '-');
}

function normalizePath(rawPath: string): string {
  const parts = rawPath.split('/').filter(Boolean);
  if (parts.length >= 2 && (parts[0] === 'tenants' || parts[0] === 'stores')) {
    parts[1] = normalizeTenantId(parts[1]);
  }
  return parts.join('/');
}

/**
 * Read collection from PostgreSQL Database with cache fallback.
 */
export async function cloudDbList<T extends { id?: string }>(path: string): Promise<T[]> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_${normPath.replace(/\//g, '_')}`;

  // 1. Fetch from PostgreSQL backend API
  try {
    const res = await fetch(`/api/db/list?path=${encodeURIComponent(normPath)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(json.data));
        }
        return json.data as T[];
      }
    }
  } catch (err) {
    console.warn(`Notice fetching from DB API ${normPath}:`, err);
  }

  // 2. Read from local storage cache if network is offline/slow
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }

  return [];
}

/**
 * Read a single record from PostgreSQL.
 */
export async function cloudDbGet<T>(path: string): Promise<T | null> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_doc_${normPath.replace(/\//g, '_')}`;

  try {
    const res = await fetch(`/api/db/get?path=${encodeURIComponent(normPath)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(json.data));
        }
        return json.data as T;
      }
    }
  } catch (err) {
    console.warn(`Notice reading doc from DB API ${normPath}:`, err);
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  return null;
}

/**
 * Write/Upsert a record to PostgreSQL Database.
 */
export async function cloudDbSet<T extends { id?: string }>(path: string, data: T): Promise<void> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_doc_${normPath.replace(/\//g, '_')}`;

  // Update local cache immediately for snappy UI
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      const parts = normPath.split('/');
      if (parts.length > 1) {
        const collectionPath = parts.slice(0, -1).join('/');
        const collCacheKey = `glowfy_cloud_${collectionPath.replace(/\//g, '_')}`;
        const cachedColl = localStorage.getItem(collCacheKey);
        if (cachedColl) {
          const list: any[] = JSON.parse(cachedColl);
          const itemId = parts[parts.length - 1];
          const idx = list.findIndex((item) => item.id === itemId || item.id === data.id);
          if (idx >= 0) {
            list[idx] = data;
          } else {
            list.push(data);
          }
          localStorage.setItem(collCacheKey, JSON.stringify(list));
        }
      }
    } catch {}
  }

  // Write to PostgreSQL
  try {
    await fetch('/api/db/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: normPath, data }),
    });
  } catch (err) {
    console.warn(`Notice writing to DB API ${normPath}:`, err);
  }
}

/**
 * Update/Patch fields of a record in PostgreSQL.
 */
export async function cloudDbUpdate<T extends Record<string, any>>(path: string, partialData: T): Promise<void> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_doc_${normPath.replace(/\//g, '_')}`;

  if (typeof window !== 'undefined') {
    try {
      const existing = localStorage.getItem(cacheKey);
      const parsed = existing ? JSON.parse(existing) : {};
      const merged = { ...parsed, ...partialData };
      localStorage.setItem(cacheKey, JSON.stringify(merged));

      const parts = normPath.split('/');
      if (parts.length > 1) {
        const collectionPath = parts.slice(0, -1).join('/');
        const collCacheKey = `glowfy_cloud_${collectionPath.replace(/\//g, '_')}`;
        const cachedColl = localStorage.getItem(collCacheKey);
        if (cachedColl) {
          const list: any[] = JSON.parse(cachedColl);
          const itemId = parts[parts.length - 1];
          const idx = list.findIndex((item) => item.id === itemId || item.id === partialData.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...partialData };
            localStorage.setItem(collCacheKey, JSON.stringify(list));
          }
        }
      }
    } catch {}
  }

  try {
    await fetch('/api/db/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: normPath, data: partialData }),
    });
  } catch (err) {
    console.warn(`Notice updating DB API ${normPath}:`, err);
  }
}

/**
 * Delete a record from PostgreSQL.
 */
export async function cloudDbDelete(path: string): Promise<void> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_doc_${normPath.replace(/\//g, '_')}`;

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(cacheKey);
      const parts = normPath.split('/');
      if (parts.length > 1) {
        const collectionPath = parts.slice(0, -1).join('/');
        const collCacheKey = `glowfy_cloud_${collectionPath.replace(/\//g, '_')}`;
        const cachedColl = localStorage.getItem(collCacheKey);
        if (cachedColl) {
          const itemId = parts[parts.length - 1];
          const list: any[] = JSON.parse(cachedColl);
          const filtered = list.filter((item) => item.id !== itemId);
          localStorage.setItem(collCacheKey, JSON.stringify(filtered));
        }
      }
    } catch {}
  }

  try {
    await fetch('/api/db/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: normPath }),
    });
  } catch (err) {
    console.warn(`Notice deleting DB API ${normPath}:`, err);
  }
}

/**
 * Real-time subscription to a collection path with polling.
 */
export function cloudDbSubscribe<T extends { id?: string }>(
  path: string,
  callback: (items: T[]) => void
): () => void {
  const normPath = normalizePath(path);

  // Initial fetch
  cloudDbList<T>(normPath).then((items) => {
    callback(items);
  });

  // Background sync poll every 3 seconds for real-time multiplayer / live updates
  const intervalId = setInterval(async () => {
    try {
      const items = await cloudDbList<T>(normPath);
      callback(items);
    } catch {}
  }, 3000);

  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Explicit helper to trigger the full migration from Firebase to PostgreSQL.
 */
export async function triggerFirebaseToPostgresMigration(): Promise<{
  success: boolean;
  message: string;
  stats?: any;
}> {
  try {
    const res = await fetch('/api/migrate-firebase-to-postgres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha ao migrar dados' };
  }
}

/**
 * Fetch live status of the PostgreSQL Database.
 */
export async function fetchDatabaseStatus(): Promise<{
  success: boolean;
  provider: string;
  stats: Record<string, number>;
}> {
  try {
    const res = await fetch('/api/db/status');
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      provider: 'PostgreSQL',
      stats: {},
    };
  }
}
