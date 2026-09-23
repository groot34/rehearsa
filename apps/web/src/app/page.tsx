'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Kit } from '@rehearsa/shared';
import {
  generateInterviewKit,
  regenerateKitSection,
  saveKitToServer,
  fetchKitById,
  updateKitOnServer,
  GenerateKitPayload,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { KitGeneratorForm } from '../components/KitGeneratorForm';
import { GenerationProgressTracker } from '../components/GenerationProgressTracker';
import { KitViewer } from '../components/KitViewer';
import { AuthForms } from '../components/AuthForms';
import { SavedKitsList } from '../components/SavedKitsList';
import {
  Sparkles,
  LogOut,
  BookMarked,
  ChevronLeft,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  User,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// View states
// ---------------------------------------------------------------------------
type View = 'home' | 'auth' | 'my-kits' | 'kit-viewer';

export default function HomePage() {
  const { token, user, isLoading: authLoading, logout } = useAuth();

  // Navigation
  const [view, setView] = useState<View>('home');

  // Kit generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<{ code: string; message: string } | null>(null);
  const [generatedKit, setGeneratedKit] = useState<Kit | null>(null);

  // Saved kit state (populated when opening a saved kit)
  const [savedKitId, setSavedKitId] = useState<string | null>(null); // non-null = kit is saved

  // Save / update UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Newly saved kit ID — triggers list refresh in SavedKitsList
  const [newlySavedKitId, setNewlySavedKitId] = useState<string | null>(null);

  // Opening a saved kit
  const [isOpeningKit, setIsOpeningKit] = useState(false);
  const [openKitError, setOpenKitError] = useState<string | null>(null);

  // Edit-preservation tracking (same as before M9)
  const [editedItemIds, setEditedItemIds] = useState<Set<string>>(new Set());
  const kitRevisionRef = useRef(0);

  const handleItemEdited = useCallback((itemId: string) => {
    setEditedItemIds((prev) => {
      if (itemId.startsWith('q_custom_') || itemId.startsWith('f_custom_')) return prev;
      if (prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
    // An edit means the in-memory kit diverges from the saved version
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

  // ---------------------------------------------------------------------------
  // Generation
  // ---------------------------------------------------------------------------

  const handleGenerate = async (payload: GenerateKitPayload) => {
    setIsGenerating(true);
    setGenError(null);
    setSavedKitId(null);
    setSaveSuccess(false);
    setSaveError(null);
    setEditedItemIds(new Set());

    const result = await generateInterviewKit(payload);
    setIsGenerating(false);

    if (result.success && result.kit) {
      setGeneratedKit(result.kit);
      setView('kit-viewer');
    } else {
      setGenError(result.error || { code: 'GENERATION_FAILED', message: 'Failed to generate kit.' });
    }
  };

  // ---------------------------------------------------------------------------
  // Section regeneration (unchanged from M7B.2)
  // ---------------------------------------------------------------------------

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
        setSaveSuccess(false); // regenerated kit diverges from last save
        onDone();
      } else {
        onDone(result.error?.message ?? 'Section regeneration failed.');
      }
    },
    [generatedKit, editedItemIds],
  );

  // ---------------------------------------------------------------------------
  // Kit updates (called by KitViewer via onUpdateKit)
  // ---------------------------------------------------------------------------

  const handleUpdateKit = useCallback((updatedKit: Kit) => {
    kitRevisionRef.current += 1;
    setGeneratedKit(updatedKit);
    setSaveSuccess(false); // edited kit diverges from last save
  }, []);

  // ---------------------------------------------------------------------------
  // Save kit
  // ---------------------------------------------------------------------------

  const handleSaveKit = async () => {
    if (!generatedKit || !token) return;
    const saveRevision = kitRevisionRef.current;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    if (savedKitId) {
      // Update existing saved kit
      const res = await updateKitOnServer(savedKitId, generatedKit, token);
      setIsSaving(false);
      if (res.success) {
        setSaveSuccess(kitRevisionRef.current === saveRevision);
        setNewlySavedKitId(savedKitId);
        if (kitRevisionRef.current !== saveRevision) {
          setSaveError('The kit changed while saving. Save again to persist the latest edits.');
        }
      } else {
        setSaveError(res.error?.message ?? 'Failed to save kit.');
      }
    } else {
      // Save new kit
      const res = await saveKitToServer(generatedKit, token);
      setIsSaving(false);
      if (res.success && res.data) {
        setSavedKitId(res.data.id);
        setSaveSuccess(kitRevisionRef.current === saveRevision);
        setNewlySavedKitId(res.data.id);
        if (kitRevisionRef.current !== saveRevision) {
          setSaveError('The kit changed while saving. Save again to persist the latest edits.');
        }
      } else {
        setSaveError(res.error?.message ?? 'Failed to save kit.');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Open a saved kit
  // ---------------------------------------------------------------------------

  const handleOpenKit = async (kitId: string) => {
    if (!token) return;
    setIsOpeningKit(true);
    setOpenKitError(null);
    const res = await fetchKitById(kitId, token);
    setIsOpeningKit(false);
    if (res.success && res.data) {
      setGeneratedKit(res.data.kit);
      setSavedKitId(res.data.id);
      setSaveSuccess(true);
      setSaveError(null);
      setEditedItemIds(new Set());
      regenRequestRef.current = 0;
      setView('kit-viewer');
    } else {
      setOpenKitError(res.error?.message ?? 'Failed to open kit. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const handleReset = () => {
    setGeneratedKit(null);
    setGenError(null);
    setIsGenerating(false);
    setSavedKitId(null);
    setSaveSuccess(false);
    setSaveError(null);
    setOpenKitError(null);
    setEditedItemIds(new Set());
    regenRequestRef.current = 0;
    setView('home');
  };

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

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
            FS-AI-INTERVIEW-01
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
                onClick={() => setView('my-kits')}
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
              onClick={() => setView('auth')}
              className="px-3.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
            >
              Sign In / Register
            </button>
          )}
        </nav>
      </div>
    </header>
  );

  // ---------------------------------------------------------------------------
  // Save banner (shown inside kit viewer)
  // ---------------------------------------------------------------------------

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
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Kit saved.</span>
          </div>
        )}
        <button
          onClick={handleSaveKit}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors ml-auto"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving…' : savedKitId ? 'Update Saved Kit' : 'Save Kit'}</span>
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header />

      <main className="flex-1 pb-16">

        {/* Auth view */}
        {view === 'auth' && (
          <div className="py-14 px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Welcome to Rehearsa</h2>
              <p className="text-sm text-slate-500 mt-1">Sign in to save and manage your interview kits.</p>
            </div>
            <AuthForms onSuccess={() => setView('home')} />
            <p className="text-center mt-4">
              <button onClick={() => setView('home')} className="text-xs text-slate-400 hover:text-slate-600">
                ← Back
              </button>
            </p>
          </div>
        )}

        {/* My kits view */}
        {view === 'my-kits' && (
          <div>
            <div className="max-w-3xl mx-auto px-4 pt-6">
              <button
                onClick={() => setView('home')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </div>
            {isOpeningKit ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Opening kit…</span>
              </div>
            ) : (
              <>
                {openKitError && (
                  <div className="max-w-3xl mx-auto px-4 mt-4">
                    <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{openKitError}</span>
                    </div>
                  </div>
                )}
                <SavedKitsList
                  onOpenKit={handleOpenKit}
                  onNewKit={handleReset}
                  newlySavedKitId={newlySavedKitId}
                />
              </>
            )}
          </div>
        )}

        {/* Kit viewer */}
        {view === 'kit-viewer' && generatedKit && (
          <div>
            <SaveBanner />
            <KitViewer
              kit={generatedKit}
              onUpdateKit={handleUpdateKit}
              onItemEdited={handleItemEdited}
              onItemDeleted={handleItemDeleted}
              onRegenerateSection={handleRegenerateSection}
              onReset={handleReset}
            />
          </div>
        )}

        {/* Home / generation view */}
        {view === 'home' && (
          <>
            <section className="py-14 px-6 max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold mb-6">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>AI Research + Deterministic Verification Pipeline</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                Master Interviews with{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600">
                  Rehearsa
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Enter a job description, company URL, and your available preparation days. Rehearsa builds a tailored prep kit with categorized questions, flashcards, and a day-by-day study schedule.
              </p>
              {!authLoading && !user && (
                <button
                  onClick={() => setView('auth')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
                >
                  Sign in to save kits
                </button>
              )}
            </section>

            <section id="builder" className="px-4">
              {isGenerating ? (
                <GenerationProgressTracker />
              ) : (
                <KitGeneratorForm onSubmit={handleGenerate} isLoading={isGenerating} error={genError} />
              )}
            </section>

            <section id="pipeline" className="py-16 px-6 max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  11-Step Sequenced Pipeline Architecture
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl mx-auto">
                  Separating probabilistic LLM generation from deterministic coverage verification and study schedule allocation.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { num: '01', title: 'JD Requirement Extraction', desc: 'Extract technical, behavioural & domain requirements' },
                  { num: '02', title: 'Seed Page Retrieval', desc: 'Fetch & clean seed company web pages' },
                  { num: '03', title: 'Dynamic Link Ranking', desc: 'Crawl target domain & score relevant paths' },
                  { num: '04', title: 'Company Hiring Search', desc: 'Research hiring culture & engineering values' },
                  { num: '05', title: 'Interview Discussion Search', desc: 'Gather public candidate interview insights' },
                  { num: '06', title: 'Pass 1 Question Bank', desc: 'Generate category-mapped prep questions' },
                  { num: '07', title: 'Flashcards & Brief', desc: 'Synthesize flashcards and company brief' },
                  { num: '08', title: 'Coverage Check (Deterministic)', desc: 'Set-difference identify uncovered requirements' },
                  { num: '09', title: 'Pass 2 Missing Generation', desc: 'Targeted generation for missed requirements' },
                  { num: '10', title: 'Schedule Allocation (Deterministic)', desc: 'Multi-day bin packing across 1–60 days' },
                  { num: '11', title: 'Schema Validation', desc: 'Verify Appendix A structure & referential integrity' },
                ].map((step) => (
                  <div key={step.num} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                      Step {step.num}
                    </span>
                    <h4 className="font-bold text-slate-900 mt-2 text-xs md:text-sm">{step.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-snug">{step.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Rehearsa</span>
            <span>— Full-Stack AI Interview Preparation Platform</span>
          </div>
          <span>Assessment Code: FS-AI-INTERVIEW-01</span>
        </div>
      </footer>
    </div>
  );
}
