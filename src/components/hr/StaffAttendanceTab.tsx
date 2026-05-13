'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  UserCheck, UserX, Clock, AlertTriangle, CalendarDays,
  CheckSquare, RefreshCw, Save, ChevronDown,
} from 'lucide-react';

type PersonType = 'teacher' | 'staff';
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE';

type AttendanceRow = {
  id: string | null;
  personId: string;
  personType: PersonType;
  name: string;
  designation: string;
  department: string;
  teacherType: string | null;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  remarks: string | null;
  onLeave: boolean;
  saved: boolean;
};

const STATUS_CFG: Record<AttendanceStatus, { label: string; bg: string; text: string; dot: string }> = {
  PRESENT:  { label: 'Present',  bg: 'bg-green/10',  text: 'text-green',   dot: 'bg-green' },
  ABSENT:   { label: 'Absent',   bg: 'bg-coral/10',  text: 'text-coral',   dot: 'bg-coral' },
  HALF_DAY: { label: 'Half Day', bg: 'bg-amber/10',  text: 'text-amber',   dot: 'bg-amber' },
  LATE:     { label: 'Late',     bg: 'bg-purple/10', text: 'text-purple',  dot: 'bg-purple' },
  ON_LEAVE: { label: 'On Leave', bg: 'bg-gray-100',  text: 'text-gray-500',dot: 'bg-gray-400' },
};

const ALL_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function StaffAttendanceTab() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [dirty, setDirty] = useState<Map<string, AttendanceRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setDirty(new Map());
    try {
      const res = await fetch(`/api/hr/attendance?date=${d}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // ok() returns data directly (no wrapper)
      setRows(data.rows ?? []);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const updateRow = (personId: string, changes: Partial<AttendanceRow>) => {
    setRows((prev) => {
      const updated = prev.map((r) => r.personId === personId ? { ...r, ...changes } : r);
      // Update dirty inside setRows so we have the current row value
      setDirty((d) => {
        const next = new Map(d);
        const row = updated.find((r) => r.personId === personId);
        if (row) next.set(personId, row);
        return next;
      });
      return updated;
    });
  };

  const markAllPresent = () => {
    setRows((prev) => {
      const updated = prev.map((r) => r.onLeave ? r : { ...r, status: 'PRESENT' as AttendanceStatus });
      setDirty((d) => {
        const next = new Map(d);
        updated.filter((r) => !r.onLeave).forEach((r) => next.set(r.personId, r));
        return next;
      });
      return updated;
    });
  };

  const save = async () => {
    if (dirty.size === 0) { toast.info('No changes to save'); return; }
    setSaving(true);
    try {
      const records = [...dirty.values()].map((r) => ({
        personId: r.personId,
        personType: r.personType,
        status: r.status,
        checkIn: r.checkIn || undefined,
        checkOut: r.checkOut || undefined,
        remarks: r.remarks || undefined,
      }));
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Attendance saved for ${dirty.size} member${dirty.size > 1 ? 's' : ''}`);
      setDirty(new Map());
      await load(date);
    } catch {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const departments = [...new Set(rows.map((r) => r.department))].sort();
  const filtered = filterDept ? rows.filter((r) => r.department === filterDept) : rows;

  const summary = {
    present:  rows.filter((r) => r.status === 'PRESENT').length,
    absent:   rows.filter((r) => r.status === 'ABSENT').length,
    halfDay:  rows.filter((r) => r.status === 'HALF_DAY').length,
    late:     rows.filter((r) => r.status === 'LATE').length,
    onLeave:  rows.filter((r) => r.status === 'ON_LEAVE').length,
    total:    rows.length,
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-sora font-semibold text-navy text-base">Staff Attendance</h3>
          <p className="text-xs text-gray-400 mt-0.5">Mark daily attendance for teaching and non-teaching staff</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 bg-white">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm text-navy font-medium outline-none bg-transparent"
            />
          </div>
          <button onClick={() => load(date)} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={markAllPresent}
            className="flex items-center gap-1.5 px-3 py-2 border border-green/30 text-green rounded-xl text-xs font-semibold hover:bg-green/5 transition-colors">
            <CheckSquare className="w-3.5 h-3.5" /> Mark All Present
          </button>
          <button onClick={save} disabled={saving || dirty.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-navyMid transition-colors">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : `Save${dirty.size > 0 ? ` (${dirty.size})` : ''}`}
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Present',  value: summary.present,  icon: UserCheck, color: 'text-green',   bg: 'bg-green/8' },
          { label: 'Absent',   value: summary.absent,   icon: UserX,     color: 'text-coral',   bg: 'bg-coral/8' },
          { label: 'Half Day', value: summary.halfDay,  icon: Clock,     color: 'text-amber',   bg: 'bg-amber/8' },
          { label: 'Late',     value: summary.late,     icon: AlertTriangle, color: 'text-purple', bg: 'bg-purple/8' },
          { label: 'On Leave', value: summary.onLeave,  icon: CalendarDays, color: 'text-gray-500', bg: 'bg-gray-100' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3 flex items-center gap-2.5`}>
            <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
            <div>
              <div className={`text-xl font-sora font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-600 bg-white">
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} members</span>
        {dirty.size > 0 && (
          <span className="text-xs text-amber font-semibold bg-amber/10 px-2 py-0.5 rounded-full">
            {dirty.size} unsaved change{dirty.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-32 h-3 bg-gray-100 rounded animate-pulse" />
                  <div className="w-20 h-2 bg-gray-50 rounded animate-pulse" />
                </div>
                <div className="w-24 h-7 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No staff records found</div>
        ) : (
          <div>
            {filtered.map((row, idx) => {
              const cfg = STATUS_CFG[row.status];
              const isDirty = dirty.has(row.personId);
              const isExpanded = expandedId === row.personId;
              const initials = row.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={row.personId} className={`border-b border-gray-50 last:border-0 ${isDirty ? 'bg-gold/2' : idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-sora font-bold text-navy">{initials}</span>
                    </div>

                    {/* Name + role */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-navy truncate">{row.name}</span>
                        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {row.designation} · {row.department}
                        {row.teacherType === 'PART_TIME' && (
                          <span className="ml-1 text-purple font-semibold">Part-Time</span>
                        )}
                      </div>
                    </div>

                    {/* Status buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {ALL_STATUSES.map((s) => {
                        const c = STATUS_CFG[s];
                        const isSelected = row.status === s;
                        const isLeaveStatus = s === 'ON_LEAVE' && row.onLeave;
                        return (
                          <button
                            key={s}
                            onClick={() => updateRow(row.personId, { status: s })}
                            disabled={row.onLeave && s !== 'ON_LEAVE'}
                            title={c.label}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                              isSelected
                                ? `${c.bg} ${c.text} ring-1 ring-current`
                                : 'text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed'
                            } ${isLeaveStatus ? 'opacity-60 cursor-default' : ''}`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Expand for time/remarks */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : row.personId)}
                      className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Expanded row: check-in, check-out, remarks */}
                  {isExpanded && (
                    <div className="px-4 pb-3 flex items-center gap-3 flex-wrap bg-gray-50/80">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-gray-500 w-14">Check-In</label>
                        <input type="time" value={row.checkIn ?? ''} onChange={(e) => updateRow(row.personId, { checkIn: e.target.value || null })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-gray-500 w-14">Check-Out</label>
                        <input type="time" value={row.checkOut ?? ''} onChange={(e) => updateRow(row.personId, { checkOut: e.target.value || null })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <label className="text-[10px] text-gray-500 w-14">Remarks</label>
                        <input type="text" value={row.remarks ?? ''} placeholder="Optional note…"
                          onChange={(e) => updateRow(row.personId, { remarks: e.target.value || null })}
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
