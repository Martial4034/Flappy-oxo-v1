import crypto from 'crypto';

interface TelegramUser {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface ValidationResult {
  isValid: boolean;
  user: TelegramUser | null;
  message: string;
  validatedData: Record<string, string> | null;
}

export function validateTelegramData(initDataString: string): ValidationResult {
  console.log('\n🔄 Validation des données Telegram');
  console.log('📥 Données reçues:', initDataString);

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN manquant');
    return {
      isValid: false,
      user: null,
      message: 'Configuration serveur manquante',
      validatedData: null
    };
  }

  try {
    const initData = new URLSearchParams(initDataString);
    const hash = initData.get('hash');
    
    if (!hash) {
      console.error('❌ Hash manquant');
      return {
        isValid: false,
        user: null,
        message: 'Hash manquant',
        validatedData: null
      };
    }

    // Vérifier l'âge des données
    const authDate = initData.get('auth_date');
    if (!authDate) {
      console.error('❌ auth_date manquant');
      return {
        isValid: false,
        user: null,
        message: 'Date d\'authentification manquante',
        validatedData: null
      };
    }

    const authTimestamp = parseInt(authDate, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeDifference = currentTimestamp - authTimestamp;
    const fiveMinutesInSeconds = 5 * 60;

    if (timeDifference > fiveMinutesInSeconds) {
      console.error('⏰ Données expirées');
      return {
        isValid: false,
        user: null,
        message: 'Données expirées (> 5 minutes)',
        validatedData: null
      };
    }

    // Préparer la vérification du hash
    initData.delete('hash');
    const dataCheckString = Array.from(initData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('📝 Données à vérifier:', dataCheckString);

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      console.error('❌ Hash invalide');
      return {
        isValid: false,
        user: null,
        message: 'Données non valides',
        validatedData: null
      };
    }

    const userString = initData.get('user');
    if (!userString) {
      console.error('❌ Données utilisateur manquantes');
      return {
        isValid: false,
        user: null,
        message: 'Données utilisateur manquantes',
        validatedData: null
      };
    }

    try {
      const user = JSON.parse(userString) as TelegramUser;
      const validatedData = Object.fromEntries(initData.entries());

      console.log('✅ Validation réussie pour:', user);
      return {
        isValid: true,
        user,
        message: 'Validation réussie',
        validatedData
      };
    } catch (error) {
      console.error('❌ Erreur parsing utilisateur:', error);
      return {
        isValid: false,
        user: null,
        message: 'Erreur format données utilisateur',
        validatedData: null
      };
    }
  } catch (error) {
    console.error('❌ Erreur validation:', error);
    return {
      isValid: false,
      user: null,
      message: 'Erreur validation',
      validatedData: null
    };
  }
} 