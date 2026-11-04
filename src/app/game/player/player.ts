// src/app/features/game/player/player.ts
import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@state/game.store';
import { ActionSelector, ActionSubmission } from './action-selector/action-selector';
import { LifeTotal } from './life-total/life-total';

@Component({
  selector: 'app-player',
  host: { class: 'relative block h-full w-full overflow-hidden bg-neutral-800 text-white' },
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

    <div class="relative z-10 flex h-full flex-col items-center justify-center">
      @if (playersTurn() === null) {
        <div (click)="setTurn()"> ME FIRST!! </div>
      } @else {
        @if (actionSelect()?.targetSeat === seat()) {
          <app-action-selector (apply)="applyAction($event)" (cancel)="cancelAction()" />
        } @else {
          @if (playersTurn() === seat()) {
            MY TURN | <div (click)="passTurn()">PASS TURN</div>
          }
          <app-life-total [seat]="seat()" />

        }
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

  applyAction(action: ActionSubmission) {
    this.gameStore.applyAction(action);
  }

  cancelAction() {
    this.gameStore.clearActionSelect();
  }

  setTurn() {
    this.gameStore.setTurn(this.seat());
  }

  passTurn() {
    this.gameStore.passTurn();
  }
}
