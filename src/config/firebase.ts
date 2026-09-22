import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref, get, set, update, remove, onValue } from 'firebase/database';

// Prioritize environment variables injected by Vercel or .env
// Fallback to the user's production "glowfyhub" Firebase project
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDNlV8kcdZO08EQj--iYxohq21qvZeHH48",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "glowfyhub.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://glowfyhub-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "glowfyhub",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "glowfyhub.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "571982162818",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:571982162818:web:97d84343ebcf2476aabd9b"
};

const customDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Connect to Firebase Realtime Database (active cloud database for glowfyhub)
export const rtdb = getDatabase(app);

// Use custom database ID if specified in env, otherwise connect to standard (default) Firestore
export const db = customDatabaseId ? getFirestore(app, customDatabaseId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// System Super Admin Email
export const SUPER_ADMIN_EMAIL = "interacaodigitall@gmail.com";

/**
 * Resilient wrapper for Firestore write/update/delete operations.
 * Resolves within timeoutMs to prevent the UI from freezing when cloud Firestore
 * is unreachable, missing, unprovisioned, or in stream reconnect loops.
 */
export async function safeFirestoreWrite<T>(
  operation: Promise<T>,
  timeoutMs = 1200
): Promise<T | null> {
  try {
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });
    return await Promise.race([operation, timeout]);
  } catch (err) {
    console.warn("Notice: Firestore write deferred/cached locally:", err);
    return null;
  }
}

/**
 * Resilient wrapper for Firestore read operations.
 * If Firestore hangs or errors, falls back to fallbackValue within timeoutMs.
 */
export async function safeFirestoreRead<T>(
  operation: Promise<T>,
  fallbackValue: T,
  timeoutMs = 1200
): Promise<T> {
  try {
    const timeout = new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    });
    const result = await Promise.race([operation, timeout]);
    return result ?? fallbackValue;
  } catch (err) {
    console.warn("Notice: Firestore read fallback:", err);
    return fallbackValue;
  }
}

// Export common Firestore & RTDB functions for explicit usage
export { collection, query, where, getDocs, doc, getDoc };
export { ref, get, set, update, remove, onValue };



