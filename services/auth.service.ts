import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

// Iniciar sesión con Google
export const loginWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    throw error;
  }
};

// Cerrar sesión
export const logout = async () => {
  return await signOut(auth);
};

// Escuchar cambios de sesión (Observer)
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};