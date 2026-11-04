// src/app/features/game/player/player.ts
import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@state/game.store';
import { ActionSelector, ActionSubmission } from './action-selector/action-selector';
import { LifeTotal } from './life-total/life-total';

@Component({
  selector: 'app-player',
  host: { class: 'relative block h-full w-full overflow-hidden bg-neutral-800 text-white' },
  // src/app/features/game/player/player.ts
  template: `
    @if (commanderUrl(); as url) {
      <img
        class="absolute inset-0 h-full w-full object-cover object-top"
        [src]="url"
        alt=""
        aria-hidden="true"
      />
    }

    <!-- Tint for contrast -->
    <div class="absolute inset-0 bg-black/55"></div>

    <div class="relative z-10 h-full">
      @if (playersTurn() === null) {
        <!-- No one has the turn yet: this player can claim it -->
        <div
          class="flex h-full w-full flex-col items-center justify-center gap-[4cqmin] px-[8cqmin]"
        >
          <button
            type="button"
            class="min-h-20 w-full touch-manipulation rounded-2xl border-2 border-indigo-300 bg-indigo-500 text-3xl font-bold text-white shadow-xl transition active:scale-95 active:bg-indigo-400 [-webkit-tap-highlight-color:transparent]"
            (click)="setTurn()"
          >
            Go first
          </button>
        </div>
      } @else if (actionSelect()?.targetSeat === seat()) {
        <app-action-selector (apply)="applyAction($event)" (cancel)="cancelAction()" />
      } @else {
        <app-life-total [seat]="seat()" />
      }
    </div>
  `,
  imports: [ActionSelector, LifeTotal],
})
export class Player {
  private gameStore = inject(GameStore);

  seat = input.required<number>();

  commanderUrl = computed(() => this.gameStore.playerAt(this.seat())?.deck?.commander.url ?? null);
  actionSelect = computed(() => this.gameStore.actionSelect());
  playersTurn = computed(() => this.gameStore.turnSeat());
  playerName = computed(() => this.gameStore.playerAt(this.seat())?.name);

  setTurn() {
    this.gameStore.setTurn(this.seat());
  }

  applyAction(action: ActionSubmission) {
    this.gameStore.applyAction(action);
  }

  cancelAction() {
    this.gameStore.clearActionSelect();
  }
}
