import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '@rehearsa/shared';
import { Layers, RotateCw, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface Props {
  flashcards: Flashcard[];
}

export const FlashcardDeck: React.FC<Props> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>({});

  // Reset index when flashcard set changes (e.g. new kit loaded)
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards.length]);

  const currentCard = flashcards[currentIndex] ?? flashcards[0];
  const isMastered = currentCard ? !!masteredIds[currentCard.id] : false;

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  }, [flashcards.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  }, [flashcards.length]);

  const toggleMastered = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setMasteredIds((prev) => ({ ...prev, [currentCard.id]: !prev[currentCard.id] }));
    },
    [currentCard.id]
  );

  // Keyboard navigation support for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMastered();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, toggleMastered]);

  // Guard is placed after all hooks to satisfy React's rules of hooks
  if (!flashcards || flashcards.length === 0 || !currentCard) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Interactive Flashcard Practice</h3>
            <p className="text-xs text-slate-500">
              Card {currentIndex + 1} of {flashcards.length} • Use Arrow Keys to navigate, Space/Enter to flip, 'M' to mark mastered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {Object.keys(masteredIds).filter((k) => masteredIds[k]).length}/{flashcards.length} Mastered
          </span>
        </div>
      </div>

      {/* Interactive Card */}
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
            <button
              type="button"
              onClick={toggleMastered}
              aria-label={isMastered ? 'Mark card as not mastered' : 'Mark card as mastered'}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                isMastered
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isMastered ? 'Mastered' : 'Mark Mastered (M)'}</span>
            </button>
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

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous flashcard"
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous (←)</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          aria-label="Flip flashcard"
          className="px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Flip Card (Space)</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next flashcard"
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <span>Next (→)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
