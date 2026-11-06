// src/app/features/game/player/action-selector/action-selector.ts
import { Component, DestroyRef, inject, model, output, signal } from '@angular/core';
import { ActionOptions } from './action-options/action-options';
import { ActionOptionsValue, DEFAULT_ACTION_OPTIONS } from './action-options/action-options.config';

/** How long a press must last before it counts as "hold". */
const HOLD_DELAY_MS = 400;
/** While still held, how often to repeat the jump. */
const HOLD_REPEAT_MS = 300;
/** Holding jumps to the next multiple of this. */
const HOLD_STEP = 5;
/** After holding this long (from the initial press), jumps get bigger. */
const HOLD_FAST_AFTER_MS = 2000;
const HOLD_FAST_STEP = 10;

/** Next multiple of `step` above n (step 5: 3 -> 5, 5 -> 10). */
const snapUp = (n: number, step: number) => (Math.floor(n / step) + 1) * step;
/** Next multiple of `step` below n, never under 0 (step 5: 8 -> 5, 5 -> 0, 3 -> 0). */
const snapDown = (n: number, step: number) => Math.max(0, (Math.ceil(n / step) - 1) * step);

/** What the selector emits on Submit: the count plus the chosen options. */
export interface ActionSubmission {
  count: number;
  options: ActionOptionsValue;
}

@Component({
  selector: 'app-action-selector',
  imports: [ActionOptions],
  host: { class: 'relative flex h-full w-full select-none flex-col' },
  template: `
    <app-action-options class="shrink-0" [(value)]="options" />

    <!-- Counter area: left half minus, right half plus -->
    <div class="relative flex min-h-0 flex-1">
      <button
        type="button"
        class="flex flex-1 touch-manipulation items-center justify-start pl-[10%] text-[12cqmin] leading-none opacity-70 transition active:bg-white/10 disabled:opacity-20 disabled:active:bg-transparent [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
        aria-label="Decrease"
        [disabled]="count() === 0"
        (pointerdown)="startHold(-1)"
        (pointerup)="endHold()"
        (pointerleave)="cancelHold()"
        (pointercancel)="cancelHold()"
        (contextmenu)="$event.preventDefault()"
        (click)="onClick(-1)"
      >
        <span aria-hidden="true">&minus;</span>
      </button>

      <button
        type="button"
        class="flex flex-1 touch-manipulation items-center justify-end pr-[10%] text-[12cqmin] leading-none opacity-70 transition active:bg-white/10 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
        aria-label="Increase"
        (pointerdown)="startHold(1)"
        (pointerup)="endHold()"
        (pointerleave)="cancelHold()"
        (pointercancel)="cancelHold()"
        (contextmenu)="$event.preventDefault()"
        (click)="onClick(1)"
      >
        <span aria-hidden="true">+</span>
      </button>

      <!-- Count sits above the buttons but lets taps fall through to them -->
      <span
        class="pointer-events-none absolute inset-0 flex items-center justify-center font-bold leading-none tabular-nums text-[35cqmin] [text-shadow:0_2px_8px_rgb(0_0_0/0.7)]"
        aria-live="polite"
      >
        {{ count() }}
      </span>
    </div>

    <!-- Actions: full width across the bottom -->
    <div class="flex shrink-0 gap-2 p-2">
      <button
        type="button"
        class="min-h-14 flex-[1] touch-manipulation rounded-full border-2 border-neutral-500 bg-neutral-800 text-xl text-white transition active:bg-neutral-700 [-webkit-tap-highlight-color:transparent]"
        aria-label="Cancel"
        (click)="cancel.emit()"
      >
        <span aria-hidden="true">&#x2715;</span>
      </button>
      <button
        type="button"
        class="min-h-14 flex-[3] touch-manipulation rounded-full border-2 border-white bg-white text-lg font-semibold text-black transition active:bg-neutral-200 [-webkit-tap-highlight-color:transparent]"
        (click)="onApply()"
      >
        Apply
      </button>
    </div>
  `,
})
export class ActionSelector {
  /** Current count. Two-way bindable, e.g. [(count)]="..."; never goes below 0. */
  count = model(0);

  /** Emits the count and chosen options when Submit is pressed. */
  apply = output<ActionSubmission>();
  /** Emits when Cancel is pressed. */
  cancel = output<void>();

  protected readonly options = signal<ActionOptionsValue>(DEFAULT_ACTION_OPTIONS);

  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  /** True once a hold has fired, so the click that follows release is ignored. */
  private longPressed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected onApply() {
    this.apply.emit({ count: this.count(), options: this.options() });
  }

  /** Regular tap: step by 1, unless this click is just the release of a hold. */
  protected onClick(direction: 1 | -1) {
    if (this.longPressed) {
      this.longPressed = false;
      return;
    }
    this.count.update((n) => Math.max(0, n + direction));
  }

  protected startHold(direction: 1 | -1) {
    this.clearTimer();
    this.longPressed = false;

    const pressedAt = Date.now();

    const tick = () => {
      const before = this.count();
      const step = Date.now() - pressedAt >= HOLD_FAST_AFTER_MS ? HOLD_FAST_STEP : HOLD_STEP;
      this.count.set(direction === 1 ? snapUp(before, step) : snapDown(before, step));
      this.longPressed = true;

      // Stop at the floor: the minus button disables itself and may never see a release.
      this.holdTimer = this.count() === before ? null : setTimeout(tick, HOLD_REPEAT_MS);
    };

    this.holdTimer = setTimeout(tick, HOLD_DELAY_MS);
  }

  /** Finger/mouse released on the button. Keep longPressed so the click is swallowed. */
  protected endHold() {
    this.clearTimer();
  }

  /** Pointer left the button or was cancelled: no click will follow. */
  protected cancelHold() {
    this.clearTimer();
    this.longPressed = false;
  }

  private clearTimer() {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }
}
