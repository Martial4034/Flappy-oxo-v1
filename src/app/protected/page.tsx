'use client';

import { Section, Cell } from '@telegram-apps/telegram-ui';
import { Page } from '@/components/Page';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ReferralButton } from '@/components/ReferralButton/ReferralButton';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

export default function ProtectedPage() {
  const { user } = useFirebaseAuth();

  return (
    <Page>
      <ProtectedRoute>
        <Section header="Page Protégée">
          <Cell
            subtitle={`ID utilisateur: ${user?.uid || 'Non connecté'}`}
          >
            Bienvenue sur la page protégée
          </Cell>
        </Section>

        <ReferralButton />
      </ProtectedRoute>
    </Page>
  );
}