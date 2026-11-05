// src/app/state/game.store.ts
import { computed, effect, inject, signal, untracked } from '@angular/core';
import { Deck } from '@models/deck';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { withStorageSync } from './with-storage-sync';
import { GroupStore } from './group.store';
import { ProfileStore } from './profile.store';
import { ActionSubmission } from '../game/player/action-selector/action-selector';

export type PlayerStatus = 'alive' | 'dead' | 'protected' | 'eliminated';

export type Player = {
  id: number;
  name: string;
  status: PlayerStatus;
  life: number;
  infect: number;
  commanderDmg: Record<number, number>;
  isGuest: boolean;
  deck: Deck | null;
};

export type ActionSelect = {
  sourceSeat: number;
  targetSeat: number;
};

type GameState = {
  gameState: 'SETUP' | 'PLAY' | 'POST';
  playerCount: number;
  startingLife: number;
  players: Player[];
  /** The group this game is played with; limits who can take a seat. */
  groupId: string | null;
  actionSelect: ActionSelect | null;
  turnSeat: number | null;
};

/** What undo restores. UI state (actionSelect, gameState) is deliberately left out. */
type Snapshot = Pick<GameState, 'players' | 'turnSeat'>;

const initialState: GameState = {
  gameState: 'SETUP',
  playerCount: 4,
  startingLife: 40,
  players: [],
  groupId: null,
  actionSelect: null,
  turnSeat: null,
};

export type DeathDecision = { kill: number[]; protect: number[] };

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const MAX_HISTORY = 50;

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

  // Undo history. A plain signal prop, not state, so withStorageSync never persists it.
  withProps(() => ({ _history: signal<Snapshot[]>([]) })),
  withComputed(({ _history }) => ({
    canUndo: computed(() => _history().length > 0),
  })),
  withMethods((store) => ({
    /** Call at the start of every user-level action, before changing anything. */
    _checkpoint() {
      store._history.update((h) =>
        [...h, { players: store.players(), turnSeat: store.turnSeat() }].slice(-MAX_HISTORY),
      );
    },
    _clearHistory() {
      store._history.set([]);
    },
    undo() {
      const last = store._history().at(-1);
      if (!last) return;
      store._history.update((h) => h.slice(0, -1));
      // actionSelect is cleared so a restored state can't leave the selector open
      patchState(store, { ...last, actionSelect: null });
    },
  })),

  // Game setup methods
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
    playerAt(seat: number): Player | undefined {
      return store.players()[seat];
    },
    playersReady(): boolean {
      const players = store.players();
      return players.length > 0 && players.every((p) => p.deck || p.isGuest);
    },

    resetGame() {
      store._clearHistory();
      patchState(store, initialState);
    },
    startGameSetup() {
      store._clearHistory();
      const players = Array.from({ length: store.playerCount() }, (_, i): Player => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        status: 'alive',
        life: store.startingLife(),
        infect: 0,
        commanderDmg: Object.fromEntries(
          Array.from({ length: store.playerCount() }, (_, seat) => [seat, 0] as const),
        ),
        deck: null,
        isGuest: false,
      }));
      patchState(store, { gameState: 'SETUP', players, turnSeat: null });
    },
    playGame() {
      store._clearHistory();
      patchState(store, { gameState: 'PLAY', turnSeat: null, actionSelect: null });
    },
  })),

  // Turn methods
  withMethods((store) => {
    const advanceTurn = () =>
      patchState(store, ({ turnSeat, players }) => ({
        turnSeat: ((turnSeat ?? -1) + 1) % players.length,
      }));

    return {
      /** For the turn-skip effect: moves the turn without creating an undo step. */
      _advanceTurn: advanceTurn,
      setTurn(playerSeat: number) {
        store._checkpoint();
        patchState(store, { turnSeat: playerSeat });
      },
      passTurn() {
        store._checkpoint();
        advanceTurn();
      },
    };
  }),

  // Gameplay methods
  withMethods((store) => ({
    setActionSelect(sourceSeat: number, targetSeat: number) {
      const actionSelect = { sourceSeat, targetSeat };
      patchState(store, { actionSelect });
    },
    clearActionSelect() {
      patchState(store, { actionSelect: null });
    },
    applyAction(action: ActionSubmission) {
      const select = store.actionSelect();
      if (!select) {
        return;
      }
      store._checkpoint(); // after the guard, so no-ops don't create undo steps

      const { targetSeat, sourceSeat } = select;
      const { count, options } = action;
      const numAlivePlayers = store.players().filter((p) => p.status !== 'eliminated').length;

      patchState(store, ({ players }) => ({
        actionSelect: null,
        players: players.map((player, seat) => {
          let shouldApply = false;
          const isTarget = seat === targetSeat;
          const isSource = seat === sourceSeat;

          let playerCount = count;
          let optionsType = options.type;

          switch (options.target) {
            case 'Player': {
              shouldApply = isTarget;
              break;
            }
            case 'All': {
              shouldApply = true;
              break;
            }
            case 'Opponents': {
              shouldApply = !isSource;
              break;
            }
          }

          switch (options.type) {
            case 'Drain': {
              shouldApply = true;
              optionsType = isSource ? 'Healing' : 'Damage';
              break;
            }
            case 'Extort': {
              shouldApply = true;
              optionsType = isSource ? 'Healing' : 'Damage';
              playerCount = isSource ? count * (numAlivePlayers - 1) : count;
              break;
            }
            case 'Lifelink': {
              shouldApply = true;
              optionsType = isSource ? 'Healing' : 'Damage';
              break;
            }
          }

          if (!shouldApply) {
            return player;
          }

          let life = player.life;
          let infect = player.infect;
          const commanderDmg = { ...player.commanderDmg };

          switch (optionsType) {
            case 'Damage': {
              life -= playerCount;

              if (options.tags.includes('Commander')) {
                commanderDmg[sourceSeat] = (commanderDmg[sourceSeat] ?? 0) + playerCount;
              }
              break;
            }
            case 'Healing': {
              life += playerCount;
              break;
            }
            case 'Infect': {
              infect += playerCount;
              break;
            }
          }

          return { ...player, life, infect, commanderDmg };
        }),
      }));
    },
    applyDeathDescision(decision: DeathDecision) {
      const { kill, protect } = decision;

      patchState(store, ({ players }) => ({
        players: players.map((player, seat): Player => {
          if (kill.includes(seat)) {
            return { ...player, status: 'eliminated' };
          } else if (protect.includes(seat)) {
            return { ...player, status: 'protected' };
          } else {
            return player;
          }
        }),
      }));
    },
    protectPlayer(seat: number) {
      store._checkpoint();
      patchState(store, ({ players }) => ({
        players: players.map((p, i): Player => (i === seat ? { ...p, status: 'protected' } : p)),
      }));
    },
    eliminatePlayer(seat: number) {
      store._checkpoint();
      patchState(store, ({ players }) => ({
        players: players.map((p, i): Player => (i === seat ? { ...p, status: 'eliminated' } : p)),
      }));
    },
  })),

  withHooks((store, profiles = inject(ProfileStore)) => ({
    onInit() {
      profiles.watchDecks(store.deckUserIds);

      const isLethal = (p: Player) =>
        p.life <= 0 || p.infect >= 10 || Object.values(p.commanderDmg).some((d) => d >= 21);

      const nextStatus = (p: Player): PlayerStatus => {
        const lethal = isLethal(p);
        if (p.status === 'alive' && lethal) return 'dead'; // pending confirm
        if ((p.status === 'dead' || p.status === 'protected') && !lethal) return 'alive';
        return p.status; // 'eliminated' only changes through an explicit action
      };

      // Keeps statuses in line with the counters. Runs after changes and after undo.
      effect(() => {
        const players = store.players();

        // Nothing to fix: return so our own patch doesn't retrigger forever
        if (players.every((p) => nextStatus(p) === p.status)) return;

        untracked(() =>
          patchState(store, (s) => ({
            players: s.players.map((p) => ({ ...p, status: nextStatus(p) })),
          })),
        );
      });

      // Moves the turn off an eliminated player. Part of the same undo step as the
      // elimination, so it must not checkpoint.
      effect(() => {
        const turn = store.turnSeat();
        const players = store.players();

        if (turn !== null && players[turn]?.status === 'eliminated') {
          untracked(() => store._advanceTurn());
        }
      });
    },
  })),
);
