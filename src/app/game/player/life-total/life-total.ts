// src/app/features/game/player/life-total/life-total.ts
import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@state/game.store';

const INFECT_LETHAL = 10;
const COMMANDER_LETHAL = 21;

@Component({
  selector: 'app-life-total',
  host: { class: 'flex max-w-full flex-col items-center gap-[2cqmin]' },
  template: `
    <span class="text-sm opacity-80 [text-shadow:0_1px_3px_rgb(0_0_0/0.8)]">
      {{ player()?.name }}
    </span>
    <span
      class="font-bold leading-none tabular-nums text-[35cqmin] [text-shadow:0_2px_8px_rgb(0_0_0/0.7)]"
    >
      {{ player()?.life }}
    </span>

    @if (infect() > 0 || commanderHits().length) {
      <div
        class="absolute inset-x-[3cqmin] bottom-[3cqmin] flex flex-wrap items-end justify-start gap-[1.5cqmin]"
      >
        @if (infect() > 0) {
          <span
            class="flex h-[11cqmin] min-w-[14cqmin] items-center justify-center gap-[1cqmin] overflow-hidden rounded-md px-[2cqmin] text-[7cqmin] font-bold tabular-nums [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
            [class]="infectLethal() ? 'bg-red-700 ring-2 ring-red-500' : 'bg-emerald-800'"
            [attr.aria-label]="infect() + ' poison counters'"
          >
            <span aria-hidden="true">☣</span>
            {{ infect() }}
          </span>
        }

        @for (hit of commanderHits(); track hit.seat) {
          <span
            class="relative flex h-[11cqmin] min-w-[14cqmin] items-center justify-center overflow-hidden rounded-md bg-neutral-700 px-[2cqmin] text-[7cqmin] font-bold tabular-nums"
            [class.ring-2]="hit.lethal"
            [class.ring-red-500]="hit.lethal"
            [attr.aria-label]="hit.dmg + ' commander damage from ' + hit.name"
          >
            @if (hit.url) {
              <img
                class="absolute inset-0 h-full w-full object-cover object-top"
                [src]="hit.url"
                alt=""
                aria-hidden="true"
              />
            }
            <!-- Tint for contrast; red when lethal -->
            <span
              class="absolute inset-0"
              [class]="hit.lethal ? 'bg-red-700/60' : 'bg-black/50'"
            ></span>
            <span class="relative [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">{{ hit.dmg }}</span>
          </span>
        }
      </div>
    }
  `,
})
export class LifeTotal {
  private gameStore = inject(GameStore);

  seat = input.required<number>();

  player = computed(() => this.gameStore.playerAt(this.seat()));

  infect = computed(() => this.player()?.infect ?? 0);
  infectLethal = computed(() => this.infect() >= INFECT_LETHAL);

  /** One entry per opposing seat that has dealt commander damage to this player. */
  commanderHits = computed(() =>
    Object.entries(this.player()?.commanderDmg ?? {})
      .map(([key, dmg]) => {
        const seat = Number(key);
        const source = this.gameStore.playerAt(seat);
        return {
          seat,
          dmg,
          name: source?.name ?? `Seat ${seat + 1}`,
          url: source?.deck?.commander.url ?? null,
          lethal: dmg >= COMMANDER_LETHAL,
        };
      })
      .filter((hit) => hit.dmg > 0),
  );
}
