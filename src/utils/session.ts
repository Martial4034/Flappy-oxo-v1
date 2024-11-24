import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { JWTPayload } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
}

const key = new TextEncoder().encode(JWT_SECRET);

export const SESSION_DURATION = 60 * 60 * 1000;

export interface SessionUser {
  telegramId: number;
  uid: string;
}

export interface SessionData extends JWTPayload {
  user: SessionUser;
  expires: string;
}

export async function encrypt(payload: {
  user: SessionUser;
  expires: Date;
}): Promise<string> {
  const sessionData: SessionData = {
    user: payload.user,
    expires: payload.expires.toISOString(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(payload.expires.getTime() / 1000),
  };

  return await new SignJWT(sessionData)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionData> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'user' in payload &&
      'expires' in payload &&
      typeof payload.user === 'object' &&
      payload.user !== null &&
      'telegramId' in payload.user &&
      'uid' in payload.user
    ) {
      return payload as SessionData;
    }
    throw new Error('Structure de session invalide');
  } catch (error) {
    console.error('Erreur déchiffrement session:', error);
    throw error;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const sessionCookie = cookies().get('session');
  
  if (!sessionCookie?.value) {
    return null;
  }

  try {
    return await decrypt(sessionCookie.value);
  } catch (error) {
    console.error('Erreur lecture session:', error);
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  
  if (!sessionCookie?.value) {
    return;
  }

  try {
    const currentSession = await decrypt(sessionCookie.value);
    const newExpires = new Date(Date.now() + SESSION_DURATION);
    
    const res = NextResponse.next();
    res.cookies.set({
      name: 'session',
      value: await encrypt({
        user: currentSession.user,
        expires: newExpires
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: newExpires,
    });
    
    return res;
  } catch (error) {
    console.error('Erreur mise à jour session:', error);
    return;
  }
} 