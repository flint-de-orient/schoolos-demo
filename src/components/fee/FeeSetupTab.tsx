'use client';

import { useState } from 'react';
import FeeComponentsTab from './FeeComponentsTab';
import FeeCategoriesTab from './FeeCategoriesTab';
import FeePlansTab from './FeePlansTab';
import FeeConcessionsTab from './FeeConcessionsTab';
import FeeSettingsTab from './FeeSettingsTab';

type SetupTab = 'components' | 'categories' | 'plans' | 'concessions' | 'settings';

const TABS: { id: SetupTab; label: string; desc: string }[] = [
  { id: 'components', label: 'Fee Components', desc: 'Tuition, Lab, Library…' },
  { id: 'categories', label: 'Student Categories', desc: 'Day Scholar, Hostelier…' },
  { id: 'plans', label: 'Fee Plans', desc: 'Annual plans per class/year' },
  { id: 'concessions', label: 'Concessions', desc: 'Merit, Staff Ward, RTE…' },
  { id: 'settings',   label: 'Settings',    desc: 'Due days, auto-schedule…' },
];

export default function FeeSetupTab() {
  const [active, setActive] = useState<SetupTab>('components');

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-iceLight border border-ice rounded-xl px-5 py-4 text-sm text-navyMid">
        <span className="font-semibold">Fee Structure Setup</span>
        {' '}— Configure your school&apos;s fee engine here. Start with{' '}
        <strong>Components</strong> → <strong>Plans</strong> → assign to students from the Fee tab.
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              active === t.id
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="font-semibold">{t.label}</div>
            <div className="text-xs text-gray-400 hidden lg:block">{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {active === 'components' && <FeeComponentsTab />}
        {active === 'categories' && <FeeCategoriesTab />}
        {active === 'plans' && <FeePlansTab />}
        {active === 'concessions' && <FeeConcessionsTab />}
        {active === 'settings'   && <FeeSettingsTab />}
      </div>
    </div>
  );
}
