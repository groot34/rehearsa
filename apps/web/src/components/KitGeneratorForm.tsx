import React, { useState } from 'react';
import { Sparkles, Calendar, Globe, FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import { GenerateKitPayload } from '../lib/api';

interface Props {
  onSubmit: (payload: GenerateKitPayload) => void;
  isLoading: boolean;
  error?: { code: string; message: string; details?: any } | null;
}

export const KitGeneratorForm: React.FC<Props> = ({ onSubmit, isLoading, error }) => {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [companyUrl, setCompanyUrl] = useState<string>('https://example.com');
  const [daysAvailable, setDaysAvailable] = useState<number>(7);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!jobDescription || jobDescription.trim().length < 20) {
      errs.jobDescription = 'Job description must be at least 20 characters long.';
    }

    if (!companyUrl || !companyUrl.trim()) {
      errs.companyUrl = 'Company URL is required.';
    } else {
      try {
        const parsed = new URL(companyUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errs.companyUrl = 'Company URL must start with http:// or https://';
        }
      } catch {
        errs.companyUrl = 'Please enter a valid URL (e.g. https://example.com)';
      }
    }

    if (!daysAvailable || daysAvailable < 1 || daysAvailable > 60) {
      errs.daysAvailable = 'Days available must be between 1 and 60.';
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (validateForm()) {
      onSubmit({
        jobDescription: jobDescription.trim(),
        companyUrl: companyUrl.trim(),
        daysAvailable: Number(daysAvailable),
      });
    }
  };

  const loadSampleData = () => {
    setJobDescription(
      'We are seeking a Senior Full Stack Engineer proficient in TypeScript, React, Next.js, and Node.js backend architecture to lead system design and optimize high-scale APIs.'
    );
    setCompanyUrl('https://example.com');
    setDaysAvailable(14);
    setClientErrors({});
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 max-w-4xl mx-auto my-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Interview Preparation Kit</h2>
          <p className="text-sm text-slate-500 mt-1">
            Input your target role JD, company website, and study timeframe (1–60 days).
          </p>
        </div>

        <button
          type="button"
          onClick={loadSampleData}
          disabled={isLoading}
          className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 transition-colors flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Load Sample Job Description</span>
        </button>
      </div>

      {/* API Server Error Display */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>Generation Failed ({error.code || 'ERROR'})</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed pl-6">{error.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Description Textarea */}
        <div className="space-y-2">
          <label htmlFor="jobDescription" className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Job Description (JD Text)</span>
            </span>
            <span className="text-slate-400 font-mono font-normal">Min 20 Chars</span>
          </label>
          <textarea
            id="jobDescription"
            rows={6}
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value);
              if (clientErrors.jobDescription) {
                setClientErrors((prev) => ({ ...prev, jobDescription: '' }));
              }
            }}
            placeholder="Paste the full job description text here (responsibilities, technical stack, qualifications)..."
            disabled={isLoading}
            className={`w-full p-4 rounded-2xl border text-sm font-sans transition-all focus:outline-none focus:ring-2 ${
              clientErrors.jobDescription
                ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500/20'
                : 'border-slate-200 bg-slate-50/50 focus:border-sky-500 focus:ring-sky-500/20'
            }`}
          />
          {clientErrors.jobDescription && (
            <p className="text-xs text-rose-600 font-medium">{clientErrors.jobDescription}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Company URL */}
          <div className="space-y-2">
            <label htmlFor="companyUrl" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Target Company Website URL</span>
            </label>
            <input
              id="companyUrl"
              type="text"
              value={companyUrl}
              onChange={(e) => {
                setCompanyUrl(e.target.value);
                if (clientErrors.companyUrl) {
                  setClientErrors((prev) => ({ ...prev, companyUrl: '' }));
                }
              }}
              placeholder="https://company.example.com"
              disabled={isLoading}
              className={`w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                clientErrors.companyUrl
                  ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500/20'
                  : 'border-slate-200 bg-slate-50/50 focus:border-sky-500 focus:ring-sky-500/20'
              }`}
            />
            {clientErrors.companyUrl && (
              <p className="text-xs text-rose-600 font-medium">{clientErrors.companyUrl}</p>
            )}
          </div>

          {/* Days Available Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Preparation Timeframe</span>
              </span>
              <span className="font-mono text-sm text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {daysAvailable} {daysAvailable === 1 ? 'Day' : 'Days'}
              </span>
            </div>
            <div className="pt-2 px-1">
              <input
                id="daysAvailable"
                type="range"
                min={1}
                max={60}
                value={daysAvailable}
                onChange={(e) => {
                  setDaysAvailable(Number(e.target.value));
                  if (clientErrors.daysAvailable) {
                    setClientErrors((prev) => ({ ...prev, daysAvailable: '' }));
                  }
                }}
                disabled={isLoading}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5">
                <span>1 Day</span>
                <span>14 Days</span>
                <span>30 Days</span>
                <span>60 Days</span>
              </div>
            </div>
            {clientErrors.daysAvailable && (
              <p className="text-xs text-rose-600 font-medium">{clientErrors.daysAvailable}</p>
            )}
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sky-500/25 active:scale-[0.99]'
            }`}
          >
            <span>{isLoading ? 'Generating Interview Kit...' : 'Generate Interview Kit'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
};
