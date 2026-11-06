// src/app/features/game/player/life-total/protect-button/protect-button.ts
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-protect-button',
  template: `
    <button
      type="button"
      class="flex size-10 touch-manipulation items-center justify-center rounded-full border-2 shadow-md backdrop-blur-sm transition active:scale-90 [-webkit-tap-highlight-color:transparent]"
      [class]="
        active()
          ? 'border-sky-300 bg-sky-500/90 text-white'
          : 'border-neutral-400/60 bg-black/50 text-neutral-200'
      "
      [attr.aria-pressed]="active()"
      [attr.aria-label]="active() ? 'Remove protection' : 'Protect from this action'"
      (click)="pressed.emit()"
    >
      <svg
        viewBox="0 0 24 24"
        class="size-6"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
        stroke-linecap="round"
        [attr.fill]="active() ? 'currentColor' : 'none'"
        aria-hidden="true"
      >
        <path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10v-6L12 2.5z" />
        @if (active()) {
          <path d="m8.5 12 2.5 2.5 4.5-5" stroke="#0369a1" stroke-width="2" fill="none" />
        }
      </svg>
    </button>
  `,
})
export class ProtectButton {
  /** True when this player is protected from the current action. */
  active = input(false);
  pressed = output<void>();
}
