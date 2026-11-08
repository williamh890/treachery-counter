// src/app/core/orientation-lock.ts
import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** How long to wait before leaving fullscreen, so quick screen-to-screen navigation never exits. */
const UNLOCK_DELAY_MS = 1500;

@Injectable({ providedIn: 'root' })
export class OrientationLock {
  private doc = inject(DOCUMENT);

  /** True between lockLandscape() and unlock(): the game flow wants fullscreen + landscape. */
  private wanted = false;
  private unlockTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly _needsGesture = signal(false);
  /** True while fullscreen is wanted but missing. The next tap anywhere restores it. */
  readonly needsGesture = this._needsGesture.asReadonly();

  constructor() {
    this.doc.addEventListener('fullscreenchange', () => this.onFullscreenChange());
  }

  /** Touch-first primary input (phones and tablets). Laptops report a fine pointer, even with a touchscreen. */
  isTouchDevice(): boolean {
    return matchMedia('(pointer: coarse)').matches;
  }

  /** True when the installed PWA was launched fullscreen via the manifest (no requestFullscreen needed). */
  private isDisplayFullscreen(): boolean {
    return matchMedia('(display-mode: fullscreen)').matches;
  }

  /** Enter fullscreen and lock landscape. Call from a user gesture if you can; if not, the next tap does it. */
  async lockLandscape(): Promise<boolean> {
    // Cancel a pending unlock first, so back-and-forth navigation keeps fullscreen alive.
    clearTimeout(this.unlockTimer);
    this.unlockTimer = undefined;

    if (!this.isTouchDevice()) return false;
    this.wanted = true;

    if (this.isDisplayFullscreen()) {
      await this.lockOrientation();
      return true;
    }
    if (!this.doc.documentElement.requestFullscreen) return false;
    return this.enter();
  }

  /** Leave fullscreen and release the lock. Call when leaving the game screen. */
  unlock(): void {
    this.wanted = false; // first, so the fullscreenchange below doesn't try to restore
    this.disarm();
    this._needsGesture.set(false);

    clearTimeout(this.unlockTimer);
    this.unlockTimer = setTimeout(() => void this.doUnlock(), UNLOCK_DELAY_MS);
  }

  private async doUnlock(): Promise<void> {
    this.unlockTimer = undefined;
    if (this.wanted) return; // someone locked again in the meantime

    try {
      screen.orientation.unlock();
    } catch {
      /* unsupported */
    }
    // In a manifest-fullscreen PWA there is no fullscreenElement, so this is a no-op there.
    if (this.doc.fullscreenElement) {
      await this.doc.exitFullscreen().catch(() => undefined);
    }
  }

  private async enter(): Promise<boolean> {
    if (!this.isDisplayFullscreen() && !this.doc.fullscreenElement) {
      try {
        await this.doc.documentElement.requestFullscreen();
      } catch {
        // No user gesture (a reload on /game, say): wait for the next tap
        this.waitForTap();
        return false;
      }
    }
    this._needsGesture.set(false);

    await this.lockOrientation();
    return true;
  }

  /**
   * Best effort, and released whenever fullscreen exits, so it's redone on every entry.
   * `lock` isn't in every TypeScript version's DOM typings, hence the cast.
   */
  private async lockOrientation(): Promise<void> {
    const orientation = screen.orientation as
      (ScreenOrientation & { lock?: (type: 'landscape') => Promise<void> }) | undefined;
    await orientation?.lock?.('landscape').catch(() => undefined);
  }

  private onFullscreenChange() {
    if (!this.wanted) return;
    if (this.doc.fullscreenElement) {
      this._needsGesture.set(false);
    } else {
      this.waitForTap(); // fullscreen was left (swipe, back button, Esc)
    }
  }

  /** Fullscreen can only start from a user gesture, so re-enter on the next tap. */
  private waitForTap() {
    this._needsGesture.set(true);
    this.disarm();
    this.doc.addEventListener('pointerup', this.onTap, { once: true, capture: true });
  }

  private disarm() {
    this.doc.removeEventListener('pointerup', this.onTap, { capture: true });
  }

  private onTap = () => {
    if (this.wanted) void this.enter();
  };
}
