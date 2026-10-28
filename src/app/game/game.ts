// src/app/features/game/player-grid.ts
import { Component, computed, inject } from '@angular/core';
import { GameStore } from '@state/game.store';

type Tile = {
  playerIndex: number;
  turns: number;
  sideways: boolean;
};

@Component({
  selector: 'app-player-grid',
  host: { class: 'flex min-h-0 flex-1' },
  template: `
    @for (column of columns(); track $index) {
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        @for (tile of column; track tile.playerIndex) {
          <div
            class="relative min-h-0 flex-1 overflow-hidden [container-type:size]">
            <div
              class="absolute bg-grey left-1/2 top-1/2 flex justify-center items-center"
              [style.width]="tile.sideways ? '100cqh' : '100cqw'"
              [style.height]="tile.sideways ? '100cqw' : '100cqh'"
              [style.transform]="'translate(-50%, -50%) rotate(' + tile.turns * 90 + 'deg)'">
              <span class="p-2 text-sm opacity-60">Seat {{ tile.playerIndex + 1 }} ▲</span>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class Game {
  private game = inject(GameStore);

  constructor() {
    this.game.startGame();
  }

  readonly gridLayout = computed(() => {
    const players = this.game.players();
    const columns: number[][] = [];
    let column: number[] = [];
    const len = players.length;

    for (let r = 0; 2 * r < len; r++) {
      if ((r + 1) * 2 <= len) {
        column.push(r);
      }
      column.push(len - r - 1);

      columns.push(column);
      column = [];
    }

    return columns;
  });

  readonly columns = computed<Tile[][]>(() =>
    this.gridLayout().map(column =>
      column.map(playerIndex => {
        const turns = this.getPlayerQuarterTurns(column, playerIndex);
        return { playerIndex, turns, sideways: Math.abs(turns) % 2 === 1 };
      })
    )
  );

  getPlayerQuarterTurns(column: number[], index: number) {
    if (column.length === 1) {
      return -1;
    }

    const isTopTile = column.indexOf(index) === 0;
    return isTopTile ? 2 : 0;
  }
}
