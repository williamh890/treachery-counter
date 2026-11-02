// src/app/features/game/player/player.ts
import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@state/game.store';
import { ActionSelector, ActionSubmission } from "./action-selector/action-selector";

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
      @if (actionSelect()?.targetSeat === seat()) {
        <app-action-selector (apply)="applyAction($event)" (cancel)="cancelAction()"/>
      } @else {
        <span class="text-sm opacity-80 [text-shadow:0_1px_3px_rgb(0_0_0/0.8)]">
          {{ player()?.name }}
        </span>
        <span
          class="font-bold leading-none tabular-nums text-[35cqmin] [text-shadow:0_2px_8px_rgb(0_0_0/0.7)]"
        >
          {{ player()?.life }}
        </span>
      }
    </div>
  `,
  imports: [ActionSelector],
})
export class Player {
  private gameStore = inject(GameStore);

  seat = input.required<number>();

  player = computed(() => this.gameStore.playerAt(this.seat()));
  commanderUrl = computed(() => this.player()?.deck?.commander.url ?? null);
  actionSelect = computed(() => this.gameStore.actionSelect());

  applyAction(action: ActionSubmission) {
    this.gameStore.applyAction(action);
  }

  cancelAction() {
    this.gameStore.clearActionSelect();
  }
}
