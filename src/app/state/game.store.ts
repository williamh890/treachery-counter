// src/app/state/game.store.ts
import { computed, inject } from '@angular/core';
import { Deck } from '@models/deck';
import { signalStore, withState, withMethods, withComputed, patchState, withHooks } from '@ngrx/signals';
import { withStorageSync } from './with-storage-sync';
import { GroupStore } from './group.store';
import { ProfileStore } from './profile.store';

export type Player = {
  id: number;
  name: string;
  life: number;
  isGuest: boolean;
  deck: Deck | null;
};

type GameState = {
  gameState: 'SETUP' | 'PLAY' | 'POST';
  playerCount: number;
  startingLife: number;
  players: Player[];
  /** The group this game is played with; limits who can take a seat. */
  groupId: string | null;
};

const initialState: GameState = {
  gameState: 'SETUP',
  playerCount: 4,
  startingLife: 20,
  players: [],
  groupId: null,
};

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

export const GameStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  // Bumped from 1: the persisted shape gained groupId.
  withStorageSync<GameState>({ key: 'game-state', version: 2 }),

  withComputed((store, groups = inject(GroupStore)) => ({
    /** The selected group, or null if none is chosen (or it's gone / not loaded yet). */
    group: computed(() => groups.groupsWithMembers().find((g) => g.id === store.groupId()) ?? null),
  })),
  withComputed(({ group }) => ({
    /** The only accounts that can take a seat: members of the selected group. */
    seatUsers: computed(() => group()?.members ?? []),
  })),
  // a third withComputed, after the one that defines `group`
  withComputed((store) => ({
    /** Uids to keep deck listeners open for: only while seats are being set up. */
    deckUserIds: computed(
      () =>
        store.gameState() === 'SETUP' && store.players().length > 0
          ? (store.group()?.memberIds ?? [])
          : [],
      { equal: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]) },
    ),
  })),

  // at the end of the signalStore(...) chain
  withHooks((store, profiles = inject(ProfileStore)) => ({
    onInit() {
      profiles.watchDecks(store.deckUserIds);
    },
  })),

  withMethods((store) => ({
    setGroup(groupId: string | null) {
      patchState(store, { groupId });
    },
    setPlayerCount(count: number) {
      const clamped = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(count)));
      patchState(store, { playerCount: clamped });
    },
    setStartingLife(life: number) {
      patchState(store, { startingLife: Math.max(1, Math.round(life)) });
    },
    setPlayerDeck(seat: number, deck: Deck | null) {
      patchState(store, ({ players }) => ({
        players: players.map((p, i) => (i === seat ? { ...p, deck, isGuest: false } : p)),
      }));
    },
    setPlayerIsGuest(seat: number, isGuest: boolean) {
      patchState(store, ({ players }) => ({
        players: players.map((p, i) => (i === seat ? { ...p, isGuest } : p)),
      }));
    },
    onPlayerDamaged(seat: number, delta: number) {
      patchState(store, ({ players }) => ({
        players: players.map((p, i) => (i === seat ? { ...p, life: p.life - delta } : p)),
      }));
    },
    playerAt(seat: number): Player | undefined {
      return store.players()[seat];
    },
    playersReady(): boolean {
      const players = store.players();
      return players.length > 0 && players.every((p) => p.deck || p.isGuest);
    },
    resetGame() {
      patchState(store, initialState);
    },
    startGameSetup() {
      const players = Array.from({ length: store.playerCount() }, (_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        life: store.startingLife(),
        deck: null,
        isGuest: false,
      }));
      patchState(store, { gameState: 'SETUP', players });
    },
    playGame() {
      patchState(store, { gameState: 'PLAY' });
    },
  })),
);
