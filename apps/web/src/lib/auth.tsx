'use client';

/**
 * Auth context for Rehearsa.
 *
 * Token storage decision: sessionStorage
 *   - Tokens are stored in sessionStorage rather than localStorage or a cookie.
 *   - sessionStorage is cleared when the browser tab/window is closed, limiting
 *     the exposure window of a disclosed token.
 *   - Unlike httpOnly cookies, sessionStorage is accessible to JavaScript —
 *     XSS attacks on the same origin could read the token. This is an accepted
 *     trade-off for a client-rendered SPA without a BFF (Backend For Frontend).
 *     localStorage would have the same XSS risk but survive tab close.
 *   - Refreshing the page keeps the token (unlike in-memory state), which
 *     prevents the user from being logged out on every page reload.
 *   - In a production hardening pass, migrating to httpOnly cookies set by the
 *     server would be the preferred approach. This is out of scope for M9.
 *
 * Known limitations:
 *   - The JWT is not invalidated server-side on logout (stateless JWT, M8 decision).
 *   - A new tab opened from an existing tab does NOT inherit the session
 *     (sessionStorage is per-tab). Users would need to log in again in new tabs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser, loginUser, registerUser, logoutUser } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthState {
  token: string | null;
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

const SESSION_TOKEN_KEY = 'rehearsa_token';
const SESSION_USER_KEY = 'rehearsa_user';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const storedUser = sessionStorage.getItem(SESSION_USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // sessionStorage unavailable (e.g. SSR, private browsing) — continue unauthenticated
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistSession = (newToken: string, newUser: AuthUser) => {
    try {
      sessionStorage.setItem(SESSION_TOKEN_KEY, newToken);
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(newUser));
    } catch {
      // Best-effort storage — app still works if sessionStorage is unavailable
    }
    setToken(newToken);
    setUser(newUser);
  };

  const clearSession = () => {
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
    } catch {}
    setToken(null);
    setUser(null);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    if (res.success && res.token && res.user) {
      persistSession(res.token, res.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message ?? 'Login failed.' };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await registerUser({ email, password });
    if (res.success && res.token && res.user) {
      persistSession(res.token, res.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message ?? 'Registration failed.' };
  }, []);

  const logout = useCallback(async () => {
    if (token) await logoutUser(token);
    clearSession();
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, register, logout }}>
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
