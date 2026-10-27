import { Component, DestroyRef, OnInit, inject, signal, computed, effect } from '@angular/core';
import { getFirestore, collection, onSnapshot, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { AuthService } from '../auth';
import { db } from '../firebase';

interface Deck {
  id: string;
  name: string;
}

@Component({
  imports: [],
  selector: 'app-profiles',
  styleUrl: './profiles.css',
  templateUrl: './profiles.html',
})
export class Profiles {
  private auth = inject(AuthService);

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
    const decksRef = collection(db, 'users', this.userId(), 'decks');
    await addDoc(decksRef, { name: 'New Custom Deck', createdAt: new Date() });
  }

  async deleteDeck(deckId: string) {
    const deckRef = doc(db, 'users', this.userId(), 'decks', deckId);
    await deleteDoc(deckRef);
  }
}
