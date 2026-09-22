import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { TenantNotification } from '../../types';

export async function createTenantNotification(
  tenantId: string, 
  notification: Omit<TenantNotification, 'id' | 'createdAt'>
): Promise<TenantNotification> {
  const notifCol = collection(db, 'tenants', tenantId, 'notifications');
  const notifRef = doc(notifCol);
  const newNotif: TenantNotification = {
    id: notifRef.id,
    ...notification,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(notifRef, newNotif);
  } catch (e) {
    console.warn("Could not save notification to Firestore, caching locally:", e);
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`glowfy_notifications_${tenantId}`);
        const list: TenantNotification[] = cached ? JSON.parse(cached) : [];
        list.unshift(newNotif);
        localStorage.setItem(`glowfy_notifications_${tenantId}`, JSON.stringify(list.slice(0, 50)));
      } catch {}
    }
  }

  return newNotif;
}

export function subscribeToTenantNotifications(
  tenantId: string,
  onUpdate: (notifications: TenantNotification[]) => void,
  professionalId?: string
): Unsubscribe {
  try {
    const notifCol = collection(db, 'tenants', tenantId, 'notifications');
    const q = query(notifCol, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TenantNotification[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as TenantNotification);
        });

        const filtered = professionalId && professionalId !== 'all'
          ? list.filter((n) => !n.professionalId || n.professionalId === professionalId)
          : list;

        if (typeof window !== 'undefined') {
          localStorage.setItem(`glowfy_notifications_${tenantId}`, JSON.stringify(list));
        }
        onUpdate(filtered);
      },
      (error) => {
        console.warn("Notice: Real-time notifications listener error, fallback to cache:", error);
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`glowfy_notifications_${tenantId}`);
          if (cached) {
            try {
              const list: TenantNotification[] = JSON.parse(cached);
              const filtered = professionalId && professionalId !== 'all'
                ? list.filter((n) => !n.professionalId || n.professionalId === professionalId)
                : list;
              onUpdate(filtered);
            } catch {}
          }
        }
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Listener creation error:", err);
    return () => {};
  }
}

export async function markNotificationAsRead(tenantId: string, notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'tenants', tenantId, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (e) {
    console.warn("Could not mark notification as read in Firestore:", e);
  }
}
