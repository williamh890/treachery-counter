import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { GameStore } from '@state/game.store';
import { AuthService } from '@services/auth';
import { PlayerSetup } from './player-setup/player-setup';
import { Player } from './player/player';
import { DragArrow, Point } from './drag-arrow';

type Tile = {
  playerIndex: number;
  turns: number;
  sideways: boolean;
};

interface ActiveDrag {
  from: number;
  start: Point;
  current: Point;
  over: number | null;
  leftSource: boolean; // true once the pointer has been over any other tile
}

interface Press {
  pointerId: number;
  seat: number;
  x: number;
  y: number;
  center: Point;
}

const DRAG_THRESHOLD_PX = 8;
const FADE_MS = 200;

@Component({
  selector: 'app-player-grid',
  imports: [PlayerSetup, Player, DragArrow, MatButtonModule],
  host: {
    class: 'relative flex min-h-0 flex-1',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
  },
  template: `
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
                <app-player-setup [seat]="tile.playerIndex" [users]="auth.users()" />
              } @else if (game.gameState() === 'PLAY') {
                <app-player [seat]="tile.playerIndex" />
              } @else if (game.gameState() === 'POST') {
                <div>FINISHED GAME</div>
              }

              @if (dropTarget() === tile.playerIndex) {
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
    }

    @if (drag(); as d) {
      <app-drag-arrow [start]="d.start" [end]="d.current" [fading]="arrowFading()" />
    }
  `,
})
export class Game {
  game = inject(GameStore);
  auth = inject(AuthService);

  private router = inject(Router);

  protected drag = signal<ActiveDrag | null>(null);
  protected arrowFading = signal(false);

  /** The seat the arrow is currently hovering over (never the source). */
  protected dropTarget = computed(() => {
    const d = this.drag();
    if (!d || this.arrowFading() || d.over === null) return null;
    if (d.over === d.from && !d.leftSource) return null;
    return d.over;
  });

  private press: Press | null = null;
  private dragging = false;
  private fadeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.fadeTimer));
  }

  start() {
    this.game.playGame();
  }

  back() {
    this.router.navigate(['/start-game']);
  }

  // --- Drag between players ---

  protected onPointerDown(e: PointerEvent) {
    if (this.game.gameState() !== 'PLAY' || this.press) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const tile = (e.target as HTMLElement).closest<HTMLElement>('[data-seat]');
    if (!tile) return;

    // The bounding box of a rotated tile still has the right center.
    const rect = tile.getBoundingClientRect();
    this.press = {
      pointerId: e.pointerId,
      seat: Number(tile.dataset['seat']),
      x: e.clientX,
      y: e.clientY,
      center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    };
    this.dragging = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  protected onPointerMove(e: PointerEvent) {
    const p = this.press;
    if (!p || e.pointerId !== p.pointerId) return;

    if (!this.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD_PX) return;
      this.dragging = true;
      clearTimeout(this.fadeTimer);
      this.arrowFading.set(false);
      this.drag.set({
        from: p.seat,
        start: p.center,
        current: p.center,
        over: p.seat,
        leftSource: false,
      });
    }

    const current = { x: e.clientX, y: e.clientY };
    const over = this.seatAt(current);
    this.drag.update((d) =>
      d
        ? { ...d, current, over, leftSource: d.leftSource || (over !== null && over !== d.from) }
        : d,
    );
  }

  protected onPointerUp(e: PointerEvent) {
    const p = this.press;
    if (!p || e.pointerId !== p.pointerId) return;

    const wasDragging = this.dragging;
    this.press = null;
    this.dragging = false;
    if (!wasDragging) return; // a tap, not a drag

    const to = this.seatAt({ x: e.clientX, y: e.clientY });
    this.fadeOutArrow();

    if (to !== null) {
      this.onPlayerDragged(p.seat, to);
    }
  }

  protected onPointerCancel(e: PointerEvent) {
    const p = this.press;
    if (!p || e.pointerId !== p.pointerId) return;

    if (this.dragging) this.fadeOutArrow();
    this.press = null;
    this.dragging = false;
  }

  /** Called with the seat the drag started on and the seat it was released over. */
  private onPlayerDragged(from: number, to: number) {
    console.log(`Drag from seat ${from} to seat ${to}`);
    this.game.onPlayerDamaged(to, 1);
  }

  private fadeOutArrow() {
    this.arrowFading.set(true);
    this.fadeTimer = setTimeout(() => {
      this.drag.set(null);
      this.arrowFading.set(false);
    }, FADE_MS);
  }

  /** Which player (if any) is under this screen point. */
  private seatAt({ x, y }: Point): number | null {
    const seat = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-seat]')?.dataset[
      'seat'
    ];
    return seat === undefined ? null : Number(seat);
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
}
