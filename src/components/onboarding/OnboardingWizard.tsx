'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  School, CalendarDays, BookOpen, CheckCircle2,
  ChevronRight, ChevronLeft, Loader2, Plus, Trash2,
} from 'lucide-react';

const CISCE_GRADES = [
  { name: 'Nursery',    order: 1,  exam: false },
  { name: 'LKG',        order: 2,  exam: false },
  { name: 'UKG',        order: 3,  exam: false },
  { name: 'Class I',    order: 4,  exam: false },
  { name: 'Class II',   order: 5,  exam: false },
  { name: 'Class III',  order: 6,  exam: false },
  { name: 'Class IV',   order: 7,  exam: false },
  { name: 'Class V',    order: 8,  exam: false },
  { name: 'Class VI',   order: 9,  exam: false },
  { name: 'Class VII',  order: 10, exam: false },
  { name: 'Class VIII', order: 11, exam: false },
  { name: 'Class IX',   order: 12, exam: false },
  { name: 'Class X',    order: 13, exam: true  },
  { name: 'Class XI',   order: 14, exam: false },
  { name: 'Class XII',  order: 15, exam: true  },
];

interface GradeRow {
  name: string;
  order: number;
  isExamClass: boolean;
  sections: string[];
  enabled: boolean;
}

const STEPS = [
  { label: 'School Profile', icon: School },
  { label: 'Academic Year',  icon: CalendarDays },
  { label: 'Grade Setup',    icon: BookOpen },
  { label: 'Done',           icon: CheckCircle2 },
];

interface TenantData {
  name: string;
  shortName: string;
  board: string;
  phone: string | null;
  address: string | null;
  city: string;
  state: string;
  website: string | null;
  headTitle: string;
  headName: string;
}

export default function OnboardingWizard({ tenant }: { tenant: TenantData }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — School Profile (pre-filled from superadmin creation)
  const [profile, setProfile] = useState({
    name:      tenant.name,
    shortName: tenant.shortName ?? '',
    phone:     tenant.phone ?? '',
    address:   tenant.address ?? '',
    city:      tenant.city ?? '',
    state:     tenant.state ?? '',
    website:   tenant.website ?? '',
    headTitle: tenant.headTitle ?? 'Principal',
    headName:  tenant.headName ?? '',
  });

  // Step 2 — Academic Year
  const [year, setYear] = useState({
    label:     '2025-26',
    startDate: '2025-04-01',
    endDate:   '2026-03-31',
  });
  const [academicYearId, setAcademicYearId] = useState('');

  // Step 3 — Grades
  const [grades, setGrades] = useState<GradeRow[]>(
    CISCE_GRADES.map((g) => ({
      name: g.name,
      order: g.order,
      isExamClass: g.exam,
      sections: ['A'],
      enabled: ['Class I', 'Class II', 'Class III', 'Class IV', 'Class V',
                 'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X'].includes(g.name),
    }))
  );

  const toggleGrade = (name: string) =>
    setGrades((prev) => prev.map((g) => g.name === name ? { ...g, enabled: !g.enabled } : g));

  const addSection = (name: string) =>
    setGrades((prev) => prev.map((g) => {
      if (g.name !== name || g.sections.length >= 5) return g;
      const next = String.fromCharCode(65 + g.sections.length);
      return { ...g, sections: [...g.sections, next] };
    }));

  const removeSection = (name: string, sec: string) =>
    setGrades((prev) => prev.map((g) =>
      g.name === name ? { ...g, sections: g.sections.filter((s) => s !== sec) } : g
    ));

  // ── Step handlers ──────────────────────────────────────

  const submitProfile = async () => {
    if (!profile.name || !profile.headName) {
      toast.error('School name and head name are required');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/onboarding/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setLoading(false);
    if (!res.ok) { toast.error('Failed to save profile'); return; }
    setStep(1);
  };

  const submitYear = async () => {
    if (!year.label || !year.startDate || !year.endDate) {
      toast.error('All academic year fields are required');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/onboarding/academic-year', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(year),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? 'Failed to create academic year'); return; }
    setAcademicYearId(data.id);
    setStep(2);
  };

  const submitGrades = async () => {
    const enabled = grades.filter((g) => g.enabled && g.sections.length > 0);
    if (enabled.length === 0) { toast.error('Select at least one grade'); return; }
    setLoading(true);
    const res = await fetch('/api/onboarding/grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academicYearId,
        grades: enabled.map((g) => ({
          name: g.name,
          displayOrder: g.order,
          sections: g.sections,
          isExamClass: g.isExamClass,
        })),
      }),
    });
    setLoading(false);
    if (!res.ok) { toast.error('Failed to create grades'); return; }
    setStep(3);
  };

  const completeOnboarding = async () => {
    setLoading(true);
    await fetch('/api/onboarding/complete', { method: 'POST' });
    setLoading(false);
    window.location.href = '/dashboard';
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
            <span className="text-navy font-sora font-bold text-lg">S</span>
          </div>
          <span className="text-white font-sora font-bold text-2xl">School<span className="text-gold">OS</span></span>
        </div>
        <p className="text-ice text-sm">AI-Powered School ERP · Setup Wizard</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                ${done   ? 'bg-green/20 text-green border border-green/30' : ''}
                ${active ? 'bg-gold text-navy border border-gold' : ''}
                ${!done && !active ? 'bg-white/10 text-ice/50 border border-white/10' : ''}
              `}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px ${i < step ? 'bg-green/50' : 'bg-white/20'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">

        {/* ── Step 0: School Profile ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-sora font-semibold text-navy">School Profile</h2>
              <p className="text-sm text-gray-500 mt-1">Tell us about your school — this appears on reports, ID cards and parent messages.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">School Name *</label>
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Short Name</label>
                <input value={profile.shortName} placeholder="e.g. SACK"
                  onChange={(e) => setProfile({ ...profile, shortName: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</label>
                <input value={profile.phone} placeholder="033-XXXXXXXX"
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Head Title</label>
                <select value={profile.headTitle} onChange={(e) => setProfile({ ...profile, headTitle: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
                  <option>Principal</option>
                  <option>Headmaster</option>
                  <option>Headmistress</option>
                  <option>Director</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Head Name *</label>
                <input value={profile.headName} placeholder="Dr. Anita Sharma"
                  onChange={(e) => setProfile({ ...profile, headName: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">City</label>
                <input value={profile.city} placeholder="Kolkata"
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">State</label>
                <input value={profile.state} placeholder="West Bengal"
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Website</label>
                <input value={profile.website} placeholder="https://yourschool.edu.in"
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
            </div>
            <button onClick={submitProfile} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navyMid transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* ── Step 1: Academic Year ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-sora font-semibold text-navy">Academic Year</h2>
              <p className="text-sm text-gray-500 mt-1">Set up your current academic year. You can add more years later.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Year Label *</label>
                <input value={year.label} placeholder="2025-26"
                  onChange={(e) => setYear({ ...year, label: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Start Date *</label>
                  <input type="date" value={year.startDate}
                    onChange={(e) => setYear({ ...year, startDate: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">End Date *</label>
                  <input type="date" value={year.endDate}
                    onChange={(e) => setYear({ ...year, endDate: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)}
                className="flex items-center gap-1.5 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={submitYear} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navyMid transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Grade Setup ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-sora font-semibold text-navy">Grade Structure</h2>
              <p className="text-sm text-gray-500 mt-1">Select grades your school runs and add sections for each.</p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {grades.map((g) => (
                <div key={g.name}
                  className={`border rounded-xl p-3 transition-all ${g.enabled ? 'border-navy/20 bg-iceLight' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={g.enabled} onChange={() => toggleGrade(g.name)}
                      className="w-4 h-4 accent-navy rounded" />
                    <span className={`text-sm font-semibold flex-1 ${g.enabled ? 'text-navy' : 'text-gray-400'}`}>
                      {g.name}
                      {g.isExamClass && (
                        <span className="ml-2 text-xs bg-gold/20 text-amber px-1.5 py-0.5 rounded-full">Board Exam</span>
                      )}
                    </span>
                    {g.enabled && (
                      <div className="flex items-center gap-1.5">
                        {g.sections.map((s) => (
                          <div key={s} className="flex items-center gap-0.5 bg-navy text-white text-xs px-2 py-0.5 rounded-full">
                            {s}
                            {g.sections.length > 1 && (
                              <button onClick={() => removeSection(g.name, s)} className="hover:text-gold ml-0.5">
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {g.sections.length < 5 && (
                          <button onClick={() => addSection(g.name)}
                            className="text-navy hover:text-gold transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {grades.filter((g) => g.enabled).length} grades selected · {grades.filter((g) => g.enabled).reduce((a, g) => a + g.sections.length, 0)} sections total
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={submitGrades} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navyMid transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Structure <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 rounded-full bg-green/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green" />
            </div>
            <div>
              <h2 className="text-2xl font-sora font-semibold text-navy">You&apos;re all set!</h2>
              <p className="text-sm text-gray-500 mt-2">
                <strong>{profile.name || tenant.name}</strong> is ready to go. Your dashboard, fee module, attendance, and all other modules are now active.
              </p>
            </div>
            <div className="bg-iceLight rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-navy uppercase tracking-wide">What&apos;s ready:</p>
              {[
                'School profile configured',
                `Academic year ${year.label} created`,
                `${grades.filter((g) => g.enabled).length} grades with ${grades.filter((g) => g.enabled).reduce((a, g) => a + g.sections.length, 0)} sections`,
                'WhatsApp notifications ready to connect',
                'Fee structure engine active',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <button onClick={completeOnboarding} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold text-navy font-semibold py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Go to Dashboard <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-ice/40 text-xs mt-6">
        SchoolOS · Powered by Flint De Orient · {tenant.board} Board
      </p>
    </div>
  );
}
