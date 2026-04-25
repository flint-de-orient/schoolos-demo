import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  actions?: React.ReactNode;
}

export default function ModuleHeader({ title, subtitle, icon: Icon, iconColor = 'text-navy', actions }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-iceLight flex items-center justify-center">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
        <div>
          <h2 className="text-xl font-sora font-semibold text-navy">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 font-dm-sans">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
