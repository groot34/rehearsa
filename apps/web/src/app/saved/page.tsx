'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { SavedKitsList } from '../../components/SavedKitsList';
import { LogOut, BookMarked, ChevronLeft, User, Loader2 } from 'lucide-react';

export default function SavedKitsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const Header = () => (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
            R
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Rehearsa</span>
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 rounded-full border border-sky-200">
            Saved Kits
          </span>
        </button>

        <nav className="flex items-center gap-3">
          {authLoading ? null : user ? (
            <>
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <User className="w-3.5 h-3.5" />
                {user.email}
              </span>
              <button
                onClick={async () => { await logout(); router.push('/'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="px-3.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
            >
              Sign In / Register
            </button>
          )}
        </nav>
      </div>
    </header>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full px-4 text-center">
            <p className="text-sm text-slate-600 mb-4">Please sign in to view your saved kits.</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
            >
              Sign In
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header />
      <main className="flex-1 pb-16">
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-4"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>
          <SavedKitsList
            onOpenKit={(kitId) => router.push(`/kit/${kitId}`)}
            onNewKit={() => router.push('/')}
          />
        </div>
      </main>
    </div>
  );
}
