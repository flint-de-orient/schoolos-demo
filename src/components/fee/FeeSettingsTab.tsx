'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

type Settings = {
  monthlyDueDay: number;
  biMonthlyDueDay: number;
  quarterlyDueDay: number;
  halfYearlyDueDay: number;
  annualDueDay: number;
};

const FIELDS: { key: keyof Settings; label: string; freq: string; hint: string }[] = [
  { key: 'monthlyDueDay',    label: 'Monthly',     freq: 'MONTHLY',     hint: 'Bill generated each month; due on this day.' },
  { key: 'biMonthlyDueDay',  label: 'Bi-monthly',  freq: 'BI_MONTHLY',  hint: 'Every 2 months; due on this day of the billing month.' },
  { key: 'quarterlyDueDay',  label: 'Quarterly',   freq: 'QUARTERLY',   hint: 'Apr / Jul / Oct / Jan; due on this day.' },
  { key: 'halfYearlyDueDay', label: 'Half-yearly', freq: 'HALF_YEARLY', hint: 'Apr & Oct; due on this day.' },
  { key: 'annualDueDay',     label: 'Annual',      freq: 'ANNUAL',      hint: 'Once at start of academic year; due on this day.' },
];

export default function FeeSettingsTab() {
  const [settings, setSettings] = useState<Settings>({
    monthlyDueDay: 10,
    biMonthlyDueDay: 10,
    quarterlyDueDay: 10,
    halfYearlyDueDay: 1,
    annualDueDay: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/fee/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.monthlyDueDay === 'number') setSettings(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/fee/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'Failed to save');
        return;
      }
      toast.success('Fee settings saved');
    } finally {
      setSaving(false);
    }
  }

  function set(key: keyof Settings, val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 31) setSettings((s) => ({ ...s, [key]: n }));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h4 className="text-sm font-semibold text-navy mb-0.5">Auto-Schedule Due Days</h4>
        <p className="text-xs text-gray-500">
          When a fee plan uses an automatic schedule (no custom installments), installments are
          created with due dates anchored to these day-of-month values.
        </p>
      </div>

      <div className="space-y-3">
        {FIELDS.map(({ key, label, hint }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-6 bg-white border border-gray-100 rounded-xl px-5 py-4"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-400">Day</span>
              <input
                type="number"
                min={1}
                max={31}
                value={settings[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
              <span className="text-xs text-gray-400">of month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-navy text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-navyMid transition-colors"
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
