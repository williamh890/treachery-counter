// src/app/features/game/dead-players-dialog/dead-players-dialog.ts
import { Component, computed, inject, output, signal } from '@angular/core';
import { GameStore, DeathDecision } from '@state/game.store';

@Component({
  selector: 'app-dead-players-dialog',
  host: {
    class: 'fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Players at lethal',
    // The grid listens for pointer events on its host; keep taps here out of its drag logic
    '(pointerdown)': '$event.stopPropagation()',
    '(pointermove)': '$event.stopPropagation()',
    '(pointerup)': '$event.stopPropagation()',
    '(pointercancel)': '$event.stopPropagation()',
  },
  template: `
    <div class="w-full max-w-sm rounded-2xl bg-neutral-900 p-4 text-white shadow-2xl">
      <h2 class="text-xl font-bold">Someone died bro!</h2>

      <ul class="mt-4 flex flex-col gap-2">
        @for (d of dead(); track d.seat) {
          <li>
            <label
              class="relative flex min-h-16 cursor-pointer items-center gap-3 overflow-hidden rounded-xl bg-neutral-800 px-3"
            >
              @if (d.url) {
                <img
                  class="absolute inset-0 h-full w-full object-cover object-top opacity-40"
                  [src]="d.url"
                  alt=""
                  aria-hidden="true"
                />
              }
              <input
                type="checkbox"
                class="relative size-6 shrink-0 accent-red-500"
                [checked]="d.kill"
                (change)="toggle(d.seat)"
              />
              <span
                class="relative flex-1 truncate text-lg font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
              >
                {{ d.name }}
              </span>
              <span
                class="relative text-sm font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
                [class]="d.kill ? 'text-red-400' : 'text-emerald-400'"
              >
                {{ d.kill ? 'Eliminate' : 'Keep alive' }}
              </span>
            </label>
          </li>
        }
      </ul>

      <button
        type="button"
        class="mt-4 min-h-14 w-full touch-manipulation rounded-full bg-white text-lg font-semibold text-black transition active:bg-neutral-200 [-webkit-tap-highlight-color:transparent]"
        (click)="submit()"
      >
        Confirm
      </button>
    </div>
  `,
})
export class DeadPlayersDialog {
  private game = inject(GameStore);

  resolved = output<DeathDecision>();

  /** Seats the user has unchecked. Everyone defaults to checked, including newly dead players. */
  private unchecked = signal<ReadonlySet<number>>(new Set());

  dead = computed(() =>
    this.game.players().flatMap((p, seat) =>
      p.status === 'dead'
        ? [
            {
              seat,
              name: p.name,
              url: p.deck?.commander.url ?? null,
              kill: !this.unchecked().has(seat),
            },
          ]
        : [],
    ),
  );

  toggle(seat: number) {
    this.unchecked.update((s) => {
      const next = new Set(s);
      if (!next.delete(seat)) next.add(seat);
      return next;
    });
  }

  submit() {
    const dead = this.dead();
    this.resolved.emit({
      kill: dead.filter((d) => d.kill).map((d) => d.seat),
      protect: dead.filter((d) => !d.kill).map((d) => d.seat),
    });
  }
}
