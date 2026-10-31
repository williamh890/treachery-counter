// src/app/features/start-game/start-game.ts
import { Component, effect, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { GameStore } from '@state/game.store';
import { GroupStore } from '@state/group.store';
import { AuthService } from '@services/auth';

@Component({
  selector: 'app-start-game',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  host: { class: 'flex min-h-0 flex-1 flex-col items-center justify-center' },
  template: `
    <form
      [formGroup]="form"
      (ngSubmit)="start()"
      class="flex w-full max-w-xl flex-col items-center gap-8 px-6"
    >
      <h1 class="text-3xl font-semibold">New game</h1>

      <section class="flex w-full flex-col items-center gap-3">
        <h2 class="text-sm font-medium opacity-70">Group</h2>
        @if (groupStore.ready() && groups().length === 0) {
          <p class="text-center opacity-70">You need a group to start a game.</p>
          <a mat-stroked-button class="!h-12" routerLink="/profiles/groups">Create a group</a>
        } @else {
          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <mat-select formControlName="groupId" aria-label="Group" placeholder="Choose a group">
              @for (g of groups(); track g.id) {
                <mat-option class="!min-h-14" [value]="g.id">
                  {{ g.name }} ({{ g.members.length }})
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      </section>

      <section class="flex w-full flex-col items-center gap-3">
        <h2 class="text-sm font-medium opacity-70">Starting life</h2>
        <mat-button-toggle-group
          formControlName="startingLife"
          aria-label="Starting life"
          class="touch-toggles w-full"
          [hideSingleSelectionIndicator]="true"
        >
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
          [hideSingleSelectionIndicator]="true"
        >
          @for (count of playerOptions; track count) {
            <mat-button-toggle [value]="count" class="flex-1">
              {{ count }}
            </mat-button-toggle>
          }
        </mat-button-toggle-group>
      </section>

      <button mat-flat-button type="submit" [disabled]="form.invalid">Start game</button>
    </form>
  `,
})
export class StartGame {
  private fb = inject(NonNullableFormBuilder);
  private game = inject(GameStore);
  private router = inject(Router);
  authService = inject(AuthService);
  protected readonly groupStore = inject(GroupStore);
  protected readonly groups = this.groupStore.groupsWithMembers;

  readonly lifeOptions = [20, 25, 40];
  readonly playerOptions = Array.from({ length: 8 }, (_, i) => i + 1);

  readonly form = this.fb.group({
    groupId: this.fb.control<string | null>(this.game.groupId(), Validators.required),
    startingLife: this.fb.control(this.game.startingLife()),
    playerCount: this.fb.control(this.game.playerCount()),
  });

  constructor() {
    effect(() => {
      const groups = this.groups();
      const control = this.form.controls.groupId;

      // Wait for the first snapshot so a stored choice isn't cleared while loading.
      if (!this.groupStore.ready()) return;

      if (control.value && !groups.some((g) => g.id === control.value)) {
        // The stored group was deleted, or you've left it.
        control.setValue(null);
      }

      // Nothing to choose between: pick the only group.
      if (!control.value && groups.length === 1) {
        control.setValue(groups[0].id);
      }
    });
  }

  start() {
    const { groupId, startingLife, playerCount } = this.form.getRawValue();
    if (!groupId) return;

    this.game.setStartingLife(startingLife);
    this.game.setPlayerCount(playerCount);
    this.game.setGroup(groupId);
    this.game.startGameSetup();

    this.router.navigate(['/game']);
  }
}
