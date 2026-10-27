import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

import { AuthService } from '@services/auth';

@Component({
  imports: [MatButton, MatDivider, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger],
  selector: 'app-login-btn',
  styleUrl: './login-btn.css',
  templateUrl: './login-btn.html',
})
export class LoginBtn {
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
