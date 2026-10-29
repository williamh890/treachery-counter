// @services/auth.ts
import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '@services/firebase';

export interface UserProfile {
  username: string;
  createdAt?: unknown;
}

/** A profile plus its Firestore doc id (the user's uid). */
export interface AppUser extends UserProfile {
  uid: string;
}

const MAX_USERNAME_LENGTH = 30;

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly _currentUser = signal<User | null>(null);
  private readonly _userProfile = signal<UserProfile | null>(null);
  private readonly _users = signal<AppUser[]>([]);
  private readonly _ready = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly userProfile = this._userProfile.asReadonly();

  /** Every user in the system, sorted by username. Empty while signed out. */
  readonly users = this._users.asReadonly();

  /** True once auth state (and, if signed in, the first profile snapshot) has resolved. */
  readonly ready = this._ready.asReadonly();

  private unsubscribeProfile?: () => void;
  private unsubscribeUsers?: () => void;
  private readonly unsubscribeAuth: () => void;

  constructor() {
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      this._currentUser.set(user);
      this.watchProfile(user);
      this.watchUsers(user);
    });
  }

  ngOnDestroy() {
    this.unsubscribeAuth();
    this.unsubscribeProfile?.();
    this.unsubscribeUsers?.();
  }

  async signInWithGoogle() {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async signOut() {
    await signOut(auth);
  }

  async updateUsername(username: string) {
    const uid = this._currentUser()?.uid;
    if (!uid) throw new Error('Not signed in');

    const trimmed = username.trim();
    if (!trimmed) throw new Error('Username cannot be empty');
    if (trimmed.length > MAX_USERNAME_LENGTH) {
      throw new Error(`Username must be ${MAX_USERNAME_LENGTH} characters or fewer`);
    }

    await setDoc(doc(db, 'users', uid), { username: trimmed }, { merge: true });
  }

  private watchProfile(user: User | null) {
    this.unsubscribeProfile?.();
    this.unsubscribeProfile = undefined;

    if (!user) {
      this._userProfile.set(null);
      this._ready.set(true);
      return;
    }

    // Seed the profile only if it doesn't exist; never overwrite an existing one.
    void this.ensureProfile(user).catch((e) => console.error('ensureProfile failed', e));

    this.unsubscribeProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        this._userProfile.set(snap.exists() ? (snap.data() as UserProfile) : null);
        this._ready.set(true);
      },
      (err) => {
        console.error('profile listener failed', err);
        this._ready.set(true);
      },
    );
  }

  private watchUsers(user: User | null) {
    this.unsubscribeUsers?.();
    this.unsubscribeUsers = undefined;

    if (!user) {
      this._users.set([]);
      return;
    }

    this.unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser);
        users.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''));
        this._users.set(users);
      },
      (err) => console.error('users listener failed', err),
    );
  }

  private async ensureProfile(user: User) {
    const ref = doc(db, 'users', user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return;

      tx.set(ref, {
        username: user.displayName ?? user.email?.split('@')[0] ?? 'Player',
        createdAt: serverTimestamp(),
      });
    });
  }

  async getUserDecks(userId: string): Promise<any[]> {
    try {
      // 1. Reference the subcollection: users/{userId}/decks
      const decksCol = collection(db, 'users', userId, 'decks');

      // 2. Fetch the documents from that subcollection
      const snapshot = await getDocs(decksCol);

      // 3. Map document snapshots to a structured array
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(`Error loading decks for user ${userId}:`, error);
      return [];
    }
  }
}
