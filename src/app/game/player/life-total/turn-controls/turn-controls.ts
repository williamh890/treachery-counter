import { Component, computed, inject } from '@angular/core';
import { GameStore } from '@state/game.store';
import { UndoButton } from './undo-button/undo-button';

@Component({
  selector: 'app-turn-controls',
  imports: [UndoButton],
  host: { class: 'pointer-events-none absolute inset-0' },
  template: `
    @if (showTurnBorder()) {
      <div class="absolute inset-0 border-4 border-indigo-400/80" aria-hidden="true"></div>
    }

    <div class="pointer-events-auto absolute inset-x-0 bottom-0 flex items-center gap-2 p-2">
      <app-undo-button [disabled]="!canUndo()" (undo)="undo()" (undoTurn)="undoTurn()" />
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

  showTurnBorder = computed(() => this.gameStore.actionSelect() === null);
  canUndo = this.gameStore.canUndo;

  undo() {
    this.gameStore.undo();
  }
  undoTurn() {
    this.gameStore.undoTurn();
  }
  passTurn() {
    this.gameStore.passTurn();
  }
  openOptions() {
    this.gameStore.openOptions();
  }
}
