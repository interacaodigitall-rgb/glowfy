import { rtdb, ref, get, set, update, remove, onValue, db, safeFirestoreWrite, safeFirestoreRead, doc } from '../config/firebase';
import { setDoc, deleteDoc } from 'firebase/firestore';

/**
 * Normalizes any tenant slug or ID to a single canonical ID.
 * Prevents split databases or inconsistent localStorage keys between
 * 'mr-navalha', 'mister-navalha', 'MR-NAVALHA', etc.
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

/**
 * Normalizes collection paths like:
 * tenants/mister-navalha/products -> tenants/mr-navalha/products
 */
function normalizePath(rawPath: string): string {
  const parts = rawPath.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'tenants') {
    parts[1] = normalizeTenantId(parts[1]);
  }
  return parts.join('/');
}

/**
 * Read a collection from the active Cloud Database with local caching.
 * Guaranteed to be cross-browser consistent.
 */
export async function cloudDbList<T extends { id?: string }>(path: string): Promise<T[]> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_${normPath.replace(/\//g, '_')}`;

  // 1. Try reading from active Firebase Realtime Database
  try {
    const dbRef = ref(rtdb, normPath);
    const snapPromise = get(dbRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    const snap = await Promise.race([snapPromise, timeoutPromise]);

    if (snap && snap.exists()) {
      const val = snap.val();
      const list: T[] = [];
      if (Array.isArray(val)) {
        val.forEach((item, index) => {
          if (item) {
            list.push({ id: String(item.id || index), ...item });
          }
        });
      } else if (typeof val === 'object' && val !== null) {
        Object.entries(val).forEach(([k, item]: [string, any]) => {
          if (item && typeof item === 'object') {
            list.push({ id: item.id || k, ...item });
          }
        });
      }

      // Update local storage cache
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
      return list;
    }
  } catch (err) {
    console.warn(`Notice reading cloud path ${normPath}:`, err);
  }

  // 2. Read from persistent local cache if offline
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }

  return [];
}

/**
 * Read a single record from the active Cloud Database.
 */
export async function cloudDbGet<T>(path: string): Promise<T | null> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_doc_${normPath.replace(/\//g, '_')}`;

  try {
    const dbRef = ref(rtdb, normPath);
    const snap = await get(dbRef);
    if (snap.exists()) {
      const data = snap.val() as T;
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn(`Notice reading cloud doc ${normPath}:`, err);
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
 * Write a record to the Cloud Database, synchronizing across all devices and browsers.
 */
export async function cloudDbSet<T extends { id?: string }>(path: string, data: T): Promise<void> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_doc_${normPath.replace(/\//g, '_')}`;

  // Update local cache immediately
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      
      // If writing into a collection item (e.g. tenants/X/products/id), update collection cache too
      const parts = normPath.split('/');
      if (parts.length > 1) {
        const collectionPath = parts.slice(0, -1).join('/');
        const collCacheKey = `glowfy_cloud_${collectionPath.replace(/\//g, '_')}`;
        const cachedColl = localStorage.getItem(collCacheKey);
        if (cachedColl) {
          const list: any[] = JSON.parse(cachedColl);
          const itemId = parts[parts.length - 1];
          const idx = list.findIndex(item => item.id === itemId || item.id === data.id);
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

  // 1. Write to active Firebase Realtime Database
  try {
    const dbRef = ref(rtdb, normPath);
    const parts = normPath.split('/');
    // CRITICAL: If setting a tenant root (e.g. "tenants/mr-navalha"), NEVER use set()
    // because set() in RTDB replaces the entire node and wipes child collections (products, services, etc.)!
    // Instead use update() to patch properties and preserve all children!
    if (parts.length === 2 && parts[0] === 'tenants') {
      await update(dbRef, data);
    } else {
      await set(dbRef, data);
    }
  } catch (err) {
    console.warn(`Notice writing to RTDB ${normPath}:`, err);
  }

  // 2. Best-effort mirror write to Firestore (if configured)
  const parts = normPath.split('/');
  if (parts.length % 2 === 0) {
    // Valid Firestore document path
    try {
      const firestoreDocRef = doc(db, parts[0], ...parts.slice(1));
      safeFirestoreWrite(setDoc(firestoreDocRef, data, { merge: true })).catch(() => {});
    } catch {}
  }
}

/**
 * Update/patch fields of a record in Cloud Database without overwriting children or other keys.
 */
export async function cloudDbUpdate<T extends Record<string, any>>(path: string, partialData: T): Promise<void> {
  const normPath = normalizePath(path);
  const cacheKey = `glowfy_cloud_doc_${normPath.replace(/\//g, '_')}`;

  // Update local cache
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
          const idx = list.findIndex(item => item.id === itemId || item.id === partialData.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...partialData };
            localStorage.setItem(collCacheKey, JSON.stringify(list));
          }
        }
      }
    } catch {}
  }

  // 1. Write to active Firebase Realtime Database
  try {
    const dbRef = ref(rtdb, normPath);
    await update(dbRef, partialData);
  } catch (err) {
    console.warn(`Notice updating RTDB ${normPath}:`, err);
  }

  // 2. Best-effort mirror write to Firestore (if configured)
  const parts = normPath.split('/');
  if (parts.length % 2 === 0) {
    try {
      const firestoreDocRef = doc(db, parts[0], ...parts.slice(1));
      safeFirestoreWrite(setDoc(firestoreDocRef, partialData, { merge: true })).catch(() => {});
    } catch {}
  }
}

/**
 * Delete a record from Cloud Database across all devices and browsers.
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
          const filtered = list.filter(item => item.id !== itemId);
          localStorage.setItem(collCacheKey, JSON.stringify(filtered));
        }
      }
    } catch {}
  }

  try {
    const dbRef = ref(rtdb, normPath);
    await remove(dbRef);
  } catch (err) {
    console.warn(`Notice deleting from RTDB ${normPath}:`, err);
  }

  const parts = normPath.split('/');
  if (parts.length % 2 === 0) {
    try {
      const firestoreDocRef = doc(db, parts[0], ...parts.slice(1));
      safeFirestoreWrite(deleteDoc(firestoreDocRef)).catch(() => {});
    } catch {}
  }
}

/**
 * Subscribe to real-time changes on a collection path so that any browser
 * immediately sees updates made on other devices.
 */
export function cloudDbSubscribe<T extends { id?: string }>(
  path: string, 
  callback: (items: T[]) => void
): () => void {
  const normPath = normalizePath(path);
  try {
    const dbRef = ref(rtdb, normPath);
    const unsubscribe = onValue(dbRef, (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const val = snap.val();
      const list: T[] = [];
      if (Array.isArray(val)) {
        val.forEach((item, index) => {
          if (item) list.push({ id: String(item.id || index), ...item });
        });
      } else if (typeof val === 'object' && val !== null) {
        Object.entries(val).forEach(([k, item]: [string, any]) => {
          if (item && typeof item === 'object') {
            list.push({ id: item.id || k, ...item });
          }
        });
      }
      callback(list);
    }, (error) => {
      console.warn(`RTDB subscribe notice on ${normPath}:`, error);
    });

    return unsubscribe;
  } catch (e) {
    console.warn(`RTDB subscribe setup notice on ${normPath}:`, e);
    return () => {};
  }
}
