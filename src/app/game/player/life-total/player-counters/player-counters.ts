// src/app/features/game/player/life-total/player-counters/player-counters.ts
import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '@state/game.store';
import { OptionIcon } from '../../action-selector/action-options/option-icon';

const INFECT_LETHAL = 10;
const COMMANDER_LETHAL = 21;

@Component({
  selector: 'app-player-counters',
  host: { class: 'flex flex-wrap items-start justify-start gap-[1.5cqmin]' },
  imports: [OptionIcon],
  template: `
    @if (infect() > 0) {
      <span
        class="flex h-[11cqmin] min-w-[14cqmin] items-center justify-center gap-[1cqmin] overflow-hidden rounded-md px-[2cqmin] text-[7cqmin] font-bold tabular-nums text-white transition-colors [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
        [class]="
          infectLethal()
            ? 'bg-emerald-700/90 ring-2 ring-emerald-400'
            : 'bg-neutral-900/70 ring-1 ring-white/15'
        "
        role="img"
        [attr.aria-label]="infect() + ' poison counters'"
      >
        <span class="size-[1.2em] shrink-0" aria-hidden="true">
          <app-option-icon name="Infect" [thin]="true" />
        </span>
        {{ infect() }}
      </span>
    }

    @for (hit of commanderHits(); track hit.seat) {
      <span
        class="relative flex h-[11cqmin] min-w-[14cqmin] items-center justify-center overflow-hidden rounded-md bg-neutral-700 px-[2cqmin] text-[7cqmin] font-bold tabular-nums"
        [class.ring-2]="hit.lethal"
        [class.ring-red-500]="hit.lethal"
        role="img"
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
  `,
})
export class PlayerCounters {
  private gameStore = inject(GameStore);

  seat = input.required<number>();

  private player = computed(() => this.gameStore.playerAt(this.seat()));

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
