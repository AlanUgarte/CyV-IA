import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<string>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  // Bootstrap: hydrate user from token so guards survive a page reload
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    authApi.me()
      .then(({ data }) => setState({ user: data.data, isLoading: false, isAuthenticated: true }))
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setState({ user: null, isLoading: false, isAuthenticated: false });
      });
  }, []);

  // Listen for forced logout events (401 after refresh failure)
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const { accessToken, refreshToken, user } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setState({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as User['role'],
        status: 'active',
        plan: user.subscription?.plan ?? null,
        extraPermissions: [],
        planFeatures: [],
        maxCampaigns: user.subscription?.maxCampaigns ?? null,
        maxCreatives: user.subscription?.maxCreatives ?? null,
      },
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const register = async (email: string, password: string, fullName: string) => {
    const { data } = await authApi.register(email, password, fullName);
    return (data as { message: string }).message;
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
