'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import {
  Wifi, WifiOff, Plus, Trash2, Copy, Check, Monitor,
  CreditCard, Users, ArrowRightCircle, ArrowLeftCircle,
  RefreshCw, Shield, Smartphone, Eye, EyeOff,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceType = 'UHF_RFID' | 'HF_RFID' | 'FACE_CAM';

type GateDevice = {
  id: string; deviceId: string; label: string; location: string | null;
  deviceType: DeviceType; deviceToken: string; isActive: boolean; lastSeenAt: string | null;
};

type StudentCard = {
  id: string; cardUid: string | null; faceId: string | null; deviceType: DeviceType; isActive: boolean;
  student: { id: string; name: string; admissionNo: string; grade: { name: string }; section: { name: string } };
};

type GateEvent = {
  id: string; type: 'ENTRY' | 'EXIT'; rawUid: string | null; resolved: boolean;
  timestamp: string; scanMethod: string | null;
  student: { id: string; name: string; admissionNo: string; grade: { name: string }; section: { name: string } } | null;
  gateDevice: { label: string; location: string | null; deviceType: string } | null;
};

type Student = { id: string; name: string; admissionNo: string; grade: { name: string }; section: { name: string } };

const DEVICE_LABELS: Record<DeviceType, string> = {
  UHF_RFID: 'UHF RFID (Walk-through)',
  HF_RFID: 'HF RFID (Tap)',
  FACE_CAM: 'Face Recognition',
};

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  UHF_RFID: <Wifi className="w-4 h-4" />,
  HF_RFID: <CreditCard className="w-4 h-4" />,
  FACE_CAM: <Eye className="w-4 h-4" />,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GatePage() {
  const [tab, setTab] = useState<'live' | 'devices' | 'cards'>('live');

  return (
    <PageWrapper>
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([['live', 'Live Gate'], ['devices', 'Devices'], ['cards', 'Card Assignment']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'live' && <LiveGateTab />}
        {tab === 'devices' && <DevicesTab />}
        {tab === 'cards' && <CardAssignmentTab />}
      </div>
    </PageWrapper>
  );
}

// ─── Live Gate Tab ─────────────────────────────────────────────────────────────

function LiveGateTab() {
  const [events, setEvents] = useState<GateEvent[]>([]);
  const [insideCount, setInsideCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/gate/log');
    if (res.ok) {
      const d = await res.json();
      setEvents(d.data?.events ?? []);
      setInsideCount(d.data?.insideCount ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15s
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const entryCount = events.filter(e => e.type === 'ENTRY' && e.resolved).length;
  const exitCount = events.filter(e => e.type === 'EXIT' && e.resolved).length;
  const unknownCount = events.filter(e => !e.resolved).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Currently Inside', value: insideCount, color: 'text-green', bg: 'bg-green/10', icon: <Users className="w-5 h-5" /> },
          { label: 'Entries Today', value: entryCount, color: 'text-navy', bg: 'bg-iceLight', icon: <ArrowRightCircle className="w-5 h-5" /> },
          { label: 'Exits Today', value: exitCount, color: 'text-amber', bg: 'bg-amber/10', icon: <ArrowLeftCircle className="w-5 h-5" /> },
          { label: 'Unknown Taps', value: unknownCount, color: 'text-coral', bg: 'bg-coral/10', icon: <Shield className="w-5 h-5" /> },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-sora font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Event feed */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Today&apos;s Gate Events</h2>
          <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-navy">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Time', 'Student', 'Class', 'Event', 'Device', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : events.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No gate events today</td></tr>
              ) : events.map(e => (
                <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">
                    {new Date(e.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {e.student ? (
                      <p className="text-sm font-semibold text-gray-800">{e.student.name}</p>
                    ) : (
                      <p className="text-xs text-gray-400 font-mono">{e.rawUid ?? '—'}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {e.student ? `${e.student.grade.name} / ${e.student.section.name}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${e.type === 'ENTRY' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                      {e.type === 'ENTRY' ? <ArrowRightCircle className="w-3 h-3" /> : <ArrowLeftCircle className="w-3 h-3" />}
                      {e.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{e.gateDevice?.label ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.resolved ? 'bg-green/10 text-green' : 'bg-coral/10 text-coral'}`}>
                      {e.resolved ? 'Identified' : 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Devices Tab ───────────────────────────────────────────────────────────────

function DevicesTab() {
  const [devices, setDevices] = useState<GateDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: '', location: '', deviceType: 'HF_RFID' as DeviceType });

  const load = useCallback(async () => {
    const res = await fetch('/api/gate/devices');
    if (res.ok) { const d = await res.json(); setDevices(d.data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.label) { toast.error('Label is required'); return; }
    const res = await fetch('/api/gate/devices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) { toast.success('Device registered'); setAdding(false); setForm({ label: '', location: '', deviceType: 'HF_RFID' }); load(); }
    else toast.error('Failed to register device');
  };

  const handleToggle = async (d: GateDevice) => {
    await fetch(`/api/gate/devices/${d.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/gate/devices/${id}`, { method: 'DELETE' });
    toast.success('Device removed'); load();
  };

  const copyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopied(id);
    toast.success('Device token copied');
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Register RFID readers and face cameras. Each device gets a unique token for webhook authentication.</p>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Device
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-iceLight border border-ice rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-navy">New Device</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Label *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Main Gate - Entry" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. North Gate" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Device Type *</label>
              <select value={form.deviceType} onChange={e => setForm(f => ({ ...f, deviceType: e.target.value as DeviceType }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="HF_RFID">HF RFID (Tap — classroom)</option>
                <option value="UHF_RFID">UHF RFID (Walk-through gate)</option>
                <option value="FACE_CAM">Face Recognition Camera</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 transition-colors">Register</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Devices list */}
      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
        ) : devices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">No devices registered yet</div>
        ) : devices.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.isActive ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-400'}`}>
                  {DEVICE_ICONS[d.deviceType]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{d.label}</p>
                  <p className="text-xs text-gray-500">{DEVICE_LABELS[d.deviceType]}{d.location ? ` · ${d.location}` : ''}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {d.lastSeenAt ? `Last seen: ${new Date(d.lastSeenAt).toLocaleString('en-IN')}` : 'Never connected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.isActive ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-500'}`}>
                  {d.isActive ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => handleToggle(d)} className="text-xs text-gray-500 hover:text-navy border border-gray-200 px-2 py-1 rounded-lg transition-colors">
                  {d.isActive ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => handleDelete(d.id)} className="text-coral hover:bg-coral/5 p-1.5 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Device token */}
            <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Monitor className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <code className="text-xs text-gray-600 flex-1 truncate font-mono">
                {showToken[d.id] ? d.deviceToken : '••••••••••••••••••••••••••••'}
              </code>
              <button onClick={() => setShowToken(s => ({ ...s, [d.id]: !s[d.id] }))} className="text-gray-400 hover:text-gray-600">
                {showToken[d.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => copyToken(d.deviceToken, d.id)} className="text-gray-400 hover:text-navy transition-colors">
                {copied === d.id ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Use this token as <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;token&gt;</code> in hardware webhook calls to <code className="bg-gray-100 px-1 rounded">POST /api/gate/tap</code></p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card Assignment Tab ───────────────────────────────────────────────────────

function CardAssignmentTab() {
  const [cards, setCards] = useState<StudentCard[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ studentId: '', cardUid: '', faceId: '', deviceType: 'HF_RFID' as DeviceType });
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [cardsRes, studentsRes] = await Promise.all([
      fetch('/api/gate/cards'),
      fetch('/api/students?limit=200'),
    ]);
    if (cardsRes.ok) { const d = await cardsRes.json(); setCards(d.data ?? []); }
    if (studentsRes.ok) { const d = await studentsRes.json(); setStudents(d.data?.data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.studentId || !form.deviceType) { toast.error('Student and device type required'); return; }
    if (!form.cardUid && !form.faceId) { toast.error('Card UID or Face ID required'); return; }
    const res = await fetch('/api/gate/cards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) { toast.success('Card assigned'); setAdding(false); setForm({ studentId: '', cardUid: '', faceId: '', deviceType: 'HF_RFID' }); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? 'Failed to assign card'); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/gate/cards/${id}`, { method: 'DELETE' });
    toast.success('Card removed'); load();
  };

  const filtered = cards.filter(c =>
    !search || c.student.name.toLowerCase().includes(search.toLowerCase()) ||
    c.student.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
    (c.cardUid ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student or card UID…"
            className="w-full pl-4 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy/90 transition-colors">
          <Plus className="w-4 h-4" /> Assign Card
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-iceLight border border-ice rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-navy">Assign Card / Face ID to Student</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Student *</label>
              <select value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="">Select student…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Device Type *</label>
              <select value={form.deviceType} onChange={e => setForm(f => ({ ...f, deviceType: e.target.value as DeviceType }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="HF_RFID">HF RFID</option>
                <option value="UHF_RFID">UHF RFID</option>
                <option value="FACE_CAM">Face Camera</option>
              </select>
            </div>
            {form.deviceType !== 'FACE_CAM' ? (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Card UID (hex) *</label>
                <input value={form.cardUid} onChange={e => setForm(f => ({ ...f, cardUid: e.target.value.toUpperCase() }))}
                  placeholder="e.g. A3F21B09" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Face ID (from camera vendor) *</label>
                <input value={form.faceId} onChange={e => setForm(f => ({ ...f, faceId: e.target.value }))}
                  placeholder="e.g. FACE-00123" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 transition-colors">Assign</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Cards table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Student', 'Class', 'Card UID / Face ID', 'Type', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No cards assigned yet</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-gray-800">{c.student.name}</p>
                  <p className="text-xs text-gray-400">{c.student.admissionNo}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.student.grade.name} / {c.student.section.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.cardUid ?? c.faceId ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    {DEVICE_ICONS[c.deviceType]} {c.deviceType.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-500'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(c.id)} className="text-coral hover:bg-coral/5 p-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Integration note */}
      <div className="bg-navy/5 border border-navy/10 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Smartphone className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-navy mb-1">Hardware Integration</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Configure your RFID reader / face camera to POST to{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">POST /api/gate/tap</code> with{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">Authorization: Bearer &lt;deviceToken&gt;</code>.
              Body: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">{`{"uid":"A3F21B09","direction":"ENTRY"}`}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
