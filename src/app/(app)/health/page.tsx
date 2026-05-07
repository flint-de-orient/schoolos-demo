'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import StatCard from '@/components/shared/StatCard';
import { Heart, Stethoscope, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const VACCINATIONS = [
  { key: 'BCG', label: 'BCG' },
  { key: 'HepB', label: 'HepB' },
  { key: 'MMR', label: 'MMR' },
  { key: 'DPT', label: 'DPT' },
  { key: 'Typh', label: 'Typh' },
];

const mockVaccTracker = [
  { name: 'Arjun C.', BCG: true, HepB: true, MMR: true, DPT: true, Typh: false },
  { name: 'Priya S.', BCG: true, HepB: true, MMR: false, DPT: true, Typh: false },
  { name: 'Souvik M.', BCG: true, HepB: true, MMR: true, DPT: true, Typh: true },
  { name: 'Ananya R.', BCG: true, HepB: false, MMR: true, DPT: true, Typh: true },
  { name: 'Rajan B.', BCG: true, HepB: true, MMR: true, DPT: false, Typh: true },
];

export default function HealthPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ visitsToday: 0, referredToday: 0, vaccinationsDue: 0 });
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        setStats(data.stats ?? { visitsToday: 0, referredToday: 0, vaccinationsDue: 0 });
        setLogs(data.logs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Nurse Visits Today" value={String(stats.visitsToday)} icon={Heart} iconBg="bg-pink" />
        <StatCard title="Referred to Doctor" value={String(stats.referredToday)} icon={Stethoscope} iconBg="bg-coral" />
        <StatCard title="Vaccinations Due" value={String(stats.vaccinationsDue)} icon={AlertCircle} iconBg="bg-amber" subtitle="Next 30 days" />
      </div>

      {/* Epidemic Alert */}
      <div className="bg-green/8 border border-green/20 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Shield className="w-5 h-5 text-green flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green">All Clear — No Epidemic Patterns Detected</p>
          <p className="text-xs text-gray-500 mt-0.5">No cluster illness patterns detected this week. School health status: Normal.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Nurse Log */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-sora font-semibold text-navy">Nurse Visit Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Date', 'Student', 'Complaint', 'Action', 'Referred', 'Parent Notified'].map(h => (
                    <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">No nurse visits recorded</td></tr>
                ) : logs.map((entry, i) => {
                  const gradeName = entry.student?.section?.grade?.name ?? '';
                  const secName = entry.student?.section?.name ?? '';
                  const className = gradeName ? `${gradeName}-${secName}` : '';
                  return (
                    <tr key={entry.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(entry.date).toLocaleDateString('en-IN')}{entry.time ? ` · ${entry.time}` : ''}</td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-gray-800">{entry.student?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{className}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 max-w-[160px]">
                        <span className="line-clamp-2">{entry.complaint}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 max-w-[160px]">
                        <span className="line-clamp-2">{entry.actionTaken ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.referredToDoctor ? 'bg-amber/10 text-amber' : 'bg-gray-100 text-gray-500'}`}>
                          {entry.referredToDoctor ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {entry.parentNotified
                          ? <CheckCircle className="w-4 h-4 text-green" />
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vaccination Tracker */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Vaccination Tracker</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-gray-400 pb-2">Student</th>
                  {VACCINATIONS.map(v => (
                    <th key={v.key} className="text-center text-gray-400 pb-2">{v.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockVaccTracker.map((v, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2 font-semibold text-gray-700 text-[11px]">{v.name}</td>
                    {VACCINATIONS.map(vacc => (
                      <td key={vacc.key} className="text-center py-2">
                        {(v as any)[vacc.key]
                          ? <CheckCircle className="w-3.5 h-3.5 text-green mx-auto" />
                          : <span className="text-coral text-[11px] font-bold">×</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">BCG · Hepatitis B · MMR · DPT · Typhoid Booster</p>
        </div>
      </div>
    </PageWrapper>
  );
}
