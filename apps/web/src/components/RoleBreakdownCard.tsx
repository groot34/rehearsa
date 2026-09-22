import React from 'react';
import { Role } from '@rehearsa/shared';
import { Briefcase, CheckCircle, Tag } from 'lucide-react';

interface Props {
  role: Role;
}

export const RoleBreakdownCard: React.FC<Props> = ({ role }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{role.title}</h3>
            <span className="text-xs text-slate-500 font-medium">Seniority: {role.seniority}</span>
          </div>
        </div>
        <span className="px-3 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
          {role.requirements.length} Core Requirements
        </span>
      </div>

      {role.responsibilities && role.responsibilities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Primary Responsibilities
          </h4>
          <ul className="space-y-2">
            {role.responsibilities.map((resp, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          <span>Extracted Requirements Matrix</span>
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {role.requirements.map((req) => {
            const isMust = req.priority === 'must';
            const kindColors: Record<string, string> = {
              technical: 'bg-sky-50 text-sky-700 border-sky-200',
              behavioural: 'bg-purple-50 text-purple-700 border-purple-200',
              domain: 'bg-amber-50 text-amber-700 border-amber-200',
            };

            return (
              <div
                key={req.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                    {req.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        kindColors[req.kind] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {req.kind}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        isMust
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {req.priority}
                    </span>
                  </div>
                </div>
                <p className="text-xs md:text-sm font-medium text-slate-800 leading-snug">{req.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
