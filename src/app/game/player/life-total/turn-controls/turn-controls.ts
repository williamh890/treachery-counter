import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { GameStore } from '@state/game.store';

/** How long the undo button must be held to undo the whole turn. */
const HOLD_MS = 2000;
/** Presses shorter than this never show the bar or the label change. */
const SHOW_AFTER_MS = 200;

@Component({
  selector: 'app-turn-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none absolute inset-0' },
  template: `
    <!-- Active player highlight -->
    @if (showTurnBorder()) {
      <div class="absolute inset-0 border-4 border-indigo-400/80" aria-hidden="true"></div>
    }

    <div class="pointer-events-auto absolute inset-x-0 bottom-0 flex items-center gap-2 p-2">
      <!-- Undo: tap = undo, hold = undo turn -->
      <button
        type="button"
        class="flex size-14 shrink-0 touch-manipulation select-none items-center justify-center rounded-full border-2 border-neutral-500 bg-neutral-800 text-lg font-semibold text-white transition active:bg-neutral-700 disabled:opacity-30 disabled:active:bg-neutral-800 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
        aria-label="Undo last action. Hold to undo the whole turn."
        [disabled]="!canUndo()"
        (pointerdown)="startPress($event)"
        (pointerup)="cancelPress()"
        (pointerleave)="cancelPress()"
        (pointercancel)="cancelPress()"
        (contextmenu)="$event.preventDefault()"
        (click)="onUndoClick()"
      >
        <span aria-hidden="true">↶</span>
      </button>

      <!-- Pass: doubles as the hold-progress bar -->
      <button
        type="button"
        class="relative min-h-14 flex-1 touch-manipulation overflow-hidden rounded-full border-2 border-indigo-300 bg-indigo-500 text-lg font-semibold text-white transition active:bg-indigo-400 [-webkit-tap-highlight-color:transparent]"
        (click)="passTurn()"
      >
        @if (showHold()) {
          <span
            class="bar"
            aria-hidden="true"
            [style.--fill-ms]="fillMs"
            [style.--delay-ms]="delayMs"
          ></span>
          <span class="label label-in" aria-hidden="true" [style.--delay-ms]="delayMs">
            Undo Turn
          </span>
        }
        <span class="relative" [class.label-out]="showHold()" [style.--delay-ms]="delayMs">
          Pass
        </span>
      </button>

      <!-- Options -->
      <button
        type="button"
        class="flex min-h-14 touch-manipulation items-center justify-center rounded-full border-2 border-neutral-500 bg-neutral-800 px-5 text-lg font-semibold text-white transition active:bg-neutral-700 [-webkit-tap-highlight-color:transparent]"
        aria-label="Game options"
        (click)="openOptions()"
      >
        <span aria-hidden="true">⋯</span>
      </button>
    </div>
  `,
  styles: `
    .bar {
      position: absolute;
      inset: 0;
      background: var(--color-neutral-800, #262626);
      transform: scaleX(0);
      transform-origin: left;
      animation: bar-fill var(--fill-ms) linear var(--delay-ms) forwards;
    }

    .label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
    }

    .label-in {
      animation: fade-in 0.1s linear var(--delay-ms) forwards;
    }

    .label-out {
      animation: fade-out 0.1s linear var(--delay-ms) forwards;
    }

    @keyframes bar-fill {
      to {
        transform: scaleX(1);
      }
    }

    @keyframes fade-in {
      to {
        opacity: 1;
      }
    }

    @keyframes fade-out {
      to {
        opacity: 0;
      }
    }
  `,
})
export class TurnControls {
  private readonly gameStore = inject(GameStore);

  protected readonly canUndo = this.gameStore.canUndo;
  protected readonly showTurnBorder = computed(() => this.gameStore.actionSelect() === null);

  // CSS values for the animation
  protected readonly delayMs = `${SHOW_AFTER_MS}ms`;
  protected readonly fillMs = `${HOLD_MS - SHOW_AFTER_MS}ms`;

  // Hold-to-undo-turn state
  private readonly holding = signal(false);
  protected readonly showHold = computed(() => this.holding() && this.canUndo());

  private timer: ReturnType<typeof setTimeout> | null = null;
  private longPressed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected startPress(event: PointerEvent) {
    if (event.button !== 0 || !this.canUndo()) return;

    // Reset here, not in click: if undoTurn disables the button, no click
    // fires and the flag would otherwise stay stale.
    this.longPressed = false;
    this.clearTimer();
    this.holding.set(true);

    this.timer = setTimeout(() => {
      this.timer = null;
      this.holding.set(false);
      if (!this.canUndo()) return;
      this.longPressed = true;
      navigator.vibrate?.(30);
      this.gameStore.undoTurn();
    }, HOLD_MS);
  }

  protected cancelPress() {
    this.clearTimer();
    this.holding.set(false);
  }

  protected onUndoClick() {
    // The release after a completed hold still emits a click; swallow it.
    if (this.longPressed) {
      this.longPressed = false;
      return;
    }
    this.gameStore.undo();
  }

  protected passTurn() {
    this.gameStore.passTurn();
  }

  protected openOptions() {
    this.gameStore.openOptions();
  }

  private clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
