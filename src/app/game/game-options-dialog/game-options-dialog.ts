// src/app/features/game/game-options-dialog/game-options-dialog.ts
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-game-options-dialog',
  host: {
    class: 'fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Game options',
  },
  template: `
    <div class="w-full max-w-sm rounded-2xl bg-neutral-900 p-4 text-white shadow-2xl">
      <h2 class="text-xl font-bold">Game options</h2>

      <div class="mt-4 flex flex-col gap-2">
        <button
          type="button"
          class="min-h-14 w-full touch-manipulation rounded-full bg-white text-lg font-semibold text-black transition active:bg-neutral-200 [-webkit-tap-highlight-color:transparent]"
          (click)="finish.emit()"
        >
          Finish game
        </button>
        <button
          type="button"
          class="min-h-14 w-full touch-manipulation rounded-full border-2 border-amber-400/70 bg-amber-950/60 text-lg font-semibold text-amber-100 transition active:bg-amber-900 [-webkit-tap-highlight-color:transparent]"
          (click)="restart.emit()"
        >
          Restart
        </button>
        <button
          type="button"
          class="min-h-14 w-full touch-manipulation rounded-full border-2 border-neutral-500 bg-neutral-800 text-lg font-semibold text-white transition active:bg-neutral-700 [-webkit-tap-highlight-color:transparent]"
          (click)="closed.emit()"
        >
          Close
        </button>
      </div>
    </div>
  `,
})
export class GameOptionsDialog {
  finish = output<void>();
  restart = output<void>();
  closed = output<void>();
}
