import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';
import type { User, AuthResponse } from '../types/api';


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ setAccessToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Auto-refresh token
  const { data: refreshData, isLoading } = useQuery<AuthResponse>({
    queryKey: ['auth', 'refresh'],
    queryFn: authApi.refresh,
    retry: false,
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (refreshData) {
      setUser(refreshData.user);
      setAccessToken(refreshData.accessToken);
      // Set token for API calls
      authApi.setToken(refreshData.accessToken);
    }
  }, [refreshData]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password, totpCode }: { email: string; password: string; totpCode?: string }) =>
      authApi.login(email, password, totpCode),
    onSuccess: (data: AuthResponse) => {
      setUser(data.user);
      setAccessToken(data.accessToken);
      authApi.setToken(data.accessToken);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setUser(null);
      setAccessToken(null);
      authApi.setToken(null);
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string, totpCode?: string) => {
    await loginMutation.mutateAsync({ email, password, totpCode });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refreshToken = async () => {
    const data: AuthResponse = await authApi.refresh();
    setUser(data.user);
    setAccessToken(data.accessToken);
    authApi.setToken(data.accessToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}