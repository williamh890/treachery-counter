// src/app/features/game/player/elimination/elimination.ts
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-elimination',
  host: { class: 'relative flex h-full w-full flex-col items-center justify-center' },
  template: `
    <span class="text-sm opacity-80 [text-shadow:0_1px_3px_rgb(0_0_0/0.8)]">
      {{ name() }}
    </span>
    <span
      class="font-black leading-none tracking-widest text-red-500 text-[22cqmin] [text-shadow:0_2px_8px_rgb(0_0_0/0.8)]"
    >
      DEAD
    </span>

    <!-- Revive: full width across the bottom -->
    <div class="absolute inset-x-0 bottom-0 flex p-2">
      <button
        type="button"
        class="min-h-14 flex-1 touch-manipulation rounded-full border-2 border-neutral-500 bg-neutral-800 text-lg font-semibold text-white transition active:bg-neutral-700 [-webkit-tap-highlight-color:transparent]"
        (click)="revive.emit()"
      >
        Revive
      </button>
    </div>
  `,
})
export class Elimination {
  name = input.required<string>();
  revive = output<void>();
}
