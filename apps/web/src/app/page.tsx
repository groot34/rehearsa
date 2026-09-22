import React from 'react';
import { Sparkles, Compass, CheckCircle2, Calendar, BookOpen, Layers, ShieldCheck, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
              R
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              Rehearsa
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 rounded-full border border-sky-200">
              FS-AI-INTERVIEW-01
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#pipeline"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              11-Step Pipeline
            </a>
            <a
              href="#architecture"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Architecture
            </a>
            <button className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
              Launch App
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100/70 border border-sky-200 text-sky-800 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>AI-Powered Research + Deterministic Verification</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            Master Every Technical & Behavioral Interview with{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600">
              Rehearsa
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Provide a job description, target company URL, and your available preparation days (1–60). Rehearsa researches the company, extracts requirements, generates categorized questions & flashcards, and builds a day-by-day study schedule.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 rounded-xl hover:from-sky-700 hover:to-indigo-700 shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2">
              <span>Create Interview Kit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#pipeline"
              className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Explore Specifications
            </a>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section id="features" className="py-16 bg-white border-y border-slate-200/80">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Engineered for Complete Interview Readiness
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Strict Appendix A JSON schema compliance with mathematical coverage guarantees.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Deep Web Research</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Dynamic URL crawling with SSRF protection, crawling target company pages and public interview discussions while respecting robots.txt.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Deterministic Coverage</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Application code uses set difference calculations to ensure 100% of extracted requirements are mapped to interview questions in Pass 2.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Study Scheduler</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Balances category focus, difficulty ratings, and study minutes strictly across your requested preparation timeframe (1–60 days).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 11-Step Pipeline Blueprint */}
        <section id="pipeline" className="py-20 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              11-Step Sequenced Pipeline
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Separating probabilistic AI generation from deterministic business invariants.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { num: '01', title: 'JD Requirement Extraction', desc: 'Extract technical, behavioural & domain requirements' },
              { num: '02', title: 'Seed Page Retrieval', desc: 'Fetch & clean seed company web pages' },
              { num: '03', title: 'Dynamic Link Ranking', desc: 'Crawl target domain & score relevant paths' },
              { num: '04', title: 'Company Hiring Search', desc: 'Research hiring culture & engineering values' },
              { num: '05', title: 'Interview Discussion Search', desc: 'Gather public candidate interview insights' },
              { num: '06', title: 'Pass 1 Question Bank', desc: 'Generate category-mapped prep questions' },
              { num: '07', title: 'Flashcards & Brief', desc: 'Synthesize flashcards and company brief' },
              { num: '08', title: 'Coverage Check (Deterministic)', desc: 'Set-difference identify uncovered requirements' },
              { num: '09', title: 'Pass 2 Missing Generation', desc: 'Targeted generation for missed requirements' },
              { num: '10', title: 'Schedule Allocation (Deterministic)', desc: 'Multi-day bin packing across 1–60 days' },
              { num: '11', title: 'Schema Validation', desc: 'Verify Appendix A structure & referential integrity' },
            ].map((step) => (
              <div key={step.num} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                    Step {step.num}
                  </span>
                  <h4 className="font-bold text-slate-900 mt-2 text-sm">{step.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Rehearsa</span>
            <span>— Full-Stack AI Interview Preparation Platform</span>
          </div>
          <div>
            <span>Assessment Code: FS-AI-INTERVIEW-01</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
