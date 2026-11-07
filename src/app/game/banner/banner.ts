import { Component, computed, effect, input, output } from '@angular/core';

const MESSAGES = [
  'WE LOVE {name}. HE HAS BLESSED US WITH HIS PRESENCE. ALL HAIL!',
  '{name}... PLEASE GO SIT IN THE CORNER. NO ONE LIKE YOU BRO.'
];

@Component({
  selector: 'app-banner',
  host: { class: 'contents' }, // the host adds no box; the overlay lives in the template
  template: `
    @if (visible()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-8 text-center"
        (click)="closed.emit()"
      >
        <p
          class="max-w-[90%] text-balance break-words text-center text-3xl font-bold text-white sm:text-5xl"
        >
          {{ message() }}
        </p>

        <div class="absolute inset-x-0 bottom-0 h-2 bg-white/20">
          <div
            class="banner-progress h-full origin-left bg-white"
            [style.animation-duration.ms]="durationMs()"
          ></div>
        </div>
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
export class Banner {
  readonly name = input.required<string>();
  readonly chance = input(0.15); // probability (0-1) that the banner actually shows
  readonly durationMs = input(5000);
  readonly closed = output<void>();

  /** Rolled once per name; the dice are only re-rolled if the name changes. */
  protected readonly visible = computed(() => {
    this.name();
    return Math.random() < this.chance();
  });

  protected readonly message = computed(() => {
    const template = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    return template.replaceAll('{name}', this.name().toUpperCase());
  });

  constructor() {
    effect((onCleanup) => {
      // Lost the roll: tell the parent we're done right away.
      if (!this.visible()) {
        this.closed.emit();
        return;
      }
      const timer = setTimeout(() => this.closed.emit(), this.durationMs());
      onCleanup(() => clearTimeout(timer));
    });
  }
}
