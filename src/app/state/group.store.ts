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
import {
  QuerySnapshot,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Query,
} from 'firebase/firestore';
import { db } from '@services/firebase';
import { AuthService } from '@services/auth';
import { AppUser, ProfileStore } from '@state/profile.store';

/** groups/{id}. memberIds always includes ownerId. */
export interface Group {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt?: unknown;
}

/** A group with its memberIds resolved to user profiles. */
export interface GroupWithMembers extends Group {
  members: AppUser[];
}

const MAX_GROUP_NAME_LENGTH = 40;

interface GroupState {
  /** Groups the signed-in user is a member of. */
  groups: Group[];
  /** True once the first groups snapshot for the current user has arrived. */
  loaded: boolean;
}

const initialState: GroupState = {
  groups: [],
  loaded: false,
};

const querySnapshot$ = (q: Query) =>
  new Observable<QuerySnapshot>((sub) =>
    onSnapshot(
      q,
      (s) => sub.next(s),
      (e) => sub.error(e),
    ),
  );

export const GroupStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store, auth = inject(AuthService), profiles = inject(ProfileStore)) => ({
    /** Auth has resolved and, if signed in, the first groups snapshot has too. */
    ready: computed(() => auth.resolved() && (!auth.uid() || store.loaded())),

    /** Groups with memberIds resolved against the all-users list. */
    groupsWithMembers: computed<GroupWithMembers[]>(() => {
      const byUid = new Map(profiles.users().map((u) => [u.uid, u]));
      return store.groups().map((g) => ({
        ...g,
        members: g.memberIds.map((id) => byUid.get(id)).filter((u): u is AppUser => !!u),
      }));
    }),
  })),

  withMethods((store, auth = inject(AuthService), profiles = inject(ProfileStore)) => {
    const requireUid = () => {
      const uid = auth.uid();
      if (!uid) throw new Error('Not signed in');
      return uid;
    };

    const requireGroup = (groupId: string) => {
      const group = store.groups().find((g) => g.id === groupId);
      if (!group) throw new Error('Group not found');
      return group;
    };

    return {
      // Driven by the uid signal: re-runs on sign-in/out, the previous listener
      // is unsubscribed automatically by switchMap.
      watchGroups: rxMethod<string | null>(
        pipe(
          tap((uid) => patchState(store, { groups: [], loaded: !uid })),
          switchMap((uid) => {
            if (!uid) return EMPTY;

            const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', uid));

            return querySnapshot$(q).pipe(
              tap((snapshot) => {
                const groups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
                groups.sort((a, b) => a.name.localeCompare(b.name));
                patchState(store, { groups, loaded: true });
              }),
              catchError((err) => {
                console.error('groups listener failed', err);
                patchState(store, { loaded: true });
                return EMPTY;
              }),
            );
          }),
        ),
      ),

      /** Create a group owned by the current user. Resolves with the new group id. */
      async createGroup(name: string): Promise<string> {
        const uid = requireUid();

        const trimmed = name.trim();
        if (!trimmed) throw new Error('Group name cannot be empty');
        if (trimmed.length > MAX_GROUP_NAME_LENGTH) {
          throw new Error(`Group name must be ${MAX_GROUP_NAME_LENGTH} characters or fewer`);
        }

        const ref = await addDoc(collection(db, 'groups'), {
          name: trimmed,
          ownerId: uid,
          memberIds: [uid],
          createdAt: serverTimestamp(),
        });
        return ref.id;
      },

      /** Any member can add a user. Adding someone already in the group is a no-op. */
      async addMember(groupId: string, userId: string) {
        requireUid();
        requireGroup(groupId);
        if (!profiles.users().some((u) => u.uid === userId)) {
          throw new Error('User not found');
        }

        await updateDoc(doc(db, 'groups', groupId), { memberIds: arrayUnion(userId) });
      },

      /** Any member can remove a user (including themselves), except the owner. */
      async removeMember(groupId: string, userId: string) {
        requireUid();
        const group = requireGroup(groupId);
        if (userId === group.ownerId) {
          throw new Error('The owner cannot be removed from the group');
        }

        await updateDoc(doc(db, 'groups', groupId), { memberIds: arrayRemove(userId) });
      },

      /** Only the owner can delete a group. */
      async deleteGroup(groupId: string) {
        const uid = requireUid();
        const group = requireGroup(groupId);
        if (group.ownerId !== uid) {
          throw new Error('Only the owner can delete a group');
        }

        await deleteDoc(doc(db, 'groups', groupId));
      },
    };
  }),

  withHooks((store, auth = inject(AuthService)) => ({
    onInit() {
      store.watchGroups(auth.uid);
    },
  })),
);
