// src/app/features/game/game-options-dialog/game-options-dialog.ts
import { Component, computed, inject, output, signal } from '@angular/core';
import { GameStore } from '@state/game.store';

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
      <p class="mt-1 text-sm text-neutral-400">Check the winners, then finish the game.</p>

      <ul class="mt-4 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        @for (p of players(); track p.seat) {
          <li>
            <label
              class="relative flex min-h-16 cursor-pointer items-center gap-3 overflow-hidden rounded-xl bg-neutral-800 px-3"
              [class.opacity-60]="p.eliminated && !p.winner"
            >
              @if (p.url) {
                <img
                  class="absolute inset-0 h-full w-full object-cover object-top opacity-40"
                  [src]="p.url"
                  alt=""
                  aria-hidden="true"
                />
              }
              <input
                type="checkbox"
                class="relative size-6 shrink-0 accent-amber-400"
                [checked]="p.winner"
                (change)="toggle(p.seat)"
              />
              <span
                class="relative flex-1 truncate text-lg font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
              >
                {{ p.name }}
              </span>
              @if (p.winner) {
                <span class="relative text-sm font-semibold text-amber-300">Winner</span>
              } @else if (p.eliminated) {
                <span class="relative text-sm text-neutral-400">Eliminated</span>
              }
            </label>
          </li>
        }
      </ul>

      <div class="mt-4 flex flex-col gap-2">
        <button
          type="button"
          class="min-h-14 w-full touch-manipulation rounded-full bg-white text-lg font-semibold text-black transition active:bg-neutral-200 [-webkit-tap-highlight-color:transparent]"
          (click)="finish.emit(winnerSeats())"
        >
          {{ winnerSeats().length ? 'Finish game' : 'Finish without a winner' }}
        </button>

        <div class="flex gap-2">
          <button
            type="button"
            class="min-h-14 flex-1 touch-manipulation rounded-full border-2 border-red-400/70 bg-red-950/80 text-lg font-semibold text-red-100 transition active:bg-red-900 [-webkit-tap-highlight-color:transparent]"
            (click)="stop.emit()"
          >
            Stop game
          </button>
          <button
            type="button"
            class="min-h-14 flex-1 touch-manipulation rounded-full border-2 border-neutral-500 bg-neutral-800 text-lg font-semibold text-white transition active:bg-neutral-700 [-webkit-tap-highlight-color:transparent]"
            (click)="closed.emit()"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  `,
})
export class GameOptionsDialog {
  private game = inject(GameStore);

  finish = output<number[]>();
  stop = output<void>();
  closed = output<void>();

  /** Preselect the winner when exactly one player is left standing. */
  private winners = signal<ReadonlySet<number>>(this.initialWinners());

  players = computed(() =>
    this.game.players().map((p, seat) => ({
      seat,
      name: p.name,
      url: p.deck?.commander.url ?? null,
      eliminated: p.status === 'eliminated',
      winner: this.winners().has(seat),
    })),
  );

  winnerSeats = computed(() => this.players().filter((p) => p.winner).map((p) => p.seat));

  toggle(seat: number) {
    this.winners.update((s) => {
      const next = new Set(s);
      if (!next.delete(seat)) next.add(seat);
      return next;
    });
  }

  private initialWinners(): ReadonlySet<number> {
    const alive = this.game
      .players()
      .flatMap((p, seat) => (p.status !== 'eliminated' ? [seat] : []));
    return new Set(alive.length === 1 ? alive : []);
  }
}
