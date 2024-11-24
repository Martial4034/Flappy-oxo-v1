// hooks/useFirebaseAuth.ts

import { useCallback, useMemo, useState, useEffect } from 'react';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { auth } from '@/core/firebase/config';
import { signInWithCustomToken } from 'firebase/auth';
import { User } from 'firebase/auth';

export interface AuthState {
  loading: boolean;
  error: Error | null;
  user: User | null;
  isAuthenticated: boolean;
}

export function useFirebaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    error: null,
    user: null,
    isAuthenticated: false
  });

  const initDataUser = useSignal(initData.user);

  // Mémoriser les données d'initialisation
  const initDataPayload = useMemo(() => {
    if (!initDataUser) return null;
    return {
      initData: initData.raw,
      user: {
        id: initDataUser.id,
        firstName: initDataUser.firstName,
        lastName: initDataUser.lastName,
        username: initDataUser.username,
        photoUrl: initDataUser.photoUrl,
        languageCode: initDataUser.languageCode
      }
    };
  }, [initDataUser]);

  // Écouter les changements d'état d'authentification
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthState(prev => ({
        ...prev,
        user,
        loading: false,
        isAuthenticated: !!user
      }));
    });

    return () => unsubscribe();
  }, []);

  const authenticate = useCallback(async () => {
    if (!initDataPayload) {
      const error = new Error('Données Telegram non disponibles');
      setAuthState(prev => ({ ...prev, error, loading: false }));
      return null;
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initDataPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }

      if (!data.customToken) {
        throw new Error('Token personnalisé manquant dans la réponse');
      }

      const userCredential = await signInWithCustomToken(auth, data.customToken);
      return userCredential.user;

    } catch (error) {
      const authError = error as Error;
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: authError,
        isAuthenticated: false
      }));
      throw authError;
    }
  }, [initDataPayload]);

  return {
    ...authState,
    authenticate,
    initDataUser
  };
}
