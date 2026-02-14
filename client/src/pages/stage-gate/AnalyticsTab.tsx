/**
 * AnalyticsTab - Gate analytics visualization
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/grt";
import { STAGES } from "../../../../shared/stage-definitions";

interface GateStatItem {
  gate_stage: string;
  status: string;
  count: number;
}

interface SignalStatItem {
  status: string;
  priority: string;
  count: number;
}

interface AutoVerifyStatItem {
  auto_verified: number | null;
  count: number;
}

interface StatsData {
  gates: GateStatItem[];
  signals: SignalStatItem[];
  autoVerify: AutoVerifyStatItem[];
}

interface AnalyticsTabProps {
  statsData?: StatsData;
  isLoading?: boolean;
}

export default function AnalyticsTab({ statsData, isLoading }: AnalyticsTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        加载统计数据中...
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无统计数据
      </div>
    );
  }

  // Gate pass rate by stage
  const stagePassRates: { stage: string; name: string; total: number; passed: number; rate: number }[] = [];
  const gatesByStage: Record<string, { total: number; passed: number }> = {};
  for (const item of statsData.gates) {
    if (!gatesByStage[item.gate_stage]) {
      gatesByStage[item.gate_stage] = { total: 0, passed: 0 };
    }
    gatesByStage[item.gate_stage].total += item.count;
    if (item.status === "pass" || item.status === "waived") {
      gatesByStage[item.gate_stage].passed += item.count;
    }
  }
  for (const stage of STAGES) {
    const data = gatesByStage[stage.id];
    if (data && data.total > 0) {
      stagePassRates.push({
        stage: stage.id,
        name: stage.name,
        total: data.total,
        passed: data.passed,
        rate: Math.round((data.passed / data.total) * 100),
      });
    }
  }

  // Signal status distribution
  const signalByStatus: Record<string, number> = {};
  for (const item of statsData.signals) {
    signalByStatus[item.status] = (signalByStatus[item.status] || 0) + item.count;
  }

  const signalStatusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "待发送", color: "bg-yellow-500" },
    sent: { label: "已发送", color: "bg-blue-500" },
    acknowledged: { label: "已确认", color: "bg-cyan-500" },
    executed: { label: "已执行", color: "bg-green-500" },
    failed: { label: "失败", color: "bg-red-500" },
    cancelled: { label: "已取消", color: "bg-gray-500" },
  };

  // Auto-verify stats
  const autoCount = statsData.autoVerify.find(a => a.auto_verified === 1)?.count || 0;
  const manualCount = statsData.autoVerify.find(a => a.auto_verified === 0 || a.auto_verified === null)?.count || 0;
  const totalVerify = autoCount + manualCount;

  return (
    <div className="space-y-6">
      {/* Gate pass rate by stage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">各阶段通过率</CardTitle>
        </CardHeader>
        <CardContent>
          {stagePassRates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无门径通过率数据</p>
          ) : (
            <div className="space-y-3">
              {stagePassRates.map((s) => (
                <div key={s.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <StatusBadge color="blue">{s.stage}</StatusBadge>
                      <span className="text-muted-foreground">{s.name}</span>
                    </span>
                    <span className="font-medium">{s.rate}% ({s.passed}/{s.total})</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        s.rate >= 80 ? "bg-green-500" : s.rate >= 50 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${s.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Signal status distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">拉动信号分布</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(signalByStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无拉动信号数据</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(signalByStatus).map(([status, count]) => {
                  const def = signalStatusLabels[status];
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${def?.color || "bg-gray-500"}`} />
                        <span className="text-sm">{def?.label || status}</span>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-verification stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">验证方式统计</CardTitle>
          </CardHeader>
          <CardContent>
            {totalVerify === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无验证数据</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>自动验证</span>
                    <span className="font-medium">{autoCount} ({totalVerify > 0 ? Math.round((autoCount / totalVerify) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-cyan-500 transition-all"
                      style={{ width: `${totalVerify > 0 ? (autoCount / totalVerify) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>手动验证</span>
                    <span className="font-medium">{manualCount} ({totalVerify > 0 ? Math.round((manualCount / totalVerify) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-purple-500 transition-all"
                      style={{ width: `${totalVerify > 0 ? (manualCount / totalVerify) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
