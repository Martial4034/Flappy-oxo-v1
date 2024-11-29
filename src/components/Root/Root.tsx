'use client';

import { type PropsWithChildren, useEffect } from 'react';
import { miniApp, useLaunchParams, useSignal, initData } from '@telegram-apps/sdk-react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorPage } from '@/components/ErrorPage';
import { useTelegramMock } from '@/hooks/useTelegramMock';
import { useDidMount } from '@/hooks/useDidMount';
import { useClientOnce } from '@/hooks/useClientOnce';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { setLocale } from '@/core/i18n/locale';
import { init } from '@/core/init';

import './styles.css';

function RootInner({ children }: PropsWithChildren) {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTelegramMock();
  }

  const lp = useLaunchParams();
  const debug = isDev || lp.startParam === 'debug';

  useClientOnce(() => {
    init(debug);
  });

  const isDark = useSignal(miniApp.isDark);
  const telegramUser = useSignal(initData.user);
  const { loading, error, isAuthenticated, authenticate } = useFirebaseAuth();

  useEffect(() => {
    if (telegramUser?.languageCode) {
      setLocale(telegramUser.languageCode);
    }
  }, [telegramUser]);

  useEffect(() => {
    debug && import('eruda').then((lib) => lib.default.init());
  }, [debug]);

  useEffect(() => {
    if (!isAuthenticated && !loading && !error) {
      authenticate().catch(console.error);
    }
    console.log('isAuthenticated', isAuthenticated);
    console.log('User', telegramUser);
  }, [isAuthenticated, loading, error, authenticate]);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      console.log('Route changée vers:', url);
    };

    window.addEventListener('popstate', () => {
      console.log('Navigation détectée');
    });

    return () => {
      window.removeEventListener('popstate', () => {
        console.log('Navigation détectée');
      });
    };
  }, []);

  const handleReauthenticate = () => {
    authenticate().catch(console.error);
  };

  if (error) {
    return (
      <>
        <ErrorPage error={error} />
        <button onClick={handleReauthenticate}>Réessayer l&apos;authentification</button>
      </>
    );
  }

  if (loading) {
    return <div className="root__loading">Loading...</div>;
  }

  return (
    <TonConnectUIProvider manifestUrl="https://flappy-oxo-v1.vercel.app/tonconnect-manifest.json">
      <AppRoot
        appearance={isDark ? 'dark' : 'light'}
        platform={['macos', 'ios'].includes(lp.platform) ? 'ios' : 'base'}
      >
        {children}
      </AppRoot>
    </TonConnectUIProvider>
  );
}

export function Root(props: PropsWithChildren) {
  const didMount = useDidMount();

  return didMount ? (
    <ErrorBoundary fallback={ErrorPage}>
      <RootInner {...props} />
    </ErrorBoundary>
  ) : (
    <div className="root__loading">Loading</div>
  );
}
