// features/profiles/deck-card/deck-card.ts
import { Component, computed, input, output } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Deck } from '../../models/deck';

@Component({
  selector: 'app-deck-card',
  imports: [MatCard, MatIconButton, MatIcon],
  host: { class: 'block' },
  template: `
    <mat-card appearance="outlined" class="h-full">
      <div class="relative aspect-[4/3] overflow-hidden rounded-t-[inherit]">
        <div class="grid h-full" [class.grid-cols-2]="deck().partner">
          <img
            [src]="deck().commander.url"
            [alt]="deck().commander.name"
            class="h-full w-full min-h-0 object-cover"
          />
          @if (deck().partner; as partner) {
            <img
              [src]="partner.url"
              [alt]="partner.name"
              class="h-full w-full min-h-0 object-cover"
            />
          }
        </div>

        @if (deck().companion; as companion) {
          <img
            [src]="companion.url"
            [alt]="companion.name"
            class="absolute bottom-2 right-2 h-14 aspect-[4/3] rounded border-2 border-white object-cover shadow-md"
          />
        }
      </div>

      <div class="flex items-start gap-2 p-4">
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-base font-medium">{{ deck().name }}</h2>
          <p class="truncate text-sm opacity-70">{{ commanders() }}</p>
        </div>
        <button mat-icon-button [attr.aria-label]="'Delete ' + deck().name" (click)="remove.emit()">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    </mat-card>
  `,
})
export class DeckCard {
  deck = input.required<Deck>();
  remove = output<void>();

  protected commanders = computed(() => {
    const { commander, partner } = this.deck();
    return partner ? `${commander.name} & ${partner.name}` : commander.name;
  });
}
