import { Component } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [MatButtonModule, RouterLink, RouterLinkActive],
  selector: 'app-home',
  styleUrl: './home.css',
  template: `
    <div class="flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 class="text-lg font-semibold">Treachery Counter</h1>

      <a matButton="elevated" routerLink="/start-game" routerLinkActive="text-primary font-semibold"
        >Start Game</a
      >
      <a matButton="elevated" routerLink="/profiles" routerLinkActive="text-primary font-semibold"
        >Profile</a
      >
    </div>
  `,
})
export class Home {}
