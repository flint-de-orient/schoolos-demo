'use client';

import { useState } from 'react';
import { Search, Users, BookOpen, Clock, Phone } from 'lucide-react';
import teachersData from '@/data/muraliganj/teachers.json';

export default function MHSTeachersPage() {
  const [query, setQuery] = useState('');

  const filtered = teachersData.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.subjects.some(s => s.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sora font-bold text-2xl text-gray-900">Teachers</h2>
          <p className="text-sm text-gray-500 mt-1">{teachersData.length} staff members · {teachersData.filter(t => t.status === 'active').length} active</p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Active',   count: teachersData.filter(t => t.status === 'active').length,   color: 'bg-green/10 text-green' },
            { label: 'On Leave', count: teachersData.filter(t => t.status === 'on-leave').length,  color: 'bg-amber/10 text-amber' },
          ].map(s => (
            <div key={s.label} className={`${s.color} px-3 py-1.5 rounded-lg text-sm font-semibold`}>
              {s.count} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search teacher or subject…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Teacher', 'Designation', 'Subject(s)', 'Assigned Classes', 'Periods/Week', 'Contact', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-sora font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-gold font-bold text-xs font-sora flex-shrink-0">
                      {t.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{t.name}</div>
                      <div className="text-[10px] text-gray-400">{t.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.designation}</td>
                <td className="px-4 py-3">
                  {t.subjects.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 mr-1 px-2 py-0.5 bg-purple/10 text-purple text-xs rounded-full font-medium">
                      <BookOpen className="w-3 h-3" />{s}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {t.assignedClasses.slice(0, 4).map(c => (
                      <span key={c} className="text-[10px] bg-iceLight text-navy px-1.5 py-0.5 rounded font-semibold">{c}</span>
                    ))}
                    {t.assignedClasses.length > 4 && (
                      <span className="text-[10px] text-gray-400">+{t.assignedClasses.length - 4}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {t.periodsPerWeek}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Phone className="w-3 h-3" />{t.phone}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${t.status === 'active' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                    {t.status === 'active' ? 'Active' : 'On Leave'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            No teachers match your search
          </div>
        )}
      </div>

      {/* Load summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-sora font-semibold text-sm text-gray-900 mb-3">Weekly Load Summary</h3>
        <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
          {teachersData.filter(t => t.status === 'active').map(t => {
            const pct = Math.round((t.periodsPerWeek / 30) * 100);
            return (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-36 truncate">{t.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${pct >= 80 ? 'bg-coral' : pct >= 60 ? 'bg-amber' : 'bg-green'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{t.periodsPerWeek}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
