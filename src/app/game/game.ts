import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { GameStore, DeathDecision } from '@state/game.store';
import { PlayerSetup } from './player-setup/player-setup';
import { Player } from './player/player';
import { DragArrow } from './drag-arrow';
import { ProfileStore } from '@state/profile.store';
import { GroupStore } from '@state/group.store';
import { DeadPlayersDialog } from './dead-player-dialog/dead-player-dialog';
import { GameOptionsDialog } from './game-options-dialog/game-options-dialog';
import { OrientationLock } from '@services/orientation-lock';
import { Banner } from './banner/banner';
import { ActionGesture } from './action-gesture';

type Tile = {
  playerIndex: number;
  turns: number;
  sideways: boolean;
};

@Component({
  selector: 'app-player-grid',
  imports: [
    PlayerSetup,
    Player,
    DragArrow,
    MatButtonModule,
    DeadPlayersDialog,
    GameOptionsDialog,
    Banner,
  ],
  hostDirectives: [ActionGesture],
  host: {
    class: 'relative flex min-h-0 flex-1',
  },
  template: `
    @if (game.optionsOpen()) {
      <app-game-options-dialog
        (finish)="finishGame($event)"
        (stop)="stopGame()"
        (closed)="game.closeOptions()"
      />
    }
    @for (column of columns(); track $index) {
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        @for (tile of column; track tile.playerIndex) {
          <div class="relative min-h-0 flex-1 overflow-hidden [container-type:size]">
            <div
              class="absolute bg-grey left-1/2 top-1/2 flex justify-center items-center"
              [class.touch-none]="game.gameState() === 'PLAY'"
              [class.select-none]="game.gameState() === 'PLAY'"
              [attr.data-seat]="tile.playerIndex"
              [style.width]="tile.sideways ? '100cqh' : '100cqw'"
              [style.height]="tile.sideways ? '100cqw' : '100cqh'"
              [style.transform]="'translate(-50%, -50%) rotate(' + tile.turns * 90 + 'deg)'"
            >
              @if (game.gameState() === 'SETUP') {
                <app-player-setup
                  [seat]="tile.playerIndex"
                  [users]="game.seatUsers()"
                  (userSelected)="onUserSelected($event)"
                />
              } @else if (game.gameState() === 'PLAY') {
                <app-player [seat]="tile.playerIndex" />
              } @else if (game.gameState() === 'POST') {
                <div>FINISHED GAME</div>
              }

              @if (gestures.dropTarget() === tile.playerIndex) {
                <div
                  class="pointer-events-none absolute inset-0 z-20 border-4 border-white/80"
                ></div>
              }
            </div>
          </div>
        }
      </div>
    }

    @if (game.gameState() === 'SETUP') {
      <div
        class="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3"
      >
        <button matButton="elevated" class="pointer-events-auto" (click)="back()">Back</button>

        @if (game.playersReady()) {
          <button matButton="filled" class="pointer-events-auto" (click)="start()">Start</button>
        }
      </div>
    } @else if (playersTurn() === null) {
      <div
        class="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3"
      >
        <button matButton="elevated" class="pointer-events-auto" (click)="setRandomPlayersTurn()">
          Random
        </button>
      </div>
    } @else if (deadPlayers()?.length > 0) {
      <app-dead-players-dialog (resolved)="onConfirmDeath($event)" />
    }

    @if (gestures.drag(); as d) {
      <app-drag-arrow [start]="d.start" [end]="d.current" [fading]="gestures.arrowFading()" />
    }

    @if (bannerName(); as name) {
      <app-banner [name]="name" (closed)="bannerName.set(null)" />
    }

    @if (orientation.needsGesture()) {
      <div class="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center">
        <span class="rounded-full bg-black/80 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          Tap anywhere to return to fullscreen
        </span>
      </div>
    }
  `,
  styles: `
    .banner-progress {
      animation: banner-progress linear forwards;
    }
    @keyframes banner-progress {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }
  `,
})
export class Game {
  protected game = inject(GameStore);
  protected profileStore = inject(ProfileStore);
  protected gestures = inject(ActionGesture);

  private router = inject(Router);

  protected bannerName = signal<string | null>(null);

  playersTurn = computed(() => this.game.turnSeat());
  deadPlayers = computed(
    () => this.game.players()?.filter((player) => player.status === 'dead') ?? [],
  );

  private readonly groupStore = inject(GroupStore);
  protected orientation = inject(OrientationLock);

  constructor() {
    this.orientation.lockLandscape();

    inject(DestroyRef).onDestroy(() => this.orientation.unlock());

    effect(() => {
      if (!this.groupStore.ready()) return;
      if (!this.game.group()) this.router.navigate(['/start-game']);
    });
  }

  start() {
    this.game.playGame();
  }

  back() {
    this.router.navigate(['/start-game']);
  }

  protected onUserSelected(name: string) {
    if (!this.bannerName()) this.bannerName.set(name); // don't stack banners
  }

  setRandomPlayersTurn() {
    const numPlayers = this.game.players().length;
    this.game.setTurn(Math.floor(Math.random() * numPlayers));
  }

  onConfirmDeath(decision: DeathDecision) {
    this.game.applyDeathDescision(decision);
  }

  // --- Layout (unchanged) ---

  readonly gridLayout = computed(() => {
    const players = this.game.players();
    const columns: number[][] = [];
    let column: number[] = [];
    const len = players.length;

    for (let r = 0; 2 * r < len; r++) {
      if ((r + 1) * 2 <= len) {
        column.push(r);
      }
      column.push(len - r - 1);

      columns.push(column);
      column = [];
    }

    return columns;
  });

  readonly columns = computed<Tile[][]>(() =>
    this.gridLayout().map((column) =>
      column.map((playerIndex) => {
        const turns = this.getPlayerQuarterTurns(column, playerIndex);
        return { playerIndex, turns, sideways: Math.abs(turns) % 2 === 1 };
      }),
    ),
  );

  getPlayerQuarterTurns(column: number[], index: number) {
    if (column.length === 1) {
      return -1;
    }

    const isTopTile = column.indexOf(index) === 0;
    return isTopTile ? 2 : 0;
  }

  finishGame(winners: number[]) {
    console.log(winners);
    this.game.closeOptions();
    this.game.resetGame();
    this.router.navigateByUrl('/home');
  }

  stopGame() {
    this.game.closeOptions();
    this.game.resetGame();
    this.router.navigateByUrl('/home');
  }
}
