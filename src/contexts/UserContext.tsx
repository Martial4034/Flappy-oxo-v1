import { createContext, useContext, useState, useEffect } from 'react';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { useTonWallet } from '@tonconnect/ui-react';
import { UserService } from '@/services/userService';
import { testFirebaseConnection } from '@/core/firebase/test';
import type { UserData } from '@/types/user';

interface UserContextType {
  user: UserData | null;
  loading: boolean;
  error: Error | null;
  updateUser: (data: Partial<UserData>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  console.log('Les données de l\'utilisateur sont depuis le context :', user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const wallet = useTonWallet();
  const telegramUser = useSignal(initData.user);

  useEffect(() => {
    const testConnection = async () => {
      console.log('Testing Firebase connection...');
      const isConnected = await testFirebaseConnection();
      console.log('Firebase connection test result:', isConnected);
    };

    testConnection();
  }, []);

  useEffect(() => {
    const initUser = async () => {
      console.log('On initie les données de l\'utilisateur');
      if (!telegramUser) {
        console.log('No telegram user found');
        return;
      }
      console.log('telegramUser', telegramUser);
      
      try {
        console.log('Attempting to create/update user...');
        const userData = await UserService.createOrUpdateUser({
          telegramId: Number(telegramUser.id),
          username: telegramUser.username || undefined,
          firstName: telegramUser.firstName || undefined,
          lastName: telegramUser.lastName || undefined,
          walletAddress: wallet?.account.address,
          walletPublicKey: wallet?.account.publicKey,
          role: 'user',
        });
        
        console.log('User created/updated successfully:', userData);
        setUser(userData);
      } catch (err) {
        console.error('Error creating/updating user:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [telegramUser, wallet]);

  const updateUser = async (data: Partial<UserData>) => {
    if (!user) return;
    
    try {
      const updatedUser = await UserService.createOrUpdateUser({
        ...user,
        ...data,
      });
      setUser(updatedUser);
    } catch (err) {
      setError(err as Error);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, error, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}; 