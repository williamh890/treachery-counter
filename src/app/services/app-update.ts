// app-update.ts
import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private sw = inject(SwUpdate);
  private _updateReady = signal(false);
  readonly updateReady = this._updateReady.asReadonly();
  private lastCheck = 0;

  init() {
    if (!this.sw.isEnabled) return;

    this.sw.versionUpdates
      .pipe(filter((e) => e.type === 'VERSION_READY'))
      .subscribe(() => this._updateReady.set(true));

    // Cache is in a broken state, so reload to recover
    this.sw.unrecoverable.subscribe(() => location.reload());

    // Installed mobile PWAs are usually suspended, not closed
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.check();
    });
    this.check();
  }

  private async check() {
    const now = Date.now();
    if (now - this.lastCheck < 60_000) return; // throttle
    this.lastCheck = now;
    try {
      await this.sw.checkForUpdate();
    } catch {
      /* offline or transient failure */
    }
  }

  async apply() {
    await this.sw.activateUpdate();
    location.reload();
  }
}
