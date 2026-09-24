import React, { useState } from 'react';
import { Question, QuestionCategory } from '@rehearsa/shared';
import {
  HelpCircle,
  Star,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

interface Props {
  questions: Question[];
  availableRequirements?: { id: string; text: string }[];
  onUpdateQuestion?: (updated: Question) => void;
  onAddQuestion?: (question: Omit<Question, 'id'>) => void;
  onDeleteQuestion?: (questionId: string) => void;
  questionConfidence?: Record<string, 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'>;
  onUpdateConfidence?: (questionId: string, confidence: 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready') => void;
  isUpdatingConfidence?: boolean;
}

export const QuestionBankCard: React.FC<Props> = ({
  questions,
  availableRequirements = [],
  onUpdateQuestion,
  onAddQuestion,
  onDeleteQuestion,
  questionConfidence = {},
  onUpdateConfidence,
  isUpdatingConfidence = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [editAnswer, setEditAnswer] = useState<string>('');
  const [editCategory, setEditCategory] = useState<QuestionCategory>('technical');
  const [editDifficulty, setEditDifficulty] = useState<number>(2);
  const [editError, setEditError] = useState<string | null>(null);

  // Adding state
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addPrompt, setAddPrompt] = useState<string>('');
  const [addAnswer, setAddAnswer] = useState<string>('');
  const [addCategory, setAddCategory] = useState<QuestionCategory>('technical');
  const [addDifficulty, setAddDifficulty] = useState<number>(2);
  const [addReqId, setAddReqId] = useState<string>(
    availableRequirements[0]?.id || 'r1'
  );
  const [addError, setAddError] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'technical', label: 'Technical' },
    { id: 'behavioural', label: 'Behavioural' },
    { id: 'system-design', label: 'System Design' },
    { id: 'company-fit', label: 'Company Fit' },
  ];

  const filteredQuestions =
    selectedCategory === 'all'
      ? questions
      : questions.filter((q) => q.category === selectedCategory);

  const toggleExpand = (id: string) => {
    if (editingId === id) return; // Don't toggle collapse while editing
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditing = (q: Question, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(q.id);
    setEditPrompt(q.prompt);
    setEditAnswer(q.answer_outline);
    setEditCategory(q.category);
    setEditDifficulty(q.difficulty);
    setEditError(null);
    setExpandedIds((prev) => ({ ...prev, [q.id]: true }));
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditError(null);
  };

  const saveEditing = (originalQ: Question, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editPrompt.trim()) {
      setEditError('Question prompt cannot be empty.');
      return;
    }
    if (!editAnswer.trim()) {
      setEditError('Answer outline cannot be empty.');
      return;
    }

    if (onUpdateQuestion) {
      onUpdateQuestion({
        ...originalQ,
        prompt: editPrompt.trim(),
        answer_outline: editAnswer.trim(),
        category: editCategory,
        difficulty: editDifficulty,
      });
    }

    setEditingId(null);
    setEditError(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this question?')) {
      if (onDeleteQuestion) {
        onDeleteQuestion(id);
      }
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPrompt.trim()) {
      setAddError('Question prompt cannot be empty.');
      return;
    }
    if (!addAnswer.trim()) {
      setAddError('Answer outline cannot be empty.');
      return;
    }

    if (onAddQuestion) {
      onAddQuestion({
        prompt: addPrompt.trim(),
        answer_outline: addAnswer.trim(),
        category: addCategory,
        difficulty: addDifficulty,
        requirement_ids: [addReqId],
      });
    }

    setIsAdding(false);
    setAddPrompt('');
    setAddAnswer('');
    setAddError(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Categorized Question Bank</h3>
            <p className="text-xs text-slate-500">
              {questions.length} questions mapped to requirements
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Question Button */}
          {onAddQuestion && (
            <button
              onClick={() => {
                setIsAdding((prev) => !prev);
                setAddError(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel Add' : 'Add Question'}</span>
            </button>
          )}

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add New Question Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveNew}
          className="p-5 border border-purple-200 bg-purple-50/30 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-purple-600" />
              <span>Add Custom Question</span>
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
            <label className="text-xs font-bold text-slate-700">Question Prompt</label>
            <input
              type="text"
              value={addPrompt}
              onChange={(e) => setAddPrompt(e.target.value)}
              placeholder="e.g., Explain the difference between process and thread in operating systems."
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Answer Outline & Key Points</label>
            <textarea
              rows={2}
              value={addAnswer}
              onChange={(e) => setAddAnswer(e.target.value)}
              placeholder="Key concepts, architectural tradeoffs, and evaluation criteria..."
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value as QuestionCategory)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="technical">Technical</option>
                <option value="behavioural">Behavioural</option>
                <option value="system-design">System Design</option>
                <option value="company-fit">Company Fit</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Difficulty</label>
              <select
                value={addDifficulty}
                onChange={(e) => setAddDifficulty(Number(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={1}>1 - Beginner / Foundational</option>
                <option value={2}>2 - Intermediate / Standard</option>
                <option value={3}>3 - Advanced / Deep Dive</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Maps to Requirement</label>
              <select
                value={addReqId}
                onChange={(e) => setAddReqId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {availableRequirements.length > 0 ? (
                  availableRequirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id}: {r.text.slice(0, 30)}...
                    </option>
                  ))
                ) : (
                  <option value="r1">r1 (Default)</option>
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
            >
              Save Question
            </button>
          </div>
        </form>
      )}

      {/* Question List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No questions found in category "{selectedCategory}".
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isExpanded = !!expandedIds[q.id];
            const isEditing = editingId === q.id;

            return (
              <div
                key={q.id}
                className="border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all overflow-hidden"
              >
                {/* Normal View Header */}
                {!isEditing ? (
                  <div
                    onClick={() => toggleExpand(q.id)}
                    className="p-4 cursor-pointer flex items-start justify-between gap-4 select-none"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                          {q.id}
                        </span>
                        <span className="text-[11px] uppercase font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                          {q.category}
                        </span>

                        {/* Difficulty Rating */}
                        <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                          <span className="text-[10px] font-bold mr-1">Diff</span>
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < q.difficulty ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Linked Requirement IDs */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <span>Reqs:</span>
                          {q.requirement_ids.map((rid) => (
                            <span
                              key={rid}
                              className="font-mono font-medium bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px]"
                            >
                              {rid}
                            </span>
                          ))}
                        </div>

                        {/* Confidence Selector */}
                        {onUpdateConfidence && (
                          <div className="flex items-center gap-1">
                            <select
                              value={questionConfidence[q.id] || 'unknown'}
                              onChange={(e) => onUpdateConfidence(q.id, e.target.value as any)}
                              disabled={isUpdatingConfidence}
                              className="text-[10px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                            >
                              <option value="unknown">Unknown</option>
                              <option value="not-ready">Not Ready</option>
                              <option value="somewhat-ready">Somewhat Ready</option>
                              <option value="ready">Ready</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 leading-snug">{q.prompt}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      {onUpdateQuestion && (
                        <button
                          type="button"
                          onClick={(e) => startEditing(q, e)}
                          title="Edit Question"
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDeleteQuestion && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(q.id, e)}
                          title="Delete Question"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Inline Edit Form */
                  <div className="p-4 bg-purple-50/20 border-b border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                        Editing {q.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Cancel</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => saveEditing(q, e)}
                          className="px-3 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>

                    {editError && (
                      <div className="p-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Question Prompt</label>
                      <textarea
                        rows={2}
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Answer Outline</label>
                      <textarea
                        rows={2}
                        value={editAnswer}
                        onChange={(e) => setEditAnswer(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as QuestionCategory)}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="technical">Technical</option>
                          <option value="behavioural">Behavioural</option>
                          <option value="system-design">System Design</option>
                          <option value="company-fit">Company Fit</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">Difficulty</label>
                        <select
                          value={editDifficulty}
                          onChange={(e) => setEditDifficulty(Number(e.target.value))}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value={1}>1 - Beginner</option>
                          <option value={2}>2 - Intermediate</option>
                          <option value={3}>3 - Advanced</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Normal Expanded Content */}
                {!isEditing && isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-200/80 bg-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                      <MessageSquareText className="w-3.5 h-3.5 text-purple-600" />
                      <span>Answer Outline & Key Points</span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-700 leading-relaxed bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                      {q.answer_outline}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
