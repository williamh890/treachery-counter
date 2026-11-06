// src/app/features/game/player/life-total/turn-controls/turn-controls.ts
import { Component, inject } from '@angular/core';
import { GameStore } from '@state/game.store';

@Component({
  selector: 'app-turn-controls',
  // Covers the tile but lets taps through; only the button strip takes them
  host: { class: 'pointer-events-none absolute inset-0' },
  template: `
    <!-- Active player highlight -->
    <div class="absolute inset-0 border-4 border-indigo-400/80" aria-hidden="true"></div>

    <!-- Undo + pass turn + options: full width across the bottom -->
    <div class="pointer-events-auto absolute inset-x-0 bottom-0 flex gap-2 p-2">
      <button
        type="button"
        class="flex min-h-14 touch-manipulation items-center justify-center gap-1.5 rounded-full border-2 border-neutral-500 bg-neutral-800 px-5 text-lg font-semibold text-white transition active:bg-neutral-700 disabled:opacity-30 disabled:active:bg-neutral-800 [-webkit-tap-highlight-color:transparent]"
        aria-label="Undo last action"
        [disabled]="!canUndo()"
        (click)="undo()"
      >
        <span aria-hidden="true">↶</span>
      </button>
      <button
        type="button"
        class="min-h-14 flex-1 touch-manipulation rounded-full border-2 border-indigo-300 bg-indigo-500 text-lg font-semibold text-white transition active:bg-indigo-400 [-webkit-tap-highlight-color:transparent]"
        (click)="passTurn()"
      >
        Pass
      </button>
      <button
        type="button"
        class="flex min-h-14 touch-manipulation items-center justify-center rounded-full border-2 border-neutral-500 bg-neutral-800 px-5 text-lg font-semibold text-white transition active:bg-neutral-700 [-webkit-tap-highlight-color:transparent]"
        aria-label="Game options"
        (click)="openOptions()"
      >
        <span aria-hidden="true">⋯</span>
      </button>
    </div>
  `,
})
export class TurnControls {
  private gameStore = inject(GameStore);

  canUndo = this.gameStore.canUndo;

  undo() {
    this.gameStore.undo();
  }

  passTurn() {
    this.gameStore.passTurn();
  }

  openOptions() {
    this.gameStore.openOptions();
  }
}
