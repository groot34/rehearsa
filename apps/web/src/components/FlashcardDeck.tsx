import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '@rehearsa/shared';
import {
  Layers,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Confidence tier configuration
const CONFIDENCE_TIERS = [
  { value: 'easy',   label: 'Easy',   short: 'E', className: 'bg-emerald-500/20 border-emerald-400 text-emerald-300', dotClass: 'bg-emerald-400' },
  { value: 'medium', label: 'Medium', short: 'M', className: 'bg-amber-500/20 border-amber-400 text-amber-300',     dotClass: 'bg-amber-400' },
  { value: 'hard',   label: 'Hard',   short: 'H', className: 'bg-rose-500/20 border-rose-400 text-rose-300',        dotClass: 'bg-rose-400' },
] as const;

type FlashcardConfidenceTier = 'easy' | 'medium' | 'hard';

interface Props {
  flashcards: Flashcard[];
  availableRequirements?: { id: string; text: string }[];
  onUpdateFlashcard?: (updated: Flashcard) => void;
  onAddFlashcard?: (card: Omit<Flashcard, 'id'>) => void;
  onDeleteFlashcard?: (cardId: string) => void;
  /** Persisted confidence map from the server (card id → tier). */
  flashcardConfidence?: Record<string, FlashcardConfidenceTier>;
  /** Called when the user selects a confidence tier for a card. */
  onUpdateFlashcardConfidence?: (flashcardId: string, confidence: FlashcardConfidenceTier) => void;
  isUpdatingFlashcardConfidence?: boolean;
}

export const FlashcardDeck: React.FC<Props> = ({
  flashcards,
  availableRequirements = [],
  onUpdateFlashcard,
  onAddFlashcard,
  onDeleteFlashcard,
  flashcardConfidence = {},
  onUpdateFlashcardConfidence,
  isUpdatingFlashcardConfidence = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Editing state for current card
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editFront, setEditFront] = useState<string>('');
  const [editBack, setEditBack] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  // Adding state for new card
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addFront, setAddFront] = useState<string>('');
  const [addBack, setAddBack] = useState<string>('');
  const [addReqId, setAddReqId] = useState<string>(
    availableRequirements[0]?.id || 'r1'
  );
  const [addError, setAddError] = useState<string | null>(null);

  // Keep index within bounds if deck size shrinks
  useEffect(() => {
    if (currentIndex >= flashcards.length && flashcards.length > 0) {
      setCurrentIndex(flashcards.length - 1);
    }
  }, [flashcards.length, currentIndex]);

  const currentCard = flashcards[currentIndex] ?? flashcards[0];
  const currentConfidence: FlashcardConfidenceTier | undefined = currentCard
    ? flashcardConfidence[currentCard.id]
    : undefined;

  const handleNext = useCallback(() => {
    if (isEditing) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  }, [flashcards.length, isEditing]);

  const handlePrev = useCallback(() => {
    if (isEditing) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  }, [flashcards.length, isEditing]);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;
    setEditFront(currentCard.front);
    setEditBack(currentCard.back);
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
    setEditError(null);
  };

  const saveEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editFront.trim()) {
      setEditError('Card front text cannot be empty.');
      return;
    }
    if (!editBack.trim()) {
      setEditError('Card back text cannot be empty.');
      return;
    }

    if (onUpdateFlashcard && currentCard) {
      onUpdateFlashcard({
        ...currentCard,
        front: editFront.trim(),
        back: editBack.trim(),
      });
    }

    setIsEditing(false);
    setEditError(null);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;
    if (flashcards.length <= 1) {
      alert('Cannot delete the last remaining flashcard in the deck.');
      return;
    }

    if (confirm(`Are you sure you want to delete flashcard ${currentCard.id}?`)) {
      if (onDeleteFlashcard) {
        onDeleteFlashcard(currentCard.id);
      }
      setIsEditing(false);
      setIsFlipped(false);
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFront.trim()) {
      setAddError('Front text cannot be empty.');
      return;
    }
    if (!addBack.trim()) {
      setAddError('Back text cannot be empty.');
      return;
    }

    if (onAddFlashcard) {
      onAddFlashcard({
        front: addFront.trim(),
        back: addBack.trim(),
        requirement_ids: [addReqId],
      });
    }

    setIsAdding(false);
    setAddFront('');
    setAddBack('');
    setAddError(null);
    // Navigate to the newly added card (at end of deck)
    setCurrentIndex(flashcards.length);
    setIsFlipped(false);
  };

  // Keyboard navigation support for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (isEditing || isAdding) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isEditing, isAdding]);

  if (!flashcards || flashcards.length === 0 || !currentCard) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <p className="text-slate-500 text-sm">No flashcards in this kit.</p>
        {onAddFlashcard && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg"
          >
            + Create First Flashcard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Interactive Flashcard Practice</h3>
            <p className="text-xs text-slate-500">
              Card {currentIndex + 1} of {flashcards.length} • Use Arrow Keys to navigate, Space/Enter to flip
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Flashcard Button */}
          {onAddFlashcard && (
            <button
              onClick={() => {
                setIsAdding((prev) => !prev);
                setIsEditing(false);
                setAddError(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel Add' : 'Add Card'}</span>
            </button>
          )}

          {/* Confidence distribution summary */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {CONFIDENCE_TIERS.map((tier) => {
              const count = flashcards.filter((f) => flashcardConfidence[f.id] === tier.value).length;
              return (
                <span key={tier.value} className="flex items-center gap-0.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${tier.dotClass}`} />
                  <span>{count}</span>
                </span>
              );
            })}
            <span className="text-slate-400 ml-0.5">/ {flashcards.length}</span>
          </div>
        </div>
      </div>

      {/* Add New Flashcard Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveNew}
          className="p-5 border border-teal-200 bg-teal-50/30 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-teal-600" />
              <span>Add Custom Flashcard</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {addError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Front (Concept / Question)</label>
            <input
              type="text"
              value={addFront}
              onChange={(e) => setAddFront(e.target.value)}
              placeholder="e.g., What is goroutine backpressure in Go?"
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Back (Explanation / Answer)</label>
            <textarea
              rows={2}
              value={addBack}
              onChange={(e) => setAddBack(e.target.value)}
              placeholder="Concise, memorable concept explanation..."
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white resize-y"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Maps to Requirement</label>
            <select
              value={addReqId}
              onChange={(e) => setAddReqId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {availableRequirements.length > 0 ? (
                availableRequirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id}: {r.text.slice(0, 35)}...
                  </option>
                ))
              ) : (
                <option value="r1">r1 (Default)</option>
              )}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-teal-100">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
            >
              Save Card
            </button>
          </div>
        </form>
      )}

      {/* Interactive Card / Edit Card */}
      {!isEditing ? (
        <div
          tabIndex={0}
          role="button"
          aria-label={`Flashcard ${currentIndex + 1}: ${isFlipped ? 'Answer' : 'Question'}. Press Space to flip.`}
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative min-h-[220px] p-6 rounded-2xl border transition-all duration-300 cursor-pointer select-none flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 ${
            isFlipped
              ? 'bg-gradient-to-br from-teal-900 to-slate-900 text-white border-teal-700 shadow-lg shadow-teal-900/20'
              : 'bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-slate-800 shadow-lg shadow-slate-900/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-white/10 px-2 py-0.5 rounded text-white/80">
                {currentCard.id}
              </span>
              <span className="text-[11px] font-semibold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/60">
                {isFlipped ? 'Answer (Back)' : 'Question (Front)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onUpdateFlashcard && (
                <button
                  type="button"
                  onClick={startEditing}
                  title="Edit Current Flashcard"
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {onDeleteFlashcard && flashcards.length > 1 && (
                <button
                  type="button"
                  onClick={handleDelete}
                  title="Delete Flashcard"
                  className="p-1 rounded-lg bg-white/10 hover:bg-rose-500/30 text-white/80 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Confidence tier selector */}
              {onUpdateFlashcardConfidence && (
                <div className="flex items-center gap-1">
                  {isUpdatingFlashcardConfidence ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white/50" />
                  ) : (
                    CONFIDENCE_TIERS.map((tier) => {
                      const isActive = currentConfidence === tier.value;
                      return (
                        <button
                          key={tier.value}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentCard) {
                              onUpdateFlashcardConfidence(currentCard.id, tier.value);
                            }
                          }}
                          aria-label={`Mark card as ${tier.label}`}
                          aria-pressed={isActive}
                          title={tier.label}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                            isActive
                              ? tier.className
                              : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isActive ? tier.dotClass : 'bg-white/40'}`} />
                          <span>{tier.label}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              <span className="text-xs text-white/50 flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Flip (Space)</span>
              </span>
            </div>
          </div>

          {/* Card Main Text */}
          <div className="my-6 text-center" aria-live="polite">
            <p className="text-base md:text-lg font-medium leading-relaxed">
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-white/50">
            <div>
              <span>Requirement IDs: </span>
              {currentCard.requirement_ids.map((rid) => (
                <span key={rid} className="font-mono text-teal-300 font-bold ml-1">
                  {rid}
                </span>
              ))}
            </div>
            <span>Card {currentIndex + 1} of {flashcards.length}</span>
          </div>
        </div>
      ) : (
        /* Inline Edit Form for Current Card */
        <div className="p-6 bg-slate-50 border border-teal-300 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
              Editing {currentCard.id}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={saveEditing}
                className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {editError && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Front (Concept / Question)</label>
            <input
              type="text"
              value={editFront}
              onChange={(e) => setEditFront(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Back (Answer / Explanation)</label>
            <textarea
              rows={3}
              value={editBack}
              onChange={(e) => setEditBack(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isEditing}
          aria-label="Previous flashcard"
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous (←)</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          disabled={isEditing}
          aria-label="Flip flashcard"
          className="px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Flip Card (Space)</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={isEditing}
          aria-label="Next flashcard"
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <span>Next (→)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
