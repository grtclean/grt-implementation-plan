import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetProps {
  title: string;
  authorized: boolean; // 是否授权
  children: React.ReactNode;
  userPreferenceShow: boolean; // 用户是否勾选显示
  className?: string;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export const DashboardWidget = ({ 
  title, 
  authorized, 
  children, 
  userPreferenceShow,
  className,
  icon,
  headerExtra
}: WidgetProps) => {
  // 如果用户设置不显示，直接返回 null
  if (!userPreferenceShow) return null;

  return (
    <div 
      className={cn(
        "relative rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 overflow-hidden transition-all",
        !authorized ? 'opacity-50 grayscale cursor-not-allowed select-none' : 'hover:border-orange-500/30',
        className
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-orange-500">{icon}</span>}
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          {!authorized && <Lock className="w-4 h-4 text-slate-500" />}
        </div>
      </div>

      {/* Content */}
      <div className={!authorized ? 'blur-[2px]' : ''}>
        {children}
      </div>

      {/* Unauthorized Overlay */}
      {!authorized && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/80 px-4 py-2 rounded border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
            <Lock size={12} />
            Access Restricted
          </div>
        </div>
      )}
    </div>
  );
};

// 示例用法：Gemini 绩效卡片
interface PerformanceCardProps {
  authorized: boolean;
  userPreferenceShow?: boolean;
  score?: number;
  percentile?: string;
  feedback?: string;
}

export const PerformanceCard = ({ 
  authorized, 
  userPreferenceShow = true,
  score = 92,
  percentile = "Top 5%",
  feedback = "Excellent PLC code structure today. The logic for the safety interlock was robust. Suggestion: Add more comments in the initialization block."
}: PerformanceCardProps) => (
  <DashboardWidget 
    title="Gemini Performance Review" 
    authorized={authorized} 
    userPreferenceShow={userPreferenceShow}
  >
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-green-500 mb-1">{percentile}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        "{feedback}"
      </p>
      {/* Gemini Logo / Branding */}
      <div className="text-[10px] text-purple-400 flex justify-end mt-2">
        Powered by Gemini Pro
      </div>
    </div>
  </DashboardWidget>
);

// 通用的Widget包装器Hook
export const useWidgetAuthorization = (requiredRoles: string[], userRole: string) => {
  return requiredRoles.includes(userRole);
};

export default DashboardWidget;
