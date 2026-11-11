// src/app/features/game/player/player.ts
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { GameStore } from '@state/game.store';
import { ActionSelector } from './action-selector/action-selector';
import { ActionSubmission } from './action-selector/action-options/action-options.config';
import { LifeTotal } from './life-total/life-total';
import { Elimination } from './elimination/elimination';
import { optionColor } from './action-selector/action-options/action-options.config';

type ArtKind = 'commander' | 'partner';

@Component({
  selector: 'app-player',
  host: {
    class:
      'relative block h-full w-full select-none overflow-hidden bg-neutral-800 text-white [-webkit-touch-callout:none]',
    '(contextmenu)': '$event.preventDefault()',
  },
  template: `
    <!-- Art: one half per commander (the whole tile when there's no partner).
         Each half carries its own tint, so one can be lit up while the other dims. -->
    <div class="pointer-events-none absolute inset-0 flex" aria-hidden="true">
      @for (art of arts(); track art.kind) {
        <div class="relative h-full min-w-0 flex-1 overflow-hidden">
          <img
            class="h-full w-full select-none object-cover object-top [-webkit-touch-callout:none]"
            [src]="art.url"
            alt=""
            draggable="false"
          />

          <div
            class="absolute inset-0"
            [class]="tintClass(art.kind)"
            [style.box-shadow]="glow(art.kind)"
          ></div>
        </div>
      }
    </div>

    <!-- No art at all: plain tint over the tile background -->
    @if (!arts().length) {
      <div class="absolute inset-0 bg-black/55"></div>
    }

    <div class="relative z-10 h-full">
      @if (playersTurn() === null) {
        <!-- No one has the turn yet: this player can claim it -->
        <div
          class="flex h-full w-full flex-col items-center justify-center gap-[4cqmin] px-[8cqmin]"
        >
          <button
            type="button"
            class="min-h-20 w-full touch-manipulation rounded-2xl border-2 border-indigo-300 bg-indigo-500 text-3xl font-bold text-white shadow-xl transition active:scale-95 active:bg-indigo-400 [-webkit-tap-highlight-color:transparent]"
            (click)="setTurn()"
          >
            Go first
          </button>
        </div>
      } @else if (actionSelect()?.sourceSeat === seat()) {
        <app-action-selector
          [seat]="seat()"
          (apply)="applyAction($event)"
          (cancel)="cancelAction()"
        />
      } @else {
        @if (player(); as p) {
          @if (p.status !== 'eliminated') {
            <app-life-total [seat]="seat()" (eliminate)="eliminatePlayer()" />
          } @else {
            <app-elimination [name]="p.name" (revive)="protectPlayer()" />
          }
        }
      }
    </div>

    <!-- Target glow, colored by the selected action type. Always mounted so it can fade out. -->
    <div
      class="target-glow pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ease-out motion-reduce:transition-none"
      [class]="outlineColor() ? 'opacity-100' : 'opacity-0'"
      [style.--glow]="outlineColor() ?? lastGlowColor()"
      aria-hidden="true"
    ></div>
  `,
  styles: `
    .target-glow {
      box-shadow:
        inset 0 0 16px 3px color-mix(in srgb, var(--glow) 90%, transparent),
        inset 0 0 32px 5px color-mix(in srgb, var(--glow) 50%, transparent);
    }
  `,
  imports: [ActionSelector, LifeTotal, Elimination],
})
export class Player {
  private gameStore = inject(GameStore);

  seat = input.required<number>();

  actionSelect = computed(() => this.gameStore.actionSelect());
  playersTurn = computed(() => this.gameStore.turnSeat());
  player = computed(() => this.gameStore.playerAt(this.seat()));
  playerName = computed(() => this.player()?.name);

  /** Last color the glow had, so it can keep it while fading out. */
  protected lastGlowColor = signal<string | null>(null);

  constructor() {
    effect(() => {
      const color = this.outlineColor();
      if (color) this.lastGlowColor.set(color);
    });
  }

  /** The art halves to draw: commander first, partner second, only those that have an image. */
  arts = computed(() => {
    const deck = this.player()?.deck;
    const all: { kind: ArtKind; url: string | null }[] = [
      { kind: 'commander', url: deck?.commander.url ?? null },
      { kind: 'partner', url: deck?.partner?.url ?? null },
    ];
    return all.filter((a): a is { kind: ArtKind; url: string } => a.url !== null);
  });

  /**
   * Which commander the open action comes from, if this tile is the source and a
   * Commander/Partner tag is selected. Null otherwise.
   */
  activeArt = computed<ArtKind | null>(() => {
    if (this.actionSelect()?.sourceSeat !== this.seat()) return null;
    const tags = this.gameStore.actionOptions()?.tags ?? [];
    if (tags.includes('Commander')) return 'commander';
    if (tags.includes('Partner')) return 'partner';
    return null;
  });

  outlineColor = computed(() => {
    const opts = this.gameStore.actionOptions();
    if (!opts || !this.gameStore.targetSeats().includes(this.seat())) return null;
    return optionColor(opts.type).edge;
  });

  /** Lighter tint for the selected commander, heavier for the other one. */
  /** Slightly lighter tint for the selected commander, slightly heavier for the other one. */
  protected tintClass(kind: ArtKind) {
    const active = this.activeArt();
    if (active === null) return 'bg-black/55';
    return active === kind ? 'bg-black/40' : 'bg-black/65';
  }

  /** Soft white inset glow on the selected commander's art. Inset, because the tile clips. */
  protected glow(kind: ArtKind) {
    if (this.activeArt() !== kind) return 'none';
    return 'inset 0 0 18px 2px rgb(255 255 255 / 0.45)';
  }

  setTurn() {
    this.gameStore.setTurn(this.seat());
  }

  applyAction(action: ActionSubmission) {
    this.gameStore.applyAction(action);
  }

  cancelAction() {
    this.gameStore.clearActionSelect();
  }

  protectPlayer() {
    this.gameStore.protectPlayer(this.seat());
  }

  eliminatePlayer() {
    this.gameStore.eliminatePlayer(this.seat());
  }
}
