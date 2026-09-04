import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAyl2SYfWOxhBdMmS7KwPsMgrI1zcewBOY",
  authDomain: "gen-lang-client-0517780229.firebaseapp.com",
  projectId: "gen-lang-client-0517780229",
  storageBucket: "gen-lang-client-0517780229.firebasestorage.app",
  messagingSenderId: "166336870691",
  appId: "1:166336870691:web:6bb39fbc6d387e37a43496"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, 'ai-studio-11095d8c-b869-4a8c-9d98-35243efbdc56');
