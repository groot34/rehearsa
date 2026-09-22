import React from 'react';
import { Coverage } from '@rehearsa/shared';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  coverage: Coverage;
  totalRequirements: number;
}

export const CoverageBadge: React.FC<Props> = ({ coverage, totalRequirements }) => {
  const is100Percent = coverage.uncovered_requirement_ids.length === 0;
  const coveredCount = totalRequirements - coverage.uncovered_requirement_ids.length;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg shadow-slate-900/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              is100Percent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Deterministic Requirement Coverage</h4>
            <p className="text-xs text-slate-400">Set-difference application calculation</p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20 flex items-center gap-1">
          <RefreshCw className="w-3 h-3 text-sky-400" />
          <span>Passes: {coverage.passes}</span>
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-extrabold text-white">
            {coveredCount}/{totalRequirements}
          </span>
          <span className="text-xs text-slate-400">
            ({Math.round((coveredCount / (totalRequirements || 1)) * 100)}% requirements covered)
          </span>
        </div>

        {is100Percent ? (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Coverage Verified</span>
          </span>
        ) : (
          <div className="text-xs text-amber-400 bg-amber-950/60 border border-amber-800/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Uncovered IDs: {coverage.uncovered_requirement_ids.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
