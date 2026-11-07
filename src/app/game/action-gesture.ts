import { DestroyRef, Directive, computed, inject, signal } from '@angular/core';
import { GameStore } from '@state/game.store';
import { Point } from './drag-arrow';

export interface ActiveDrag {
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
  /** Started on a button, e.g. in the action selector. */
  onControl: boolean;
}

const DRAG_THRESHOLD_PX = 8;
/** A finger holding a button jitters; don't mistake that for a drag. */
const CONTROL_DRAG_THRESHOLD_PX = 64;
const FADE_MS = 500;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 40;

/**
 * Opens the action selector from touch/mouse gestures on the player grid:
 * drag from one tile to another (or back onto itself), or double-tap a tile.
 * Tiles are found through their `data-seat` attribute.
 */
@Directive({
  selector: '[appActionGesture]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
  },
})
export class ActionGesture {
  private game = inject(GameStore);

  /** The arrow being dragged, for rendering. */
  readonly drag = signal<ActiveDrag | null>(null);
  readonly arrowFading = signal(false);

  /** The seat the arrow is currently hovering over (never the source). */
  readonly dropTarget = computed(() => {
    const d = this.drag();
    if (!d || this.arrowFading() || d.over === null) return null;
    if (d.over === d.from && !d.leftSource) return null;
    return d.over;
  });

  private press: Press | null = null;
  private dragging = false;
  private lastTap: { seat: number; time: number; x: number; y: number } | null = null;
  private fadeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.fadeTimer));
  }

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
      onControl: !!(e.target as HTMLElement).closest('button'),
    };
    this.dragging = false;
    // No pointer capture yet: it happens once the press turns into a drag, so taps and
    // holds on buttons (e.g. in the action selector) keep behaving like normal presses.
  }

  protected onPointerMove(e: PointerEvent) {
    const p = this.press;
    if (!p || e.pointerId !== p.pointerId) return;

    if (!this.dragging) {
      const threshold = p.onControl ? CONTROL_DRAG_THRESHOLD_PX : DRAG_THRESHOLD_PX;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < threshold) return;
      this.dragging = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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

    if (!wasDragging) {
      this.registerTap(p, e); // a tap, not a drag
      return;
    }
    this.lastTap = null;

    const to = this.seatAt({ x: e.clientX, y: e.clientY });
    this.fadeOutArrow();
    if (to !== null) this.openActionSelect(p.seat, to);
  }

  protected onPointerCancel(e: PointerEvent) {
    const p = this.press;
    if (!p || e.pointerId !== p.pointerId) return;

    if (this.dragging) this.fadeOutArrow();
    this.press = null;
    this.dragging = false;
  }

  // --- Double tap ---

  private registerTap(p: Press, e: PointerEvent) {
    // Button presses (undo, pass, selector buttons) never count toward a double tap
    if (p.onControl) {
      this.lastTap = null;
      return;
    }

    const last = this.lastTap;
    const isDouble =
      last !== null &&
      last.seat === p.seat &&
      e.timeStamp - last.time <= DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - last.x, e.clientY - last.y) <= DOUBLE_TAP_SLOP_PX;

    if (!isDouble) {
      this.lastTap = { seat: p.seat, time: e.timeStamp, x: e.clientX, y: e.clientY };
      return;
    }

    this.lastTap = null;
    const game = this.game;
    if (game.turnSeat() === null) return; // "Go first" still showing
    if (game.players()[p.seat]?.status === 'eliminated') return;
    if (game.actionSelect()?.sourceSeat === p.seat) return; // already open here

    this.openActionSelect(p.seat, p.seat);
  }

  private openActionSelect(sourceSeat: number, targetSeat: number) {
    this.game.setActionSelect(sourceSeat, targetSeat);
  }

  // --- Helpers ---

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
}
