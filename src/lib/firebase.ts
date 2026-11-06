import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  PlayerProfileData,
  ChipTransactionItem,
  PlayerConnectionItem,
} from '../types/casino';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required by firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Blueprint validation constants
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
  return cleaned.length > 0 ? cleaned : 'anon_player';
}

export function sanitizeDisplayName(name: string): string {
  const trimmed = name.trim().slice(0, 32);
  return trimmed.length >= 2 ? trimmed : 'Guest_Patron';
}

export async function ensureFirestoreProfile(
  user: User,
  localFallback: PlayerProfileData
): Promise<PlayerProfileData> {
  const uid = sanitizeId(user.uid);
  const profilePath = `profiles/${uid}`;
  const profileRef = doc(db, 'profiles', uid);

  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...localFallback,
        uid,
        displayName: typeof data.displayName === 'string' ? data.displayName : localFallback.displayName,
        chips: typeof data.chips === 'number' ? data.chips : localFallback.chips,
        xp: typeof data.xp === 'number' ? data.xp : localFallback.xp,
        level: typeof data.level === 'number' ? data.level : localFallback.level,
        chipTheme: data.chipTheme || localFallback.chipTheme,
        tableTheme: data.tableTheme || localFallback.tableTheme,
        gamesPlayed: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : localFallback.gamesPlayed,
        totalWon: typeof data.totalWon === 'number' ? data.totalWon : localFallback.totalWon,
        biggestWin: typeof data.biggestWin === 'number' ? data.biggestWin : localFallback.biggestWin,
        dailyStreak: typeof data.dailyStreak === 'number' ? data.dailyStreak : localFallback.dailyStreak,
        lastDailyClaim: typeof data.lastDailyClaim === 'string' ? data.lastDailyClaim : '',
        lastAllowanceClaim: typeof data.lastAllowanceClaim === 'string' ? data.lastAllowanceClaim : '',
        status: data.status || 'online',
        currentGame: data.currentGame || 'Lobby',
        currentRoomId: data.currentRoomId || 'lobby',
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, profilePath);
  }

  // Create initial document strictly matching isValidPlayerProfile in firestore.rules
  const newDoc = {
    uid,
    displayName: sanitizeDisplayName(localFallback.displayName),
    chips: Math.max(0, Math.min(1000000000, Math.floor(localFallback.chips))),
    xp: Math.max(0, Math.min(1000000000, Math.floor(localFallback.xp))),
    level: Math.max(1, Math.min(1000, Math.floor(localFallback.level))),
    chipTheme: localFallback.chipTheme,
    tableTheme: localFallback.tableTheme,
    gamesPlayed: Math.max(0, Math.min(10000000, Math.floor(localFallback.gamesPlayed))),
    totalWon: Math.max(0, Math.min(1000000000, Math.floor(localFallback.totalWon))),
    biggestWin: Math.max(0, Math.min(1000000000, Math.floor(localFallback.biggestWin))),
    dailyStreak: Math.max(0, Math.min(10000, Math.floor(localFallback.dailyStreak))),
    lastDailyClaim: (localFallback.lastDailyClaim || '').slice(0, 40),
    lastAllowanceClaim: (localFallback.lastAllowanceClaim || '').slice(0, 40),
    status: 'online',
    currentGame: (localFallback.currentGame || 'Lobby').slice(0, 32),
    currentRoomId: (localFallback.currentRoomId || 'lobby').slice(0, 128),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(profileRef, newDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, profilePath);
  }

  return {
    ...localFallback,
    uid,
  };
}

export async function syncFirestoreGameplayStats(
  uid: string,
  stats: {
    chips: number;
    xp: number;
    level: number;
    gamesPlayed: number;
    totalWon: number;
    biggestWin: number;
    dailyStreak: number;
    lastDailyClaim: string;
    lastAllowanceClaim: string;
  }
) {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const profilePath = `profiles/${uid}`;
  try {
    // Matches Action 1 in firestore.rules:
    // ['chips', 'xp', 'level', 'gamesPlayed', 'totalWon', 'biggestWin', 'dailyStreak', 'lastDailyClaim', 'lastAllowanceClaim', 'updatedAt']
    await updateDoc(doc(db, 'profiles', uid), {
      chips: Math.max(0, Math.min(1000000000, Math.floor(stats.chips))),
      xp: Math.max(0, Math.min(1000000000, Math.floor(stats.xp))),
      level: Math.max(1, Math.min(1000, Math.floor(stats.level))),
      gamesPlayed: Math.max(0, Math.min(10000000, Math.floor(stats.gamesPlayed))),
      totalWon: Math.max(0, Math.min(1000000000, Math.floor(stats.totalWon))),
      biggestWin: Math.max(0, Math.min(1000000000, Math.floor(stats.biggestWin))),
      dailyStreak: Math.max(0, Math.min(10000, Math.floor(stats.dailyStreak))),
      lastDailyClaim: (stats.lastDailyClaim || '').slice(0, 40),
      lastAllowanceClaim: (stats.lastAllowanceClaim || '').slice(0, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }
}

export async function syncFirestoreCustomization(
  uid: string,
  custom: {
    displayName: string;
    chipTheme: string;
    tableTheme: string;
    status: string;
    currentGame: string;
    currentRoomId: string;
  }
) {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const profilePath = `profiles/${uid}`;
  try {
    // Matches Action 2 in firestore.rules:
    // ['displayName', 'chipTheme', 'tableTheme', 'status', 'currentGame', 'currentRoomId', 'updatedAt']
    await updateDoc(doc(db, 'profiles', uid), {
      displayName: sanitizeDisplayName(custom.displayName),
      chipTheme: custom.chipTheme,
      tableTheme: custom.tableTheme,
      status: custom.status,
      currentGame: custom.currentGame.slice(0, 32),
      currentRoomId: custom.currentRoomId.slice(0, 128),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }
}

export async function recordFirestoreTransaction(
  uid: string,
  tx: Omit<ChipTransactionItem, 'createdAt'>
) {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const txId = sanitizeId(tx.id);
  const txPath = `profiles/${uid}/transactions/${txId}`;
  try {
    await setDoc(doc(db, 'profiles', uid, 'transactions', txId), {
      uid,
      type: tx.type,
      game: tx.game.slice(0, 40),
      amount: Math.max(-100000000, Math.min(100000000, Math.floor(tx.amount))),
      balanceAfter: Math.max(0, Math.min(1000000000, Math.floor(tx.balanceAfter))),
      summary: tx.summary.slice(0, 160),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, txPath);
  }
}

export async function upsertFirestoreConnection(
  uid: string,
  targetUid: string,
  targetName: string,
  relationType: 'friend' | 'recent',
  lastPlayedGame: string
) {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const cleanTarget = sanitizeId(targetUid);
  if (cleanTarget === uid || !ID_REGEX.test(cleanTarget)) return;
  const connPath = `profiles/${uid}/connections/${cleanTarget}`;
  const connRef = doc(db, 'profiles', uid, 'connections', cleanTarget);
  try {
    const existingSnap = await getDoc(connRef);
    if (existingSnap.exists()) {
      await updateDoc(connRef, {
        targetName: sanitizeDisplayName(targetName),
        relationType,
        lastPlayedGame: lastPlayedGame.slice(0, 32),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(connRef, {
        uid,
        targetUid: cleanTarget,
        targetName: sanitizeDisplayName(targetName),
        relationType,
        lastPlayedGame: lastPlayedGame.slice(0, 32),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, connPath);
  }
}

export async function removeFirestoreConnection(uid: string, targetUid: string) {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const cleanTarget = sanitizeId(targetUid);
  const connPath = `profiles/${uid}/connections/${cleanTarget}`;
  try {
    await deleteDoc(doc(db, 'profiles', uid, 'connections', cleanTarget));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, connPath);
  }
}

export {
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  getDocs,
};
