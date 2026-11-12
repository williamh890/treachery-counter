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
import {
  ActionOptionsValue,
  ActionSubmission,
  DEFAULT_ACTION_OPTIONS,
} from '../game/player/action-selector/action-options/action-options.config';


export type PlayerStatus = 'alive' | 'dead' | 'protected' | 'eliminated';
export type LayoutMode = 'classic' | 'rows';

export type Player = {
  id: number;
  name: string;
  status: PlayerStatus;
  life: number;
  infect: number;
  commanderDmg: Record<number, number>;
  partnerDmg: Record<number, number>;
  isGuest: boolean;
  deck: Deck | null;
};

export type ActionSelect = {
  id: number;
  sourceSeat: number;
  targetSeat: number;
  protectSeats: number[];
};

type GameState = {
  gameState: 'SETUP' | 'PLAY' | 'POST';
  layoutMode: LayoutMode,
  playerCount: number;
  startingLife: number;
  players: Player[];
  /** The group this game is played with; limits who can take a seat. */
  groupId: string | null;
  actionSelect: ActionSelect | null;
  actionOptions: ActionOptionsValue | null;
  turnSeat: number | null;
};

/** What undo restores. UI state (actionSelect, gameState) is deliberately left out. */
type Snapshot = Pick<GameState, 'players' | 'turnSeat'>;

/** Per-seat change an open action would cause. */
export type PreviewDelta = { life: number; infect: number };

const initialState: GameState = {
  gameState: 'SETUP',
  layoutMode: 'classic',
  playerCount: 4,
  startingLife: 40,
  players: [],
  groupId: null,
  actionSelect: null,
  actionOptions: null,
  turnSeat: null,
};

export type DeathDecision = { kill: number[]; protect: number[] };

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 9;
const MAX_HISTORY = 50;

/**
 * NOTE: signalStore only has typed overloads for 15 features. Past that, the store type
 * falls back to an index signature (TS4111). Features of the same kind are merged into
 * single blocks below to stay well under that limit (currently 8).
 */
export const GameStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  // Bumped from 1: the persisted shape gained groupId.
  withStorageSync<GameState>({ key: 'game-state', version: 2 }),

  // Plain signals, not state, so withStorageSync never persists them.
  withProps(() => ({
    /** Undo history. */
    _history: signal<Snapshot[]>([]),
    /** Count currently dialed in on the open action selector (drives the live preview). */
    _actionCount: signal(0),
    /** Whether the options sheet is open. */
    _optionsOpen: signal(false),
  })),

  withComputed((store, groups = inject(GroupStore)) => {
    /** The selected group, or null if none is chosen (or it's gone / not loaded yet). */
    const group = computed(
      () => groups.groupsWithMembers().find((g) => g.id === store.groupId()) ?? null,
    );

    /** Players as the UI should show them: the committed state plus the open action, if any. */
    const displayPlayers = computed(() => {
      const select = store.actionSelect();
      const options = store.actionOptions();
      const count = store._actionCount();
      if (!select || !options || count === 0) return store.players();
      return applyActionTo(store.players(), select, { count, options });
    });

    return {
      group,
      /** The only accounts that can take a seat: members of the selected group. */
      seatUsers: computed(() => group()?.members ?? []),

      /** Uids to keep deck listeners open for: only while seats are being set up. */
      deckUserIds: computed(
        () =>
          store.gameState() === 'SETUP' && store.players().length > 0
            ? (group()?.memberIds ?? [])
            : [],
        { equal: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]) },
      ),

      targetSeats: computed<number[]>(() => {
        const select = store.actionSelect();
        const options = store.actionOptions();
        return select && options ? hitSeats(store.players(), select, options.target) : [];
      }),

      canUndo: computed(() => store._history().length > 0),
      optionsOpen: store._optionsOpen.asReadonly(),

      displayPlayers,

      /** Per-seat change the open action would cause. Empty when nothing is previewed. */
      previewDeltas: computed<PreviewDelta[]>(() => {
        const before = store.players();
        const after = displayPlayers();
        if (before === after) return [];
        return after.map((p, seat) => ({
          life: p.life - before[seat].life,
          infect: p.infect - before[seat].infect,
        }));
      }),
    };
  }),

  // Undo + options sheet
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
      store._actionCount.set(0);
      patchState(store, { ...last, actionSelect: null });
    },
    undoTurn() {
      const history = store._history();
      const current = store.turnSeat();
      if (current === null) return;

      // Walk back over the checkpoints taken during the current turn
      let i = history.length;
      while (i > 0 && history[i - 1].turnSeat === current) i--;

      if (i === history.length) return; // nothing has happened this turn yet

      const target = history[i]; // state before the first action of this turn
      store._history.set(history.slice(0, i));
      store._actionCount.set(0);
      patchState(store, { ...target, actionSelect: null });
    },
    openOptions() {
      store._optionsOpen.set(true);
    },
    closeOptions() {
      store._optionsOpen.set(false);
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
    setLayoutMode(mode: LayoutMode) {
      patchState(store, { layoutMode: mode });
    },
    setPlayerDeck(seat: number, deck: Deck | null) {
      patchState(store, ({ players }) => ({
        players: players.map((p, i) => (i === seat ? { ...p, deck, isGuest: false } : p)),
      }));
    },
    setPlayerName(seat: number, username: string) {
      patchState(store, ({ players }) => ({
        players: players.map((p, i) => (i === seat ? { ...p, name: username, isGuest: false } : p)),
      }));
    },
    setPlayerIsGuest(seat: number, isGuest: boolean) {
      patchState(store, ({ players }) => ({
        players: players.map((p, i) => (i === seat ? { ...p, isGuest } : p)),
      }));
    },
    /** Reads the display players, so the open action's preview shows up on every seat. */
    playerAt(seat: number): Player | undefined {
      return store.displayPlayers()[seat];
    },
    /** Uses the committed players, not the preview. */
    playersReady(): boolean {
      const players = store.players();
      return players.length > 0 && players.every((p) => p.deck || p.isGuest);
    },
    setActionOptions(value: ActionOptionsValue | null) {
      patchState(store, { actionOptions: value });
    },

    resetGame() {
      store._clearHistory();
      store._actionCount.set(0);
      patchState(store, initialState);
    },
    startGameSetup() {
      store._clearHistory();
      store._actionCount.set(0);
      const zeroDmg = (n: number) =>
        Object.fromEntries(Array.from({ length: n }, (_, seat) => [seat, 0]));
      // startGameSetup:
      const players = Array.from({ length: store.playerCount() }, (_, i): Player => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        status: 'alive',
        life: store.startingLife(),
        infect: 0,
        commanderDmg: zeroDmg(store.playerCount()),
        partnerDmg: zeroDmg(store.playerCount()),
        deck: null,
        isGuest: false,
      }));
      patchState(store, { gameState: 'SETUP', players, turnSeat: null, actionSelect: null });
    },
    playGame() {
      store._clearHistory();
      store._actionCount.set(0);
      patchState(store, { gameState: 'PLAY', turnSeat: null, actionSelect: null });
    },
  })),

  // Turn methods
  withMethods((store) => {
    const advanceTurn = () => {
      store._actionCount.set(0);
      patchState(store, ({ turnSeat, players }) => ({
        turnSeat: ((turnSeat ?? -1) + 1) % players.length,
        actionSelect: null,
      }));
    };

    return {
      /** For the turn-skip effect: moves the turn without creating an undo step. */
      _advanceTurn: advanceTurn,
      setTurn(playerSeat: number) {
        store._checkpoint();
        store._actionCount.set(0);
        patchState(store, { turnSeat: playerSeat, actionSelect: null });
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
      store._actionCount.set(0);
      patchState(store, {
        actionSelect: { id: Date.now(), sourceSeat, targetSeat, protectSeats: [] },
        actionOptions: DEFAULT_ACTION_OPTIONS,
      });
    },

    /** Called by the action selector as its count changes; drives the live preview. */
    setActionCount(count: number) {
      store._actionCount.set(Math.max(0, count));
    },

    toggleProtectFromAction(seat: number) {
      const actionSelect = store.actionSelect();
      if (!actionSelect) {
        return;
      }

      const { protectSeats } = actionSelect;
      patchState(store, {
        actionSelect: {
          ...actionSelect,
          protectSeats: protectSeats.includes(seat)
            ? protectSeats.filter((s) => s !== seat)
            : [...protectSeats, seat],
        },
      });
    },

    /** Cancel: the preview is derived, so clearing the selection reverts it. */
    clearActionSelect() {
      store._actionCount.set(0);
      patchState(store, { actionSelect: null });
    },

    applyAction(action: ActionSubmission) {
      const select = store.actionSelect();
      if (!select) {
        return;
      }
      store._checkpoint(); // after the guard, so no-ops don't create undo steps

      store._actionCount.set(0);
      patchState(store, ({ players }) => ({
        actionSelect: null,
        players: applyActionTo(players, select, action),
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
        p.life <= 0 ||
        p.infect >= 10 ||
        Object.values(p.commanderDmg).some((d) => d >= 21) ||
        Object.values(p.partnerDmg).some((d) => d >= 21);

      const nextStatus = (p: Player): PlayerStatus => {
        const lethal = isLethal(p);
        if (p.status === 'alive' && lethal) return 'dead'; // pending confirm
        if ((p.status === 'dead' || p.status === 'protected') && !lethal) return 'alive';
        return p.status; // 'eliminated' only changes through an explicit action
      };

      // Keeps statuses in line with the counters. Runs after changes and after undo.
      // Reads the committed players, so a previewed lethal hit never triggers a death prompt.
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

/** Seats an action hits. Protected seats are excluded; group targets skip eliminated players. */
function hitSeats(
  players: Player[],
  select: ActionSelect,
  target: ActionOptionsValue['target'],
): number[] {
  const { sourceSeat, targetSeat, protectSeats } = select;
  return players
    .map((_, seat) => seat)
    .filter((seat) => {
      const inGame = players[seat].status !== 'eliminated';
      const targeted =
        target === 'Player'
          ? seat === targetSeat
          : target === 'All'
            ? inGame
            : inGame && seat !== sourceSeat;
      return targeted && !protectSeats.includes(seat);
    });
}

/** Pure: the players after `action` lands. Shared by the live preview and the real apply. */
function applyActionTo(
  players: Player[],
  select: ActionSelect,
  action: ActionSubmission,
): Player[] {
  const { targetSeat, sourceSeat, protectSeats } = select;
  const { count, options } = action;

  // Seats the action is aimed at. Group targets skip eliminated players;
  // an explicit single target is always honored.
  const isTargeted = (seat: number): boolean => {
    const inGame = players[seat]?.status !== 'eliminated';
    switch (options.target) {
      case 'Player':
        return seat === targetSeat;
      case 'All':
        return inGame;
      case 'Opponents':
        return inGame && seat !== sourceSeat;
    }
  };

  // Protected seats are excluded from the action entirely
  const isExcluded = (seat: number) => protectSeats.includes(seat);
  const isHit = (seat: number) => isTargeted(seat) && !isExcluded(seat);

  const hitCount = players.filter((_, seat) => isHit(seat)).length;

  // What the source gains is tied to harm that actually landed
  const sourceGain = (() => {
    switch (options.type) {
      case 'Extort':
        return count * hitCount;
      case 'Drain':
      case 'Lifelink':
        return hitCount > 0 ? count : 0;
      default:
        return 0;
    }
  })();

  return players.map((player, seat): Player => {
    const hit = isHit(seat);
    const gains = seat === sourceSeat && sourceGain > 0 && !isExcluded(seat);
    if (!hit && !gains) {
      return player;
    }

    let life = player.life;
    let infect = player.infect;
    const commanderDmg = { ...player.commanderDmg };
    const partnerDmg = { ...player.partnerDmg };

    if (hit) {
      switch (options.type) {
        case 'Healing':
          life += count;
          break;
        case 'Infect':
          infect += count;
          break;
        default: // Damage, Drain, Extort, Lifelink
          life -= count;
          if (options.tags.includes('Commander')) {
            commanderDmg[sourceSeat] = (commanderDmg[sourceSeat] ?? 0) + count;
          }

          if (options.tags.includes('Partner')) {
            partnerDmg[sourceSeat] = (partnerDmg[sourceSeat] ?? 0) + count;
          }
      }
    }

    if (gains) {
      life += sourceGain;
    }

    return { ...player, life, infect, commanderDmg, partnerDmg };
  });
}
