import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-undo-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block size-14 shrink-0' },
  template: `
    <button
      type="button"
      class="flex size-full touch-manipulation select-none items-center justify-center rounded-full border-2 border-neutral-500 bg-neutral-800 text-lg font-semibold text-white transition active:bg-neutral-700 disabled:opacity-30 disabled:active:bg-neutral-800 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      aria-label="Undo last action. Hold to undo the whole turn."
      [disabled]="disabled()"
      (pointerdown)="startPress($event)"
      (pointerup)="cancelPress()"
      (pointerleave)="cancelPress()"
      (pointercancel)="cancelPress()"
      (contextmenu)="$event.preventDefault()"
      (click)="onClick()"
    >
      <span aria-hidden="true">↶</span>
    </button>

    <!-- Progress ring: rotated so it starts at 12 o'clock -->
    <svg
      class="pointer-events-none absolute inset-0 size-full -rotate-90"
      viewBox="0 0 56 56"
      aria-hidden="true"
    >
      @if (pressing()) {
        <circle
          class="ring"
          cx="28"
          cy="28"
          r="26"
          pathLength="100"
          [style.animation-duration.ms]="holdMs()"
        />
      }
    </svg>
  `,
  styles: `
    .ring {
      fill: none;
      stroke: var(--color-indigo-400, #818cf8);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
      opacity: 0;
      animation:
        ring-fill linear forwards,
        ring-show 0s linear forwards;
      animation-duration: var(--hold-ms), 0s;
      animation-delay: 0s, var(--show-after-ms);
    }

    @keyframes ring-fill {
      to {
        stroke-dashoffset: 0;
      }
    }

    @keyframes ring-show {
      to {
        opacity: 1;
      }
    }
  `,
})
export class UndoButton {
  readonly disabled = input(false);
  /** How long the button must be held to trigger undoTurn. */
  readonly holdMs = input(2000);

  /** Fired on a normal tap. */
  readonly undo = output<void>();
  /** Fired once the hold completes. */
  readonly undoTurn = output<void>();

  protected readonly pressing = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private longPressed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected startPress(event: PointerEvent) {
    if (event.button !== 0) return; // ignore right/middle mouse buttons

    // Reset here, not in click: if undoTurn disables the button, no click
    // fires and the flag would otherwise stay stale.
    this.longPressed = false;
    this.clearTimer();
    this.pressing.set(true);

    this.timer = setTimeout(() => {
      this.timer = null;
      this.longPressed = true;
      this.pressing.set(false);
      navigator.vibrate?.(30);
      this.undoTurn.emit();
    }, this.holdMs());
  }

  protected cancelPress() {
    this.clearTimer();
    this.pressing.set(false);
  }

  protected onClick() {
    // The release after a completed hold still emits a click; swallow it.
    if (this.longPressed) {
      this.longPressed = false;
      return;
    }
    this.undo.emit();
  }

  private clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
