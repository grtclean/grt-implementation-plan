/**
 * 离职交接进度看板 (Offboarding Progress Dashboard)
 * 
 * 在首页Dashboard显示实时离职交接进度：
 * - 进行中的离职记录数量
 * - 待审批数量
 * - 每个离职员工的交接进度条
 * - 剩余天数提醒
 */

import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserMinus,
  Users,
  ArrowRight,
  ClipboardList,
  Shield,
  Laptop,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";

interface OffboardingProgressDashboardProps {
  authorized?: boolean;
  userPreferenceShow?: boolean;
}

export default function OffboardingProgressDashboard({
  authorized = true,
  userPreferenceShow = true,
}: OffboardingProgressDashboardProps) {
  const dashboardQuery = trpc.offboarding.dashboardStats.useQuery(undefined, {
    refetchInterval: 30000, // 每30秒刷新一次
    retry: 1,
  });

  const data = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  return (
    <DashboardWidget
      title="离职交接进度"
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
      icon={<UserMinus className="w-4 h-4" />}
      headerExtra={
        <Link href="/employee-offboarding">
          <span className="text-xs text-orange-500 hover:text-orange-400 cursor-pointer flex items-center gap-1">
            查看全部 <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-1 h-14 rounded-lg bg-slate-800/50" />
            ))}
          </div>
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-lg bg-slate-800/50" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-4 text-slate-500 text-xs">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
          数据加载失败
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
          <p className="text-xs text-slate-500">当前没有进行中的离职交接</p>
          <div className="flex justify-center gap-4 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-300">{data?.summary.total || 0}</p>
              <p className="text-[10px] text-slate-500">总计</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">{data?.summary.completedThisMonth || 0}</p>
              <p className="text-[10px] text-slate-500">本月完成</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 概要统计 */}
          <div className="grid grid-cols-4 gap-2">
            <StatMini
              label="进行中"
              value={data.summary.active}
              icon={<Users className="w-3 h-3" />}
              color="text-blue-400"
            />
            <StatMini
              label="待审批"
              value={data.summary.pendingApproval}
              icon={<Shield className="w-3 h-3" />}
              color="text-yellow-400"
            />
            <StatMini
              label="本月完成"
              value={data.summary.completedThisMonth}
              icon={<CheckCircle2 className="w-3 h-3" />}
              color="text-green-400"
            />
            <StatMini
              label="总计"
              value={data.summary.total}
              icon={<TrendingUp className="w-3 h-3" />}
              color="text-slate-400"
            />
          </div>

          {/* 进行中的离职交接列表 */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {data.items.slice(0, 5).map((item) => (
              <OffboardingCard key={item.id} item={item} />
            ))}
            {data.items.length > 5 && (
              <Link href="/employee-offboarding">
                <div className="text-center py-2 text-xs text-orange-500 hover:text-orange-400 cursor-pointer">
                  还有 {data.items.length - 5} 条记录，点击查看全部
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}

// 迷你统计卡片
function StatMini({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-slate-800/40 rounded-lg p-2 text-center">
      <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

// 离职交接进度卡片
function OffboardingCard({ item }: { item: any }) {
  const isUrgent = item.daysRemaining <= 7 && item.daysRemaining > 0;
  const isOverdue = item.daysRemaining < 0;

  return (
    <Link href="/employee-offboarding">
      <div className={`rounded-lg border p-3 cursor-pointer transition-all hover:border-orange-500/30 ${
        isOverdue ? 'border-red-500/30 bg-red-500/5' :
        isUrgent ? 'border-yellow-500/30 bg-yellow-500/5' :
        'border-slate-700 bg-slate-800/30'
      }`}>
        {/* 头部：员工信息 + 剩余天数 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
              <UserMinus className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{item.employeeName}</p>
              <p className="text-[10px] text-slate-500">{item.department} · {item.position}</p>
            </div>
          </div>
          <div className="text-right">
            {isOverdue ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                已超期 {Math.abs(item.daysRemaining)}天
              </Badge>
            ) : isUrgent ? (
              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px] px-1.5 py-0">
                剩余 {item.daysRemaining}天
              </Badge>
            ) : (
              <span className="text-[10px] text-slate-500">
                {item.daysRemaining > 0 ? `${item.daysRemaining}天后` : '今天'}
              </span>
            )}
          </div>
        </div>

        {/* 总体进度条 */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-500">总体进度</span>
            <span className={`text-[10px] font-medium ${
              item.overallProgress >= 80 ? 'text-green-400' :
              item.overallProgress >= 50 ? 'text-yellow-400' :
              'text-red-400'
            }`}>{item.overallProgress}%</span>
          </div>
          <Progress
            value={item.overallProgress}
            className="h-1.5"
          />
        </div>

        {/* 分项进度 */}
        <div className="grid grid-cols-4 gap-1.5">
          <ProgressMini
            icon={<ClipboardList className="w-2.5 h-2.5" />}
            label="交接"
            completed={item.handover.completed}
            total={item.handover.total}
            progress={item.handover.progress}
          />
          <ProgressMini
            icon={<Laptop className="w-2.5 h-2.5" />}
            label="资产"
            completed={item.assets.completed}
            total={item.assets.total}
            progress={item.assets.progress}
          />
          <ProgressMini
            icon={<Shield className="w-2.5 h-2.5" />}
            label="审批"
            completed={item.approvals.completed}
            total={item.approvals.total}
            progress={item.approvals.progress}
          />
          <ProgressMini
            icon={<TrendingUp className="w-2.5 h-2.5" />}
            label="绩效"
            completed={item.performance.confirmed}
            total={item.performance.total}
            progress={item.performance.progress}
          />
        </div>

        {/* 继任者信息 */}
        {item.successorName && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
            <span>继任者:</span>
            <span className="text-slate-400">{item.successorName}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-600">
              {item.successorType === 'replacement' ? '顶替' :
               item.successorType === 'new_position' ? '新岗位' :
               item.successorType === 'backup' ? 'Backup' : '待定'}
            </Badge>
          </div>
        )}
      </div>
    </Link>
  );
}

// 分项进度迷你组件
function ProgressMini({
  icon,
  label,
  completed,
  total,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  completed: number;
  total: number;
  progress: number;
}) {
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-0.5 mb-0.5 ${
        progress >= 100 ? 'text-green-400' :
        progress > 0 ? 'text-yellow-400' :
        'text-slate-500'
      }`}>
        {icon}
        <span className="text-[10px]">{completed}/{total}</span>
      </div>
      <p className="text-[9px] text-slate-600">{label}</p>
    </div>
  );
}
