'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onSuccess?: () => void;
}

export function AuthForms({ onSuccess }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = mode === 'login'
      ? await login(email, password)
      : await register(email, password);

    setIsSubmitting(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
      {/* Mode tabs */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => { setMode('login'); setError(null); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mode === 'login'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(null); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mode === 'register'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            Create Account
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete={mode === 'login' ? 'email' : 'username'}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
            required
            minLength={mode === 'register' ? 8 : 1}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Please wait…</span></>
          ) : mode === 'login' ? (
            <><LogIn className="w-4 h-4" /><span>Sign In</span></>
          ) : (
            <><UserPlus className="w-4 h-4" /><span>Create Account</span></>
          )}
        </button>
      </form>
    </div>
  );
}
