import { Component, computed, input, signal, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { Commander, Deck } from '@models/deck';
import { GameStore } from '@state/game.store';
import { ProfileStore, AppUser } from '@state/profile.store';

enum SetupState {
  AccountOrGuest,
  UserSelect,
  DeckSelect,
  DeckSelected,
}

interface DeckCardInfo {
  role: 'Commander' | 'Partner' | 'Companion';
  card: Commander;
}

@Component({
  imports: [MatButtonModule, MatChipsModule],
  host: { class: 'block h-full w-full min-w-0 overflow-hidden' },
  selector: 'app-player-setup',
  styleUrl: './player-setup.css',
  templateUrl: './player-setup.html',
})
export class PlayerSetup {
  gameStore = inject(GameStore);
  profileStore = inject(ProfileStore);

  seat = input.required<number>();
  users = input.required<AppUser[]>();

  SetupState = SetupState;
  state = signal<SetupState>(SetupState.AccountOrGuest);
  decks = signal<Deck[]>([]);

  player = computed(() => this.gameStore.playerAt(this.seat()));
  playerDeck = computed(() => this.player()?.deck ?? null);

  /** Commander first, then partner/companion if the deck has them. */
  selectedCards = computed<DeckCardInfo[]>(() => {
    const deck = this.playerDeck();
    if (!deck) return [];

    const cards: DeckCardInfo[] = [{ role: 'Commander', card: deck.commander }];
    if (deck.partner) cards.push({ role: 'Partner', card: deck.partner });
    if (deck.companion) cards.push({ role: 'Companion', card: deck.companion });
    return cards;
  });

  async selectUser(user: AppUser) {
    const playerDecks = await this.profileStore.loadDecks(user.uid);

    this.decks.set([...playerDecks]);
    this.gameStore.setPlayerDeck(this.seat(), null);
    this.state.set(SetupState.DeckSelect);
  }

  chooseAccount() {
    this.state.set(SetupState.UserSelect);
  }

  chooseGuest() {
    this.gameStore.setPlayerIsGuest(this.seat(), true);
    this.state.set(SetupState.DeckSelected);
  }

  selectDeck(deck: Deck) {
    this.gameStore.setPlayerDeck(this.seat(), deck);
    this.state.set(SetupState.DeckSelected);
  }

  previousState() {
    const current = this.state();
    if (current === SetupState.AccountOrGuest) return;

    // Clear data belonging to the state we're leaving.
    if (current === SetupState.DeckSelected) this.gameStore.setPlayerDeck(this.seat(), null);
    if (current === SetupState.DeckSelect) this.decks.set([]);

    this.state.set(current - 1);
  }
}
