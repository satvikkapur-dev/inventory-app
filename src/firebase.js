import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAIQBhtxn7z9GU1Jcf3wOjjfYzfyFos3bY",
  authDomain: "urbnfettch-invenetory.firebaseapp.com",
  projectId: "urbnfettch-invenetory",
  storageBucket: "urbnfettch-invenetory.firebasestorage.app",
  messagingSenderId: "70366519107",
  appId: "1:70366519107:web:8fd9a3f741c8705bfc99f6"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
