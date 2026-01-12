import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import * as authService from '@/services/auth.service';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Nos suscribimos a los cambios (Login/Logout)
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
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
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Helper para actualizar el estado de carga manualmente si hace falta
  const setAuthLoading = (state: boolean) => setLoading(state);

  return { user, loading, login, logout };
};