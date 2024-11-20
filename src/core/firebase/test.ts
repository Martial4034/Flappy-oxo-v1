import { db } from './config';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export async function testFirebaseConnection() {
  try {
    // Essayer de créer une collection de test
    const testCollection = collection(db, 'test');
    
    // Ajouter un document test
    const testDoc = await addDoc(testCollection, {
      test: true,
      timestamp: Date.now(),
      message: 'Test connection'
    });
    
    console.log('Test document created with ID:', testDoc.id);
    
    // Lire la collection pour vérifier
    const querySnapshot = await getDocs(testCollection);
    console.log('Documents in test collection:', querySnapshot.size);
    querySnapshot.forEach((doc) => {
      console.log('Document data:', doc.id, doc.data());
    });

    return true;
  } catch (error) {
    console.error('Firebase test failed:', error);
    return false;
  }
} 