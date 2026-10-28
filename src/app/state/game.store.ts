// src/app/state/game.store.ts
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export type Player = {
  id: number;
  name: string;
  life: number;
};

type GameState = {
  playerCount: number;
  startingLife: number;
  players: Player[],
};

const initialState: GameState = {
  playerCount: 4,
  startingLife: 20,
  players: [],
};

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export const GameStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setPlayerCount(count: number) {
      const clamped = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(count)));
      patchState(store, { playerCount: clamped });
    },
    setStartingLife(life: number) {
      patchState(store, { startingLife: Math.max(1, Math.round(life)) });
    },
    startGame() {
      const players = Array.from({ length: store.playerCount() }, (_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        life: store.startingLife(),
      }));
      patchState(store, { players });
    },
  })),
);
