'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, Video, MapPin, Wifi, User, Phone,
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw,
  Copy, ExternalLink, ChevronDown, ChevronRight, Pencil,
  Settings, Plus, Trash2, Save
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type InterviewMode   = 'PHYSICAL' | 'GMEET' | 'ZOOM';
type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
type Recommendation  = 'ADMIT' | 'WAITLIST' | 'HOLD' | 'REJECT';

type Interview = {
  id: string; date: string; startTime: string; endTime: string;
  duration: number; mode: InterviewMode; roomOrLink: string | null;
  meetingId: string | null; meetingPasscode: string | null;
  interviewerName: string | null; queueNo: number; status: InterviewStatus;
  parentNotified: boolean; feedback: string | null; recommendation: Recommendation | null;
  inquiry: { id: string; studentName: string; parentName: string; phone: string; applyingForGrade: string; stage: string };
};

type SlotConfig = {
  workingDays: number[]; morningStart: string; morningEnd: string;
  afternoonStart: string; afternoonEnd: string; defaultDuration: number;
  maxConcurrent: number;
  blockedDates: { id: string; date: string; reason: string | null }[];
};

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Feedback Modal ───────────────────────────────────────────────────────────

function FeedbackModal({ interview, onClose, onSaved }: {
  interview: Interview; onClose: () => void; onSaved: () => void;
}) {
  const [feedback, setFeedback]           = useState(interview.feedback ?? '');
  const [recommendation, setRecommendation] = useState<Recommendation | ''>(interview.recommendation ?? '');
  const [saving, setSaving]               = useState(false);

  const RECS: { id: Recommendation; label: string; color: string; bg: string; border: string; desc: string }[] = [
    { id: 'ADMIT',    label: 'Admit',    color: 'text-green',  bg: 'bg-green/10',  border: 'border-green/30',  desc: 'Proceed to Offer Made' },
    { id: 'WAITLIST', label: 'Waitlist', color: 'text-amber',  bg: 'bg-amber/10',  border: 'border-amber/30',  desc: 'Hold pending seat' },
    { id: 'HOLD',     label: 'Hold',     color: 'text-navy',   bg: 'bg-navy/10',   border: 'border-navy/30',   desc: 'Additional review needed' },
    { id: 'REJECT',   label: 'Reject',   color: 'text-coral',  bg: 'bg-coral/10',  border: 'border-coral/30',  desc: 'Not recommended' },
  ];

  const handleSave = async () => {
    if (!recommendation) { toast.error('Please select a recommendation'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admissions/interviews/${interview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', feedback, recommendation }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? 'Failed'); return; }
      const recLabel = RECS.find(r => r.id === recommendation)?.label ?? recommendation;
      toast.success('Interview completed', { description: `${interview.inquiry.studentName} — ${recLabel}` });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-sora font-bold text-navy text-base">Interview Outcome</h2>
            <p className="text-xs text-gray-400 mt-0.5">{interview.inquiry.studentName} · {interview.startTime}–{interview.endTime}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Recommendation <span className="text-coral">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {RECS.map(r => (
                <button key={r.id} onClick={() => setRecommendation(r.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${recommendation === r.id ? `${r.bg} ${r.border} ${r.color}` : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`font-semibold text-sm ${recommendation === r.id ? r.color : 'text-gray-700'}`}>{r.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Interview Notes (optional)</label>
            <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Key observations, strengths, concerns..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-navy/20 placeholder:text-gray-300" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !recommendation}
            className="flex-1 py-2.5 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navyMid disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save Outcome'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot Config Panel ────────────────────────────────────────────────────────

function SlotConfigPanel({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg]           = useState<SlotConfig | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [newBlockDate, setNBD]  = useState('');
  const [newBlockReason, setNBR] = useState('');
  const [addingBlock, setAB]    = useState(false);

  useEffect(() => {
    fetch('/api/admissions/interviews/slot-config')
      .then(r => r.json())
      .then(d => setCfg(d.data ?? d))
      .catch(() => toast.error('Failed to load config'))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (day: number) => {
    if (!cfg) return;
    const days = cfg.workingDays.includes(day)
      ? cfg.workingDays.filter(d => d !== day)
      : [...cfg.workingDays, day].sort();
    setCfg({ ...cfg, workingDays: days });
  };

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admissions/interviews/slot-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      toast.success('Slot configuration saved');
      onClose();
    } finally { setSaving(false); }
  };

  const addBlock = async () => {
    if (!newBlockDate) return;
    setAB(true);
    try {
      const res = await fetch('/api/admissions/interviews/slot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newBlockDate, reason: newBlockReason || undefined }),
      });
      if (!res.ok) { toast.error('Failed to block date'); return; }
      const d = await res.json();
      const entry = d.data ?? d;
      setCfg(prev => prev ? { ...prev, blockedDates: [...prev.blockedDates, entry] } : prev);
      setNBD(''); setNBR('');
      toast.success(`${newBlockDate} blocked`);
    } finally { setAB(false); }
  };

  const removeBlock = async (id: string) => {
    try {
      await fetch(`/api/admissions/interviews/slot-config/blocked-dates/${id}`, { method: 'DELETE' });
      setCfg(prev => prev ? { ...prev, blockedDates: prev.blockedDates.filter(b => b.id !== id) } : prev);
    } catch { toast.error('Failed to remove'); }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-sora font-bold text-navy text-base">Interview Slot Configuration</h2>
            <p className="text-xs text-gray-400 mt-0.5">Set working hours, days, and blocked dates</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {cfg && (
            <>
              {/* Working Days */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Working Days</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5,6,7].map(d => (
                    <button key={d} onClick={() => toggleDay(d)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                        cfg.workingDays.includes(d)
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Morning Block */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Morning Session</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Start</label>
                    <input type="time" value={cfg.morningStart}
                      onChange={e => setCfg({ ...cfg, morningStart: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">End</label>
                    <input type="time" value={cfg.morningEnd}
                      onChange={e => setCfg({ ...cfg, morningEnd: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>
                </div>
              </div>

              {/* Afternoon Block */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Afternoon Session</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Start</label>
                    <input type="time" value={cfg.afternoonStart}
                      onChange={e => setCfg({ ...cfg, afternoonStart: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">End</label>
                    <input type="time" value={cfg.afternoonEnd}
                      onChange={e => setCfg({ ...cfg, afternoonEnd: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>
                </div>
              </div>

              {/* Default Duration & Max Concurrent */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-2 block">Default Slot Duration</label>
                  <select value={cfg.defaultDuration} onChange={e => setCfg({ ...cfg, defaultDuration: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white">
                    {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-2 block">Max Concurrent</label>
                  <select value={cfg.maxConcurrent} onChange={e => setCfg({ ...cfg, maxConcurrent: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white">
                    {[1, 2, 3].map(n => <option key={n} value={n}>{n} interviewer{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>

              {/* Blocked Dates */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Blocked Dates</label>
                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                  {cfg.blockedDates.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No dates blocked</p>
                  )}
                  {cfg.blockedDates.map(b => (
                    <div key={b.id} className="flex items-center gap-2 bg-coral/5 border border-coral/20 rounded-xl px-3 py-2">
                      <span className="text-xs font-semibold text-coral">{b.date}</span>
                      {b.reason && <span className="text-xs text-gray-400 flex-1 truncate">— {b.reason}</span>}
                      <button onClick={() => removeBlock(b.id)} className="text-coral/60 hover:text-coral transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="date" value={newBlockDate} onChange={e => setNBD(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 flex-shrink-0" />
                  <input type="text" placeholder="Reason (optional)" value={newBlockReason} onChange={e => setNBR(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 min-w-0" />
                  <button onClick={addBlock} disabled={!newBlockDate || addingBlock}
                    className="px-3 py-2 bg-navy text-white rounded-xl hover:bg-navyMid disabled:opacity-50 transition-colors flex-shrink-0">
                    {addingBlock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-gold text-navy rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Interview Card ───────────────────────────────────────────────────────────

function InterviewCard({ interview, onMarkNoShow, onOpenFeedback }: {
  interview: Interview;
  onMarkNoShow: (id: string) => void;
  onOpenFeedback: (interview: Interview) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const ModeIcon  = interview.mode === 'GMEET' ? Video : interview.mode === 'ZOOM' ? Wifi : MapPin;
  const modeLabel = interview.mode === 'GMEET' ? 'Google Meet' : interview.mode === 'ZOOM' ? 'Zoom' : 'In-Person';
  const modeColor = interview.mode === 'GMEET' ? 'text-teal' : interview.mode === 'ZOOM' ? 'text-purple' : 'text-navy';

  const statusConfig = {
    SCHEDULED:  { label: 'Scheduled', color: 'text-amber',    bg: 'bg-amber/10',   border: 'border-amber/30'   },
    COMPLETED:  { label: 'Completed', color: 'text-green',    bg: 'bg-green/10',   border: 'border-green/30'   },
    NO_SHOW:    { label: 'No Show',   color: 'text-coral',    bg: 'bg-coral/10',   border: 'border-coral/30'   },
    CANCELLED:  { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-100',   border: 'border-gray-200'   },
  };
  const sc = statusConfig[interview.status];

  const recConfig: Record<string, { label: string; color: string }> = {
    ADMIT:    { label: 'Admit',    color: 'text-green' },
    WAITLIST: { label: 'Waitlist', color: 'text-amber' },
    HOLD:     { label: 'Hold',     color: 'text-navy'  },
    REJECT:   { label: 'Reject',   color: 'text-coral' },
  };

  return (
    <div className={`bg-white border rounded-2xl shadow-sm transition-all ${
      interview.status === 'COMPLETED' ? 'border-green/30 opacity-80'
      : interview.status === 'NO_SHOW' ? 'border-coral/30 opacity-70'
      : interview.status === 'CANCELLED' ? 'border-gray-200 opacity-60'
      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}>
      <div className="flex items-center gap-4 p-4">
        {/* Queue badge */}
        <div className="w-10 h-10 rounded-xl bg-navy flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-[9px] text-ice/60 leading-none">Q</span>
          <span className="text-white font-bold text-base font-sora leading-none">{interview.queueNo}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sora font-semibold text-navy text-sm">{interview.inquiry.studentName}</span>
            <span className="text-[10px] bg-iceLight text-navy px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
              {interview.inquiry.applyingForGrade}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />{interview.startTime}–{interview.endTime} ({interview.duration}min)
            </span>
            <span className={`text-xs flex items-center gap-1 font-medium ${modeColor}`}>
              <ModeIcon className="w-3 h-3" />{modeLabel}
            </span>
            {interview.interviewerName && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <User className="w-3 h-3" />{interview.interviewerName}
              </span>
            )}
          </div>
        </div>

        {/* Status + expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>
            {sc.label}
          </span>
          {interview.status === 'SCHEDULED' && (
            <button onClick={() => setExpanded(v => !v)}
              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {interview.status === 'COMPLETED' && interview.recommendation && (
            <span className={`text-xs font-bold ${recConfig[interview.recommendation]?.color ?? 'text-gray-500'}`}>
              {recConfig[interview.recommendation]?.label}
            </span>
          )}
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && interview.status === 'SCHEDULED' && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-3 space-y-2">
            {interview.roomOrLink && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <ModeIcon className={`w-3.5 h-3.5 ${modeColor} flex-shrink-0`} />
                <span className="text-xs text-gray-600 truncate flex-1">{interview.roomOrLink}</span>
                <button onClick={() => { navigator.clipboard.writeText(interview.roomOrLink!); toast.success('Copied'); }}
                  className="text-gray-400 hover:text-navy transition-colors flex-shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a href={interview.roomOrLink} target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-navy transition-colors flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
            {interview.meetingPasscode && (
              <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
                <span className="font-medium text-gray-600">Passcode:</span>
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{interview.meetingPasscode}</code>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
              <Phone className="w-3 h-3" />
              <span>{interview.inquiry.parentName} · {interview.inquiry.phone}</span>
              {interview.parentNotified && (
                <span className="text-[10px] bg-green/10 text-green px-1.5 py-0.5 rounded-full font-semibold">SMS sent</span>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => onOpenFeedback(interview)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors">
                <Pencil className="w-3.5 h-3.5" />Mark Complete
              </button>
              <button onClick={() => onMarkNoShow(interview.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-coral/30 text-coral bg-coral/5 rounded-xl hover:bg-coral/10 transition-colors">
                <AlertTriangle className="w-3.5 h-3.5" />No Show
              </button>
            </div>
          </div>
        </div>
      )}

      {interview.status === 'COMPLETED' && interview.feedback && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-400 line-clamp-2 italic">&ldquo;{interview.feedback}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function InterviewScheduleTab() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate]               = useState(today);
  const [interviews, setInterviews]   = useState<Interview[]>([]);
  const [loading, setLoading]         = useState(true);
  const [feedbackTarget, setFeedbackTarget] = useState<Interview | null>(null);
  const [showConfig, setShowConfig]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admissions/interviews?date=${date}`);
      if (!res.ok) return;
      const data = await res.json();
      // API returns array directly via ok()
      setInterviews(Array.isArray(data) ? data : (data.data ?? []));
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const markNoShow = async (id: string) => {
    const iv = interviews.find(i => i.id === id);
    if (!iv) return;
    setInterviews(prev => prev.map(i => i.id === id ? { ...i, status: 'NO_SHOW' as InterviewStatus } : i));
    try {
      const res = await fetch(`/api/admissions/interviews/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'NO_SHOW' }),
      });
      if (!res.ok) {
        setInterviews(prev => prev.map(i => i.id === id ? { ...i, status: iv.status } : i));
        toast.error('Failed to update');
      } else {
        toast.warning('Marked as No Show', { description: `${iv.inquiry.studentName} — next parent notified via SMS` });
      }
    } catch {
      setInterviews(prev => prev.map(i => i.id === id ? { ...i, status: iv.status } : i));
    }
  };

  const scheduled = interviews.filter(i => i.status === 'SCHEDULED').length;
  const completed = interviews.filter(i => i.status === 'COMPLETED').length;
  const noShows   = interviews.filter(i => i.status === 'NO_SHOW').length;
  const total     = interviews.length;

  const navDate = (delta: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-4">

      {/* Date navigator + config button */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => navDate(-1)} className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all">‹</button>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm font-semibold text-navy bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/20 cursor-pointer" />
          </div>
          <button onClick={() => navDate(1)} className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all">›</button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy truncate">{dateLabel}</p>
          {total > 0 && <p className="text-xs text-gray-400">{total} interview{total !== 1 ? 's' : ''} scheduled</p>}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
          <button onClick={() => setShowConfig(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy bg-navy/10 hover:bg-navy/20 rounded-xl transition-colors">
            <Settings className="w-3.5 h-3.5" />Slot Settings
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: total,      color: 'text-navy',  bg: 'bg-navy/10'  },
            { label: 'Pending',  value: scheduled,  color: 'text-amber', bg: 'bg-amber/10' },
            { label: 'Done',     value: completed,  color: 'text-green', bg: 'bg-green/10' },
            { label: 'No Show',  value: noShows,    color: 'text-coral', bg: 'bg-coral/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2.5 text-center`}>
              <div className={`text-xl font-sora font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : interviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy/10 flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-navy/40" />
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-1">No interviews on this date</p>
          <p className="text-xs text-gray-400 max-w-xs">Schedule interviews from the Pipeline tab — click an applicant at the Documents Verified stage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...interviews]
            .sort((a, b) => {
              const order = { SCHEDULED: 0, COMPLETED: 1, NO_SHOW: 2, CANCELLED: 3 };
              if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
              return a.queueNo - b.queueNo;
            })
            .map(iv => (
              <InterviewCard
                key={iv.id}
                interview={iv}
                onMarkNoShow={markNoShow}
                onOpenFeedback={setFeedbackTarget}
              />
            ))
          }
        </div>
      )}

      {feedbackTarget && (
        <FeedbackModal interview={feedbackTarget} onClose={() => setFeedbackTarget(null)} onSaved={load} />
      )}
      {showConfig && <SlotConfigPanel onClose={() => { setShowConfig(false); load(); }} />}
    </div>
  );
}
