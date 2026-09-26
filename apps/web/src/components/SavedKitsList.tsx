'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { KitSummary } from '@rehearsa/shared';
import { fetchKitList, deleteKitFromServer } from '../lib/api';
import { useAuth } from '../lib/auth';
import { FolderOpen, Trash2, Loader2, AlertCircle, BookOpen, Plus } from 'lucide-react';

interface Props {
  onOpenKit: (kitId: string) => void;
  onNewKit: () => void;
  /** A kit ID that was just saved — triggers a list refresh */
  newlySavedKitId?: string | null;
}

export function SavedKitsList({ onOpenKit, onNewKit, newlySavedKitId }: Props) {
  const { user } = useAuth();
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadKits = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    const res = await fetchKitList();
    setIsLoading(false);
    if (res.success && res.kits) {
      setKits(res.kits);
    } else {
      setError(res.error?.message ?? 'Failed to load your kits.');
    }
  }, [user]);

  useEffect(() => {
    loadKits();
  }, [loadKits, newlySavedKitId]); // re-fetch when a new kit is saved

  const handleDelete = async (kit: KitSummary) => {
    if (!user) return;
    if (!window.confirm(`Delete the kit for "${kit.role}" at ${kit.company}? This cannot be undone.`)) return;

    setDeletingId(kit.id);
    const res = await deleteKitFromServer(kit.id);
    setDeletingId(null);

    if (res.success) {
      setKits((prev) => prev.filter((k) => k.id !== kit.id));
    } else {
      setError(res.error?.message ?? 'Failed to delete kit.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading your kits…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Your Interview Kits</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {kits.length === 0 ? 'No kits yet.' : `${kits.length} kit${kits.length === 1 ? '' : 's'} saved.`}
          </p>
        </div>
        <button
          onClick={onNewKit}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Kit
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {kits.length === 0 && !error ? (
        <div className="text-center py-16 space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Generate your first interview kit to get started.</p>
          <button
            onClick={onNewKit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate a Kit
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {kits.map((kit) => (
            <li
              key={kit.id}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-sky-300 transition-colors group"
            >
              <button
                onClick={() => onOpenKit(kit.id)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="font-semibold text-sm text-slate-900 truncate">{kit.role}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {kit.company} · {kit.daysAvailable} day{kit.daysAvailable === 1 ? '' : 's'} ·{' '}
                  Saved {new Date(kit.createdAt).toLocaleDateString()}
                </div>
              </button>

              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => onOpenKit(kit.id)}
                  title="Open kit"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(kit)}
                  disabled={deletingId === kit.id}
                  title="Delete kit"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                >
                  {deletingId === kit.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
