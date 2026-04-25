'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/input';
import AIBadge from '@/components/shared/AIBadge';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Search, TrendingUp, TrendingDown, FileText, Download,
  BookOpen, BarChart3, ClipboardList, ChevronRight, CheckCircle2
} from 'lucide-react';
import studentsData from '@/data/students.json';

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

type Tab = 'syllabus' | 'results' | 'report';

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('syllabus');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('Class X');
  const router = useRouter();

  const classes = [...new Set(studentsData.map(s => s.class))].sort();

  const filtered = studentsData
    .filter(s => s.class === classFilter && s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const avgA = Object.values(a.academicScore).reduce((x, y) => x + y, 0) / 6;
      const avgB = Object.values(b.academicScore).reduce((x, y) => x + y, 0) / 6;
      return avgB - avgA;
    });

  // Syllabus summary stats
  const avgCoverage = Math.round(syllabusData.reduce((acc, s) => acc + (s.covered / s.total) * 100, 0) / syllabusData.length);
  const onTrack = syllabusData.filter(s => (s.covered / s.total) >= 0.75).length;
  const behind = syllabusData.length - onTrack;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'syllabus', label: 'Syllabus Tracker', icon: BookOpen },
    { id: 'results',  label: 'Assessment Results', icon: BarChart3 },
    { id: 'report',   label: 'Report Cards', icon: ClipboardList },
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
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">

          {/* ── Syllabus Tracker ── */}
          {activeTab === 'syllabus' && (
            <div>
              {/* Toolbar */}
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

              {/* Cards grid on mobile, table on desktop */}
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

              {/* Mobile: student cards */}
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

              {/* Desktop: table */}
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

              {/* Bulk action */}
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

        </div>
      </div>
    </PageWrapper>
  );
}
