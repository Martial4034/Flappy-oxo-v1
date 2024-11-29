import { useCallback, useState, useEffect } from 'react';
import { auth } from '@/core/firebase/config';
import { signInWithCustomToken } from 'firebase/auth';
import { User } from 'firebase/auth';
import { useClientOnce } from '@/hooks/useClientOnce';
import {
  isTMA,
  type LaunchParams,
  mockTelegramEnv,
  parseInitData,
  retrieveLaunchParams,
} from '@telegram-apps/sdk-react';

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

  // Configuration initiale avec mock si nécessaire
  useClientOnce(() => {
    if (!sessionStorage.getItem('auth-mocked') && !isTMA('simple')) {
      const initDataRaw = new URLSearchParams([
        ['user', JSON.stringify({
          id: 99281932,
          first_name: 'Andrew',
          last_name: 'Rogue',
          username: 'rogue',
          language_code: 'en',
          is_premium: true,
          allows_write_to_pm: true,
        })],
        ['hash', '89d6079ad6762351f38c6dbbc41bb53048019256a9443988af7a48bcad16ba31'],
        ['auth_date', '1716922846'],
        ['start_param', 'debug'],
        ['chat_type', 'sender'],
        ['chat_instance', '8428209589180549439'],
      ]).toString();

      const mockLaunchParams: LaunchParams = {
        themeParams: {
          accentTextColor: '#6ab2f2',
          bgColor: '#17212b',
          buttonColor: '#5288c1',
          buttonTextColor: '#ffffff',
          destructiveTextColor: '#ec3942',
          headerBgColor: '#17212b',
          hintColor: '#708499',
          linkColor: '#6ab3f3',
          secondaryBgColor: '#232e3c',
          sectionBgColor: '#17212b',
          sectionHeaderTextColor: '#6ab3f3',
          subtitleTextColor: '#708499',
          textColor: '#f5f5f5',
        },
        initData: parseInitData(initDataRaw),
        initDataRaw,
        version: '8',
        platform: 'tdesktop',
      };

      sessionStorage.setItem('auth-mocked', '1');
      mockTelegramEnv(mockLaunchParams);
    }
  });

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
    let launchParams: LaunchParams | undefined;
    
    try {
      launchParams = retrieveLaunchParams();
    } catch (e) {
      console.warn('Impossible de récupérer les paramètres de lancement, utilisation des données mockées');
    }

    if (!launchParams?.initDataRaw) {
      const error = new Error('Données d\'authentification non disponibles');
      setAuthState(prev => ({ ...prev, error, loading: false }));
      return null;
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    console.log('🔍 launchParams.initDataRaw:', launchParams.initDataRaw);
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initData: launchParams.initDataRaw 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }

      if (!data.customToken) {
        throw new Error('Token personnalisé manquant dans la réponse');
      }

      const userCredential = await signInWithCustomToken(auth, data.customToken);
      setAuthState(prev => ({
        ...prev,
        user: userCredential.user,
        loading: false,
        isAuthenticated: true,
        error: null
      }));
      
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
  }, []);

  return {
    ...authState,
    authenticate
  };
}