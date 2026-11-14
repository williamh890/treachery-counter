/**
 * Workaround: on touch devices, Chrome sometimes delivers pointerdown and pointerup to a
 * button but never fires the click, mostly right after opening the action selector with a
 * drag. While enabled, a tap that goes down and up on the same button gets a synthetic
 * click on pointerup, and the browser's own click is swallowed if it shows up later.
 * The game turns it on only while playing (see setTapFix).
 */

let enabled = false;

/** Called by the Game component: on while gameState is PLAY, off otherwise. */
export function setTapFix(on: boolean) {
  enabled = on;
}

export function installTapFix() {
  let down: { el: Element; x: number; y: number; t: number } | null = null;
  let lastSynth = 0;

  addEventListener(
    'pointerdown',
    (e) => {
      down =
        enabled && e.pointerType === 'touch'
          ? { el: e.target as Element, x: e.clientX, y: e.clientY, t: e.timeStamp }
          : null;
    },
    true,
  );

  // The browser's own click, if it arrives after ours, is dropped so nothing fires twice
  addEventListener(
    'click',
    (e) => {
      if (enabled && e.isTrusted && performance.now() - lastSynth < 500) {
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
      if (!enabled || !d || e.pointerType !== 'touch' || e.target !== d.el) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return; // a drag, not a tap
      if (e.timeStamp - d.t > 600) return; // a long press

      const button = d.el.closest('button:not(:disabled)') as HTMLElement | null;
      if (!button) return;

      lastSynth = performance.now();
      button.click();
    },
    true,
  );
}
