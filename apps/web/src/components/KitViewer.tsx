import React, { useState } from 'react';
import { Kit, Question, Flashcard } from '@rehearsa/shared';
import { CompanyBriefCard } from './CompanyBriefCard';
import { RoleBreakdownCard } from './RoleBreakdownCard';
import { QuestionBankCard } from './QuestionBankCard';
import { FlashcardDeck } from './FlashcardDeck';
import { StudyScheduleTimeline } from './StudyScheduleTimeline';
import { CoverageBadge } from './CoverageBadge';
import {
  updateQuestionInKit,
  addQuestionToKit,
  deleteQuestionFromKit,
  updateFlashcardInKit,
  addFlashcardToKit,
  deleteFlashcardFromKit,
} from '../lib/kitEditing';
import {
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
  Briefcase,
  Building2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface Props {
  kit: Kit;
  onUpdateKit?: (updatedKit: Kit) => void;
  /** Called when the user edits an item in-place (retains its original LLM ID). */
  onItemEdited?: (itemId: string) => void;
  /** Called when the user deletes an item (removes it from preserved set). */
  onItemDeleted?: (itemId: string) => void;
  /**
   * Called when the user clicks a Regenerate Section button.
   * The parent controls the async request and calls onStart/onDone callbacks
   * to drive KitViewer's loading/error display.
   */
  onRegenerateSection?: (
    section: 'questions' | 'flashcards',
    onStart: () => void,
    onDone: (error?: string) => void,
  ) => void;
  onReset: () => void;
}

export const KitViewer: React.FC<Props> = ({
  kit,
  onUpdateKit,
  onItemEdited,
  onItemDeleted,
  onRegenerateSection,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'brief' | 'role' | 'questions' | 'cards' | 'schedule'
  >('all');

  // Per-section regeneration loading and error state
  const [regenLoading, setRegenLoading] = useState<{
    questions: boolean;
    flashcards: boolean;
  }>({ questions: false, flashcards: false });

  const [regenError, setRegenError] = useState<{
    questions: string | null;
    flashcards: string | null;
  }>({ questions: null, flashcards: null });

  const tabs = [
    { id: 'all', label: 'Complete Kit View', icon: Sparkles },
    { id: 'brief', label: 'Company Brief', icon: Building2 },
    { id: 'role', label: 'Role Breakdown', icon: Briefcase },
    { id: 'questions', label: `Questions (${kit.questions.length})`, icon: HelpCircle },
    { id: 'cards', label: `Flashcards (${kit.flashcards.length})`, icon: Layers },
    { id: 'schedule', label: `Schedule (${kit.schedule.days_available} Days)`, icon: Calendar },
  ];

  // -------------------------------------------------------------------------
  // Question editing handlers
  // -------------------------------------------------------------------------

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    const res = updateQuestionInKit(kit, updatedQuestion);
    if (res.success && res.kit && onUpdateKit) {
      onUpdateKit(res.kit);
      onItemEdited?.(updatedQuestion.id);
    }
  };

  const handleAddQuestion = (newQuestionData: Omit<Question, 'id'>) => {
    const res = addQuestionToKit(kit, newQuestionData);
    if (res.success && res.kit && onUpdateKit) {
      onUpdateKit(res.kit);
      // q_custom_* items are auto-preserved by the server — no need to call onItemEdited
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    const res = deleteQuestionFromKit(kit, questionId);
    if (res.success && res.kit && onUpdateKit) {
      onUpdateKit(res.kit);
      onItemDeleted?.(questionId);
    }
  };

  // -------------------------------------------------------------------------
  // Flashcard editing handlers
  // -------------------------------------------------------------------------

  const handleUpdateFlashcard = (updatedCard: Flashcard) => {
    const res = updateFlashcardInKit(kit, updatedCard);
    if (res.success && res.kit && onUpdateKit) {
      onUpdateKit(res.kit);
      onItemEdited?.(updatedCard.id);
    }
  };

  const handleAddFlashcard = (newCardData: Omit<Flashcard, 'id'>) => {
    const res = addFlashcardToKit(kit, newCardData);
    if (res.success && res.kit && onUpdateKit) {
      onUpdateKit(res.kit);
    }
  };

  const handleDeleteFlashcard = (cardId: string) => {
    const res = deleteFlashcardFromKit(kit, cardId);
    if (res.success && res.kit && onUpdateKit) {
      onUpdateKit(res.kit);
      onItemDeleted?.(cardId);
    }
  };

  // -------------------------------------------------------------------------
  // Section regeneration handler
  // -------------------------------------------------------------------------

  const handleRegen = (section: 'questions' | 'flashcards') => {
    if (!onRegenerateSection) return;
    if (regenLoading[section]) return; // already in flight

    onRegenerateSection(
      section,
      () => {
        // onStart: enter loading state, clear previous error
        setRegenLoading((prev) => ({ ...prev, [section]: true }));
        setRegenError((prev) => ({ ...prev, [section]: null }));
      },
      (errorMsg?: string) => {
        // onDone: leave loading state, set error if any
        setRegenLoading((prev) => ({ ...prev, [section]: false }));
        setRegenError((prev) => ({ ...prev, [section]: errorMsg ?? null }));
      },
    );
  };

  // -------------------------------------------------------------------------
  // Regenerate button component (used for both sections)
  // -------------------------------------------------------------------------

  const RegenButton = ({
    section,
    label,
  }: {
    section: 'questions' | 'flashcards';
    label: string;
  }) => {
    const isLoading = regenLoading[section];
    return (
      <button
        type="button"
        onClick={() => handleRegen(section)}
        disabled={isLoading || !onRegenerateSection}
        title={`Regenerate ${label} using the AI pipeline while preserving your edits`}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 rounded-lg transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        <span>{isLoading ? 'Regenerating…' : `Regenerate ${label}`}</span>
      </button>
    );
  };

  // -------------------------------------------------------------------------
  // Regen error banner component
  // -------------------------------------------------------------------------

  const RegenErrorBanner = ({ section }: { section: 'questions' | 'flashcards' }) => {
    const msg = regenError[section];
    if (!msg) return null;
    return (
      <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold">Regeneration failed. </span>
          <span>{msg}</span>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-8 max-w-6xl mx-auto my-8 px-4 sm:px-6">
      {/* Kit Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30">
                {kit.source.company}
              </span>
              <span className="text-xs text-white/50">
                Researched: {new Date(kit.source.researched_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {kit.role.title} Interview Prep Kit
            </h1>
            <p className="text-xs sm:text-sm text-white/70">
              Generated from {kit.source.jd_chars} JD chars across {kit.source.pages_used.length} researched page(s).
            </p>
          </div>

          <button
            onClick={onReset}
            className="self-start sm:self-auto px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Generate New Kit</span>
          </button>
        </div>

        {/* Coverage Badge Header Summary */}
        <CoverageBadge coverage={kit.coverage} totalRequirements={kit.role.requirements.length} />

        {/* Section Filter Nav Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md font-bold'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Selected Tab Views */}
      <div className="space-y-8">
        {(activeTab === 'all' || activeTab === 'brief') && (
          <CompanyBriefCard companyName={kit.source.company} companyBrief={kit.company_brief} />
        )}

        {(activeTab === 'all' || activeTab === 'role') && (
          <RoleBreakdownCard role={kit.role} />
        )}

        {(activeTab === 'all' || activeTab === 'questions') && (
          <div className="space-y-3">
            {/* Regen controls for Questions section */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-500">
                Preserve your edits and refresh the AI-generated questions.
              </span>
              <RegenButton section="questions" label="Questions" />
            </div>
            <RegenErrorBanner section="questions" />
            <QuestionBankCard
              questions={kit.questions}
              availableRequirements={kit.role.requirements}
              onUpdateQuestion={handleUpdateQuestion}
              onAddQuestion={handleAddQuestion}
              onDeleteQuestion={handleDeleteQuestion}
            />
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'cards') && (
          <div className="space-y-3">
            {/* Regen controls for Flashcards section */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-500">
                Preserve your edits and refresh the AI-generated flashcards.
              </span>
              <RegenButton section="flashcards" label="Flashcards" />
            </div>
            <RegenErrorBanner section="flashcards" />
            <FlashcardDeck
              flashcards={kit.flashcards}
              availableRequirements={kit.role.requirements}
              onUpdateFlashcard={handleUpdateFlashcard}
              onAddFlashcard={handleAddFlashcard}
              onDeleteFlashcard={handleDeleteFlashcard}
            />
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'schedule') && (
          <StudyScheduleTimeline schedule={kit.schedule} questions={kit.questions} />
        )}
      </div>
    </div>
  );
};
