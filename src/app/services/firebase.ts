// firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCOmRm9WqiL8GsZPFxGN03DvdC8-SGKLlo",
  authDomain: "treachery-counter.firebaseapp.com",
  projectId: "treachery-counter",
  storageBucket: "treachery-counter.firebasestorage.app",
  messagingSenderId: "15363933130",
  appId: "1:15363933130:web:861a6288d47fdaa8c58533"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
