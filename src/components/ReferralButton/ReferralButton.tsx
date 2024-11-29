'use client';

import { useCallback, useState } from 'react';
import { Section, Cell, Button } from '@telegram-apps/telegram-ui';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';


export function ReferralButton() {
  const { user } = useFirebaseAuth();
  const [copied, setCopied] = useState(false);

  const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'Erreur_bot';
  const BASE_URL = `https://t.me/${BOT_USERNAME}/start`;

  const getReferralLink = useCallback(() => {
    if (!user) return '';
    // Utiliser l'UID de l'utilisateur comme paramètre de démarrage
    return `${BASE_URL}?start=ref_${user.uid}`;
  }, [user, BOT_USERNAME]);

  const handleShare = useCallback(() => {
    const link = getReferralLink();
    const text = 'Rejoins-moi sur cette application !';
    openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  }, [getReferralLink]);

  const handleCopy = useCallback(async () => {
    const link = getReferralLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  }, [getReferralLink]);

  if (!user) return null;

  return (
    <Section header="Inviter des amis">
      <Cell
        onClick={handleShare}
        subtitle="Partager directement via Telegram"
      >
        Inviter des amis
      </Cell>
      <Cell
        onClick={handleCopy}
        subtitle={copied ? "Lien copié !" : "Copier le lien d'invitation"}
      >
        Copier le lien
      </Cell>
    </Section>
  );
}