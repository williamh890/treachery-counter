import {
  Component,
  computed,
  input,
  signal,
  inject,
  effect,
  output,
  untracked,
} from '@angular/core';

import { getAuth } from 'firebase/auth';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Commander, Deck, NewDeck } from '@models/deck';
import { GameStore } from '@state/game.store';
import { ProfileStore, AppUser } from '@state/profile.store';
import { NewDeckDialog, NewDeckDialogData } from '../../profiles/new-deck-dialog/new-deck-dialog';
import { firstValueFrom } from 'rxjs';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@services/firebase';
import { DeckSelect } from './deck-select/deck-select';

enum SetupState {
  UserSelect,
  DeckSelect,
  DeckSelected,
}

interface DeckCardInfo {
  role: 'Commander' | 'Partner' | 'Companion';
  card: Commander;
}

@Component({
  imports: [MatButtonModule, MatChipsModule, MatIconModule, DeckSelect],
  host: { class: 'block h-full w-full min-w-0 overflow-hidden' },
  selector: 'app-player-setup',
  template: `
    <div class="relative h-full min-h-0 min-w-0 p-4">
      <!-- Fixed header -->
      <header
        class="absolute inset-x-4 top-4 z-10 grid min-h-[3.25rem] grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 pt-3"
      >
        <div class="justify-self-start">
          @if (state() !== SetupState.UserSelect) {
            <button (click)="previousState()" matButton="text">← Back</button>
          }
        </div>

        <div class="min-w-0 truncate text-center text-xs opacity-60">
          @if (state() === SetupState.UserSelect) {
            Player Select
          } @else {
            @if (player()?.name) {
              {{ player()?.name }}
            } @else {
              Seat {{ seat() }} ▲
            }
          }
        </div>
      </header>

      <!-- Content: fills the rest and centers itself -->
      <div
        class="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-2 pt-[3.25rem]"
        [class]="state() === SetupState.DeckSelected ? 'pb-[3.25rem]' : 'pb-0'"
      >
        @if (state() === SetupState.UserSelect) {
          <div class="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto">
            <div class="my-auto flex w-full flex-col items-center gap-2 pb-[3.25rem]">
              <div
                class="flex w-full flex-wrap justify-center gap-2"
                role="group"
                aria-label="Player Selection"
              >
                @for (user of usersNotInGame(); track user.uid) {
                  <mat-chip (click)="selectUser(user)">{{ user.username }}</mat-chip>
                }
              </div>

              @if ((usersNotInGame()?.length ?? 0) > 0) {
                <div class="my-3 h-px w-2/3 max-w-48 bg-current opacity-20" role="separator"></div>
              }

              <div
                class="flex w-full flex-wrap justify-center gap-2"
                role="group"
                aria-label="Guest Selection"
              >
                <mat-chip (click)="chooseGuest()">Guest</mat-chip>
              </div>
            </div>
          </div>
        } @else if (state() === SetupState.DeckSelect) {
          <app-deck-select
            [decks]="decks()"
            [isGuest]="!!player()?.isGuest"
            (select)="selectDeck($event)"
            (add)="addDeck()"
            (skip)="skipDeck()"
          />
        } @else if (state() === SetupState.DeckSelected) {
          <div class="text-center text-lg font-semibold">
            {{ playerDeck()?.name ?? player()?.name }}
          </div>

          <div class="flex w-full min-w-0 justify-center gap-2">
            @for (item of selectedCards(); track item.role) {
              <figure class="flex min-w-0 max-w-28 flex-1 flex-col items-center gap-1">
                <img
                  class="aspect-[5/7] w-full rounded-md object-cover shadow"
                  [src]="item.card.url"
                  [alt]="item.card.name"
                />
                <figcaption class="w-full text-center text-[0.65rem] leading-tight">
                  <span class="block uppercase tracking-wide opacity-60">{{ item.role }}</span>
                  {{ item.card.name }}
                </figcaption>
              </figure>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class PlayerSetup {
  gameStore = inject(GameStore);
  profileStore = inject(ProfileStore);
  private dialog = inject(MatDialog);

  seat = input.required<number>();
  users = input.required<AppUser[]>();
  readonly userSelected = output<string>();

  SetupState = SetupState;
  state = signal<SetupState>(SetupState.UserSelect);
  selectedUid = signal<string | null>(null);

  /** True once this seat has finished setup (deck picked, skipped, or temp deck added). */
  readonly ready = computed(() => this.state() === SetupState.DeckSelected);

  /** Decks of the chosen account, straight from the store's cache. */
  decks = computed<Deck[]>(() => {
    const uid = this.selectedUid();
    return (uid && this.profileStore.decksByUser()[uid]) || [];
  });

  player = computed(() => this.gameStore.playerAt(this.seat()));
  playerDeck = computed(() => this.player()?.deck ?? null);

  usersNotInGame = computed(() => {
    const taken = this.gameStore.players().map((p) => p.uid);
    return this.users().filter((user) => !taken.includes(user.uid));
  });

  /** Commander first, then partner/companion if the deck has them. */
  selectedCards = computed<DeckCardInfo[]>(() => {
    const deck = this.playerDeck();
    if (!deck) return [];

    const cards: DeckCardInfo[] = [{ role: 'Commander', card: deck.commander }];
    if (deck.partner) cards.push({ role: 'Partner', card: deck.partner });
    if (deck.companion) cards.push({ role: 'Companion', card: deck.companion });
    return cards;
  });

  constructor() {
    // Fallback: if the prefetch hasn't delivered this account yet, fetch it once.
    effect(() => {
      const uid = this.selectedUid();
      if (uid && !this.profileStore.decksByUser()[uid]) {
        void this.profileStore.loadDecks(uid);
      }
    });

    // Layout toggle: the store clears names/decks (Game.toggleLayout), so reset the local flow too
    let previousLayout = this.gameStore.layoutMode();
    effect(() => {
      const layout = this.gameStore.layoutMode();
      if (layout === previousLayout) return;
      previousLayout = layout;
      untracked(() => {
        this.selectedUid.set(null);
        this.state.set(SetupState.UserSelect);
      });
    });
  }

  reset() {
    this.selectedUid.set(null);
    this.state.set(SetupState.UserSelect);
    this.gameStore.setPlayerDeck(this.seat(), null);
    this.gameStore.setPlayerIsGuest(this.seat(), false);
    this.gameStore.setPlayerName(this.seat(), `Player ${this.seat() + 1}`);
  }

  selectUser(user: AppUser) {
    this.selectedUid.set(user.uid);
    this.gameStore.setPlayerUser(this.seat(), user);
    this.gameStore.setPlayerDeck(this.seat(), null);
    this.state.set(SetupState.DeckSelect);
    this.userSelected.emit(user.username);
  }

  chooseGuest() {
    this.gameStore.setPlayerIsGuest(this.seat(), true);
    this.state.set(SetupState.DeckSelect);
  }

  skipDeck() {
    this.gameStore.setPlayerDeck(this.seat(), null);
    this.state.set(SetupState.DeckSelected);
  }

  /** Guests get a temp deck; real users save to their profile. */
  addDeck() {
    return this.player()?.isGuest ? this.addTempDeck() : this.createDeck();
  }

  private async addTempDeck() {
    const ref = this.dialog.open<NewDeckDialog, NewDeckDialogData, NewDeck>(NewDeckDialog, {
      width: '32rem',
      maxWidth: '95vw',
      data: { temp: true },
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    this.gameStore.setPlayerDeck(this.seat(), { id: crypto.randomUUID(), ...result });
    this.state.set(SetupState.DeckSelected);
  }

  private async createDeck() {
    const targetUid = this.selectedUid();
    const currentUid = getAuth().currentUser?.uid;
    if (!targetUid || !currentUid) return;

    const isOwn = targetUid === currentUid;
    const groupId = isOwn ? null : this.gameStore.groupId();
    if (!isOwn && !groupId) return; // nothing to authorize the write against

    const ref = this.dialog.open<NewDeckDialog, void, NewDeck>(NewDeckDialog, {
      width: '32rem',
      maxWidth: '95vw',
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    await addDoc(collection(db, 'users', targetUid, 'decks'), {
      ...result,
      ...(groupId ? { groupId, addedBy: currentUid } : {}),
    });
    await this.profileStore.loadDecks(targetUid); // remove if decks come from a live listener
  }

  previousState() {
    const current = this.state();
    if (current === SetupState.UserSelect) return;

    if (current === SetupState.DeckSelected) {
      this.gameStore.setPlayerDeck(this.seat(), null);
    }
    if (current === SetupState.DeckSelect) {
      this.selectedUid.set(null);
      this.gameStore.setPlayerUser(this.seat(), null); // also clears the guest flag
    }

    this.state.set(current - 1);
  }

  selectDeck(deck: Deck) {
    this.gameStore.setPlayerDeck(this.seat(), deck);
    this.state.set(SetupState.DeckSelected);
  }
}
