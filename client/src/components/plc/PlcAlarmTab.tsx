/**
 * PLC Alarm Management Tab — Alarm database + troubleshooting
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertTriangle, Download, Search, HelpCircle, X } from "lucide-react";

interface PlcAlarmTabProps {
  projectId: number;
  plcProjectId: number | null;
}

const CLASS_COLOR: Record<string, string> = {
  A: "bg-red-100 text-red-800 border-red-300",
  B: "bg-orange-100 text-orange-800 border-orange-300",
  C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  W: "bg-blue-100 text-blue-800 border-blue-300",
};

const CLASS_LABEL: Record<string, string> = {
  A: "故障 (Fault)",
  B: "报警 (Alarm)",
  C: "警告 (Warning)",
  W: "信息 (Info)",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-600",
  high: "text-orange-600",
  medium: "text-yellow-600",
  low: "text-blue-600",
};

export default function PlcAlarmTab({ projectId, plcProjectId }: PlcAlarmTabProps) {
  const [filter, setFilter] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedAlarmId, setSelectedAlarmId] = useState<number | null>(null);

  const alarms = trpc.designEngine.plcGetAlarms.useQuery(
    { plcProjectId: plcProjectId || 0 },
    { enabled: !!plcProjectId }
  );
  const exportCsv = trpc.designEngine.plcExportAlarmList.useQuery(
    { plcProjectId: plcProjectId || 0 },
    { enabled: false }
  );
  const troubleshooting = trpc.designEngine.plcGenerateTroubleshootingGuide.useQuery(
    { alarmId: selectedAlarmId || 0 },
    { enabled: !!selectedAlarmId }
  );

  if (!plcProjectId) {
    return <div className="text-center py-20 text-muted-foreground">请先创建PLC项目</div>;
  }

  const filteredAlarms = (alarms.data || []).filter(a => {
    if (classFilter !== "all" && a.alarmClass !== classFilter) return false;
    if (filter && !(a.alarmCode.includes(filter) || a.messageZh?.includes(filter) || a.messageEn?.includes(filter))) return false;
    return true;
  });

  const classCounts = {
    A: (alarms.data || []).filter(a => a.alarmClass === "A").length,
    B: (alarms.data || []).filter(a => a.alarmClass === "B").length,
    C: (alarms.data || []).filter(a => a.alarmClass === "C").length,
    W: (alarms.data || []).filter(a => a.alarmClass === "W").length,
  };

  const handleExportCsv = async () => {
    const result = await exportCsv.refetch();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alarm-list-${plcProjectId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`已导出 ${result.data.count} 条报警`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(classCounts).map(([cls, count]) => (
          <Card key={cls} className="py-2">
            <CardContent className="p-2 text-center">
              <div className={`text-2xl font-bold ${SEVERITY_COLOR[cls === "A" ? "critical" : cls === "B" ? "high" : cls === "C" ? "medium" : "low"]}`}>{count}</div>
              <div className="text-xs text-muted-foreground">{CLASS_LABEL[cls]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索报警号/消息..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8" />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            <SelectItem value="A">A — 故障</SelectItem>
            <SelectItem value="B">B — 报警</SelectItem>
            <SelectItem value="C">C — 警告</SelectItem>
            <SelectItem value="W">W — 信息</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="h-4 w-4 mr-1" />
          导出报警列表
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Alarm table */}
        <div className={selectedAlarmId ? "lg:col-span-8" : "lg:col-span-12"}>
          <Card>
            <CardContent className="p-0">
              {alarms.isLoading ? <Skeleton className="h-80" /> : (
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">报警号</th>
                        <th className="p-2 text-left">等级</th>
                        <th className="p-2 text-left">消息(中)</th>
                        <th className="p-2 text-left">消息(英)</th>
                        <th className="p-2 text-left">触发条件</th>
                        <th className="p-2 text-left">联锁动作</th>
                        <th className="p-2 text-left">复位</th>
                        <th className="p-2 text-left">严重度</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlarms.map(a => (
                        <tr key={a.id} className={`border-t hover:bg-accent/50 ${selectedAlarmId === a.id ? "bg-accent" : ""}`}>
                          <td className="p-2 font-mono font-medium">{a.alarmCode}</td>
                          <td className="p-2">
                            <Badge variant="outline" className={CLASS_COLOR[a.alarmClass]}>{a.alarmClass}</Badge>
                          </td>
                          <td className="p-2 max-w-[200px] truncate">{a.messageZh}</td>
                          <td className="p-2 max-w-[150px] truncate text-muted-foreground">{a.messageEn}</td>
                          <td className="p-2 font-mono text-[10px] max-w-[120px] truncate">{a.triggerCondition}</td>
                          <td className="p-2 max-w-[120px] truncate">{a.interlockAction}</td>
                          <td className="p-2">{a.resetType}</td>
                          <td className="p-2">
                            <span className={SEVERITY_COLOR[a.severity || "medium"]}>{a.severity}</span>
                          </td>
                          <td className="p-2">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedAlarmId(a.id)}>
                              <HelpCircle className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredAlarms.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">无匹配报警</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Troubleshooting panel */}
        {selectedAlarmId && (
          <div className="lg:col-span-4">
            <Card className="h-[500px] overflow-y-auto">
              <CardHeader className="py-2 px-3 flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1">
                  <HelpCircle className="h-4 w-4" />
                  排故指南
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedAlarmId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-2">
                {troubleshooting.isLoading ? <Skeleton className="h-40" /> : troubleshooting.data ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="font-mono text-sm font-medium">{troubleshooting.data.alarmCode}</span>
                    </div>
                    <p className="text-sm">{troubleshooting.data.message}</p>
                    <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded whitespace-pre-wrap">
                      {troubleshooting.data.diagram}
                    </pre>
                    {((troubleshooting.data.steps as any[]) || []).length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold">排故步骤</h4>
                        {(troubleshooting.data.steps as any[]).map((step: any, i: number) => (
                          <div key={i} className="text-xs flex gap-2">
                            <Badge variant="outline" className="shrink-0 h-5 w-5 p-0 justify-center">{step.stepNumber || i + 1}</Badge>
                            <span>{step.action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
