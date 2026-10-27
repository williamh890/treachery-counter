import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCOmRm9WqiL8GsZPFxGN03DvdC8-SGKLlo",
  authDomain: "treachery-counter.firebaseapp.com",
  projectId: "treachery-counter",
  storageBucket: "treachery-counter.firebasestorage.app",
  messagingSenderId: "15363933130",
  appId: "1:15363933130:web:861a6288d47fdaa8c58533"
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private app = initializeApp(firebaseConfig);
  private auth = getAuth(this.app);

  // A read-only Signal representing the logged-in user [1]
  currentUser = signal<User | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
    });
  }

  signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  logIn(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  logOut() {
    return signOut(this.auth);
  }
}
