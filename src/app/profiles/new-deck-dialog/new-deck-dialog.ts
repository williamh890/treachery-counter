// features/decks/new-deck-dialog/new-deck-dialog.ts
import { Component, computed, inject, signal } from '@angular/core';
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
    <h2 mat-dialog-title>New deck</h2>

    <mat-dialog-content>
      <div class="flex flex-col pt-2">
        <mat-form-field class="w-full">
          <mat-label>Deck name</mat-label>
          <input matInput [(ngModel)]="name" autocomplete="off" />
        </mat-form-field>

        <app-commander-picker label="Commander" [(value)]="commander" />
        <app-commander-picker label="Partner (optional)" [(value)]="partner" />
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!canSave()" (click)="save()">Create</button>
    </mat-dialog-actions>
  `,
})
export class NewDeckDialog {
  private ref = inject<MatDialogRef<NewDeckDialog, NewDeck>>(MatDialogRef);

  protected name = signal('');
  protected commander = signal<Commander | null>(null);
  protected partner = signal<Commander | null>(null);

  protected canSave = computed(() => this.name().trim() !== '' && this.commander() !== null);

  protected save() {
    const commander = this.commander();
    if (!this.canSave() || !commander) return;

    const partner = this.partner();
    this.ref.close({
      name: this.name().trim(),
      commander,
      // Firestore rejects `undefined`, so only include the key when there is a value
      ...(partner ? { partner } : {}),
    });
  }
}
