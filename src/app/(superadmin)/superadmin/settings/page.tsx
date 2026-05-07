'use client';

import { Settings, Shield, Bell, Database, Key } from 'lucide-react';

const sections = [
  {
    icon: Shield,
    title: 'Security',
    items: [
      { label: 'Enforce 2FA for all admins', enabled: false },
      { label: 'Session timeout after 8 hours', enabled: true },
      { label: 'IP allowlist for super admin access', enabled: false },
    ],
  },
  {
    icon: Bell,
    title: 'Notifications',
    items: [
      { label: 'Email alert on new tenant registration', enabled: true },
      { label: 'Weekly platform usage digest', enabled: true },
      { label: 'Alert on failed login attempts (>5)', enabled: true },
    ],
  },
  {
    icon: Database,
    title: 'Data & Backup',
    items: [
      { label: 'Daily automated database backup', enabled: true },
      { label: 'Retain backups for 30 days', enabled: true },
      { label: 'Cross-region backup replication', enabled: false },
    ],
  },
];

export default function PlatformSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-gold" />
        <div>
          <h1 className="font-sora font-bold text-2xl text-white">Platform Settings</h1>
          <p className="text-gray-400 text-sm mt-0.5">Global configuration for SchoolOS SaaS platform</p>
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Key className="w-4 h-4 text-gold" />
          <h2 className="font-sora font-semibold text-white">Platform Info</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Product', 'SchoolOS ERP'],
            ['Version', '1.0.0-beta'],
            ['Vendor', 'Flint De Orient Marketing & Technology Pvt. Ltd.'],
            ['Support Email', 'support@schoolos.in'],
            ['Plan Model', 'Per-module SaaS · Annual billing'],
            ['Environment', process.env.NODE_ENV ?? 'production'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-white font-dm-sans">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle sections */}
      {sections.map((section) => (
        <div key={section.title} className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <section.icon className="w-4 h-4 text-gold" />
            <h2 className="font-sora font-semibold text-white">{section.title}</h2>
          </div>
          <div className="space-y-4">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <p className="text-sm text-gray-300 font-dm-sans">{item.label}</p>
                <div className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${item.enabled ? 'bg-gold' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
