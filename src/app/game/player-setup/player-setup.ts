import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-player-setup',
  styleUrl: './player-setup.css',
  templateUrl: './player-setup.html',
})
export class PlayerSetup {
  seat = input.required<number>();
}
