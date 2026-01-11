import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDARrpOH46iRYinZ7-gdcogf2TjwDbKPsQ",
  authDomain: "ayudaepuyen.firebaseapp.com",
  projectId: "ayudaepuyen",
  storageBucket: "ayudaepuyen.firebasestorage.app",
  messagingSenderId: "763989049970",
  appId: "1:763989049970:web:7060b458e9f6f5947138eb"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();