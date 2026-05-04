'use client';

import { useState } from 'react';
import { Search, Phone, Mail, BookOpen, UserCheck, AlertTriangle } from 'lucide-react';
import teachersData from '@/data/muraliganj/teachers.json';

type Teacher = typeof teachersData[number];

export default function MHSHRPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'on-leave'>('all');

  const filtered = teachersData.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subjects.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  const active = teachersData.filter(t => t.status === 'active').length;
  const onLeave = teachersData.filter(t => t.status === 'on-leave').length;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div>
        <h2 className="font-sora font-bold text-2xl text-gray-900">HR &amp; Staff</h2>
        <p className="text-sm text-gray-500 mt-1">Muraliganj High School (H.S) · Teaching Staff</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Staff',    value: teachersData.length, color: 'text-navy',  bg: 'bg-navy/10' },
          { label: 'Active Today',   value: active,              color: 'text-green', bg: 'bg-green/10' },
          { label: 'On Leave',       value: onLeave,             color: 'text-amber', bg: 'bg-amber/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <div className={`text-3xl font-sora font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-600 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {onLeave > 0 && (
        <div className="bg-amber/5 border border-amber/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-amber">{onLeave} teacher(s) on leave today.</span>
            {' '}Use the AI Timetable Engine → Substitution tab to assign cover teachers.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or subject…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['all', 'active', 'on-leave'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {f === 'on-leave' ? 'On Leave' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((t: Teacher) => (
            <div key={t.id} className={`border rounded-xl p-4 transition-all hover:shadow-sm ${t.status === 'on-leave' ? 'border-amber/30 bg-amber/5' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-sora font-bold text-sm flex-shrink-0 ${t.status === 'active' ? 'bg-navy text-white' : 'bg-amber/20 text-amber'}`}>
                  {t.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sora font-semibold text-sm text-gray-900 truncate">{t.name}</span>
                    {t.status === 'active'
                      ? <span className="flex items-center gap-1 text-[10px] font-bold bg-green/10 text-green px-2 py-0.5 rounded-full flex-shrink-0"><UserCheck className="w-2.5 h-2.5" />Active</span>
                      : <span className="flex items-center gap-1 text-[10px] font-bold bg-amber/10 text-amber px-2 py-0.5 rounded-full flex-shrink-0"><AlertTriangle className="w-2.5 h-2.5" />On Leave</span>
                    }
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <BookOpen className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{t.subjects.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Phone className="w-2.5 h-2.5" />{t.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Mail className="w-2.5 h-2.5 text-gray-400" />
                    <span className="text-[10px] text-gray-400 truncate">{t.email}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.assignedClasses.map((c: string) => (
                      <span key={c} className="text-[10px] bg-navy/5 text-navy px-1.5 py-0.5 rounded font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No staff found for your search.</div>
        )}
      </div>
    </div>
  );
}
