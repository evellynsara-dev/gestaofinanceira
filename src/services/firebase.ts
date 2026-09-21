import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Transaction, CategoryBudget, PaymentAccount, Member, ProfileMode } from '../types';

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Authenticate anonymously so requests have an auth context if needed
signInAnonymously(auth).catch((err) => {
  console.warn('Anonymous auth note (firestore access continues):', err.message);
});

// Test connection as mandated by skill
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'profiles', 'health-check'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline, falling back to cached/local storage');
    }
    return false;
  }
}

export interface ProfileCloudData {
  transactions?: Transaction[];
  budgets?: CategoryBudget[];
  accounts?: PaymentAccount[];
  members?: Member[];
  updatedAt?: string;
}

/**
 * Subscribes to real-time changes for a profile ('familia' or 'empresa').
 * This ensures that when the user accesses from anywhere using the same link,
 * changes sync instantly across all devices.
 */
export function subscribeToProfileCloudData(
  mode: ProfileMode,
  onData: (data: ProfileCloudData) => void
): () => void {
  const profileRef = doc(db, 'profiles', mode);
  
  const unsubscribe = onSnapshot(
    profileRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.data();
        let transactions: Transaction[] | undefined;
        let budgets: CategoryBudget[] | undefined;
        let accounts: PaymentAccount[] | undefined;
        let members: Member[] | undefined;

        try {
          if (raw.transactions) transactions = typeof raw.transactions === 'string' ? JSON.parse(raw.transactions) : raw.transactions;
          if (raw.budgets) budgets = typeof raw.budgets === 'string' ? JSON.parse(raw.budgets) : raw.budgets;
          if (raw.accounts) accounts = typeof raw.accounts === 'string' ? JSON.parse(raw.accounts) : raw.accounts;
          if (raw.members) members = typeof raw.members === 'string' ? JSON.parse(raw.members) : raw.members;
        } catch (e) {
          console.error('Error parsing cloud profile data:', e);
        }

        onData({
          transactions,
          budgets,
          accounts,
          members,
          updatedAt: raw.updatedAt,
        });
      }
    },
    (err) => {
      console.warn(`Firestore onSnapshot error for ${mode} (using local cache):`, err.message);
    }
  );

  return unsubscribe;
}

/**
 * Saves profile data to Firestore cloud so it persists across all devices and links.
 */
let saveTimers: Record<string, any> = {};

export async function saveProfileCloudData(
  mode: ProfileMode,
  data: Partial<ProfileCloudData>
): Promise<void> {
  // Debounce writes to avoid spamming Firestore
  return new Promise((resolve) => {
    if (saveTimers[mode]) {
      clearTimeout(saveTimers[mode]);
    }

    saveTimers[mode] = setTimeout(async () => {
      try {
        const profileRef = doc(db, 'profiles', mode);
        const payload: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };

        if (data.transactions !== undefined) {
          payload.transactions = JSON.stringify(data.transactions);
        }
        if (data.budgets !== undefined) {
          payload.budgets = JSON.stringify(data.budgets);
        }
        if (data.accounts !== undefined) {
          payload.accounts = JSON.stringify(data.accounts);
        }
        if (data.members !== undefined) {
          payload.members = JSON.stringify(data.members);
        }

        await setDoc(profileRef, payload, { merge: true });
        resolve();
      } catch (err: any) {
        console.warn('Failed to save to Firestore cloud, local cache preserved:', err?.message);
        resolve();
      }
    }, 400);
  });
}
