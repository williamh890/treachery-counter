// @state/profile.store.ts
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Observable, catchError, pipe, switchMap, tap } from 'rxjs';
import { User } from 'firebase/auth';
import {
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@services/firebase';
import { AuthService } from '@services/auth';
import { Deck } from '@models/deck'; // adjust to wherever Deck lives

export interface UserProfile {
  username: string;
  createdAt?: unknown;
}

/** A profile plus its Firestore doc id (the user's uid). */
export interface AppUser extends UserProfile {
  uid: string;
}

const MAX_USERNAME_LENGTH = 30;

interface ProfileState {
  profile: UserProfile | null;
  /** True once the first profile snapshot for the current user has arrived. */
  profileLoaded: boolean;
  /** Every user in the system, sorted by username. Empty while signed out. */
  users: AppUser[];
  /** Decks fetched so far, keyed by the owning user's uid. */
  decksByUser: Record<string, Deck[]>;
}

const initialState: ProfileState = {
  profile: null,
  profileLoaded: false,
  users: [],
  decksByUser: {},
};

// Firestore listeners as Observables: unsubscribing tears the listener down,
// so switchMap cleans up for us.
const docSnapshot$ = (ref: DocumentReference) =>
  new Observable<DocumentSnapshot>((sub) =>
    onSnapshot(ref, (s) => sub.next(s), (e) => sub.error(e)),
  );

const querySnapshot$ = (ref: Query) =>
  new Observable<QuerySnapshot>((sub) =>
    onSnapshot(ref, (s) => sub.next(s), (e) => sub.error(e)),
  );

/** Seed the profile only if it doesn't exist; never overwrite an existing one. */
async function ensureProfile(uid: string, user: User | null) {
  const ref = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;

    tx.set(ref, {
      username: user?.displayName ?? user?.email?.split('@')[0] ?? 'Player',
      createdAt: serverTimestamp(),
    });
  });
}

export const ProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store, auth = inject(AuthService)) => ({
    /** Auth has resolved and, if signed in, the first profile snapshot has too. */
    ready: computed(() => auth.resolved() && (!auth.uid() || store.profileLoaded())),
  })),

  withMethods((store, auth = inject(AuthService)) => ({
    // Driven by the uid signal: re-runs on sign-in/out, previous listener is
    // unsubscribed automatically by switchMap.
    watchProfile: rxMethod<string | null>(
      pipe(
        tap((uid) =>
          patchState(store, {
            profile: null,
            profileLoaded: !uid, // nothing to wait for when signed out
            decksByUser: {},
          }),
        ),
        switchMap((uid) => {
          if (!uid) return EMPTY;

          void ensureProfile(uid, auth.currentUser()).catch((e) =>
            console.error('ensureProfile failed', e),
          );

          return docSnapshot$(doc(db, 'users', uid)).pipe(
            tap((snap) =>
              patchState(store, {
                profile: snap.exists() ? (snap.data() as UserProfile) : null,
                profileLoaded: true,
              }),
            ),
            catchError((err) => {
              console.error('profile listener failed', err);
              patchState(store, { profileLoaded: true });
              return EMPTY;
            }),
          );
        }),
      ),
    ),

    watchUsers: rxMethod<string | null>(
      pipe(
        tap((uid) => {
          if (!uid) patchState(store, { users: [] });
        }),
        switchMap((uid) => {
          if (!uid) return EMPTY;

          return querySnapshot$(collection(db, 'users')).pipe(
            tap((snapshot) => {
              const users = snapshot.docs.map(
                (d) => ({ uid: d.id, ...d.data() }) as AppUser,
              );
              users.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''));
              patchState(store, { users });
            }),
            catchError((err) => {
              console.error('users listener failed', err);
              return EMPTY;
            }),
          );
        }),
      ),
    ),

    async updateUsername(username: string) {
      const uid = auth.uid();
      if (!uid) throw new Error('Not signed in');

      const trimmed = username.trim();
      if (!trimmed) throw new Error('Username cannot be empty');
      if (trimmed.length > MAX_USERNAME_LENGTH) {
        throw new Error(`Username must be ${MAX_USERNAME_LENGTH} characters or fewer`);
      }

      await setDoc(doc(db, 'users', uid), { username: trimmed }, { merge: true });
    },

    /** One-time fetch of users/{userId}/decks; result is cached in state. */
    async loadDecks(userId: string): Promise<Deck[]> {
      try {
        const snapshot = await getDocs(collection(db, 'users', userId, 'decks'));
        const decks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck);
        patchState(store, (s) => ({ decksByUser: { ...s.decksByUser, [userId]: decks } }));
        return decks;
      } catch (error) {
        console.error(`Error loading decks for user ${userId}:`, error);
        return [];
      }
    },
  })),

  withHooks((store, auth = inject(AuthService)) => ({
    onInit() {
      // Passing a signal makes rxMethod re-run whenever it changes.
      store.watchProfile(auth.uid);
      store.watchUsers(auth.uid);
    },
  })),
);
