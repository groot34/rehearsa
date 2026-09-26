'use client';

/**
 * Auth context for Rehearsa.
 *
 * Authentication: HttpOnly cookies
 *   - JWT stored in HttpOnly cookie set by backend on login/register.
 *   - JavaScript cannot read the cookie (XSS-resistant).
 *   - Tabs inherit the cookie automatically.
 *   - Token cleared on logout via backend cookie clearing.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser, loginUser, registerUser, logoutUser } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount via /auth/me
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.user) {
          setUser(data.user);
        }
      } catch {
        // Session check failed — continue unauthenticated
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const clearSession = () => {
    setUser(null);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    if (res.success && res.user) {
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message ?? 'Login failed.' };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await registerUser({ email, password });
    if (res.success && res.user) {
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message ?? 'Registration failed.' };
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    clearSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
