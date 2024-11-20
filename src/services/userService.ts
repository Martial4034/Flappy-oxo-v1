import { db } from '@/core/firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
} from 'firebase/firestore';
import type { UserData } from '@/types/user';

// Type pour les données stockées dans Firestore
type FirestoreData = Omit<UserData, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};

export class UserService {
  private static COLLECTION = 'users';

  private static toFirestore(userData: Partial<UserData>): Partial<FirestoreData> {
    const now = Date.now();
    const firestoreData: Partial<FirestoreData> = {
      ...userData,
      createdAt: userData.createdAt?.getTime() || now,
      updatedAt: now,
      role: userData.role || 'user'
    };

    // Filtrer les valeurs undefined
    return Object.fromEntries(
      Object.entries(firestoreData).filter(([_, value]) => value !== undefined)
    ) as Partial<FirestoreData>;
  }

  private static fromFirestore(data: FirestoreData): UserData {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  static async createOrUpdateUser(userData: Partial<UserData>): Promise<UserData> {
    if (!userData.telegramId) {
      throw new Error('telegramId is required');
    }

    const userRef = doc(db, this.COLLECTION, userData.telegramId.toString());
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const newUserData = {
        ...userData,
        role: 'user' as const
      };
      
      const firestoreData = this.toFirestore(newUserData);
      await setDoc(userRef, firestoreData);
      return this.fromFirestore(firestoreData as FirestoreData);
    }

    const existingData = userDoc.data() as FirestoreData;
    const updatedData = {
      ...existingData,
      ...this.toFirestore(userData),
      role: existingData.role || 'user' as const
    };

    await updateDoc(userRef, updatedData);
    return this.fromFirestore(updatedData as FirestoreData);
  }

  static async getUserById(telegramId: number): Promise<UserData | null> {
    const userRef = doc(db, this.COLLECTION, telegramId.toString());
    const userDoc = await getDoc(userRef);
    
    return userDoc.exists() 
      ? this.fromFirestore(userDoc.data() as FirestoreData) 
      : null;
  }
} 