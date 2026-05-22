'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface AuthContextValue {
  userId: string | undefined;
  email: string | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const value: AuthContextValue = {
    userId: session?.user?.id,
    email: session?.user?.email,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
