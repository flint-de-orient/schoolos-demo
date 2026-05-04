'use client';

import PageWrapper from '@/components/layout/PageWrapper';
import StatCard from '@/components/shared/StatCard';
import { Heart, Stethoscope, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import healthData from '@/data/health.json';

export default function HealthPage() {
  return (
    <PageWrapper>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Nurse Visits Today" value={String(healthData.stats.nurseVisitsToday)} icon={Heart} iconBg="bg-pink" />
        <StatCard title="Referred to Doctor" value={String(healthData.stats.referredToDoctor)} icon={Stethoscope} iconBg="bg-coral" />
        <StatCard title="Vaccinations Due" value={String(healthData.stats.vaccinationsDueThisMonth)} icon={AlertCircle} iconBg="bg-amber" subtitle="This month" />
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
                {healthData.nurseLog.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{entry.date}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-800">{entry.studentName}</p>
                      <p className="text-xs text-gray-400">{entry.class}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-[160px]">
                      <span className="line-clamp-2">{entry.complaint}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 max-w-[160px]">
                      <span className="line-clamp-2">{entry.action}</span>
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
                ))}
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
                  <th className="text-center text-gray-400 pb-2">BCG</th>
                  <th className="text-center text-gray-400 pb-2">HepB</th>
                  <th className="text-center text-gray-400 pb-2">MMR</th>
                  <th className="text-center text-gray-400 pb-2">DPT</th>
                  <th className="text-center text-gray-400 pb-2">Typh</th>
                </tr>
              </thead>
              <tbody>
                {healthData.vaccinationTracker.map(v => {
                  const vals = [v.BCG, v.HepatitisB, v.MMR, v.DPT, v.TyphoidBooster];
                  return (
                    <tr key={v.studentId} className="border-b border-gray-50">
                      <td className="py-2 font-semibold text-gray-700 text-[11px]">{v.name.split(' ')[0]}</td>
                      {vals.map((val, i) => (
                        <td key={i} className="text-center py-2">
                          {val
                            ? <CheckCircle className="w-3.5 h-3.5 text-green mx-auto" />
                            : <span className="text-coral text-[11px] font-bold">×</span>
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">BCG · Hepatitis B · MMR · DPT · Typhoid Booster</p>
        </div>
      </div>
    </PageWrapper>
  );
}
