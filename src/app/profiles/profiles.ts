import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
import { db } from '@services/firebase';
import { AuthService } from '@services/auth';
import { Deck, NewDeck } from '@models/deck';
import { NewDeckDialog } from './new-deck-dialog/new-deck-dialog';
import { DeckCard } from './deck-card/deck-card';

@Component({
  selector: 'app-profiles',
  imports: [MatButton, MatIcon, MatProgressBar, MatFormField, MatLabel, MatInput, DeckCard],
  host: { class: 'block' },
  template: `
    <div class="mx-auto max-w-6xl">
      @if (uid()) {
        <form
          class="mb-6 flex items-start gap-2"
          (submit)="$event.preventDefault(); saveUsername()"
        >
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Username</mat-label>
            <input
              matInput
              maxlength="30"
              autocomplete="username"
              [value]="usernameDraft()"
              (input)="usernameDraft.set($any($event.target).value)"
            />
          </mat-form-field>
          <button mat-flat-button type="submit" class="mt-1" [disabled]="!canSaveUsername()">
            Save
          </button>
        </form>
      }

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
              <app-deck-card [deck]="deck" (remove)="removeDeck(deck)" />
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

  // Username editing
  protected savingUsername = signal(false);

  // Follows the stored username, but stays editable; resets when the stored value changes.
  protected usernameDraft = linkedSignal(() => this.auth.userProfile()?.username ?? '');

  protected canSaveUsername = computed(() => {
    const draft = this.usernameDraft().trim();
    return !!draft && draft !== (this.auth.userProfile()?.username ?? '') && !this.savingUsername();
  });

  constructor() {
    effect((onCleanup) => {
      // Wait for auth to resolve so we don't flash "Sign in" on reload.
      if (!this.auth.ready()) return;

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

  protected async saveUsername() {
    if (!this.canSaveUsername()) return;

    this.savingUsername.set(true);
    try {
      await this.auth.updateUsername(this.usernameDraft());
      this.error.set(null);
      this.snackBar.open('Username updated', undefined, { duration: 3000 });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not update username');
    } finally {
      this.savingUsername.set(false);
    }
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

  protected async removeDeck(deck: Deck) {
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
