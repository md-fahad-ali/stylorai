import { LucideIcon, TrendingUp } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: 'up' | 'down';
}

export function StatsCard({ title, value, change, icon: Icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-6">
        <div className="text-[13px] text-gray-500 tracking-wide uppercase">{title}</div>
        <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
        </div>
      </div>

      <div className="text-[32px] tracking-tight mb-3">{value}</div>

      <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
        <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
        <span>{change}</span>
      </div>
    </div>
  );
}