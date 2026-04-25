import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}

export default function StatCard({ title, value, subtitle, icon: Icon, iconBg = 'bg-navyMid', trend, trendLabel }: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green' : trend === 'down' ? 'text-coral' : 'text-gray-400';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-dm-sans mb-1 truncate">{title}</p>
          <p className="text-3xl font-sora font-semibold text-navy leading-tight">{value}</p>
          {(subtitle || trendLabel) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {trend && <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />}
              <p className={`text-xs font-dm-sans ${trendLabel ? trendColor : 'text-gray-400'}`}>
                {trendLabel ?? subtitle}
              </p>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
