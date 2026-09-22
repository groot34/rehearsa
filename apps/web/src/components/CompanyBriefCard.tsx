import React from 'react';
import { CompanyBrief } from '@rehearsa/shared';
import { Building2, ExternalLink, Globe } from 'lucide-react';

interface Props {
  companyName: string;
  companyBrief: CompanyBrief;
}

export const CompanyBriefCard: React.FC<Props> = ({ companyName, companyBrief }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{companyName} Overview</h3>
          <p className="text-xs text-slate-500">Synthesized web research & company brief</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Mission & Culture Summary
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            {companyBrief.summary}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Products & Engineering Focus
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            {companyBrief.what_they_do}
          </p>
        </div>

        {companyBrief.sources && companyBrief.sources.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Sourced Research Pages</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {companyBrief.sources.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                >
                  <span className="truncate max-w-[200px]">{src}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
