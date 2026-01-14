import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import * as authService from '@/services/auth.service';
import { db } from '@/lib/firebase'; // Asegúrate de tener este export en tu config
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '@/types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // <--- ESTADO NUEVO PARA EL ROL
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Nos suscribimos a los cambios (Login/Logout)
    const unsubscribe = authService.subscribeToAuthChanges(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // --- AQUÍ ESTÁ LA MAGIA: Buscamos el rol en la DB ---
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            // Si el usuario ya existe, cargamos su perfil (incluyendo si es admin)
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Si es la primera vez que entra, creamos un perfil base (rol: 'user')
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || "",
              displayName: currentUser.displayName || "Usuario Nuevo",
              role: 'user', // Por defecto nadie es admin
            };
            
            // Guardamos en Firestore
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error cargando perfil:", error);
        }
      } else {
        // Si hizo logout, limpiamos el perfil
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await authService.loginWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      console.error("Login error:", error);
      alert("No se pudo iniciar sesión.");
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setProfile(null); // Limpiamos perfil al salir
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Retornamos 'profile' para que admin/page.tsx pueda verificar el rol
  return { user, profile, loading, login, logout };
};