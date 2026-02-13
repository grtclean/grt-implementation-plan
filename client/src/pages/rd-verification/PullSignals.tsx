/**
 * 拉动信号 Tab - JIT/JIS信号管理
 * 使用Mock数据
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAGES } from "../../../../shared/stage-definitions";
import { Zap, ArrowRight, Factory, Inbox, CheckCircle, Clock } from "lucide-react";

interface MockSignal {
  id: number;
  upstreamGate: string;
  triggerEvent: string;
  targetAasId: string;
  status: "pending" | "triggered" | "confirmed";
  actionPayload: Record<string, unknown>;
}

const MOCK_SIGNALS: MockSignal[] = [
  { id: 1, upstreamGate: "M6", triggerEvent: "上汽JIS订单到达", targetAasId: "AAS-GRT501-CL01", status: "triggered", actionPayload: { action: "start_production", line: "A3" } },
  { id: 2, upstreamGate: "M7", triggerEvent: "装配完成信号", targetAasId: "AAS-GRT501-TST01", status: "pending", actionPayload: { action: "start_test", protocol: "FAT" } },
  { id: 3, upstreamGate: "M9", triggerEvent: "发货确认", targetAasId: "AAS-GRT502-INS01", status: "confirmed", actionPayload: { action: "prepare_installation", site: "台积电南京" } },
  { id: 4, upstreamGate: "M4", triggerEvent: "方案冻结完成", targetAasId: "AAS-GRT503-PRO01", status: "pending", actionPayload: { action: "start_procurement", priority: "high" } },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{className?: string}> }> = {
  pending: { label: "待触发", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  triggered: { label: "已触发", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Zap },
  confirmed: { label: "已确认", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
};

export default function PullSignals() {
  const [signals, setSignals] = useState(MOCK_SIGNALS);

  const handleTrigger = (id: number) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status: "triggered" as const } : s));
  };
  const handleConfirm = (id: number) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status: "confirmed" as const } : s));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">生产拉动信号</h3>
          <p className="text-sm text-muted-foreground">JIT/JIS拉动信号管理</p>
        </div>
      </div>

      <div className="space-y-3">
        {signals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>暂无拉动信号</p>
            </CardContent>
          </Card>
        ) : signals.map((signal) => {
          const sc = statusConfig[signal.status];
          const StatusIcon = sc.icon;
          return (
            <Card key={signal.id} className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-400">{signal.upstreamGate}</Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{signal.triggerEvent}</span>
                      <Badge variant="outline" className={sc.color}><StatusIcon className="w-3 h-3 mr-1" />{sc.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Factory className="w-4 h-4" />目标: {signal.targetAasId}</span>
                    </div>
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono">
                      {JSON.stringify(signal.actionPayload, null, 2)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {signal.status === "pending" && (
                      <Button size="sm" onClick={() => handleTrigger(signal.id)}><Zap className="w-4 h-4 mr-1" />触发</Button>
                    )}
                    {signal.status === "triggered" && (
                      <Button size="sm" variant="outline" onClick={() => handleConfirm(signal.id)}><CheckCircle className="w-4 h-4 mr-1" />确认</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
