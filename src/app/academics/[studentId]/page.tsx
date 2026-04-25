'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Trophy, AlertTriangle, Phone, Mail, BookOpen, Heart,
  BookMarked, ClipboardList, ArrowLeft, GraduationCap,
  BarChart3, CreditCard, CalendarDays, TrendingUp, TrendingDown,
  MapPin, Droplets
} from 'lucide-react';
import Link from 'next/link';
import studentsData from '@/data/students.json';
import feeData from '@/data/fee.json';
import libraryData from '@/data/library.json';
import homeworkData from '@/data/homework.json';
import { getInitials } from '@/lib/utils';

const houseColors: Record<string, string> = {
  Tagore: 'bg-blue-100 text-blue-700 border-blue-200',
  Bose:   'bg-purple-100 text-purple-700 border-purple-200',
  Roy:    'bg-green/10 text-green border-green/20',
  Teresa: 'bg-pink/10 text-pink border-pink/20',
};

const subjectColors: Record<string, string> = {
  english:     'bg-blue-500',
  mathematics: 'bg-purple-500',
  science:     'bg-teal',
  history:     'bg-amber',
  geography:   'bg-cyan-500',
  bengali:     'bg-rose-500',
};

type Tab = 'academic' | 'attendance' | 'fee' | 'health' | 'library' | 'homework';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'academic',   label: 'Academic',   icon: GraduationCap },
  { id: 'attendance', label: 'Attendance',  icon: CalendarDays },
  { id: 'fee',        label: 'Fee',         icon: CreditCard },
  { id: 'health',     label: 'Health',      icon: Heart },
  { id: 'library',    label: 'Library',     icon: BookMarked },
  { id: 'homework',   label: 'Homework',    icon: ClipboardList },
];

export default function StudentProfilePage({ params }: { params: { studentId: string } }) {
  const { studentId } = params;
  const [activeTab, setActiveTab] = useState<Tab>('academic');

  const student = studentsData.find(s => s.id === studentId);
  if (!student) notFound();

  const feeRecords   = feeData.records.filter(f => f.studentId === student.id).slice(0, 4);
  const issuedBooks  = libraryData.books.filter(b => b.issuedTo.some(i => i.studentId === student.id));
  const hwClass      = homeworkData.assignments.filter(h => h.class === `${student.class}-${student.section}`).slice(0, 5);
  const scores       = student.academicScore as Record<string, number>;
  const avg          = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6);

  const learningInsight = `${student.name.split(' ')[0]} shows ${avg >= 85 ? 'strong' : 'moderate'} academic performance with ${
    scores.mathematics > scores.english ? 'strength in quantitative subjects' : 'strength in language subjects'
  }. ${avg < 80 ? 'Needs additional support in weaker areas.' : 'Consistent performance across subjects.'} ${
    student.learningStyle === 'Visual'    ? 'Visual learning style — recommend diagrams and charts for complex concepts.' :
    student.learningStyle === 'Auditory'  ? 'Auditory learner — classroom discussions and verbal explanations are most effective.' :
    'Kinesthetic learner — hands-on activities and experiments work best.'
  }`;

  const attendanceColor = student.attendancePercent >= 90 ? '#3B6D11' : student.attendancePercent >= 75 ? '#BA7517' : '#D85A30';
  const attendanceTextColor = student.attendancePercent >= 90 ? 'text-green' : student.attendancePercent >= 75 ? 'text-amber' : 'text-coral';

  return (
    <PageWrapper>
      {/* Back */}
      <Link href="/academics" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy mb-5 transition-colors font-dm-sans">
        <ArrowLeft className="w-4 h-4" /> Back to Academics
      </Link>

      {/* ── Hero Card ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
        {/* Gradient banner */}
        <div className="gradient-navy px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gold flex items-center justify-center text-navy font-bold text-xl font-sora flex-shrink-0 shadow-lg">
                {getInitials(student.name)}
              </div>
              <div>
                <h1 className="font-sora font-bold text-white text-xl leading-tight">{student.name}</h1>
                <p className="text-ice/70 text-sm mt-0.5">{student.class} · Section {student.section} · {student.rollNo}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${houseColors[student.house] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {student.house} House
                  </span>
                  <span className="text-[11px] bg-white/15 text-white border border-white/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Droplets className="w-2.5 h-2.5" />{student.bloodGroup}
                  </span>
                  <span className="text-[11px] bg-white/15 text-white border border-white/20 px-2 py-0.5 rounded-full font-semibold">
                    {student.gender}
                  </span>
                  <span className="text-[11px] bg-white/15 text-ice border border-white/10 px-2 py-0.5 rounded-full font-semibold">
                    {student.learningStyle} Learner
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats — pushed to right on desktop */}
            <div className="sm:ml-auto grid grid-cols-4 gap-3">
              {[
                { label: 'Attendance', value: `${student.attendancePercent}%`, color: attendanceTextColor },
                { label: 'Avg Score', value: avg, color: 'text-white' },
                { label: 'Fee', value: student.feeStatus, color: student.feeStatus === 'paid' ? 'text-green' : student.feeStatus === 'overdue' ? 'text-coral' : 'text-amber' },
                { label: 'Books Out', value: student.libraryBooksIssued, color: 'text-white' },
              ].map(stat => (
                <div key={stat.label} className="text-center bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                  <div className={`text-lg font-sora font-bold capitalize ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-ice/60 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact + parent strip */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" />{student.parent.phone}</span>
          <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400" />{student.parent.email}</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400" />{student.address}</span>
          <span className="hidden sm:inline text-gray-300">·</span>
          <span><strong className="text-gray-600">Father:</strong> {student.parent.father}</span>
          <span><strong className="text-gray-600">Mother:</strong> {student.parent.mother}</span>
          <span><strong className="text-gray-600">Occupation:</strong> {student.parent.occupation}</span>
        </div>

        {/* Medical alert inline */}
        {student.medicalNotes && (
          <div className="px-6 py-2.5 bg-amber/5 border-t border-amber/15 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber flex-shrink-0" />
            <span className="text-xs text-amber font-semibold">Medical: </span>
            <span className="text-xs text-gray-700">{student.medicalNotes}</span>
          </div>
        )}
      </div>

      {/* ── Tabs + Content ─────────────────────────────────────────────── */}
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

        <div className="p-5 sm:p-6">

          {/* ── Academic ── */}
          {activeTab === 'academic' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Subject bars — 3 cols */}
              <div className="lg:col-span-3 space-y-4">
                <h3 className="font-sora font-semibold text-navy">Subject Performance</h3>
                {Object.entries(scores).map(([subject, score]) => (
                  <div key={subject}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700 capitalize">{subject}</span>
                      <span className={`font-bold tabular-nums ${score >= 85 ? 'text-green' : score >= 70 ? 'text-amber' : 'text-coral'}`}>{score} / 100</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${subjectColors[subject] ?? 'bg-navy'}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: predicted + AI summary + achievements */}
              <div className="lg:col-span-2 space-y-4">
                {/* Predicted board score */}
                <div className="bg-gradient-to-br from-goldLight to-white border border-gold/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-gold" />
                    <span className="text-xs font-semibold text-gray-500">Predicted Board Score</span>
                    <AIBadge />
                  </div>
                  <div className="text-5xl font-sora font-bold text-navy mb-1">{student.predictedBoardScore}%</div>
                  <div className="h-2 bg-gold/20 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${student.predictedBoardScore}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {student.predictedBoardScore >= 80 ? 'On track for distinction' : student.predictedBoardScore >= 60 ? 'Average performance projected' : 'Needs improvement — below target'}
                  </p>
                </div>

                {/* AI learning summary */}
                <div className="bg-iceLight border border-ice rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AIBadge label="AI Learning Summary" />
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{learningInsight}</p>
                </div>

                {/* Achievements */}
                {student.achievements.length > 0 && (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-gold" />
                      <h4 className="font-sora font-semibold text-navy text-sm">Achievements</h4>
                    </div>
                    <ul className="space-y-2">
                      {student.achievements.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                          <span className="text-gold mt-0.5 flex-shrink-0">★</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Attendance ── */}
          {activeTab === 'attendance' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Ring */}
              <div className="sm:col-span-1 flex flex-col items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl p-6">
                <div className="relative w-36 h-36 mb-4">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#E8EFFE" strokeWidth="12" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={attendanceColor}
                      strokeWidth="12"
                      strokeDasharray={`${(student.attendancePercent / 100) * 314} 314`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-sora font-bold ${attendanceTextColor}`}>{student.attendancePercent}%</span>
                    <span className="text-xs text-gray-400">This Year</span>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${attendanceTextColor}`}>
                  {student.attendancePercent >= 90 ? 'Excellent' : student.attendancePercent >= 75 ? 'Satisfactory' : 'At Risk'}
                </p>
              </div>

              {/* Stats */}
              <div className="sm:col-span-2 grid grid-cols-2 gap-3 content-start">
                {[
                  { label: 'Days Present', value: Math.round(student.attendancePercent * 2.2), color: 'text-green', bg: 'bg-green/10' },
                  { label: 'Days Absent', value: Math.round((100 - student.attendancePercent) * 2.2), color: 'text-coral', bg: 'bg-coral/10' },
                  { label: 'Total School Days', value: 220, color: 'text-navy', bg: 'bg-navy/10' },
                  { label: 'Required (75%)', value: 165, color: 'text-amber', bg: 'bg-amber/10' },
                ].map(stat => (
                  <div key={stat.label} className={`${stat.bg} rounded-2xl p-5`}>
                    <div className={`text-3xl font-sora font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}

                {student.attendancePercent < 75 && (
                  <div className="col-span-2 bg-coral/8 border border-coral/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700">Attendance is below the mandatory 75% threshold. Parent counselling and immediate follow-up recommended.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Fee ── */}
          {activeTab === 'fee' && (
            <div className="space-y-4">
              {/* Status banner */}
              <div className={`rounded-2xl p-4 border flex items-center justify-between ${
                student.feeStatus === 'paid' ? 'bg-green/8 border-green/20' :
                student.feeStatus === 'overdue' ? 'bg-coral/8 border-coral/20' : 'bg-amber/8 border-amber/20'
              }`}>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Current Fee Status</p>
                  <StatusBadge status={student.feeStatus} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Admission Date</p>
                  <p className="text-sm font-semibold text-gray-700">{student.admissionDate}</p>
                </div>
              </div>

              {/* Records */}
              {feeRecords.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Term', 'Amount', 'Due Date', 'Paid On', 'Mode', 'Status'].map(h => (
                          <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {feeRecords.map((f, i) => (
                        <tr key={f.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700">{f.term}</td>
                          <td className="px-4 py-3 text-sm font-bold text-navy">₹{f.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{f.dueDate}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{f.paidDate ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{f.paymentMode ?? '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-2xl">No fee records found</div>
              )}
            </div>
          )}

          {/* ── Health ── */}
          {activeTab === 'health' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Medical notes + general */}
              <div className="space-y-4">
                <h3 className="font-sora font-semibold text-navy">Medical Summary</h3>
                {student.medicalNotes ? (
                  <div className="bg-amber/8 border border-amber/20 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber mb-1">Active Medical Note</p>
                      <p className="text-sm text-gray-700">{student.medicalNotes}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green/8 border border-green/20 rounded-2xl p-4 flex gap-3">
                    <Heart className="w-5 h-5 text-green flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green">No medical conditions on record</p>
                      <p className="text-xs text-gray-500 mt-0.5">Student is medically cleared for all school activities</p>
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Blood Group</p>
                  <p className="text-2xl font-sora font-bold text-navy">{student.bloodGroup}</p>
                </div>
              </div>

              {/* Vaccination tracker */}
              <div>
                <h3 className="font-sora font-semibold text-navy mb-4">Vaccination Status</h3>
                <div className="space-y-2">
                  {[
                    { name: 'BCG', done: true },
                    { name: 'Hepatitis B', done: true },
                    { name: 'MMR (Measles, Mumps, Rubella)', done: true },
                    { name: 'DPT Booster', done: true },
                    { name: 'Typhoid Booster', done: false },
                    { name: 'COVID-19', done: false },
                  ].map(v => (
                    <div key={v.name} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${v.done ? 'bg-green/5 border-green/15' : 'bg-gray-50 border-gray-100'}`}>
                      <span className="text-sm text-gray-700">{v.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.done ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                        {v.done ? '✓ Done' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Library ── */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-sora font-semibold text-navy">Issued Books</h3>
                <span className="text-sm text-gray-500">{issuedBooks.length} book{issuedBooks.length !== 1 ? 's' : ''} currently issued</span>
              </div>

              {issuedBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {issuedBooks.map(b => {
                    const issue = b.issuedTo.find(i => i.studentId === student.id);
                    const isOverdue = issue ? new Date(issue.dueDate) < new Date() : false;
                    return (
                      <div key={b.id} className={`flex items-start gap-4 p-4 rounded-2xl border ${isOverdue ? 'bg-coral/5 border-coral/20' : 'bg-gray-50 border-gray-100'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-coral/10' : 'bg-navy/10'}`}>
                          <BookOpen className={`w-5 h-5 ${isOverdue ? 'text-coral' : 'text-navy'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{b.title}</p>
                          <p className="text-xs text-gray-400 mb-2">{b.author} · {b.genre}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Due: {issue?.dueDate}</span>
                            {isOverdue && (
                              <span className="text-[10px] font-bold text-coral bg-coral/10 px-1.5 py-0.5 rounded-full">OVERDUE</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                  <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No books currently issued</p>
                </div>
              )}
            </div>
          )}

          {/* ── Homework ── */}
          {activeTab === 'homework' && (
            <div className="space-y-5">
              {/* Submission rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Submission Rate', value: '88%', color: 'text-green', bg: 'bg-green/8 border-green/20', icon: TrendingUp },
                  { label: 'Assignments Submitted', value: '22 / 25', color: 'text-navy', bg: 'bg-navy/5 border-navy/10', icon: ClipboardList },
                  { label: 'Pending', value: '3', color: 'text-coral', bg: 'bg-coral/8 border-coral/20', icon: TrendingDown },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                        <span className="text-xs text-gray-500">{stat.label}</span>
                      </div>
                      <div className={`text-2xl font-sora font-bold ${stat.color}`}>{stat.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Assignment list */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[480px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Subject', 'Description', 'Assigned', 'Due', 'Status'].map(h => (
                        <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hwClass.length > 0 ? hwClass.map((h, i) => (
                      <tr key={h.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{h.subject}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{h.description}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{h.assignedDate}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-medium">{h.dueDate}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${h.status === 'closed' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                            {h.status === 'closed' ? 'Submitted' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No homework records for this class</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </PageWrapper>
  );
}
