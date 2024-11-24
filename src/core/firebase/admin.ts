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
        isNewUser: false
      };
    }

    // Créer un nouvel utilisateur
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || `User_${telegramId}`;
    
    // Créer un ID unique basé sur l'ID Telegram
    const uid = `telegram_${telegramId}`;

    // Créer l'utilisateur dans Authentication
    await authAdmin.createUser({
      uid,
      displayName,
      photoURL: userData.photoUrl || undefined,
    });

    // Créer le document utilisateur dans Firestore
    await firestoreAdmin.collection('users').doc(uid).set({
      ...userData,
      displayName,
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
      isNewUser: true
    };
  } catch (error) {
    console.error('Erreur lors de la gestion de l\'utilisateur:', error);
    throw error;
  }
}