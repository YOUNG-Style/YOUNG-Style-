import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBTB_4VOdexf-TSJqfSyB8DlCVFe8M_U2A",
  authDomain: "young-style-e4310.firebaseapp.com",
  projectId: "young-style-e4310",
  storageBucket: "young-style-e4310.firebasestorage.app",
  messagingSenderId: "140848630832",
  appId: "1:140848630832:web:f3271efe3b8222879e71f5",
  measurementId: "G-ZW5GQLR6YM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  doc,
  setDoc,
  getDoc
};
