import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useFirebaseAuth();
  console.log('isAuthenticated =', isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/'); // Rediriger vers la page d'accueil si non authentifié
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return isAuthenticated ? <>{children}</> : null;
} 