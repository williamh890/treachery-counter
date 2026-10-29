// src/app/state/game.store.ts
import { Deck } from '@models/deck';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStorageSync } from './with-storage-sync';

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
};

const initialState: GameState = {
  gameState: 'SETUP',
  playerCount: 4,
  startingLife: 20,
  players: [],
};

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

export const GameStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withStorageSync<GameState>({ key: 'game-state', version: 1 }),
  withMethods((store) => ({
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
