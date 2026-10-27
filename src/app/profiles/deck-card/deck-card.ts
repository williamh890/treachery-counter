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
      <div class="grid overflow-hidden rounded-t-[inherit]" [class.grid-cols-2]="deck().partner">
        <img [src]="deck().commander.url" [alt]="deck().commander.name"
             class="aspect-[4/3] w-full object-cover" />
        @if (deck().partner; as partner) {
          <img [src]="partner.url" [alt]="partner.name"
               class="aspect-[4/3] w-full object-cover" />
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
