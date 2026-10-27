import { Component, inject } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [MatButtonModule, RouterLink, RouterLinkActive],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
}
