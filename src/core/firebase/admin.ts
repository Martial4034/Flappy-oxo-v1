import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Initialisation de Firebase Admin
if (!getApps().length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const authAdmin = admin.auth();
export const firestoreAdmin = admin.firestore();

interface UserData {
  telegramId: number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  photoUrl?: string | null;
  languageCode?: string;
  referredBy?: string | null;
  referralCode: string;
  referralCount: number;
}

interface RequestInfo {
  ip: string;
  userAgent: string;
}

export async function getOrCreateFirebaseUser(userData: UserData, requestInfo: RequestInfo) {
  const { telegramId, firstName, lastName, username } = userData;
  
  try {
    // Rechercher d'abord un utilisateur existant par telegramId
    const usersSnapshot = await firestoreAdmin
      .collection('users')
      .where('telegramId', '==', telegramId)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      // Utilisateur existant trouvé
      const userDoc = usersSnapshot.docs[0];
      console.log('Utilisateur existant trouvé:', userDoc.id);
      
      // Mettre à jour les informations de l'utilisateur
      await userDoc.ref.update({
        ...userData,
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        'deviceInfo.lastIp': requestInfo.ip,
        'deviceInfo.lastUserAgent': requestInfo.userAgent,
        'deviceInfo.lastLoginAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      // Vérifier si l'utilisateur existe dans Authentication
      try {
        await authAdmin.getUser(userDoc.id);
      } catch (error) {
        // Si l'utilisateur n'existe pas dans Auth, le créer
        await authAdmin.createUser({
          uid: userDoc.id,
          displayName: [firstName, lastName].filter(Boolean).join(' ') || `User_${telegramId}`,
          photoURL: userData.photoUrl || undefined,
        });
      }

      return {
        uid: userDoc.id,
        isNewUser: false,
        referralCode: userDoc.data().referralCode
      };
    }

    // Créer un nouvel utilisateur
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || `User_${telegramId}`;
    
    // Créer un ID unique basé sur l'ID Telegram
    const uid = `telegram_${telegramId}`;
    const referralCode = generateReferralCode(telegramId);

    // Créer l'utilisateur dans Authentication
    await authAdmin.createUser({
      uid,
      displayName,
      photoURL: userData.photoUrl || undefined,
    });

    // Créer le document utilisateur avec les informations de parrainage
    await firestoreAdmin.collection('users').doc(uid).set({
      ...userData,
      displayName,
      referralCode,
      referralCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      deviceInfo: {
        firstIp: requestInfo.ip,
        firstUserAgent: requestInfo.userAgent,
        lastIp: requestInfo.ip,
        lastUserAgent: requestInfo.userAgent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    });

    console.log('Nouvel utilisateur créé:', uid);

    return {
      uid,
      isNewUser: true,
      referralCode
    };
  } catch (error) {
    console.error('Erreur lors de la gestion de l\'utilisateur:', error);
    throw error;
  }
}

// Fonction utilitaire pour générer un code de parrainage unique
function generateReferralCode(telegramId: number): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `REF_${telegramId}_${timestamp}${random}`.toUpperCase();
}

// Nouvelle fonction pour gérer les parrainages
export async function handleReferral(userId: string, referralCode: string) {
  try {
    // Vérifier que l'utilisateur n'est pas déjà parrainé
    const userDoc = await firestoreAdmin.collection('users').doc(userId).get();
    if (userDoc.data()?.referredBy) {
      return { success: false, message: 'Utilisateur déjà parrainé' };
    }

    // Trouver le parrain
    const referrerSnapshot = await firestoreAdmin
      .collection('users')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (referrerSnapshot.empty) {
      return { success: false, message: 'Code de parrainage invalide' };
    }

    const referrerDoc = referrerSnapshot.docs[0];
    
    // Mettre à jour l'utilisateur parrainé
    await userDoc.ref.update({
      referredBy: referrerDoc.id,
      referredAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Mettre à jour le compteur du parrain
    await referrerDoc.ref.update({
      referralCount: admin.firestore.FieldValue.increment(1)
    });

    return { success: true, referrerId: referrerDoc.id };
  } catch (error) {
    console.error('Erreur lors du parrainage:', error);
    throw error;
  }
}