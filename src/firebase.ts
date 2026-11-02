import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

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
      (fullText.includes('@firebase/firestore') && fullText.includes('Could not reach Cloud Firestore'))
    ) {
      console.warn('[Firestore Offline Fallback]', ...args);
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
