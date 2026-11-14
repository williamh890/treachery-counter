import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

export function installTapFix() {
  let down: { el: Element; x: number; y: number; t: number } | null = null;
  let lastSynth = 0;

  addEventListener(
    'pointerdown',
    (e) => {
      down =
        e.pointerType === 'touch'
          ? { el: e.target as Element, x: e.clientX, y: e.clientY, t: e.timeStamp }
          : null;
    },
    true,
  );

  // The browser's own click, if it ever arrives, is dropped: we already clicked
  addEventListener(
    'click',
    (e) => {
      if (e.isTrusted && performance.now() - lastSynth < 500) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );

  addEventListener(
    'pointerup',
    (e) => {
      const d = down;
      down = null;
      if (!d || e.pointerType !== 'touch' || e.target !== d.el) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
      if (e.timeStamp - d.t > 600) return;

      const button = d.el.closest('button:not(:disabled)') as HTMLElement | null;
      if (!button) return;

      lastSynth = performance.now();
      button.click();
    },
    true,
  );
}
installTapFix();
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
