// app/api/auth/verify/route.ts

import { NextResponse } from 'next/server';
import { authAdmin, getOrCreateFirebaseUser } from '@/core/firebase/admin';
import { validateTelegramData } from '@/utils/telegramAuth';
import { cookies } from 'next/headers';
import { encrypt, SESSION_DURATION } from '@/utils/session';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  console.log('\n📨 Nouvelle requête d\'authentification');
  
  try {
    const { initData } = await request.json();
    console.log('🔍 initData:', initData);
  

    const validation = validateTelegramData(initData);
    console.log('🔍 Résultat validation:', validation.message);

    if (!validation.isValid || !validation.user) {
      return NextResponse.json(
        { error: validation.message },
        { status: 401 }
      );
    }

    const headersList = headers();
    const requestInfo = {
      ip: headersList.get('x-forwarded-for') || 'unknown',
      userAgent: headersList.get('user-agent') || 'unknown'
    };

    try {
      // S'assurer que l'ID est un nombre
      const telegramId = Number(validation.user.id);
      if (isNaN(telegramId) || telegramId <= 0) {
        throw new Error('ID Telegram invalide');
      }

      
      const { first_name, last_name, username, photo_url, language_code } = validation.user;
      
      // Vérification et attribution du username
      
      const usernameToUse = username || `${first_name}`;
      
      if (!first_name || !last_name || !photo_url || !language_code) {
        return NextResponse.json(
          { error: 'Certaines données utilisateur sont manquantes' },
          { status: 400 }
        );
      }


      // Créer/récupérer l'utilisateur Firebase
      const { uid, isNewUser } = await getOrCreateFirebaseUser({
        telegramId,
        firstName: first_name,
        lastName: last_name,
        username: usernameToUse,
        photoUrl: photo_url,
        languageCode: language_code,
        referralCode: '', // Valeur par défaut
        referralCount: 0   // Valeur par défaut
      }, requestInfo);

      // Générer le token Firebase
      const customToken = await authAdmin.createCustomToken(uid);

      // Créer une session
      const expires = new Date(Date.now() + SESSION_DURATION);
      const session = await encrypt({ 
        user: { 
          telegramId,
          uid 
        }, 
        expires 
      });

      // Sauvegarder la session dans un cookie
      cookies().set('session', session, { 
        expires, 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      console.log('✅ Authentification réussie pour:', uid);
      
      return NextResponse.json({
        customToken,
        uid,
        isNewUser,
        status: 'success',
        message: 'Authentification réussie'
      });

    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'utilisateur Firebase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'utilisateur' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}