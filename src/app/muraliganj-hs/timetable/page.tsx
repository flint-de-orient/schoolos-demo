'use client';

import { useState } from 'react';
import { Clock, Brain, AlertTriangle, Download, Share2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import TimetableGrid      from './_components/TimetableGrid';
import AIGenerator        from './_components/AIGenerator';
import SubstitutionPanel  from './_components/SubstitutionPanel';
import timetableData      from '@/data/muraliganj/timetable.json';

type Tab = 'view' | 'generate' | 'substitution';

const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'view',         label: 'Timetable View',      icon: Clock },
  { id: 'generate',     label: 'AI Generator',        icon: Brain,         badge: 'AI' },
  { id: 'substitution', label: 'Substitution',        icon: AlertTriangle, badge: '1' },
];

const { meta } = timetableData;

export default function MHSTimetablePage() {
  const [activeTab, setActiveTab] = useState<Tab>('view');

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-sora font-bold text-2xl text-gray-900">AI Timetable Engine</h2>
          <p className="text-sm text-gray-500 mt-1">
            Academic Year 2026-27 · Generated {new Date(meta.generatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs bg-green/10 text-green px-3 py-1.5 rounded-full font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Published · {meta.conflictsFound} Conflicts
          </div>
          <button onClick={() => toast.success('Timetable exported as PDF')} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button onClick={() => toast.success('Share link copied to clipboard')} className="flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-lg text-sm hover:bg-navyMid transition-colors font-sora font-semibold">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>
      </div>

      {/* Quality strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Quality Score',   value: `${meta.qualityScore.overall}/100`,  color: 'text-gold',   bg: 'bg-gold/10' },
          { label: 'Conflict-Free',   value: `${meta.qualityScore.conflictFree}%`, color: 'text-green',  bg: 'bg-green/10' },
          { label: 'Teacher Fatigue', value: `${meta.qualityScore.teacherFatigue}%`, color: 'text-teal', bg: 'bg-teal/10' },
          { label: 'Pedagogy Score',  value: `${meta.qualityScore.pedagogy}%`,    color: 'text-purple', bg: 'bg-purple/10' },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-xl p-3 flex items-center gap-3`}>
            <div>
              <div className={`font-sora font-bold text-xl ${m.color}`}>{m.value}</div>
              <div className="text-xs text-gray-500">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-dm-sans transition-all duration-150 ${
                isActive ? 'bg-white text-navy font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.badge === 'AI' ? 'bg-teal text-white' : 'bg-coral text-white'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'view' && <TimetableGrid />}
        {activeTab === 'generate' && <AIGenerator />}
        {activeTab === 'substitution' && <SubstitutionPanel />}
      </div>
    </div>
  );
}
