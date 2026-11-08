// src/app/features/game/player/life-total/life-total.ts
import { Component, computed, inject, input, output } from '@angular/core';
import { GameStore } from '@state/game.store';
import { PlayerCounters } from './player-counters/player-counters';
import { ProtectButton } from './protect-button/protect-button';
import { TurnControls } from './turn-controls/turn-controls';

@Component({
  selector: 'app-life-total',
  host: { class: 'relative flex h-full w-full flex-col items-center justify-center gap-[2cqmin]' },
  imports: [PlayerCounters, ProtectButton, TurnControls],
  template: `
    @if (player()?.status === 'protected') {
      <button
        type="button"
        class="absolute right-[3cqmin] top-[3cqmin] flex h-9 touch-manipulation items-center gap-1.5 rounded-full border border-red-400/70 bg-red-950/80 px-3.5 text-sm font-semibold text-red-100 shadow-md backdrop-blur-sm transition active:scale-95 active:bg-red-900 [-webkit-tap-highlight-color:transparent]"
        (click)="eliminate.emit()"
      >
        <span aria-hidden="true">☠</span>
        Eliminate
      </button>
    }

    <span class="text-sm opacity-80 [text-shadow:0_1px_3px_rgb(0_0_0/0.8)]">
      {{ player()?.name }}
    </span>

    <div class="relative">
      <span
        class="block font-bold leading-none tabular-nums text-[35cqmin] transition-colors duration-150 [text-shadow:0_2px_8px_rgb(0_0_0/0.7)]"
        [class]="lifeTint()"
      >
        {{ player()?.life }}
      </span>

      @if (isTargeted() || isProtected()) {
        <app-protect-button
          class="absolute left-full top-1/2 ml-[3cqmin] -translate-y-1/2"
          [active]="isProtected()"
          (pressed)="toggleProtect()"
        />
      }
    </div>

    <app-player-counters
      class="absolute left-[3cqmin] top-[3cqmin] max-w-[calc(100%-6cqmin)]"
      [seat]="seat()"
    />

    @if (isMyTurn()) {
      <app-turn-controls />
    }
  `,
})
export class LifeTotal {
  private gameStore = inject(GameStore);

  seat = input.required<number>();
  eliminate = output<void>();

  player = computed(() => this.gameStore.playerAt(this.seat()));
  isMyTurn = computed(() => this.gameStore.turnSeat() === this.seat());
  actionSelect = computed(() => this.gameStore.actionSelect());
  isTargeted = computed(() => {
    const opts = this.gameStore.actionOptions();
    return opts && opts.target !== 'Player' && this.gameStore.targetSeats().includes(this.seat());
  });
  isProtected = computed(() => this.actionSelect()?.protectSeats.includes(this.seat()) ?? false);

  delta = computed(() => this.gameStore.previewDeltas()[this.seat()] ?? null);
  lifeDelta = computed(() => this.delta()?.life ?? 0);

  /** Soft tint while an action is previewed: red for damage, green for life gain. */
  lifeTint = computed(() => {
    const d = this.lifeDelta();
    if (d < 0) return 'text-red-300';
    if (d > 0) return 'text-emerald-300';
    return '';
  });

  /** "+5" / "-5" */
  protected signed(n: number): string {
    return n > 0 ? `+${n}` : `${n}`;
  }

  toggleProtect() {
    this.gameStore.toggleProtectFromAction(this.seat());
  }
}
