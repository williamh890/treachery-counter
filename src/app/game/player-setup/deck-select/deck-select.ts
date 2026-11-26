import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Deck } from '@models/deck';
import { ScryfallService } from '@services/scryfall';
import { firstValueFrom } from 'rxjs';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  imports: [MatIconModule, MatProgressSpinnerModule],
  selector: 'app-deck-select',
  template: `
    <ul
      class="flex min-h-0 w-full flex-1 flex-wrap content-start justify-center gap-1 overflow-y-auto overflow-x-hidden"
    >
      @for (deck of sortedDecks(); track deck.id) {
        <li class="w-20">
          <button
            type="button"
            class="flex w-full cursor-pointer flex-col items-center gap-0.5 rounded p-0.5 transition hover:bg-black/5 dark:hover:bg-white/10"
            (click)="select.emit(deck)"
          >
            <img
              class="aspect-[7/5] w-full rounded-sm object-cover object-top shadow"
              loading="lazy"
              [src]="deck.commander.url"
              [alt]="deck.commander.name"
            />
            <span class="line-clamp-2 w-full text-center text-[0.65rem] leading-tight">
              {{ deck.name }}
            </span>
          </button>
        </li>
      }

      <li class="w-20">
        <button
          type="button"
          class="flex w-full cursor-pointer flex-col items-center gap-0.5 rounded p-0.5 transition hover:bg-black/5 dark:hover:bg-white/10"
          (click)="add.emit()"
        >
          <div
            class="flex aspect-[7/5] w-full items-center justify-center rounded-sm border border-solid border-neutral-500 bg-black/10 drop-shadow-sm dark:border-neutral-400 dark:bg-white/15"
          >
            <mat-icon>add</mat-icon>
          </div>
          <span class="line-clamp-2 w-full text-center text-[0.65rem] leading-tight">
            {{ isGuest() ? 'Select Commander' : 'Add deck' }}
          </span>
        </button>
      </li>

      <li class="w-20">
        <button
          type="button"
          class="flex w-full cursor-pointer flex-col items-center gap-0.5 rounded p-0.5 transition hover:bg-black/5 dark:hover:bg-white/10"
          (click)="isGuest() ? rng() : shuffle()"
        >
          <div
            class="flex aspect-[7/5] w-full items-center justify-center rounded-sm border border-solid border-neutral-500 bg-black/10 drop-shadow-sm dark:border-neutral-400 dark:bg-white/15"
          >
            @if (!loading) {
              <mat-icon>shuffle</mat-icon>
            } @else {
              <mat-spinner diameter="24" />
            }
          </div>
          <span class="line-clamp-2 w-full text-center text-[0.65rem] leading-tight">
            Shuffle
          </span>
        </button>
      </li>
    </ul>
  `,
  styles: ``,
})
export class DeckSelect {
  scryfall = inject(ScryfallService);
  decks = input<Deck[]>();
  isGuest = input.required<boolean>();
  loading = false;

  sortedDecks = computed(() =>
    this.decks()?.sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base', numeric: true }),
    ),
  );

  select = output<Deck>();
  add = output<void>();

  shuffle() {
    const decks = this.decks();
    if (!decks) return;

    const rngDeck = decks[Math.floor(Math.random() * decks.length)];
    this.select.emit(rngDeck);
  }

  async rng() {
    this.loading = true;
    const commander = await firstValueFrom(this.scryfall.randomCommander());
    this.loading = false;

    if (!commander) return;

    const deck: Deck = {
      id: `rng-${commander.name}`,
      name: commander.name,
      commander,
    };

    this.select.emit(deck);
  }
}
