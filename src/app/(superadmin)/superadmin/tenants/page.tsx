'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus, Search, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  board: string;
  city: string;
  state: string;
  email: string;
  isActive: boolean;
  plan: string;
  createdAt: string;
  _count?: { users: number };
  modules: { module: string; isActive: boolean }[];
}

const BOARD_COLOR: Record<string, string> = {
  CBSE:  'bg-blue-100 text-blue-700',
  CISCE: 'bg-purple-100 text-purple-700',
  WBBSE: 'bg-teal/10 text-teal',
  OTHER: 'bg-gray-100 text-gray-600',
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/superadmin/tenants')
      .then((r) => r.json())
      .then((d) => { setTenants(d.data ?? []); setLoading(false); });
  }, []);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sora font-bold text-2xl text-white">Tenants</h1>
          <p className="text-gray-400 text-sm mt-1">{tenants.length} schools on the platform</p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-gold/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add School
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or city…"
          className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold/50"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs text-gray-500 uppercase tracking-wide px-5 py-3.5 font-dm-sans">School</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wide px-4 py-3.5 font-dm-sans">Board</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wide px-4 py-3.5 font-dm-sans">Location</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wide px-4 py-3.5 font-dm-sans">Modules</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wide px-4 py-3.5 font-dm-sans">Status</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-800/60">
                  <td colSpan={6} className="px-5 py-4">
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <Building2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No tenants found</p>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white font-dm-sans">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BOARD_COLOR[t.board] ?? BOARD_COLOR.OTHER}`}>
                      {t.board}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-400 text-xs">{t.city}, {t.state}</td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-300">
                      {t.modules.filter((m) => m.isActive).length} active
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {t.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-green font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-coral font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/superadmin/tenants/${t.id}`}
                      className="text-gray-400 hover:text-gold transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
