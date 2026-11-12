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

type Layout = {
  // Direction the groups are stacked in the host:
  // 'row' = groups side by side (classic columns), 'col' = groups stacked (rows layout).
  direction: 'row' | 'col';
  groups: Tile[][];
};

type TileSpec = { seat: number; turns: number };
type LayoutSpec = TileSpec[][]; // outer = rows, inner = tiles in that row

// Seats run clockwise: top row left→right, bottom row right→left.
// Top tiles face the opposite side (2 turns), bottom tiles face you (0).
const top = (seat: number): TileSpec => ({ seat, turns: 2 });
const bottom = (seat: number): TileSpec => ({ seat, turns: 0 });
// Side seats face inward from the short edges of the screen.
const left = (seat: number): TileSpec => ({ seat, turns: 1 });
const right = (seat: number): TileSpec => ({ seat, turns: -1 });

const LAYOUTS: Record<number, LayoutSpec> = {
  // Side by side (classic mode stacks the two tiles vertically instead).
  2: [[left(0), right(1)]],
  3: [[top(0), top(1)], [bottom(2)]],
  4: [
    [top(0), top(1)],
    [bottom(3), bottom(2)],
  ],
  5: [
    [top(0), top(1), top(2)],
    [bottom(4), bottom(3)],
  ],
  6: [
    [top(0), top(1), top(2)],
    [bottom(5), bottom(4), bottom(3)],
  ],
  7: [
    [top(0), top(1), top(2), top(3)],
    [bottom(6), bottom(5), bottom(4)],
  ],
  8: [
    [top(0), top(1), top(2), top(3)],
    [bottom(7), bottom(6), bottom(5), bottom(4)],
  ],
  9: [
    [top(0), top(1), top(2), top(3), top(4)],
    [bottom(8), bottom(7), bottom(6), bottom(5)],
  ],
};

// Describes where each seat ends up on screen (as fractions of the grid) and how it's rotated,
// so two layouts built differently (columns vs. rows) can be compared by how they look.
function visualSignature(layout: Layout): string {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const groupCount = layout.groups.length;
  const tiles = layout.groups.flatMap((group, g) =>
    group.map((tile, i) => {
      const n = group.length;
      const rect =
        layout.direction === 'row'
          ? { x: g / groupCount, y: i / n, w: 1 / groupCount, h: 1 / n }
          : { x: i / n, y: g / groupCount, w: 1 / n, h: 1 / groupCount };
      return {
        seat: tile.playerIndex,
        turns: tile.turns,
        x: round(rect.x),
        y: round(rect.y),
        w: round(rect.w),
        h: round(rect.h),
      };
    }),
  );
  return JSON.stringify(tiles.sort((a, b) => a.seat - b.seat));
}

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
    '[class.flex-row]': "layout().direction === 'row'",
    '[class.flex-col]': "layout().direction === 'col'",
  },
  template: `
    @if (game.optionsOpen()) {
      <app-game-options-dialog
        (finish)="finishGame($event)"
        (stop)="stopGame()"
        (closed)="game.closeOptions()"
      />
    }
    @for (group of layout().groups; track $index) {
      <div
        class="flex min-h-0 min-w-0 flex-1"
        [class.flex-col]="layout().direction === 'row'"
        [class.flex-row]="layout().direction === 'col'"
      >
        @for (tile of group; track tile.playerIndex) {
          <div class="relative min-h-0 min-w-0 flex-1 overflow-hidden [container-type:size]">
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

        @if (layoutsDiffer()) {
          <button matButton="elevated" class="pointer-events-auto" (click)="toggleLayout()">
            Toggle Layout
          </button>
        }

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

  toggleLayout() {
    this.game.setLayoutMode(this.game.layoutMode() === 'rows' ? 'classic' : 'rows');
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

  // --- Layouts ---

  // Classic: outer array is columns, tiles stack vertically inside each column.
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

  private readonly classicLayout = computed<Layout>(() => ({
    direction: 'row',
    groups: this.gridLayout().map((column) =>
      column.map((playerIndex) => {
        const turns = this.getPlayerQuarterTurns(column, playerIndex);
        return { playerIndex, turns, sideways: Math.abs(turns) % 2 === 1 };
      }),
    ),
  }));

  // Rows: outer array is rows, tiles sit side by side inside each row.
  private readonly rowsLayout = computed<Layout | null>(() => {
    const spec = LAYOUTS[this.game.players().length];
    if (!spec) return null;
    return {
      direction: 'col',
      groups: spec.map((row) =>
        row.map(({ seat, turns }) => ({
          playerIndex: seat,
          turns,
          sideways: Math.abs(turns) % 2 === 1,
        })),
      ),
    };
  });

  // True when rows mode would look different from classic for the current player count.
  protected readonly layoutsDiffer = computed(() => {
    const rows = this.rowsLayout();
    if (!rows) return false;
    return visualSignature(rows) !== visualSignature(this.classicLayout());
  });

  // Falls back to classic when rows mode is selected but no spec exists for this player count.
  protected readonly layout = computed<Layout>(() => {
    if (this.game.layoutMode() === 'rows') {
      const rows = this.rowsLayout();
      if (rows) return rows;
    }
    return this.classicLayout();
  });

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
