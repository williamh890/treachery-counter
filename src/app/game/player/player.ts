// src/app/features/game/player/player.ts
import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@state/game.store';
import { ActionSelector, ActionSubmission } from './action-selector/action-selector';
import { LifeTotal } from './life-total/life-total';
import { Elimination } from './elimination/elimination';

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
        @if (player(); as p) {
          @if (p.status !== 'eliminated') {
            <app-life-total [seat]="seat()" (eliminate)="eliminatePlayer()" />
          } @else {
            <app-elimination [name]="p.name" (revive)="protectPlayer()"/>
          }
        }
      }
    </div>
  `,
  imports: [ActionSelector, LifeTotal, Elimination],
})
export class Player {
  private gameStore = inject(GameStore);

  seat = input.required<number>();

  commanderUrl = computed(() => this.gameStore.playerAt(this.seat())?.deck?.commander.url ?? null);
  actionSelect = computed(() => this.gameStore.actionSelect());
  playersTurn = computed(() => this.gameStore.turnSeat());
  player = computed(() => this.gameStore.playerAt(this.seat()));
  playerName = computed(() => this.player()?.name);

  setTurn() {
    this.gameStore.setTurn(this.seat());
  }

  applyAction(action: ActionSubmission) {
    this.gameStore.applyAction(action);
  }

  cancelAction() {
    this.gameStore.clearActionSelect();
  }

  protectPlayer() {
    this.gameStore.protectPlayer(this.seat());
  }

  eliminatePlayer() {
    this.gameStore.eliminatePlayer(this.seat());
  }
}
