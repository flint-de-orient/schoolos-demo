import { Decimal } from '@prisma/client/runtime/library';
import { FeeFrequency } from '@prisma/client';

type PlanItem = {
  id: string;
  componentId: string;
  amount: Decimal;
  frequency: FeeFrequency;
  includeForNewAdmission: boolean;
};

type CustomInstallment = {
  name: string;
  percentage: Decimal;
  dueDay: number;
  dueMonth: number;
  displayOrder: number;
};

type Settings = {
  monthlyDueDay: number;
  biMonthlyDueDay: number;
  quarterlyDueDay: number;
  halfYearlyDueDay: number;
  annualDueDay: number;
} | null;

type Plan = {
  id: string;
  academicYear: { startDate: Date };
  items: PlanItem[];
  customSchedule: { installments: CustomInstallment[] } | null;
};

type InstallmentRow = {
  feeAccountId: string;
  planItemId: string | null;
  termLabel: string;
  amount: Decimal;
  dueDate: Date;
  paidAmount: Decimal;
  status: 'PENDING';
  lateFee: Decimal;
};

// Month occurrences for each frequency relative to session start month (0-indexed)
const OCCURRENCE_OFFSETS: Record<FeeFrequency, number[]> = {
  ONE_TIME:   [0],
  ANNUAL:     [0],
  HALF_YEARLY:[0, 6],
  QUARTERLY:  [0, 3, 6, 9],
  BI_MONTHLY: [0, 2, 4, 6, 8, 10],
  MONTHLY:    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

function dueDayForFreq(freq: FeeFrequency, settings: Settings): number {
  if (!settings) return 10;
  switch (freq) {
    case 'MONTHLY':    return settings.monthlyDueDay;
    case 'BI_MONTHLY': return settings.biMonthlyDueDay;
    case 'QUARTERLY':  return settings.quarterlyDueDay;
    case 'HALF_YEARLY':return settings.halfYearlyDueDay;
    case 'ANNUAL':
    case 'ONE_TIME':   return settings.annualDueDay;
  }
}

export function generateInstallments(
  plan: Plan,
  settings: Settings,
  feeAccountId: string,
  isNewAdmission = false,
): InstallmentRow[] {
  const rows: InstallmentRow[] = [];
  const zero = new Decimal(0);

  // Filter out items excluded for new admissions when applicable
  const items = isNewAdmission
    ? plan.items.filter((i) => i.includeForNewAdmission)
    : plan.items;

  // If a custom schedule exists, use it to split the total amount
  if (plan.customSchedule?.installments?.length) {
    const installs = plan.customSchedule.installments;
    const totalAmount = items.reduce((s, i) => s.add(i.amount), zero);
    const sessionYear = new Date(plan.academicYear.startDate).getFullYear();

    for (const inst of installs) {
      const amount = totalAmount.mul(inst.percentage).div(100).toDecimalPlaces(2);
      rows.push({
        feeAccountId,
        planItemId: items[0]?.id ?? null,
        termLabel: inst.name,
        amount,
        dueDate: new Date(sessionYear, inst.dueMonth - 1, inst.dueDay),
        paidAmount: zero,
        status: 'PENDING',
        lateFee: zero,
      });
    }
    return rows;
  }

  // Default: frequency-based generation per item
  const startDate = new Date(plan.academicYear.startDate);
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth(); // 0-indexed

  for (const item of items) {
    const offsets = OCCURRENCE_OFFSETS[item.frequency];
    const dueDay = dueDayForFreq(item.frequency, settings);

    offsets.forEach((offset, i) => {
      const rawMonth = startMonth + offset;
      const year = startYear + Math.floor(rawMonth / 12);
      const month = rawMonth % 12; // 0-indexed

      const label = item.frequency === 'ONE_TIME' || item.frequency === 'ANNUAL'
        ? 'Annual'
        : item.frequency === 'HALF_YEARLY'
        ? i === 0 ? 'First Half' : 'Second Half'
        : item.frequency === 'QUARTERLY'
        ? `Q${i + 1}`
        : item.frequency === 'BI_MONTHLY'
        ? `Bi-Monthly ${i + 1}`
        : new Date(year, month).toLocaleString('en-IN', { month: 'short', year: 'numeric' });

      rows.push({
        feeAccountId,
        planItemId: item.id,
        termLabel: label,
        amount: item.amount,
        dueDate: new Date(year, month, dueDay),
        paidAmount: zero,
        status: 'PENDING',
        lateFee: zero,
      });
    });
  }

  return rows;
}
