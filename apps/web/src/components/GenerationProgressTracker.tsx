import React from 'react';
import { Loader2, Sparkles, Compass, ShieldCheck, Calendar, Cpu } from 'lucide-react';

/**
 * Honest loading progress indicator for interview kit generation.
 * Communicates server-side pipeline activity without falsely simulating step completions.
 */
export const GenerationProgressTracker: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-sky-200 shadow-xl p-8 space-y-6 max-w-3xl mx-auto my-8 text-center">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold">
        <Sparkles className="w-4 h-4 text-sky-600 animate-spin" />
        <span>11-Step Pipeline Execution in Progress</span>
      </div>

      <div className="space-y-2 max-w-lg mx-auto">
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Generating Your Custom Interview Kit
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          The backend is conducting SSRF-safe company web research, extracting role requirements, running deterministic requirement coverage checks, and allocating your study schedule.
        </p>
      </div>

      {/* Main Loading Spinner */}
      <div className="py-6 flex flex-col items-center justify-center space-y-3">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-sky-100 border-t-sky-600 animate-spin" />
          <Cpu className="w-6 h-6 text-sky-600 absolute" />
        </div>
        <span className="text-xs font-medium text-slate-500 animate-pulse">
          Processing request... Please wait up to 15–30 seconds.
        </span>
      </div>

      {/* Pipeline Stages Overview (Honest Information) */}
      <div className="border-t border-slate-100 pt-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Pipeline Sequence Being Executed Server-Side
        </h4>
        <div className="grid sm:grid-cols-3 gap-3 text-left">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Compass className="w-4 h-4 text-sky-600" />
              <span>1. Web Research</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              SSRF-safe crawl of company website & hiring pages.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>2. AI & Coverage Check</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Role extraction & set-difference gap verification.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>3. Schedule Allocation</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Deterministic multi-day bin packing & validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
