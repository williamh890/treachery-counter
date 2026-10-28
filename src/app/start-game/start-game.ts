// src/app/features/start-game/start-game.ts
import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { GameStore } from '@state/game.store';

@Component({
  selector: 'app-start-game',
  imports: [ReactiveFormsModule, MatButtonModule, MatButtonToggleModule],
  host: { class: 'flex min-h-0 flex-1 flex-col items-center justify-center' },
  template: `
    <form
      [formGroup]="form"
      (ngSubmit)="start()"
      class="flex w-full max-w-xl flex-col items-center gap-8 px-6">

      <h1 class="text-3xl font-semibold">New game</h1>

      <section class="flex w-full flex-col items-center gap-3">
        <h2 class="text-sm font-medium opacity-70">Starting life</h2>
        <mat-button-toggle-group
          formControlName="startingLife"
          aria-label="Starting life"
          class="touch-toggles w-full"
          [hideSingleSelectionIndicator]="true">
          @for (life of lifeOptions; track life) {
            <mat-button-toggle [value]="life" class="flex-1">
              {{ life }}
            </mat-button-toggle>
          }
        </mat-button-toggle-group>
      </section>

      <section class="flex w-full flex-col items-center gap-3">
        <h2 class="text-sm font-medium opacity-70">Players</h2>
        <mat-button-toggle-group
          formControlName="playerCount"
          aria-label="Number of players"
          class="touch-toggles w-full"
          [hideSingleSelectionIndicator]="true">
          @for (count of playerOptions; track count) {
            <mat-button-toggle [value]="count" class="flex-1">
              {{ count }}
            </mat-button-toggle>
          }
        </mat-button-toggle-group>
      </section>

      <button mat-flat-button type="submit">Start game</button>
    </form>
  `,
})
export class StartGame {
  private fb = inject(NonNullableFormBuilder);
  private game = inject(GameStore);
  private router = inject(Router);

  readonly lifeOptions = [20, 25, 40];
  readonly playerOptions = Array.from({ length: 8 }, (_, i) => i + 1);

  readonly form = this.fb.group({
    startingLife: this.fb.control(this.game.startingLife()),
    playerCount: this.fb.control(this.game.playerCount()),
  });

  start() {
    const { startingLife, playerCount } = this.form.getRawValue();
    this.game.setStartingLife(startingLife);
    this.game.setPlayerCount(playerCount);
    this.game.startGame();
    this.router.navigate(['/game']);
  }
}
