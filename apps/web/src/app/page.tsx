'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Kit } from '@rehearsa/shared';
import { generateInterviewKit, regenerateKitSection, GenerateKitPayload } from '../lib/api';
import { KitGeneratorForm } from '../components/KitGeneratorForm';
import { GenerationProgressTracker } from '../components/GenerationProgressTracker';
import { KitViewer } from '../components/KitViewer';
import { Sparkles, Compass, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<{ code: string; message: string; details?: any } | null>(null);
  const [generatedKit, setGeneratedKit] = useState<Kit | null>(null);

  /**
   * Tracks which original-LLM-ID items the user has edited in-place (e.g. 'q1', 'f2').
   * Items added by the user already have q_custom_* / f_custom_* IDs and are
   * auto-preserved by the server without needing to appear here.
   *
   * This state is intentionally separate from generatedKit — it is NOT part of
   * the Appendix A schema.  It is lost on browser refresh (no persistence layer).
   */
  const [editedItemIds, setEditedItemIds] = useState<Set<string>>(new Set());

  /**
   * Called by KitViewer whenever the user performs an in-place edit on an
   * item with an original LLM-generated ID.  Adds that ID to the preserved set.
   */
  const handleItemEdited = useCallback((itemId: string) => {
    setEditedItemIds((prev) => {
      // Only track IDs that are NOT already q_custom_* / f_custom_* (those are
      // auto-preserved by the server).
      if (itemId.startsWith('q_custom_') || itemId.startsWith('f_custom_')) {
        return prev;
      }
      if (prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  }, []);

  /**
   * Called by KitViewer when the user deletes an item.  Removes it from the
   * preserved set so a deleted item can never reappear after regeneration.
   */
  const handleItemDeleted = useCallback((itemId: string) => {
    setEditedItemIds((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const handleGenerate = async (payload: GenerateKitPayload) => {
    setIsLoading(true);
    setError(null);

    const result = await generateInterviewKit(payload);

    setIsLoading(false);

    if (result.success && result.kit) {
      setGeneratedKit(result.kit);
      setEditedItemIds(new Set()); // fresh kit — no edits yet
    } else {
      setError(result.error || { code: 'GENERATION_FAILED', message: 'Failed to generate preparation kit.' });
    }
  };

  /**
   * Handles section regeneration triggered from KitViewer.
   * Uses a ref-based request counter as the stale-response guard.
   *
   * Using a ref (not state) for the counter means:
   *   - The increment is synchronous and immediately visible to the callback
   *     that runs after the await, even if React batches the re-render.
   *   - Two rapid calls both read the ref's current value, so they each
   *     receive a distinct ID and the guard correctly discards the slower one.
   *
   * State-based counters fail here because setState is async: the second call
   * reads the same stale closure value, assigns the same thisRequestId as the
   * first call, and the guard never fires.
   */
  const regenRequestRef = useRef<number>(0);

  const handleRegenerateSection = useCallback(
    async (
      section: 'questions' | 'flashcards',
      onStart: () => void,
      onDone: (error?: string) => void,
    ) => {
      if (!generatedKit) return;

      // Increment synchronously — immediately visible to any concurrent call
      regenRequestRef.current += 1;
      const thisRequestId = regenRequestRef.current;

      onStart();

      const result = await regenerateKitSection({
        kit: generatedKit,
        section,
        preserved_ids: Array.from(editedItemIds),
      });

      // Stale-response guard: if another regeneration was triggered while this
      // one was in flight, its ref value will be higher — discard this response.
      if (regenRequestRef.current !== thisRequestId) {
        // A newer request completed or is in flight — discard silently
        onDone(); // clear the loading state in KitViewer
        return;
      }

      if (result.success && result.kit) {
        setGeneratedKit(result.kit);
        // editedItemIds intentionally retained: preserved items are still edited
        onDone();
      } else {
        onDone(
          result.error?.message ?? 'Section regeneration failed. Your existing kit is unchanged.',
        );
      }
    },
    [generatedKit, editedItemIds],
  );

  const handleReset = () => {
    setGeneratedKit(null);
    setError(null);
    setIsLoading(false);
    setEditedItemIds(new Set());
    regenRequestRef.current = 0;
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50/50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
              R
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              Rehearsa
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 rounded-full border border-sky-200">
              FS-AI-INTERVIEW-01
            </span>
          </div>

          <nav className="flex items-center gap-4">
            <a
              href="#builder"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Prep Builder
            </a>
            <a
              href="#pipeline"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              11-Step Pipeline
            </a>
            {generatedKit && (
              <button
                onClick={handleReset}
                className="px-3.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
              >
                + New Kit
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* If a Kit is generated, show KitViewer */}
        {generatedKit ? (
          <KitViewer
            kit={generatedKit}
            onUpdateKit={setGeneratedKit}
            onItemEdited={handleItemEdited}
            onItemDeleted={handleItemDeleted}
            onRegenerateSection={handleRegenerateSection}
            onReset={handleReset}
          />
        ) : (
          <>
            {/* Hero Section */}
            <section className="py-14 px-6 max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold mb-6">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>AI Research + Deterministic Verification Pipeline</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                Master Technical & Behavioral Interviews with{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600">
                  Rehearsa
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Enter any job description, target company URL, and your available preparation timeframe (1–60 days). Rehearsa researches the target company, extracts role requirements, generates categorized questions & flashcards, and builds a day-by-day study schedule.
              </p>
            </section>

            {/* Interactive Builder Section */}
            <section id="builder" className="px-4">
              {isLoading ? (
                <GenerationProgressTracker />
              ) : (
                <KitGeneratorForm onSubmit={handleGenerate} isLoading={isLoading} error={error} />
              )}
            </section>

            {/* 11-Step Blueprint Grid */}
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
                  <div key={step.num} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                        Step {step.num}
                      </span>
                      <h4 className="font-bold text-slate-900 mt-2 text-xs md:text-sm">{step.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Rehearsa</span>
            <span>— Full-Stack AI Interview Preparation Platform</span>
          </div>
          <div>
            <span>Assessment Code: FS-AI-INTERVIEW-01</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
