import React, { useState } from 'react';
import { Kit } from '@rehearsa/shared';
import { CompanyBriefCard } from './CompanyBriefCard';
import { RoleBreakdownCard } from './RoleBreakdownCard';
import { QuestionBankCard } from './QuestionBankCard';
import { FlashcardDeck } from './FlashcardDeck';
import { StudyScheduleTimeline } from './StudyScheduleTimeline';
import { CoverageBadge } from './CoverageBadge';
import { Sparkles, Calendar, Layers, HelpCircle, Briefcase, Building2, CheckCircle2, RotateCcw } from 'lucide-react';

interface Props {
  kit: Kit;
  onReset: () => void;
}

export const KitViewer: React.FC<Props> = ({ kit, onReset }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'brief' | 'role' | 'questions' | 'cards' | 'schedule'>('all');

  const tabs = [
    { id: 'all', label: 'Complete Kit View', icon: Sparkles },
    { id: 'brief', label: 'Company Brief', icon: Building2 },
    { id: 'role', label: 'Role Breakdown', icon: Briefcase },
    { id: 'questions', label: `Questions (${kit.questions.length})`, icon: HelpCircle },
    { id: 'cards', label: `Flashcards (${kit.flashcards.length})`, icon: Layers },
    { id: 'schedule', label: `Schedule (${kit.schedule.days_available} Days)`, icon: Calendar },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto my-8 px-4 sm:px-6">
      {/* Kit Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30">
                {kit.source.company}
              </span>
              <span className="text-xs text-white/50">
                Researched: {new Date(kit.source.researched_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {kit.role.title} Interview Prep Kit
            </h1>
            <p className="text-xs sm:text-sm text-white/70">
              Generated from {kit.source.jd_chars} JD chars across {kit.source.pages_used.length} researched page(s).
            </p>
          </div>

          <button
            onClick={onReset}
            className="self-start sm:self-auto px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Generate New Kit</span>
          </button>
        </div>

        {/* Coverage Badge Header Summary */}
        <CoverageBadge coverage={kit.coverage} totalRequirements={kit.role.requirements.length} />

        {/* Section Filter Nav Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md font-bold'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Selected Tab Views */}
      <div className="space-y-8">
        {(activeTab === 'all' || activeTab === 'brief') && (
          <CompanyBriefCard companyName={kit.source.company} companyBrief={kit.company_brief} />
        )}

        {(activeTab === 'all' || activeTab === 'role') && (
          <RoleBreakdownCard role={kit.role} />
        )}

        {(activeTab === 'all' || activeTab === 'questions') && (
          <QuestionBankCard questions={kit.questions} />
        )}

        {(activeTab === 'all' || activeTab === 'cards') && (
          <FlashcardDeck flashcards={kit.flashcards} />
        )}

        {(activeTab === 'all' || activeTab === 'schedule') && (
          <StudyScheduleTimeline schedule={kit.schedule} questions={kit.questions} />
        )}
      </div>
    </div>
  );
};
