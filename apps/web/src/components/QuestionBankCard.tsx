import React, { useState } from 'react';
import { Question } from '@rehearsa/shared';
import { HelpCircle, Star, ChevronDown, ChevronUp, MessageSquareText } from 'lucide-react';

interface Props {
  questions: Question[];
}

export const QuestionBankCard: React.FC<Props> = ({ questions }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

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
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
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
            <p className="text-xs text-slate-500">{questions.length} questions mapped to requirements</p>
          </div>
        </div>

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

      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No questions found in category "{selectedCategory}".
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isExpanded = !!expandedIds[q.id];

            return (
              <div
                key={q.id}
                className="border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all overflow-hidden"
              >
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
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 leading-snug">{q.prompt}</h4>
                  </div>

                  <button className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isExpanded && (
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
