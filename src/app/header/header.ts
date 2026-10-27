import { Component, inject, input, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { LoginBtn } from '../login-btn/login-btn';

@Component({
  selector: 'app-header',
  imports: [MatToolbar, MatIconButton, MatIcon, LoginBtn],
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

        <h1 class="text-lg font-semibold">{{ title() }}</h1>

        <div class="justify-self-end">
          <app-login-btn />
        </div>
      </div>
    </mat-toolbar>
  `,
})
export class Header {
  private location = inject(Location);
  private router = inject(Router);

  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  showBack = computed(() => this.url() !== '/home');

  title = input('Treachery Counter');

  back() {
    // Fall back to home if the user landed here directly (no in-app history)
    if (window.history.state?.navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }
}
