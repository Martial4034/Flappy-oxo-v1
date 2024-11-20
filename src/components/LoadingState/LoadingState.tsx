import { Placeholder } from '@telegram-apps/telegram-ui';
import type { ReactNode } from 'react';

interface LoadingStateProps {
  loading: boolean;
  error: Error | null;
  children: ReactNode;
  loadingComponent?: ReactNode;
}

export function LoadingState({
  loading,
  error,
  children,
  loadingComponent
}: LoadingStateProps) {
  if (loading) {
    return loadingComponent || (
      <Placeholder
        header="Loading..."
        description="Please wait while we load your data"
      />
    );
  }

  if (error) {
    return (
      <Placeholder
        header="Error"
        description={error.message}
      />
    );
  }

  return <>{children}</>;
} 