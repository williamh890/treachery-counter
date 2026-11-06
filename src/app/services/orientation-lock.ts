// src/app/core/orientation-lock.ts
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Smallest screen side (in CSS px) that counts as a tablet; phones are well below this. */
const TABLET_MIN_SHORT_SIDE = 600;

@Injectable({ providedIn: 'root' })
export class OrientationLock {
  private doc = inject(DOCUMENT);
  private enteredFullscreen = false;
  private locked = false;

  /**
   * Touch-first primary input and a tablet-sized screen. Laptops (even touchscreen ones)
   * report a fine primary pointer, and phones fail the size check.
   * Browser-only: call it from a click handler or afterNextRender, not during SSR.
   */
  isTablet(): boolean {
    const touchFirst = matchMedia('(pointer: coarse)').matches;
    const shortSide = Math.min(screen.width, screen.height);
    return touchFirst && shortSide >= TABLET_MIN_SHORT_SIDE;
  }

  /** Best effort; does nothing off-tablet. Call from a user gesture so fullscreen is allowed. */
  async lockLandscape(): Promise<boolean> {
    if (!this.isTablet()) return false;

    // `lock` isn't in every TypeScript version's DOM typings, hence the cast
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (type: 'landscape') => Promise<void>;
    };
    if (!orientation?.lock) return false;

    try {
      if (!this.doc.fullscreenElement) {
        await this.doc.documentElement.requestFullscreen();
        this.enteredFullscreen = true;
      }
      await orientation.lock('landscape');
      this.locked = true;
      return true;
    } catch {
      await this.leaveFullscreen(); // don't leave the user stuck in fullscreen
      return false;
    }
  }

  async unlock(): Promise<void> {
    if (this.locked) {
      try {
        screen.orientation.unlock();
      } catch {
        /* unsupported */
      }
      this.locked = false;
    }
    await this.leaveFullscreen();
  }

  private async leaveFullscreen(): Promise<void> {
    if (this.enteredFullscreen && this.doc.fullscreenElement) {
      await this.doc.exitFullscreen().catch(() => undefined);
    }
    this.enteredFullscreen = false;
  }
}
