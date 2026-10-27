import { Injectable, signal } from '@angular/core';
import {
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from './firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser.set(user);
    });
  }

  signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  logIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  logInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  logOut() {
    return signOut(auth);
  }
}
