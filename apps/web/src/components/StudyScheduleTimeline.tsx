import React from 'react';
import { Schedule, Question } from '@rehearsa/shared';
import { Calendar, Clock, BookOpen, CheckCircle } from 'lucide-react';

interface Props {
  schedule: Schedule;
  questions: Question[];
}

export const StudyScheduleTimeline: React.FC<Props> = ({ schedule, questions }) => {
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Deterministic Study Schedule</h3>
            <p className="text-xs text-slate-500">
              Allocated across {schedule.days_available} preparation days
            </p>
          </div>
        </div>

        <span className="px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-200 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Total {schedule.days.reduce((acc, d) => acc + d.minutes, 0)} Mins</span>
        </span>
      </div>

      <div className="space-y-4">
        {schedule.days.map((day) => {
          const scheduledQuestions = day.question_ids
            .map((qid) => questionMap.get(qid))
            .filter((q): q is Question => q !== undefined);

          return (
            <div
              key={day.day}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    D{day.day}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">{day.focus}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{day.minutes} mins</span>
                  </span>
                  <span className="text-xs text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {day.question_ids.length} Question(s)
                  </span>
                </div>
              </div>

              {scheduledQuestions.length > 0 ? (
                <div className="space-y-2">
                  {scheduledQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-lg bg-white border border-slate-200/80 text-xs flex items-start gap-2.5"
                    >
                      <BookOpen className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {q.id}
                          </span>
                          <span className="uppercase text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {q.category}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800">{q.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/60">
                  Concept revision, flashcard practice, and mock rehearsal time.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
