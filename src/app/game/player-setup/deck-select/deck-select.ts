import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Deck } from '@models/deck';
import { ScryfallService } from '@services/scryfall';
import { firstValueFrom } from 'rxjs';

const TILE_BUTTON =
  'flex w-full cursor-pointer flex-col items-center gap-0.5 rounded p-0.5 transition hover:bg-black/5 dark:hover:bg-white/10';
const TILE_LABEL = 'line-clamp-2 w-full text-center text-[0.65rem] leading-tight';

@Component({
  imports: [MatIconModule, MatProgressSpinnerModule, NgTemplateOutlet],
  selector: 'app-deck-select',
  host: { class: 'flex min-h-0 w-full flex-1 flex-col gap-2' },
  template: `
    <ng-template #actionTile let-icon="icon" let-label="label" let-action="action">
      <li class="w-20">
        <button type="button" [class]="tileButton" (click)="action()">
          <div
            class="flex aspect-[7/5] w-full items-center justify-center rounded-sm border border-solid border-neutral-500 bg-black/10 drop-shadow-sm dark:border-neutral-400 dark:bg-white/15"
          >
            @if (icon === 'shuffle' && loading()) {
              <mat-spinner diameter="24" />
            } @else {
              <mat-icon>{{ icon }}</mat-icon>
            }
          </div>
          <span [class]="tileLabel">{{ label }}</span>
        </button>
      </li>
    </ng-template>

    <!-- Deck grid -->
    <ul
      class="flex min-h-0 w-full flex-1 flex-wrap content-start justify-center gap-1 overflow-y-auto overflow-x-hidden"
    >
      @for (deck of sortedDecks(); track deck.id) {
        <li class="w-20">
          <button type="button" [class]="tileButton" (click)="select.emit(deck)">
            <img
              class="aspect-[7/5] w-full rounded-sm object-cover object-top shadow"
              loading="lazy"
              [src]="deck.commander.url"
              [alt]="deck.commander.name"
            />
            <span [class]="tileLabel">{{ deck.name }}</span>
          </button>
        </li>
      }
    </ul>

    <!-- Actions row: stays put while decks scroll -->
    <ul class="flex w-full shrink-0 flex-wrap justify-center gap-1">
      @for (action of actions(); track action.icon) {
        <ng-container [ngTemplateOutlet]="actionTile" [ngTemplateOutletContext]="action" />
      }
    </ul>
  `,
})
export class DeckSelect {
  private scryfall = inject(ScryfallService);

  decks = input<Deck[]>();
  isGuest = input.required<boolean>();

  select = output<Deck>();
  add = output<void>();
  skip = output<void>();

  readonly tileButton = TILE_BUTTON;
  readonly tileLabel = TILE_LABEL;

  loading = signal(false);

  sortedDecks = computed(() =>
    [...(this.decks() ?? [])].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base', numeric: true }),
    ),
  );

  /** Trailing tiles after the deck list. */
  actions = computed(() => {
    const guest = this.isGuest();
    return [
      {
        icon: 'shuffle',
        label: guest ? 'Random Commander' : 'Shuffle',
        action: () => (guest ? this.rng() : this.shuffle()),
      },
      {
        icon: 'add',
        label: guest ? 'Select Commander' : 'Add deck',
        action: () => this.add.emit(),
      },
      { icon: 'close', label: 'Skip', action: () => this.skip.emit() },
    ];
  });

  shuffle() {
    const decks = this.decks();
    if (!decks?.length) return;

    this.select.emit(decks[Math.floor(Math.random() * decks.length)]);
  }

  async rng() {
    this.loading.set(true);
    try {
      const commander = await firstValueFrom(this.scryfall.randomCommander());
      if (!commander) return;

      this.select.emit({ id: `rng-${commander.name}`, name: commander.name, commander });
    } finally {
      this.loading.set(false);
    }
  }
}
