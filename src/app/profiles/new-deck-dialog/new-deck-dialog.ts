// features/decks/new-deck-dialog/new-deck-dialog.ts
import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Commander, NewDeck } from '../../models/deck';
import { CommanderPicker } from './commander-picker';

export interface NewDeckDialogData {
  /** Guest/temp deck: no deck name field, the commander's name is used. */
  temp?: boolean;
}

@Component({
  selector: 'app-new-deck-dialog',
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    CommanderPicker,
  ],
  template: `
    <h2 mat-dialog-title>{{ temp ? 'Select commander' : 'New deck' }}</h2>

    <mat-dialog-content>
      <div class="flex flex-col pt-2">
        @if (!temp) {
          <mat-form-field class="w-full">
            <mat-label>Deck name</mat-label>
            <input matInput [(ngModel)]="name" autocomplete="off" />
          </mat-form-field>
        }

        <app-commander-picker label="Commander" [(value)]="commander" />
        <app-commander-picker label="Partner (optional)" [(value)]="partner" />
        <app-commander-picker label="Companion (optional)" [(value)]="companion" />
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!canSave()" (click)="save()">
        {{ temp ? 'Select' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class NewDeckDialog {
  private ref = inject<MatDialogRef<NewDeckDialog, NewDeck>>(MatDialogRef);

  protected name = signal('');
  protected commander = signal<Commander | null>(null);
  protected partner = signal<Commander | null>(null);
  protected companion = signal<Commander | null>(null);

  protected temp =
    inject<NewDeckDialogData | null>(MAT_DIALOG_DATA, { optional: true })?.temp ?? false;

  protected canSave = computed(
    () => this.commander() !== null && (this.temp || this.name().trim() !== ''),
  );

  protected save() {
    const commander = this.commander();
    if (!this.canSave() || !commander) return;

    const partner = this.partner();
    const companion = this.companion();

    this.ref.close({
      name: this.temp ? commander.name : this.name().trim(),
      commander,
      ...(partner ? { partner } : {}),
      ...(companion ? { companion } : {}),
    });
  }
}
