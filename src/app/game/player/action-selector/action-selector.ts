// src/app/features/game/player/action-selector/action-selector.ts
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  model,
  output,
  untracked,
} from '@angular/core';
import { ActionOptions } from './action-options/action-options';
import {
  ActionOptionsValue,
  DEFAULT_ACTION_OPTIONS,
  ActionSubmission,
} from './action-options/action-options.config';
import { GameStore } from '@state/game.store';

/** How long a press must last before it counts as "hold". */
const HOLD_DELAY_MS = 400;
/** While still held, how often to repeat the jump. */
const HOLD_REPEAT_MS = 400;
/** Holding jumps to the next multiple of this. */
const HOLD_STEP = 5;
/** After holding this long (from the initial press), jumps get bigger. */
const HOLD_FAST_AFTER_MS = 2000;
const HOLD_FAST_STEP = 10;

/** Next multiple of `step` above n (step 5: 3 -> 5, 5 -> 10). */
const snapUp = (n: number, step: number) => (Math.floor(n / step) + 1) * step;
/** Next multiple of `step` below n, never under 0 (step 5: 8 -> 5, 5 -> 0, 3 -> 0). */
const snapDown = (n: number, step: number) => Math.max(0, (Math.ceil(n / step) - 1) * step);

@Component({
  selector: 'app-action-selector',
  imports: [ActionOptions],
  host: { class: 'relative flex h-full w-full select-none flex-col' },
  template: `
    <app-action-options class="shrink-0" [value]="options()" (valueChange)="setOptions($event)" />

    <!-- Counter area: left half minus, right half plus. Its own size container, so the
         count and glyphs scale to the space they actually have. -->
    <div class="relative flex min-h-0 flex-1 [container-type:size]">
      <button
        type="button"
        class="flex flex-1 touch-manipulation items-center justify-start pl-[10%] text-[20cqmin] leading-none opacity-70 transition active:bg-white/10 disabled:opacity-20 disabled:active:bg-transparent [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
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
        class="flex flex-1 touch-manipulation items-center justify-end pr-[10%] text-[20cqmin] leading-none opacity-70 transition active:bg-white/10 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
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
        class="pointer-events-none absolute inset-0 flex items-center justify-center font-bold leading-none tabular-nums [text-shadow:0_2px_8px_rgb(0_0_0/0.7)]"
        [style.font-size]="countFontSize()"
      >
        <!-- Only as wide as the digits, so the preview can anchor to it -->
        <span class="relative" aria-live="polite">
          {{ count() }}

          <!-- This seat's life, with a preview of where the action leaves it.
               Absolutely positioned, so the minus/plus split stays 50/50. -->
          @if (sourceLife(); as life) {
            <span
              class="absolute bottom-full left-1/2 mb-[2cqmin] flex -translate-x-1/2 items-center gap-[2cqmin] whitespace-nowrap text-[8cqmin] font-semibold leading-none"
              aria-hidden="true"
            >
              <span class="opacity-70">{{ life.before }}</span>
              @if (life.changed) {
                <!-- Replaces <span class="opacity-50">&rarr;</span> -->
                <svg
                  viewBox="0 0 24 24"
                  class="size-[1em] shrink-0 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12h16m-6-6 6 6-6 6" />
                </svg>
                <span class="transition-colors duration-150" [class]="life.tint">
                  {{ life.after }}
                </span>
              }
            </span>
          }
        </span>
      </span>
    </div>

    <!-- Actions: full width across the bottom, sized from the tile -->
    <div class="flex shrink-0 gap-[2cqmin] p-[2cqmin]">
      <button
        type="button"
        class="aspect-square h-[clamp(2.5rem,11cqmin,3.5rem)] shrink-0 touch-manipulation rounded-full border-2 border-neutral-500 bg-neutral-800 text-white transition active:bg-neutral-700 [font-size:clamp(0.875rem,5cqmin,1.25rem)] [-webkit-tap-highlight-color:transparent]"
        aria-label="Cancel"
        (click)="cancel.emit()"
      >
        <span aria-hidden="true">&#x2715;</span>
      </button>
      <button
        type="button"
        class="h-[clamp(2.5rem,11cqmin,3.5rem)] flex-1 touch-manipulation rounded-full border-2 border-white bg-white font-semibold text-black transition active:bg-neutral-200 [font-size:clamp(0.875rem,5cqmin,1.25rem)] [-webkit-tap-highlight-color:transparent]"
        (click)="onApply()"
      >
        Apply
      </button>
    </div>
  `,
})
export class ActionSelector {
  private gameStore = inject(GameStore);
  /** Current count. Two-way bindable, e.g. [(count)]="..."; never goes below 0. */
  count = model(0);

  /** Emits the count and chosen options when Submit is pressed. */
  apply = output<ActionSubmission>();
  /** Emits when Cancel is pressed. */
  cancel = output<void>();

  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  /** True once a hold has fired, so the click that follows release is ignored. */
  private longPressed = false;

  /** Always the store's value; falls back to defaults if it's null. */
  protected readonly options = computed(
    () => this.gameStore.actionOptions() ?? DEFAULT_ACTION_OPTIONS,
  );

  /** Changes only when a new action starts, not when protect seats are toggled. */
  private readonly actionId = computed(() => this.gameStore.actionSelect()?.id);

  /** Relative to the counter area: fits the height, and the width for 1-2 or 3+ digits. */
  protected readonly countFontSize = computed(() =>
    String(this.count()).length >= 3 ? 'min(42cqh, 26cqw)' : 'min(55cqh, 40cqw)',
  );

  /** Life of the seat this selector is on: committed value vs. the previewed one. */
  protected readonly sourceLife = computed(() => {
    const seat = this.gameStore.actionSelect()?.sourceSeat;
    if (seat === undefined) return null;
    const before = this.gameStore.players()[seat]?.life;
    const after = this.gameStore.playerAt(seat)?.life;
    if (before === undefined || after === undefined) return null;

    const tint = after < before ? 'text-red-100' : after > before ? 'text-emerald-100' : '';
    return { before, after, changed: after !== before, tint };
  });

  constructor() {
    // A new action starts from zero, even when this component instance is reused
    effect(() => {
      this.actionId();
      untracked(() => {
        this.clearTimer();
        this.longPressed = false;
        this.count.set(0);
      });
    });

    // Live preview: the store derives the previewed players from this count
    effect(() => this.gameStore.setActionCount(this.count()));

    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected setOptions(value: ActionOptionsValue) {
    this.gameStore.setActionOptions(value);
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
