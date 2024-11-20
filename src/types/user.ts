export interface UserData {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin';
  walletAddress?: string;
  walletPublicKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameData {
  userId: string;
  score: number;
  playedAt: Date;
} 