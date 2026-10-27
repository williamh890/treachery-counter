// features/profiles/profiles.ts
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, setDoc,
} from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
import { db } from '@services/firebase';
import { Deck, NewDeck } from '@models/deck';
import { NewDeckDialog } from './new-deck-dialog/new-deck-dialog';
import { DeckCard } from './deck-card/deck-card';
import { AuthService } from '@services/auth';


@Component({
  selector: 'app-profiles',
  imports: [MatButton, MatIcon, MatProgressBar, DeckCard],
  host: { class: 'block' },
  template: `
    <div class="mx-auto max-w-6xl">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold">Decks</h1>
        <button mat-flat-button [disabled]="!uid()" (click)="addNewDeck()">
          <mat-icon>add</mat-icon>
          New deck
        </button>
      </div>

      @if (error(); as message) {
        <p class="text-red-600" role="alert">{{ message }}</p>
      }

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      } @else if (!uid()) {
        <p class="opacity-70">Sign in to see your decks.</p>
      } @else {
        <ul class="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
          @for (deck of decks(); track deck.id) {
            <li>
              <app-deck-card [deck]="deck" (remove)="remove(deck)" />
            </li>
          } @empty {
            <li class="col-span-full py-12 text-center opacity-70">
              No decks yet. Create your first one.
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class Profiles {
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  protected decks = signal<Deck[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);

  protected uid = computed(() => this.auth.currentUser()?.uid ?? null);

  constructor() {
    effect((onCleanup) => {
      const uid = this.uid();

      if (!uid) {
        this.decks.set([]);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const unsubscribe = onSnapshot(
        collection(db, 'users', uid, 'decks'),
        (snapshot) => {
          this.decks.set(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck));
          this.loading.set(false);
          this.error.set(null);
        },
        (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      );

      onCleanup(unsubscribe);
    });
  }

  protected async addNewDeck() {
    const uid = this.uid();
    if (!uid) return;

    const ref = this.dialog.open<NewDeckDialog, void, NewDeck>(NewDeckDialog, {
      width: '32rem',
      maxWidth: '95vw',
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return; // cancelled

    await addDoc(collection(db, 'users', uid, 'decks'), result);
  }

  protected async remove(deck: Deck) {
    const uid = this.uid();
    if (!uid) return;

    const { id, ...data } = deck;
    const ref = doc(db, 'users', uid, 'decks', id);
    await deleteDoc(ref);

    this.snackBar
      .open(`Deleted "${deck.name}"`, 'Undo', { duration: 6000 })
      .onAction()
      .subscribe(() => setDoc(ref, data));
  }
}
