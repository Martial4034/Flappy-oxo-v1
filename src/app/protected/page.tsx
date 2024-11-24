'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Page Protégée</h1>
        <p>Cette page est doublement sécurisée</p>
      </div>
    </ProtectedRoute>
  );
} 