import { Component, inject, signal, computed, effect } from '@angular/core';
import { collection, onSnapshot, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { NewDeck } from '../models/deck';
import { NewDeckDialog } from './new-deck-dialog/new-deck-dialog';

import { AuthService } from '../auth';
import { db } from '../firebase';
import { Deck } from '../models/deck';

@Component({
  imports: [],
  selector: 'app-profiles',
  styleUrl: './profiles.css',
  templateUrl: './profiles.html',
})
export class Profiles {
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  readonly decks = signal<Deck[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly userId = computed(() => this.auth.currentUser()?.uid ?? 'TEST');

  constructor() {
    effect((onCleanup) => {
      const uid = this.userId();

      if (!uid) {
        this.decks.set([]);
        return;
      }

      this.loading.set(true);
      const decksRef = collection(db, 'users', uid, 'decks');

      const unsubscribe = onSnapshot(
        decksRef,
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

  async addNewDeck() {
    const ref = this.dialog.open<NewDeckDialog, void, NewDeck>(NewDeckDialog, {
      width: '32rem',
      maxWidth: '95vw',
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return; // cancelled

    const decksRef = collection(db, 'users', this.userId(), 'decks');
    await addDoc(decksRef, { ...result });
  }

  async deleteDeck(deckId: string) {
    const deckRef = doc(db, 'users', this.userId(), 'decks', deckId);
    await deleteDoc(deckRef);
  }
}
