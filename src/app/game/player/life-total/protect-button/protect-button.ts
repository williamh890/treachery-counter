import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-protect-button',
  template: `
    <button
      type="button"
      class="relative flex size-12 touch-manipulation items-center justify-center transition active:scale-90 [-webkit-tap-highlight-color:transparent]"
      [attr.aria-pressed]="active()"
      [attr.aria-label]="active() ? 'Remove protection' : 'Protect from this action'"
      (click)="pressed.emit()"
    >
      @if (active()) {
        <!-- Unchanged from before, centered in the same footprint as the shield -->
        <span
          class="flex size-10 items-center justify-center rounded-full border-2 border-sky-300 bg-sky-500/90 text-white shadow-md backdrop-blur-sm"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
            stroke-linecap="round"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10v-6L12 2.5z" />
            <path d="m8.5 12 2.5 2.5 4.5-5" stroke="#0369a1" stroke-width="2" fill="none" />
          </svg>
        </span>
      } @else {
        <!-- Shield with the life total in the middle -->
        <svg
          viewBox="0 0 24 24"
          class="size-12 fill-black/50 stroke-neutral-400/70 drop-shadow-md"
          stroke-width="1.5"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10v-6L12 2.5z" />
        </svg>
        @if (life() !== null) {
          <span
            class="absolute inset-x-0 top-[45%] -translate-y-1/2 text-center font-bold leading-none tabular-nums text-neutral-100"
            [class]="lifeSize()"
          >
            {{ life() }}
          </span>
        }
      }
    </button>
  `,
})
export class ProtectButton {
  /** True when this player is protected from the current action. */
  active = input(false);
  /** Life total shown inside the shield while it isn't active. */
  life = input<number | null>(null);
  pressed = output<void>();

  /** Three characters (100, -12) need a smaller font to fit inside the shield. */
  protected lifeSize = computed(() => (String(this.life() ?? '').length >= 3 ? 'text-[11px]' : 'text-sm'));
}
