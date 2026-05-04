'use client';

import { useState, useMemo } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/input';
import AIBadge from '@/components/shared/AIBadge';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTenantSafe } from '@/context/TenantContext';
import MHSAcademicsPage from '@/components/mhs/MHSAcademicsPage';
import {
  Search, TrendingUp, TrendingDown, FileText, Download,
  BookOpen, BarChart3, ClipboardList, ChevronRight, CheckCircle2,
  Brain, AlertTriangle, Clock, Users, Zap, RefreshCw,
  Grid3x3, CalendarDays, Target, Layers
} from 'lucide-react';
import studentsData from '@/data/students.json';
import conceptMasteryData from '@/data/concept-mastery.json';
import lessonPlansData from '@/data/lesson-plans.json';

const syllabusData = [
  { subject: 'Mathematics',  teacher: 'Mr. Subhashis Bose',       total: 24, covered: 19, color: 'bg-blue-500',   dot: 'bg-blue-500' },
  { subject: 'English',      teacher: 'Mrs. Jayashree Nair',       total: 18, covered: 16, color: 'bg-green-500',  dot: 'bg-green-500' },
  { subject: 'Physics',      teacher: 'Mr. Arijit Das',            total: 20, covered: 15, color: 'bg-purple-500', dot: 'bg-purple-500' },
  { subject: 'Chemistry',    teacher: 'Mrs. Suchitra Ghosh',       total: 22, covered: 17, color: 'bg-orange-500', dot: 'bg-orange-500' },
  { subject: 'Biology',      teacher: 'Mr. Prosenjit Chatterjee',  total: 18, covered: 14, color: 'bg-teal',       dot: 'bg-teal' },
  { subject: 'History',      teacher: 'Mrs. Pamela Sen',           total: 16, covered: 13, color: 'bg-amber',      dot: 'bg-amber' },
  { subject: 'Geography',    teacher: 'Mr. Tapas Mukherjee',       total: 14, covered: 12, color: 'bg-cyan-500',   dot: 'bg-cyan-500' },
  { subject: 'Bengali',      teacher: 'Mrs. Swapna Dey',           total: 16, covered: 15, color: 'bg-rose-500',   dot: 'bg-rose-500' },
];

const MASTERY_CONFIG: Record<number, { label: string; bg: string; text: string }> = {
  0: { label: 'Not Started', bg: 'bg-gray-100', text: 'text-gray-400' },
  1: { label: 'Struggling',  bg: 'bg-red-100',  text: 'text-red-600'  },
  2: { label: 'Developing',  bg: 'bg-amber/15', text: 'text-amber'    },
  3: { label: 'Proficient',  bg: 'bg-teal/15',  text: 'text-teal'     },
  4: { label: 'Mastered',    bg: 'bg-green/15', text: 'text-green'    },
};

type Tab = 'syllabus' | 'results' | 'report' | 'mastery' | 'lessons';

export default function AcademicsPage() {
  const tenant = useTenantSafe();
  return tenant?.id === 'muraliganj' ? <MHSAcademicsPage /> : <SundarbanaAcademicsContent />;
}

function SundarbanaAcademicsContent() {
  const [activeTab, setActiveTab] = useState<Tab>('syllabus');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('Class X');
  const [masterySubject, setMasterySubject] = useState('Mathematics');
  const [masteryClass, setMasteryClass] = useState('Class X');
  const [selectedPlan, setSelectedPlan] = useState(lessonPlansData.plans[0]);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genSubject, setGenSubject] = useState('Physics');
  const [genTopic, setGenTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  const classes = [...new Set(studentsData.map(s => s.class))].sort();

  const filtered = studentsData
    .filter(s => s.class === classFilter && s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const avgA = Object.values(a.academicScore).reduce((x, y) => x + y, 0) / 6;
      const avgB = Object.values(b.academicScore).reduce((x, y) => x + y, 0) / 6;
      return avgB - avgA;
    });

  const avgCoverage = Math.round(syllabusData.reduce((acc, s) => acc + (s.covered / s.total) * 100, 0) / syllabusData.length);
  const onTrack = syllabusData.filter(s => (s.covered / s.total) >= 0.75).length;
  const behind = syllabusData.length - onTrack;

  // Concept mastery data
  const masterySubjects = Object.keys(conceptMasteryData.subjects);
  const masteryTopics = useMemo(() =>
    (conceptMasteryData.subjects as Record<string, { topics: string[] }>)[masterySubject]?.topics ?? [],
    [masterySubject]
  );
  const masteryClassData = useMemo(() =>
    (conceptMasteryData.classData as Record<string, { students: { studentId: string; studentName: string; section: string; mastery: Record<string, number[]> }[] }>)[masteryClass]?.students ?? [],
    [masteryClass]
  );
  const reteachAlerts = conceptMasteryData.reteachAlerts.filter(a => a.class === masteryClass);

  const avgMastery = useMemo(() => {
    if (!masteryClassData.length || !masteryTopics.length) return [];
    return masteryTopics.map((_, ti) => {
      const vals = masteryClassData.map(s => (s.mastery[masterySubject]?.[ti] ?? 0));
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    });
  }, [masteryClassData, masteryTopics, masterySubject]);

  function runGeneratePlan() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setShowGenModal(false);
      toast.success(`Lesson plan generated for ${genSubject} — ${genTopic || 'new topic'}`);
    }, 2000);
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; ai?: boolean }[] = [
    { id: 'syllabus', label: 'Syllabus Tracker', icon: BookOpen },
    { id: 'results',  label: 'Assessment Results', icon: BarChart3 },
    { id: 'report',   label: 'Report Cards', icon: ClipboardList },
    { id: 'mastery',  label: 'Concept Mastery', icon: Grid3x3, ai: true },
    { id: 'lessons',  label: 'Lesson Planner', icon: CalendarDays, ai: true },
  ];

  return (
    <PageWrapper>
      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Students', value: studentsData.length, color: 'text-navy', bg: 'bg-navy/10' },
          { label: 'Avg Syllabus Coverage', value: `${avgCoverage}%`, color: 'text-teal', bg: 'bg-teal/10' },
          { label: 'Subjects On Track', value: onTrack, color: 'text-green', bg: 'bg-green/10' },
          { label: 'Subjects Behind', value: behind, color: 'text-coral', bg: 'bg-coral/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className={`text-2xl font-sora font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold font-dm-sans whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-navy text-navy bg-navy/3'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.ai && <span className="text-[9px] font-bold bg-teal text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Brain className="w-2.5 h-2.5" />AI</span>}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">

          {/* ── Syllabus Tracker ── */}
          {activeTab === 'syllabus' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-sora font-semibold text-navy">Syllabus Coverage</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Academic Year 2024-25 · Term 2</p>
                </div>
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white self-start sm:self-auto"
                >
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="block sm:hidden space-y-3">
                {syllabusData.map(s => {
                  const pct = Math.round((s.covered / s.total) * 100);
                  return (
                    <div key={s.subject} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                          <span className="font-semibold text-sm text-gray-800">{s.subject}</span>
                        </div>
                        <span className={`text-sm font-bold ${pct >= 80 ? 'text-green' : pct >= 60 ? 'text-amber' : 'text-coral'}`}>{pct}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{s.teacher}</p>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mb-1">
                        <div className={`h-2 rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                        <span>{s.covered} covered</span>
                        <span className="text-coral">{s.total - s.covered} remaining</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Subject', 'Teacher', 'Total', 'Covered', 'Remaining', 'Progress'].map(h => (
                        <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-5 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {syllabusData.map((s, i) => {
                      const pct = Math.round((s.covered / s.total) * 100);
                      return (
                        <tr key={s.subject} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                              <span className="font-semibold text-sm text-gray-800">{s.subject}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500">{s.teacher}</td>
                          <td className="px-5 py-3 text-sm text-gray-700">{s.total}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-green">{s.covered}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-coral">{s.total - s.covered}</td>
                          <td className="px-5 py-3 w-52">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className={`h-2 rounded-full transition-all ${s.color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-xs font-bold w-8 text-right ${pct >= 80 ? 'text-green' : pct >= 60 ? 'text-amber' : 'text-coral'}`}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Assessment Results ── */}
          {activeTab === 'results' && (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search student..." className="pl-9 h-10 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white self-start sm:self-auto"
                >
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="block sm:hidden space-y-3">
                {filtered.length === 0 ? <EmptyState /> : filtered.map(s => {
                  const scores = s.academicScore;
                  const avg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
                  return (
                    <button
                      key={s.id}
                      onClick={() => router.push(`/academics/${s.id}`)}
                      className="w-full text-left bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl p-4 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
                            <span className="text-white text-xs font-bold font-sora">{s.name.split(' ').map(n => n[0]).slice(0,2).join('')}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-800">{s.name}</div>
                            <div className="text-xs text-gray-400">{s.rollNo}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-sora font-bold text-navy">{avg}</div>
                          <div className="text-[10px] text-gray-400">Average</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[['Eng', scores.english], ['Maths', scores.mathematics], ['Sci', scores.science], ['Hist', scores.history], ['Ben', scores.bengali], ['Geo', scores.geography]].map(([sub, val]) => (
                          <div key={sub as string} className="text-center bg-white rounded-lg py-1.5">
                            <div className={`text-sm font-bold ${(val as number) >= 85 ? 'text-green' : (val as number) >= 70 ? 'text-gray-700' : 'text-coral'}`}>{val}</div>
                            <div className="text-[10px] text-gray-400">{sub}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-semibold text-gold">{s.predictedBoardScore}%</span>
                          <AIBadge />
                        </div>
                        <span className="text-xs text-teal font-semibold flex items-center gap-0.5">View Profile <ChevronRight className="w-3 h-3" /></span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Student', 'Eng', 'Maths', 'Sci', 'History', 'Bengali', 'Avg', 'Trend', 'Predicted'].map(h => (
                        <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={9}><EmptyState /></td></tr>
                    ) : filtered.map((s, i) => {
                      const scores = s.academicScore;
                      const avg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
                      const trend = avg >= 80 ? 'up' : avg >= 70 ? 'neutral' : 'down';
                      const ScoreCell = ({ val }: { val: number }) => (
                        <td className={`px-4 py-3 text-sm font-semibold ${val >= 85 ? 'text-green' : val >= 70 ? 'text-gray-700' : 'text-coral'}`}>{val}</td>
                      );
                      return (
                        <tr
                          key={s.id}
                          className={`border-b border-gray-50 hover:bg-iceLight/60 transition-colors cursor-pointer ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}
                          onClick={() => router.push(`/academics/${s.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-[10px] font-bold font-sora">{s.name.split(' ').map(n => n[0]).slice(0,2).join('')}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-gray-800">{s.name}</div>
                                <div className="text-xs text-gray-400">{s.rollNo}</div>
                              </div>
                            </div>
                          </td>
                          <ScoreCell val={scores.english} />
                          <ScoreCell val={scores.mathematics} />
                          <ScoreCell val={scores.science} />
                          <ScoreCell val={scores.history} />
                          <ScoreCell val={scores.bengali} />
                          <td className="px-4 py-3 font-bold text-sm text-navy">{avg}</td>
                          <td className="px-4 py-3">
                            {trend === 'up' ? <TrendingUp className="w-4 h-4 text-green" /> :
                             trend === 'down' ? <TrendingDown className="w-4 h-4 text-coral" /> :
                             <span className="text-gray-400 text-sm">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold text-gold">{s.predictedBoardScore}%</span>
                              <AIBadge />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Report Cards ── */}
          {activeTab === 'report' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-sora font-semibold text-navy">Report Cards</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Term 2 · 2024-25 Academic Year</p>
                </div>
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white self-start"
                >
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {studentsData.filter(s => s.class === classFilter).map((s, i) => {
                  const avg = Math.round(Object.values(s.academicScore).reduce((a, b) => a + b, 0) / 6);
                  const isGenerated = i === 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold font-sora">{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.rollNo} · Avg: <span className="font-semibold text-navy">{avg}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isGenerated && (
                          <span className="hidden sm:flex text-xs bg-green/10 text-green font-semibold px-2 py-0.5 rounded-full items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                        <button
                          onClick={() => {
                            toast.loading(`Generating report card for ${s.name}...`, { id: `rc-${s.id}` });
                            setTimeout(() => toast.success('Ready — click to download', {
                              id: `rc-${s.id}`,
                              action: { label: 'Download', onClick: () => {} },
                            }), 1500);
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-navyMid hover:text-white hover:bg-navy border border-gray-200 hover:border-navy rounded-xl px-3 py-2 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isGenerated ? 'Download' : 'Generate'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    toast.loading('Generating all report cards...', { id: 'bulk-rc' });
                    setTimeout(() => toast.success('All report cards ready for download', { id: 'bulk-rc' }), 2000);
                  }}
                  className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gold/90 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Generate All Report Cards
                </button>
                <button className="flex items-center gap-2 bg-white text-navyMid font-semibold text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:border-navy transition-colors">
                  <Download className="w-4 h-4" />
                  Download All as ZIP
                </button>
              </div>
            </div>
          )}

          {/* ── Concept Mastery ── */}
          {activeTab === 'mastery' && (
            <div>
              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <h3 className="font-sora font-semibold text-navy">Concept Mastery Heatmap</h3>
                  <AIBadge />
                </div>
                <div className="flex gap-2">
                  <select value={masteryClass} onChange={e => setMasteryClass(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20">
                    {Object.keys(conceptMasteryData.classData).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={masterySubject} onChange={e => setMasterySubject(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20">
                    {masterySubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-xs text-gray-400 font-medium">Mastery Level:</span>
                {Object.entries(MASTERY_CONFIG).map(([key, cfg]) => (
                  <span key={key} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium sticky left-0 bg-gray-50 min-w-[140px]">Student</th>
                      {masteryTopics.map(topic => (
                        <th key={topic} className="text-center text-xs text-gray-400 px-3 py-3 font-medium min-w-[100px]">{topic}</th>
                      ))}
                      <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masteryClassData.map((student, si) => {
                      const vals = student.mastery[masterySubject] ?? [];
                      const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
                      const avgCfg = MASTERY_CONFIG[Math.round(avg) as keyof typeof MASTERY_CONFIG] ?? MASTERY_CONFIG[0];
                      return (
                        <tr key={student.studentId} className={`border-b border-gray-50 hover:bg-gray-50/60 ${si % 2 !== 0 ? 'bg-gray-50/20' : ''}`}>
                          <td className="px-4 py-3 sticky left-0 bg-white hover:bg-gray-50">
                            <button
                              onClick={() => router.push(`/academics/${student.studentId}`)}
                              className="flex items-center gap-2 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-[10px] font-bold">{student.studentName.split(' ').map(n => n[0]).slice(0,2).join('')}</span>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800 group-hover:text-navy transition-colors">{student.studentName}</p>
                                <p className="text-[10px] text-gray-400">Sec {student.section}</p>
                              </div>
                            </button>
                          </td>
                          {masteryTopics.map((_, ti) => {
                            const val = vals[ti] ?? 0;
                            const cfg = MASTERY_CONFIG[val as keyof typeof MASTERY_CONFIG] ?? MASTERY_CONFIG[0];
                            return (
                              <td key={ti} className="px-3 py-3 text-center">
                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold mx-auto ${cfg.bg} ${cfg.text}`}>
                                  {val}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-bold ${avgCfg.text}`}>{avg}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Class average row */}
                    <tr className="bg-navy/3 border-t-2 border-navy/10">
                      <td className="px-4 py-3 text-xs font-bold text-navy sticky left-0 bg-navy/3">Class Average</td>
                      {avgMastery.map((avg, ti) => {
                        const cfg = MASTERY_CONFIG[Math.round(avg) as keyof typeof MASTERY_CONFIG] ?? MASTERY_CONFIG[0];
                        return (
                          <td key={ti} className="px-3 py-3 text-center">
                            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold mx-auto ${cfg.bg} ${cfg.text}`}>
                              {avg}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-navy">
                          {avgMastery.length ? Math.round(avgMastery.reduce((a, b) => a + b, 0) / avgMastery.length * 10) / 10 : '—'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Reteach alerts */}
              {reteachAlerts.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-coral" />
                    <h4 className="font-sora font-semibold text-navy text-sm">Reteach Alerts</h4>
                    <AIBadge />
                    <span className="text-xs bg-coral/10 text-coral font-semibold px-2 py-0.5 rounded-full">{reteachAlerts.length} flagged</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {reteachAlerts.map((alert, ai) => (
                      <div key={ai} className={`border rounded-xl p-4 ${alert.severity === 'high' ? 'border-coral/25 bg-coral/5' : 'border-amber/25 bg-amber/5'}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{alert.topic}</p>
                            <p className="text-xs text-gray-500">{alert.subject} · {alert.class}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${alert.severity === 'high' ? 'bg-coral/15 text-coral' : 'bg-amber/15 text-amber'}`}>
                            {alert.severity === 'high' ? 'HIGH' : 'MEDIUM'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-600">
                            <span className="font-semibold text-coral">{alert.studentsStruggling}</span> of {alert.totalStudents} students struggling
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                          <div className={`h-full rounded-full ${alert.severity === 'high' ? 'bg-coral' : 'bg-amber'}`}
                            style={{ width: `${(alert.studentsStruggling / alert.totalStudents) * 100}%` }} />
                        </div>
                        <p className="text-xs text-gray-600 flex items-start gap-1">
                          <Zap className="w-3 h-3 text-teal flex-shrink-0 mt-0.5" />
                          {alert.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Lesson Planner ── */}
          {activeTab === 'lessons' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h3 className="font-sora font-semibold text-navy">AI Lesson Planner</h3>
                  <AIBadge />
                </div>
                <button
                  onClick={() => setShowGenModal(true)}
                  className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gold/90 transition-colors"
                >
                  <Brain className="w-4 h-4" />
                  Generate Plan
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Plan list */}
                <div className="lg:col-span-1 space-y-2">
                  <p className="text-xs text-gray-400 font-medium px-1 mb-3">
                    {lessonPlansData.plans.length} plans — Class X
                  </p>
                  {lessonPlansData.plans.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        selectedPlan.id === plan.id
                          ? 'bg-navy/5 border-navy/20 shadow-sm'
                          : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-xs font-semibold ${selectedPlan.id === plan.id ? 'text-navy' : 'text-gray-700'}`}>{plan.topic}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          plan.status === 'approved' ? 'bg-green/10 text-green' :
                          plan.status === 'draft' ? 'bg-amber/10 text-amber' : 'bg-gray-100 text-gray-500'
                        }`}>{plan.status}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{plan.subject} · {plan.class}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />{plan.duration} min
                        </span>
                        <span className="text-[10px] text-gray-400">{plan.chapter}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Plan detail */}
                <div className="lg:col-span-2">
                  {selectedPlan && (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                      {/* Plan header */}
                      <div className="gradient-navy text-white px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded-full font-semibold">{selectedPlan.subject}</span>
                              <span className="text-[10px] text-ice/60">{selectedPlan.class} · {selectedPlan.chapter}</span>
                            </div>
                            <h4 className="font-sora font-bold text-base text-white">{selectedPlan.topic}</h4>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-sora font-bold text-gold">{selectedPlan.duration}</div>
                            <div className="text-[10px] text-ice/60">minutes</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-ice/70">
                          <span className="flex items-center gap-1"><Target className="w-2.5 h-2.5" />{selectedPlan.objectives.length} objectives</span>
                          <span className="flex items-center gap-1"><Layers className="w-2.5 h-2.5" />{selectedPlan.mainTeaching.length} teaching steps</span>
                          <span className="flex items-center gap-1"><Brain className="w-2.5 h-2.5" />by {selectedPlan.createdBy}</span>
                        </div>
                      </div>

                      <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                        {/* Learning objectives */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Learning Objectives</p>
                          <ul className="space-y-1.5">
                            {selectedPlan.objectives.map((obj, oi) => (
                              <li key={oi} className="flex items-start gap-2 text-xs text-gray-700">
                                <span className="w-4 h-4 rounded-full bg-navy/10 text-navy text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{oi + 1}</span>
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Warm-up */}
                        <div className="bg-goldLight border border-gold/20 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber" />
                            <p className="text-xs font-semibold text-amber">Warm-up · {selectedPlan.warmup.duration} min</p>
                          </div>
                          <p className="text-xs text-gray-700">{selectedPlan.warmup.activity}</p>
                        </div>

                        {/* Teaching steps */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Main Teaching Sequence</p>
                          <div className="space-y-2">
                            {selectedPlan.mainTeaching.map((step) => (
                              <div key={step.step} className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="w-6 h-6 rounded-lg bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{step.step}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] text-gray-400 italic">{step.method}</span>
                                    <span className="text-[10px] text-teal font-semibold ml-auto">{step.duration} min</span>
                                  </div>
                                  <p className="text-xs text-gray-700">{step.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Activity */}
                        <div className="bg-teal/5 border border-teal/20 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Users className="w-3.5 h-3.5 text-teal" />
                            <p className="text-xs font-semibold text-teal">{selectedPlan.activity.name} · {selectedPlan.activity.duration} min · Groups of {selectedPlan.activity.groupSize}</p>
                          </div>
                          <p className="text-xs text-gray-700">{selectedPlan.activity.description}</p>
                        </div>

                        {/* Homework */}
                        <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <ClipboardList className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Homework</p>
                            <p className="text-xs text-gray-700">{selectedPlan.homework}</p>
                          </div>
                        </div>

                        {/* Bloom's distribution */}
                        {selectedPlan.bloomsDistribution && Object.keys(selectedPlan.bloomsDistribution).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Brain className="w-3 h-3" />Bloom&apos;s Distribution</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(selectedPlan.bloomsDistribution as Record<string, number>).map(([level, pct]) => (
                                <div key={level} className="text-center bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                                  <div className="text-sm font-bold text-navy">{pct}%</div>
                                  <div className="text-[10px] text-gray-400">{level}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Generate modal */}
              {showGenModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="w-5 h-5 text-teal" />
                      <h3 className="font-sora font-bold text-navy">Generate AI Lesson Plan</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1.5">Subject</label>
                        <select value={genSubject} onChange={e => setGenSubject(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                          {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Bengali'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1.5">Topic</label>
                        <Input
                          placeholder="e.g., Laws of Motion, Photosynthesis..."
                          value={genTopic}
                          onChange={e => setGenTopic(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Class</label>
                          <select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                            {['Class IX', 'Class X', 'Class XI', 'Class XII'].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Duration</label>
                          <select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                            {['35 min', '45 min', '60 min', '90 min'].map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="bg-teal/5 border border-teal/20 rounded-xl p-3 flex items-start gap-2">
                        <Brain className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600">AI will generate a complete lesson plan with objectives, teaching steps, activity, formative question, and Bloom&apos;s distribution aligned to the CISCE syllabus.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button onClick={() => setShowGenModal(false)}
                        className="flex-1 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl py-2.5 hover:border-gray-300 transition-colors">
                        Cancel
                      </button>
                      <button onClick={runGeneratePlan} disabled={generating}
                        className="flex-1 flex items-center justify-center gap-2 bg-gold text-navy font-sora font-bold text-sm py-2.5 rounded-xl hover:bg-gold/90 disabled:opacity-60 transition-all">
                        {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</> : <><Brain className="w-4 h-4" /> Generate</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </PageWrapper>
  );
}
