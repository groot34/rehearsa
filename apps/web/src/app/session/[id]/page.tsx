'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Kit } from '@rehearsa/shared';
import {
  getSessionById,
  convertSessionToKit,
  regenerateKitSection,
  updateSessionQuestionConfidence,
  reorderSessionQuestions,
  updateSessionFlashcardConfidence,
  RegenerateSection,
  reorderQuestions,
  updateQuestionConfidence,
  updateFlashcardConfidence,
} from '../../../lib/api';
import { syncQuestionOrder } from '../../../lib/kitEditing';
import { useAuth } from '../../../lib/auth';
import { KitViewer } from '../../../components/KitViewer';
import { GenerationProgressTracker } from '../../../components/GenerationProgressTracker';
import {
  LogOut,
  BookMarked,
  ChevronLeft,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  User,
} from 'lucide-react';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const sessionId = params.id as string;

  // Session state
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [generatedKit, setGeneratedKit] = useState<Kit | null>(null);

  // Save / update UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedKitId, setSavedKitId] = useState<string | null>(null);

  // Edit-preservation tracking
  const [editedItemIds, setEditedItemIds] = useState<Set<string>>(new Set());
  const kitRevisionRef = useRef(0);

  // Question confidence tracking
  const [questionConfidence, setQuestionConfidence] = useState<Record<string, 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'>>({});
  const [isUpdatingConfidence, setIsUpdatingConfidence] = useState(false);

  // Question order tracking
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [isReordering, setIsReordering] = useState(false);

  // Flashcard confidence tracking
  const [flashcardConfidence, setFlashcardConfidence] = useState<Record<string, 'easy' | 'medium' | 'hard'>>({});
  const [isUpdatingFlashcardConfidence, setIsUpdatingFlashcardConfidence] = useState(false);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      setSessionError(null);
      const res = await getSessionById(sessionId);
      setIsLoading(false);

      if (res.success && res.kit) {
        setGeneratedKit(res.kit);
        setQuestionOrder(res.kit.questions.map((q) => q.id));
        setQuestionConfidence(res.questionConfidence ?? {});
        setFlashcardConfidence(res.flashcardConfidence ?? {});
      } else {
        setSessionError(res.error?.message ?? 'Failed to load session. It may have expired or does not exist.');
      }
    };

    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const handleItemEdited = useCallback((itemId: string) => {
    setEditedItemIds((prev) => {
      if (itemId.startsWith('q_custom_') || itemId.startsWith('f_custom_')) return prev;
      if (prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
    setSaveSuccess(false);
  }, []);

  const handleItemDeleted = useCallback((itemId: string) => {
    setEditedItemIds((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    setSaveSuccess(false);
  }, []);

  const handleUpdateConfidence = useCallback(async (questionId: string, confidence: 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready') => {
    setIsUpdatingConfidence(true);
    const res = await updateSessionQuestionConfidence(sessionId, { questionId, confidence });
    setIsUpdatingConfidence(false);
    if (res.success) {
      setQuestionConfidence((prev) => ({ ...prev, [questionId]: confidence }));
    }
  }, [sessionId]);

  const handleReorderQuestions = useCallback(async (newOrder: string[]) => {
    setQuestionOrder(newOrder);
    setIsReordering(true);
    const res = await reorderSessionQuestions(sessionId, { questionIds: newOrder });
    setIsReordering(false);
  }, [sessionId]);

  const handleUpdateFlashcardConfidence = useCallback(async (flashcardId: string, confidence: 'easy' | 'medium' | 'hard') => {
    setIsUpdatingFlashcardConfidence(true);
    const res = await updateSessionFlashcardConfidence(sessionId, { flashcardId, confidence });
    setIsUpdatingFlashcardConfidence(false);
    if (res.success) {
      setFlashcardConfidence((prev) => ({ ...prev, [flashcardId]: confidence }));
    }
  }, [sessionId]);

  const regenRequestRef = useRef<number>(0);

  const handleRegenerateSection = useCallback(
    async (
      section: 'questions' | 'flashcards',
      onStart: () => void,
      onDone: (error?: string) => void,
    ) => {
      if (!generatedKit) return;
      regenRequestRef.current += 1;
      const thisRequestId = regenRequestRef.current;
      onStart();

      const result = await regenerateKitSection({
        kit: generatedKit,
        section,
        preserved_ids: Array.from(editedItemIds),
      });

      if (regenRequestRef.current !== thisRequestId) {
        onDone();
        return;
      }

      if (result.success && result.kit) {
        setGeneratedKit(result.kit);
        if (section === 'questions') {
          setQuestionOrder((prev) => syncQuestionOrder(prev, result.kit!.questions));
        }
        setSaveSuccess(false);
        onDone();
      } else {
        onDone(result.error?.message ?? 'Section regeneration failed.');
      }
    },
    [generatedKit, editedItemIds],
  );

  const handleUpdateKit = useCallback((updatedKit: Kit) => {
    kitRevisionRef.current += 1;
    setGeneratedKit(updatedKit);
    setQuestionOrder((prev) => syncQuestionOrder(prev, updatedKit.questions));
    setSaveSuccess(false);
  }, []);

  const handleSaveKit = async () => {
    if (!generatedKit) return;
    const saveRevision = kitRevisionRef.current;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const res = await convertSessionToKit(sessionId);
    setIsSaving(false);

    if (res.success && res.data) {
      setSavedKitId(res.data.id);
      // Save confidence data for new kit
      const confidencePromises = Object.entries(questionConfidence).map(([questionId, confidence]) =>
        updateQuestionConfidence(res.data!.id, { questionId, confidence })
      );
      const flashcardPromises = Object.entries(flashcardConfidence).map(([flashcardId, confidence]) =>
        updateFlashcardConfidence(res.data!.id, { flashcardId, confidence })
      );
      await Promise.all([...confidencePromises, ...flashcardPromises]);
      setSaveSuccess(kitRevisionRef.current === saveRevision);
      if (questionOrder.length > 0) {
        // Reorder the saved kit after conversion
        await reorderQuestions(res.data.id, { questionIds: questionOrder });
      }
      if (kitRevisionRef.current !== saveRevision) {
        setSaveError('The kit changed while saving. Save again to persist the latest edits.');
      } else {
        // Use router.replace to replace history entry, avoiding Back button to deleted session
        router.replace(`/kit/${res.data.id}`);
      }
    } else {
      setSaveError(res.error?.message ?? 'Failed to save kit.');
    }
  };

  const handleReset = () => {
    router.push('/');
  };

  const Header = () => (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button
          onClick={handleReset}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
            R
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Rehearsa</span>
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 rounded-full border border-sky-200">
            Session
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
                onClick={() => router.push('/saved')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <BookMarked className="w-3.5 h-3.5" />
                My Kits
              </button>
              <button
                onClick={async () => { await logout(); handleReset(); }}
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

  const SaveBanner = () => {
    if (!user) return null;
    return (
      <div className="flex items-center gap-3 max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        {saveError && (
          <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Kit saved.</span>
          </div>
        )}
        <button
          onClick={handleSaveKit}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors ml-auto"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving…' : 'Save Kit'}</span>
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading session…</span>
          </div>
        </main>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full px-4">
            <div className="flex items-center gap-2 p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{sessionError}</span>
            </div>
            <p className="text-center mt-4">
              <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600">
                ← Back to home
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header />
      <main className="flex-1 pb-16">
        {generatedKit && (
          <div>
            <SaveBanner />
            <KitViewer
              kit={generatedKit}
              onUpdateKit={handleUpdateKit}
              onItemEdited={handleItemEdited}
              onItemDeleted={handleItemDeleted}
              onRegenerateSection={handleRegenerateSection}
              onReset={handleReset}
              questionConfidence={questionConfidence}
              onUpdateConfidence={handleUpdateConfidence}
              isUpdatingConfidence={isUpdatingConfidence}
              questionOrder={questionOrder}
              onReorderQuestions={handleReorderQuestions}
              isReordering={isReordering}
              flashcardConfidence={flashcardConfidence}
              onUpdateFlashcardConfidence={handleUpdateFlashcardConfidence}
              isUpdatingFlashcardConfidence={isUpdatingFlashcardConfidence}
            />
          </div>
        )}
      </main>
    </div>
  );
}
