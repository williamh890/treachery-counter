import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// tap-fix.ts, call installTapFix() in main.ts before bootstrapping
export function installTapFix() {
  let down: { el: Element; x: number; y: number; t: number } | null = null;
  let lastClick = 0;
  let lastSynth = 0;

  addEventListener('pointerdown', (e) => {
    down = e.pointerType === 'touch'
      ? { el: e.target as Element, x: e.clientX, y: e.clientY, t: e.timeStamp }
      : null;
  }, true);

  // If the browser's real click shows up late, swallow it so nothing fires twice
  addEventListener('click', (e) => {
    if (e.isTrusted && performance.now() - lastSynth < 400) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    lastClick = performance.now();
  }, true);

  addEventListener('pointerup', (e) => {
    const d = down;
    down = null;
    if (!d || e.pointerType !== 'touch' || e.target !== d.el) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return; // a drag, not a tap
    if (e.timeStamp - d.t > 600) return;                           // a long press

    const button = d.el.closest('button:not(:disabled)') as HTMLElement | null;
    if (!button) return;

    const upAt = performance.now();
    setTimeout(() => {
      if (lastClick >= upAt || !button.isConnected) return; // a real click arrived
      lastSynth = performance.now();
      button.click();
    }, 50);
  }, true);
}

installTapFix();
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
