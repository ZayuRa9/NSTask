import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import rawFirebaseConfig from '../firebase-applet-config.json';

/**
 * Dynamically resolves the optimal authDomain for Firebase Authentication:
 * 1. Explicit environment variable: VITE_FIREBASE_AUTH_DOMAIN
 * 2. In browser environments:
 *    - Dynamically evaluates window.location to support current host proxy (e.g. *.run.app)
 *    - Automatically utilizes recognized authorized domains or localhost
 * 3. Primary authorized project URLs:
 *    - `${projectId}.firebaseapp.com`
 *    - `${projectId}.web.app`
 */
export function resolveDynamicAuthDomain(): string {
  try {
    const envAuthDomain = (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN;
    if (envAuthDomain && typeof envAuthDomain === 'string' && envAuthDomain.trim()) {
      return envAuthDomain.trim();
    }
  } catch {}

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const host = window.location.host;

    // Support URL param override for testing authorized domains
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramDomain = urlParams.get('firebaseAuthDomain');
      if (paramDomain) return paramDomain;
    } catch {}

    // Check if host-based auth domain is explicitly requested
    try {
      if ((import.meta as any).env?.VITE_USE_HOST_AUTH_DOMAIN === 'true' && host) {
        return host;
      }
    } catch {}

    // If current hostname is in authorizedAuthDomains list, use it
    const authorizedList: string[] = (rawFirebaseConfig as any).authorizedAuthDomains || [];
    if (authorizedList.includes(hostname)) {
      return hostname === 'localhost' ? 'localhost' : hostname;
    }
  }

  return (
    rawFirebaseConfig.authDomain ||
    `${rawFirebaseConfig.projectId}.firebaseapp.com` ||
    `${rawFirebaseConfig.projectId}.web.app`
  );
}

// Build dynamic configuration
export const firebaseConfig = {
  ...rawFirebaseConfig,
  authDomain: resolveDynamicAuthDomain(),
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore Database with explicit database ID from config
export const db = getFirestore(app, (firebaseConfig as Record<string, any>).firestoreDatabaseId);

// Initialize Authentication
export const auth = getAuth(app);

// Filter out known harmless Firestore offline connection notices from console.error
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const fullText = args
      .map((a) => (typeof a === 'string' ? a : a?.message || a?.code || ''))
      .join(' ');
    if (
      fullText.includes('token-service-api-has-not-been-used') ||
      fullText.includes('popup-closed-by-user') ||
      fullText.includes('cancelled-popup-request') ||
      (fullText.includes('@firebase/firestore') && fullText.includes('Could not reach Cloud Firestore'))
    ) {
      console.warn('[Firebase Auth/Firestore Notice]', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Google Auth Provider configured for popups
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Validate connection to Firestore on boot as required by system guidelines
 */
export async function testFirestoreConnection(): Promise<boolean> {
  // If offline, do not attempt remote server roundtrip
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[Firestore] Running in offline-first mode (IndexedDB active)');
    return false;
  }
  try {
    if (!auth.currentUser) {
      console.log('[Firestore] Ready in offline-first mode. Cloud connection syncs upon login.');
      return true;
    }
    // Test if auth token is reachable before forcing remote server roundtrip
    try {
      await auth.currentUser.getIdToken(false);
    } catch (tokenErr: any) {
      console.warn('[Firestore] Token service warming up, using offline cache mode:', tokenErr?.message || tokenErr);
      return false;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Live connection verified successfully');
    return true;
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes('the client is offline') ||
      msg.includes('token-service') ||
      msg.includes('Could not reach Cloud Firestore')
    ) {
      console.warn('[Firestore] Backend in offline/local cache mode:', msg);
    } else {
      console.warn('[Firestore] Notice during connection test:', msg);
    }
    return false;
  }
}

// Auto-validate auth token health on boot so expired or disabled token services do not trigger Firestore loops
if (typeof window !== 'undefined') {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        await user.getIdToken(false);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('token-service') || msg.includes('securetoken.googleapis.com')) {
          console.warn('[Firebase Auth] Token service not available for current session, clearing session.');
          await auth.signOut().catch(() => {});
        }
      }
    }
  });
}
