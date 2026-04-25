import { Brain } from 'lucide-react';

export default function AIBadge({ label = 'AI' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal text-white px-1.5 py-0.5 rounded-full">
      <Brain className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
