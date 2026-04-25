'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import { Brain, Search, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import analyticsData from '@/data/analytics.json';
import studentsData from '@/data/students.json';

const subjects = ['english', 'mathematics', 'science', 'history', 'geography', 'bengali'];
const subjectLabels: Record<string, string> = {
  english: 'English', mathematics: 'Mathematics', science: 'Science',
  history: 'History', geography: 'Geography', bengali: 'Bengali',
};

const subjectColors: Record<string, string> = {
  english: 'bg-green-500', mathematics: 'bg-blue-500', science: 'bg-purple-500',
  history: 'bg-amber-500', geography: 'bg-cyan-500', bengali: 'bg-rose-500',
};

const heatmapClasses = ['Class VIII', 'Class IX', 'Class X', 'Class XI', 'Class XII'];

function getHeatColor(val: number) {
  if (val >= 85) return 'bg-green text-white';
  if (val >= 78) return 'bg-teal text-white';
  if (val >= 72) return 'bg-amber text-white';
  return 'bg-coral text-white';
}

const learningInsights: Record<string, string[]> = {
  Visual: ['Use mind maps and diagrams', 'Color-code notes by subject', 'Watch educational videos'],
  Auditory: ['Record and replay lectures', 'Join study discussion groups', 'Use mnemonics and rhymes'],
  Kinesthetic: ['Practice with past papers', 'Build models and experiments', 'Take frequent breaks'],
  'Reading/Writing': ['Summarize chapters in own words', 'Create detailed outline notes', 'Write practice essays'],
};

export default function AIAdvisorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundStudent, setFoundStudent] = useState<typeof studentsData[0] | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const match = studentsData.find(s => s.name.toLowerCase().includes(query.toLowerCase()));
      setFoundStudent(match ?? null);
    } else {
      setFoundStudent(null);
    }
  };

  return (
    <PageWrapper>
      <div className="bg-gradient-to-r from-navy to-navyMid rounded-xl p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
          <Brain className="w-7 h-7 text-gold" />
        </div>
        <div>
          <h2 className="font-sora font-bold text-white text-xl">AI Academic Advisor</h2>
          <p className="text-ice/70 text-sm mt-0.5">AI-powered insights — updated daily based on assessment data</p>
        </div>
        <AIBadge label="Powered by SchoolOS AI" />
      </div>

      {/* At-Risk Students */}
      <div className="mb-6">
        <h3 className="font-sora font-semibold text-navy text-base mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-coral" />
          At-Risk Students
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {analyticsData.atRiskStudents.map(s => {
            return (
              <div key={s.studentId} className="bg-white rounded-xl shadow-sm border border-coral/20 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-coral text-sm font-sora">
                      {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.class}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-3">{s.reason}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Risk Score</span>
                    <span className="font-bold text-coral">{s.riskScore}%</span>
                  </div>
                  <Progress value={s.riskScore} className="h-1.5" />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Recommended Action</p>
                  <p className="text-xs text-teal font-semibold mt-0.5">
                    {s.riskScore > 85 ? 'Immediate counsellor meeting' : s.riskScore > 75 ? 'Parent contact + academic support' : 'Monitor & provide study plan'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap & Predictions */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Heatmap */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-sora font-semibold text-navy mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Class Performance Heatmap
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-gray-400 pb-2 pr-3">Class</th>
                  {subjects.map(s => (
                    <th key={s} className="text-center text-gray-400 pb-2 px-1 capitalize">{s.slice(0, 3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapClasses.map(cls => {
                  const data = analyticsData.subjectPerformance[cls as keyof typeof analyticsData.subjectPerformance];
                  if (!data) return null;
                  return (
                    <tr key={cls}>
                      <td className="font-semibold text-gray-700 pr-3 py-1.5">{cls}</td>
                      {subjects.map(s => {
                        const val = data[s as keyof typeof data] as number;
                        return (
                          <td key={s} className="px-1 py-1 text-center">
                            <span className={`inline-block w-10 py-0.5 rounded font-bold ${getHeatColor(val)}`}>{val}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-3 text-[10px]">
            {[{color: 'bg-coral', label: '< 72'}, {color: 'bg-amber', label: '72-77'}, {color: 'bg-teal', label: '78-84'}, {color: 'bg-green', label: '85+'}].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${l.color}`} />
                <span className="text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Board Predictions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-sora font-semibold text-navy mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Board Result Predictions
            <AIBadge />
          </h3>
          <div className="space-y-4">
            {Object.entries(analyticsData.boardResultPrediction).map(([cls, data]) => (
              <div key={cls} className="p-4 bg-iceLight rounded-xl border border-ice">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-sora font-bold text-navy text-lg">{data.predicted}%</p>
                    <p className="text-xs text-gray-500">{cls} · Predicted Average</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Target: <strong className={data.predicted >= data.target ? 'text-green' : 'text-coral'}>{data.target}%</strong></p>
                    <p className="text-xs text-gray-400">Last Year: {data.lastYear}%</p>
                  </div>
                </div>
                <div className="h-2 bg-white rounded-full">
                  <div
                    className={`h-2 rounded-full ${data.predicted >= data.target ? 'bg-green' : 'bg-amber'}`}
                    style={{ width: `${data.predicted}%` }}
                  />
                </div>
                {data.predicted < data.target && (
                  <p className="text-[10px] text-coral font-semibold mt-2">
                    ↓ {data.target - data.predicted}% below target — review curriculum coverage
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Student AI Report */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-sora font-semibold text-navy">Individual Student AI Report</h3>
          <AIBadge />
        </div>
        <div className="relative max-w-md mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Type student name to see AI analysis..."
            className="pl-9 h-10"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {foundStudent && (
          <div className="grid grid-cols-2 gap-5 animate-fadeIn border-t border-gray-100 pt-5">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl gradient-navy flex items-center justify-center text-white font-bold font-sora">
                  {foundStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-sora font-semibold text-navy">{foundStudent.name}</p>
                  <p className="text-xs text-gray-500">{foundStudent.class} · Section {foundStudent.section}</p>
                  <span className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full font-semibold">{foundStudent.learningStyle} Learner</span>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subject Analysis</h4>
              <div className="space-y-2">
                {Object.entries(foundStudent.academicScore).map(([sub, score]) => (
                  <div key={sub}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-600 capitalize">{subjectLabels[sub] ?? sub}</span>
                      <span className={`font-bold ${score >= 85 ? 'text-green' : score >= 70 ? 'text-amber' : 'text-coral'}`}>{score}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className={`h-1.5 rounded-full ${subjectColors[sub] ?? 'bg-navy'}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="bg-goldLight border border-gold/20 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1">Predicted Board Score</p>
                <p className="text-3xl font-sora font-bold text-navy">{foundStudent.predictedBoardScore}%</p>
                <div className="mt-2 h-1.5 bg-white rounded-full">
                  <div className="h-1.5 bg-gold rounded-full" style={{ width: `${foundStudent.predictedBoardScore}%` }} />
                </div>
              </div>

              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Revision Plan</h4>
              <ul className="space-y-1.5 mb-4">
                {(learningInsights[foundStudent.learningStyle] ?? learningInsights.Visual).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="w-4 h-4 rounded-full bg-teal/10 text-teal flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>

              {(foundStudent as typeof foundStudent & { atRisk?: boolean }).atRisk && (
                <div className="bg-coral/8 border border-coral/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-coral mb-1">⚠ At-Risk Flag</p>
                  <p className="text-xs text-gray-600">{(foundStudent as typeof foundStudent & { riskReason?: string }).riskReason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!foundStudent && searchQuery.length >= 2 && (
          <p className="text-sm text-gray-400 text-center py-6">No student found matching &quot;{searchQuery}&quot;</p>
        )}

        {searchQuery.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-10 h-10 text-iceLight mx-auto mb-2" />
            <p className="text-sm text-gray-400">Search for any student to view their AI-generated academic report</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
