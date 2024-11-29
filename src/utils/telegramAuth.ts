import crypto from 'crypto';

interface TelegramUser {
  id: number;
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
  console.log('📥 Données reçues (brutes):', initDataString);

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN manquant');
    return {
      isValid: false,
      user: null,
      message: 'Configuration serveur manquante (BOT_TOKEN)',
      validatedData: null,
    };
  }

  try {
    // Parse `initDataString` en tant que URLSearchParams
    const initData = new URLSearchParams(initDataString);
    const hash = initData.get('hash');

    if (!hash) {
      console.error('❌ Hash manquant dans les données');
      return {
        isValid: false,
        user: null,
        message: 'Hash manquant',
        validatedData: null,
      };
    }

    // Étape 1: Retirer le hash pour calculer le `dataCheckString`
    initData.delete('hash');
    const dataCheckString = Array.from(initData.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Tri alphabétique des clés
      .map(([key, value]) => `${key}=${value}`) // Clé=valeur
      .join('\n');

    // Étape 2: Créer la clé secrète à partir du BOT_TOKEN
    const secretKey = crypto.createHmac('sha256', 'WebAppData') // Utiliser "WebAppData" comme clé
      .update(BOT_TOKEN)
      .digest();

    // Étape 3: Calculer le hash local basé sur `dataCheckString`
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Étape 4: Comparer le hash reçu et le hash calculé
    if (calculatedHash !== hash) {
      console.error('❌ Hash invalide : les données ont été modifiées ou sont incorrectes');
      return {
        isValid: false,
        user: null,
        message: 'Données non valides (hash incorrect)',
        validatedData: null,
      };
    }

    // Étape 5: Validation réussie, vérifier les autres champs (auth_date, user, etc.)
    const authDate = initData.get('auth_date');
    if (!authDate) {
      console.error('❌ Date d\'authentification manquante');
      return {
        isValid: false,
        user: null,
        message: 'Date d\'authentification manquante',
        validatedData: null,
      };
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const authTimestamp = parseInt(authDate, 10);

    // Vérifier que `auth_date` est dans une plage de 5 minutes
    if (currentTimestamp - authTimestamp > 5 * 60) {
      console.error('❌ Données expirées (plus de 5 minutes)');
      return {
        isValid: false,
        user: null,
        message: 'Données expirées',
        validatedData: null,
      };
    }

    // Extraire et valider l'utilisateur
    const userString = initData.get('user');
    if (!userString) {
      console.error('❌ Données utilisateur manquantes');
      return {
        isValid: false,
        user: null,
        message: 'Données utilisateur manquantes',
        validatedData: null,
      };
    }

    try {
      const user = JSON.parse(userString) as TelegramUser;
      const validatedData = Object.fromEntries(initData.entries());

      console.log('✅ Validation réussie pour l\'utilisateur:', user);
      return {
        isValid: true,
        user,
        message: 'Validation réussie',
        validatedData,
      };
    } catch (error) {
      console.error('❌ Erreur lors du parsing des données utilisateur:', error);
      return {
        isValid: false,
        user: null,
        message: 'Erreur dans le format des données utilisateur',
        validatedData: null,
      };
    }
  } catch (error) {
    console.error('❌ Erreur générale lors de la validation:', error);
    return {
      isValid: false,
      user: null,
      message: 'Erreur lors de la validation',
      validatedData: null,
    };
  }
}
