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
    
    if (!initData) {
      console.error('❌ Données manquantes');
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

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
      if (isNaN(telegramId)) {
        throw new Error('ID Telegram invalide');
      }

      // Créer/récupérer l'utilisateur Firebase
      const { uid, isNewUser } = await getOrCreateFirebaseUser({
        telegramId,
        firstName: validation.user.first_name,
        lastName: validation.user.last_name,
        username: validation.user.username,
        photoUrl: validation.user.photo_url,
        languageCode: validation.user.language_code
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
      console.error('❌ Erreur Firebase:', error);
      return NextResponse.json(
        { error: 'Erreur authentification' },
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