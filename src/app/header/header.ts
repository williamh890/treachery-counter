import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatBadge } from '@angular/material/badge';

import { LoginBtn } from '../login-btn/login-btn';
import { AppUpdateService } from '@services/app-update'; // adjust path

@Component({
  selector: 'app-header',
  imports: [MatToolbar, MatIconButton, MatIcon, MatBadge, LoginBtn],
  host: { class: 'block' },
  template: `
    <mat-toolbar class="sticky top-0 z-10">
      <div class="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <div class="justify-self-start">
          @if (showBack()) {
            <button mat-icon-button aria-label="Go back" (click)="back()">
              <mat-icon>arrow_back</mat-icon>
            </button>
          }
        </div>

        <h1 class="text-lg font-semibold"></h1>

        <div class="flex items-center gap-1 justify-self-end">
          @if (updates.updateReady()) {
            <button
              mat-icon-button
              aria-label="Update available. Tap to update the app"
              matBadge="!"
              matBadgeSize="small"
              matBadgeColor="warn"
              (click)="updates.apply()"
            >
              <mat-icon>system_update</mat-icon>
            </button>
          }
          <app-login-btn />
        </div>
      </div>
    </mat-toolbar>
  `,
})
export class Header {
  private location = inject(Location);
  private router = inject(Router);
  protected updates = inject(AppUpdateService);

  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  showBack = computed(() => {
    return this.url() !== '/home'
  });

  back() {
    console.log(this.router.url);
    const url = this.router.url;
    if (url.includes('start-game')) {
      this.router.navigateByUrl('/home');
    } else if (window.history.state?.navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }
}
