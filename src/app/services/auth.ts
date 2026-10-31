// @services/auth.ts
import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '@services/firebase';

/** Thin wrapper around Firebase Auth. Profile/user data lives in ProfileStore. */
@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly _currentUser = signal<User | null>(null);
  private readonly _resolved = signal(false);

  readonly currentUser = this._currentUser.asReadonly();

  /** True once Firebase has reported the initial auth state (signed in or not). */
  readonly resolved = this._resolved.asReadonly();

  /**
   * Stable uid. A computed only notifies when the value changes, so downstream
   * listeners re-subscribe on sign-in/out, not on every token refresh.
   */
  readonly uid = computed(() => this._currentUser()?.uid ?? null);

  private readonly unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    this._currentUser.set(user);
    this._resolved.set(true);
  });

  ngOnDestroy() {
    this.unsubscribeAuth();
  }

  async signInWithGoogle() {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async signOut() {
    await signOut(auth);
  }
}
