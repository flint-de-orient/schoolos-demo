type Status = 'paid' | 'pending' | 'overdue' | 'active' | 'on-leave' | 'present' | 'absent' | string;

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  paid:      { bg: 'bg-green/10',  text: 'text-green',  label: 'Paid' },
  pending:   { bg: 'bg-amber/10',  text: 'text-amber',  label: 'Pending' },
  overdue:   { bg: 'bg-coral/10',  text: 'text-coral',  label: 'Overdue' },
  active:    { bg: 'bg-green/10',  text: 'text-green',  label: 'Active' },
  'on-leave':{ bg: 'bg-amber/10',  text: 'text-amber',  label: 'On Leave' },
  present:   { bg: 'bg-green/10',  text: 'text-green',  label: 'Present' },
  absent:    { bg: 'bg-coral/10',  text: 'text-coral',  label: 'Absent' },
  enrolled:  { bg: 'bg-green/10',  text: 'text-green',  label: 'Enrolled' },
  rejected:  { bg: 'bg-coral/10',  text: 'text-coral',  label: 'Rejected' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status.toLowerCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
