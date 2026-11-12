// src/app/features/game/player/action-selector/action-options/option-icon/option-icon.ts
import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { BUTTONS, ButtonId } from './action-options.config';

/** Draws a button's icon. The artwork lives in action-options.icons.ts. */
@Component({
  selector: 'app-option-icon',
  host: { class: 'block size-full' },
  template: `
    <svg
      viewBox="0 0 24 24"
      class="size-full"
      fill="currentColor"
      aria-hidden="true"
      [innerHTML]="markup()"
    ></svg>
  `,
})
export class OptionIcon {
  private sanitizer = inject(DomSanitizer);

  /** Which button's icon to draw. */
  name = input.required<ButtonId>();
  /** Lighter strokes, for small spots like counter badges. Only icons that define one change. */
  thin = input(false);

  protected markup = computed(() => {
    const { svg, thinSvg } = BUTTONS[this.name()].icon;
    // Static markup from our own config, so it's safe to trust
    return this.sanitizer.bypassSecurityTrustHtml((this.thin() && thinSvg) || svg);
  });
}
