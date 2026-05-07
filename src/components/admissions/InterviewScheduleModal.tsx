'use client';

import { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, Video, MapPin, User, Phone,
  Loader2, CheckCircle2, Copy, ExternalLink, Wifi
} from 'lucide-react';
import { toast } from 'sonner';

type Slot = { startTime: string; endTime: string; available: boolean; block?: 'morning' | 'afternoon' };

type Props = {
  inquiry: {
    id: string;
    studentName: string;
    parentName: string;
    phone: string;
    applyingForClass: string;
  };
  onClose: () => void;
  onScheduled: () => void;
};

const MODE_OPTIONS = [
  { id: 'PHYSICAL', label: 'In-Person', icon: MapPin,   color: 'text-navy',  bg: 'bg-navy/10',   border: 'border-navy/20'  },
  { id: 'GMEET',    label: 'Google Meet', icon: Video,   color: 'text-teal',  bg: 'bg-teal/10',   border: 'border-teal/20'  },
  { id: 'ZOOM',     label: 'Zoom',        icon: Wifi,    color: 'text-purple', bg: 'bg-purple/10', border: 'border-purple/20'},
] as const;

const DURATION_OPTIONS = [15, 20, 30, 45, 60];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function InterviewScheduleModal({ inquiry, onClose, onScheduled }: Props) {
  const [date, setDate]               = useState(todayISO());
  const [duration, setDuration]       = useState(15);
  const [mode, setMode]               = useState<'PHYSICAL' | 'GMEET' | 'ZOOM'>('PHYSICAL');
  const [selectedSlot, setSlot]       = useState<string | null>(null);
  const [room, setRoom]               = useState('');
  const [interviewer, setInterviewer] = useState('');
  const [notifyParent, setNotify]     = useState(true);

  const [slots, setSlots]       = useState<Slot[]>([]);
  const [loadingSlots, setLS]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [result, setResult]     = useState<{ link: string; passcode?: string; isDemo?: boolean } | null>(null);

  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);

  // Load available slots whenever date or duration changes
  useEffect(() => {
    if (!date) return;
    setSlot(null);
    setLS(true);
    setSlotsMessage(null);
    fetch(`/api/admissions/interviews/available-slots?date=${date}&duration=${duration}`)
      .then(r => r.json())
      .then(d => {
        // API returns { slots, config, reason } or legacy array
        if (Array.isArray(d)) { setSlots(d); return; }
        const payload = d.data ?? d;
        if (Array.isArray(payload)) { setSlots(payload); return; }
        const { slots: s = [], reason, blockedReason } = payload;
        setSlots(s);
        if (reason === 'not_working_day') setSlotsMessage('This day is not a working day for interviews.');
        else if (reason === 'blocked') setSlotsMessage(`Date blocked: ${blockedReason ?? 'Holiday/unavailable'}`);
      })
      .catch(() => { setSlots([]); setSlotsMessage('Could not load slots — please try again.'); })
      .finally(() => setLS(false));
  }, [date, duration]);

  async function schedule() {
    if (!selectedSlot) { toast.error('Please select a time slot'); return; }
    if (mode === 'PHYSICAL' && !room.trim()) { toast.error('Enter room number or location'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/admissions/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId:       inquiry.id,
          date,
          startTime:       selectedSlot,
          duration,
          mode,
          roomOrLink:      mode === 'PHYSICAL' ? room : undefined,
          interviewerName: interviewer || undefined,
          notifyParent,
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to schedule'); return; }

      const interview = data.data ?? data;
      if (mode !== 'PHYSICAL' && interview.roomOrLink) {
        setResult({
          link:    interview.roomOrLink,
          passcode: interview.meetingPasscode ?? undefined,
          isDemo:  false,
        });
      } else {
        toast.success(`Interview scheduled for ${inquiry.studentName}`, {
          description: notifyParent ? `SMS sent to ${inquiry.phone}` : undefined,
        });
        onScheduled();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Success screen after online meeting created ───────────────────────────
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fadeIn">
          <div className="gradient-navy text-white p-5 rounded-t-2xl text-center">
            <CheckCircle2 className="w-10 h-10 text-gold mx-auto mb-2" />
            <h2 className="font-sora font-bold text-lg">Interview Scheduled!</h2>
            <p className="text-ice/70 text-sm mt-0.5">{inquiry.studentName} · {fmt12(selectedSlot!)} on {new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {mode === 'GMEET' ? 'Google Meet Link' : 'Zoom Meeting Link'}
              </p>
              <p className="text-sm font-mono text-navy break-all">{result.link}</p>
              {result.passcode && (
                <p className="text-xs text-gray-500">Passcode: <span className="font-semibold text-gray-700">{result.passcode}</span></p>
              )}
              {result.isDemo && (
                <p className="text-[10px] text-amber bg-amber/10 px-2 py-0.5 rounded-full inline-block">
                  Demo link — configure API credentials for real meetings
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(result.link); toast.success('Link copied'); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-navy border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" /> Copy Link
              </button>
              <a
                href={result.link} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-teal rounded-xl hover:bg-teal/80 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open
              </a>
            </div>

            {notifyParent && (
              <div className="bg-green/8 border border-green/20 rounded-xl p-3 flex items-center gap-2 text-xs text-green font-semibold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                SMS sent to parent ({inquiry.phone})
              </div>
            )}

            <button
              onClick={() => { onScheduled(); onClose(); }}
              className="w-full py-2.5 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main scheduling form ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col animate-fadeIn">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">Schedule Interview</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {inquiry.studentName} · {inquiry.applyingForClass}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Date + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />Date
              </label>
              <input
                type="date"
                value={date}
                min={todayISO()}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                <Clock className="w-3.5 h-3.5 inline mr-1" />Slot Duration
              </label>
              <div className="flex gap-1.5">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      duration === d
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-navy/40'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Interview Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {MODE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const sel  = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setMode(opt.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                      sel
                        ? `${opt.bg} ${opt.border} ${opt.color}`
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {mode !== 'PHYSICAL' && (
              <p className="text-[11px] text-teal bg-teal/8 border border-teal/20 rounded-lg px-3 py-2 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Meeting link will be auto-generated and sent to parent
              </p>
            )}
          </div>

          {/* Room (physical only) */}
          {mode === 'PHYSICAL' && (
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />Room / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Principal's Office, Room 12"
                value={room}
                onChange={e => setRoom(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
          )}

          {/* Interviewer */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
              <User className="w-3.5 h-3.5 inline mr-1" />Interviewer <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mrs. Jayashree Nair"
              value={interviewer}
              onChange={e => setInterviewer(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>

          {/* Available time slots */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Available Slots
              {date && <span className="font-normal text-gray-400 ml-1">— {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</span>}
            </label>

            {loadingSlots ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
              </div>
            ) : slotsMessage ? (
              <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 text-sm text-amber font-medium">
                {slotsMessage}
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {/* Morning label */}
                <div className="col-span-4 sm:col-span-5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-1">
                  Morning
                </div>
                {slots.filter(s => s.block === 'morning' || parseInt(s.startTime) < 13).map(slot => (
                  <SlotButton
                    key={slot.startTime}
                    slot={slot}
                    selected={selectedSlot === slot.startTime}
                    onSelect={() => slot.available && setSlot(slot.startTime)}
                  />
                ))}
                {/* Lunch break */}
                <div className="col-span-4 sm:col-span-5 flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] text-gray-300 font-semibold">Lunch Break</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {/* Afternoon label */}
                <div className="col-span-4 sm:col-span-5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Afternoon
                </div>
                {slots.filter(s => s.block === 'afternoon' || parseInt(s.startTime) >= 14).map(slot => (
                  <SlotButton
                    key={slot.startTime}
                    slot={slot}
                    selected={selectedSlot === slot.startTime}
                    onSelect={() => slot.available && setSlot(slot.startTime)}
                  />
                ))}
                {slots.length === 0 && !slotsMessage && (
                  <p className="col-span-5 text-sm text-gray-400 text-center py-4">No slots available for this date</p>
                )}
              </div>
            )}
          </div>

          {/* Notify parent toggle */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-green" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Notify Parent via SMS</p>
                <p className="text-xs text-gray-400">{inquiry.phone}</p>
              </div>
            </div>
            <button
              onClick={() => setNotify(n => !n)}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${notifyParent ? 'bg-green' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyParent ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={schedule}
            disabled={saving || !selectedSlot || (mode === 'PHYSICAL' && !room.trim())}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-gold text-navy rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</>
              : selectedSlot
              ? `Schedule ${fmt12(selectedSlot)}`
              : 'Select a Slot'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot button ──────────────────────────────────────────────────────────────

function SlotButton({
  slot, selected, onSelect,
}: { slot: Slot; selected: boolean; onSelect: () => void }) {
  if (!slot.available) {
    return (
      <div className="py-1.5 text-center text-[11px] font-medium text-gray-300 bg-gray-50 rounded-lg border border-gray-100 line-through select-none">
        {fmt12(slot.startTime)}
      </div>
    );
  }
  return (
    <button
      onClick={onSelect}
      className={`py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
        selected
          ? 'bg-navy text-white border-navy shadow-sm'
          : 'bg-white text-gray-700 border-gray-200 hover:border-navy/50 hover:bg-navy/5'
      }`}
    >
      {fmt12(slot.startTime)}
    </button>
  );
}
