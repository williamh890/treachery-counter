// features/decks/commander-picker/commander-picker.ts
import { Component, inject, model, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs';
import { Commander } from '../../models/deck';
import { ScryfallService } from '../../services/scryfall';

@Component({
  selector: 'app-commander-picker',
  imports: [
    ReactiveFormsModule, MatFormField, MatLabel, MatSuffix, MatInput,
    MatAutocomplete, MatAutocompleteTrigger, MatOption, MatIconButton, MatIcon,
  ],
  host: { class: 'block' },
  template: `
    <mat-form-field class="w-full">
      <mat-label>{{ label() }}</mat-label>
      <input matInput [formControl]="query" [matAutocomplete]="auto" autocomplete="off" />

      @if (value()) {
        <button matSuffix mat-icon-button type="button" aria-label="Clear" (click)="clear()">
          <mat-icon>close</mat-icon>
        </button>
      }

      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="display"
        (optionSelected)="value.set($event.option.value)"
      >
        @for (c of results(); track c.name) {
          <mat-option [value]="c">
            <span class="flex items-center gap-3">
              @if (c.url) {
                <img [src]="c.url" alt="" class="size-8 shrink-0 rounded object-cover" />
              }
              <span class="truncate">{{ c.name }}</span>
            </span>
          </mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class CommanderPicker {
  private scryfall = inject(ScryfallService);

  label = input('Commander');
  value = model<Commander | null>(null);

  protected query = new FormControl<string | Commander>('', { nonNullable: true });

  protected results = toSignal(
    this.query.valueChanges.pipe(
      // Typing after a selection invalidates it
      tap((v) => { if (typeof v === 'string') this.value.set(null); }),
      map((v) => (typeof v === 'string' ? v : '')),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => this.scryfall.searchCommanders(q)),
    ),
    { initialValue: [] as Commander[] },
  );

  protected display = (c: Commander | string | null) =>
    typeof c === 'string' ? c : (c?.name ?? '');

  protected clear() {
    this.query.setValue('');
    this.value.set(null);
  }
}
