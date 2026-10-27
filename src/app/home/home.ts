import { Component, inject } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../auth';

@Component({
  imports: [MatButtonModule, RouterLink, RouterLinkActive],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  authService = inject(AuthService);


 async signInWithGoogle() {
    try {
      await this.authService.logInWithGoogle();
      console.log('Successfully signed in with Google!');
    } catch (error) {
      console.error('Google Sign-In failed:', error);
    }
  }
}
