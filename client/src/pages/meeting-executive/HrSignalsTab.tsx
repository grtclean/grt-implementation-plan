import { useState } from "react";
import {
  UserCheck,
  GraduationCap,
  TrendingDown,
  Star,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";

const SIGNAL_TYPES: Record<string, { label: string; icon: typeof Star; color: string }> = {
  promotion_ready: { label: "晋升就绪", icon: Star, color: "text-amber-600" },
  training_needed: { label: "需要培训", icon: GraduationCap, color: "text-blue-600" },
  declining_engagement: { label: "参与度下降", icon: TrendingDown, color: "text-red-600" },
  leadership_emerging: { label: "领导力涌现", icon: UserCheck, color: "text-green-600" },
};

export function HrSignalsTab() {
  const [department, setDepartment] = useState("");
  const [signalType, setSignalType] = useState("");
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [generateEmployeeId, setGenerateEmployeeId] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const signalsQuery = trpc.ime.hrSignalsList.useQuery({
    department: department || undefined,
    signalType: signalType || undefined,
    minConfidence,
  });
  const generateMutation = trpc.ime.generateHrSignals.useMutation({
    onSuccess: () => signalsQuery.refetch(),
  });
  const updateStatusMutation = trpc.ime.updateSignalStatus.useMutation({
    onSuccess: () => signalsQuery.refetch(),
  });

  const signals = (signalsQuery.data ?? []) as any[];

  // Count by type
  const typeCounts = signals.reduce((acc: Record<string, number>, s: any) => {
    acc[s.signal_type] = (acc[s.signal_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Generate Signals */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">生成信号 — 员工ID</label>
              <Input
                value={generateEmployeeId}
                onChange={(e) => setGenerateEmployeeId(e.target.value)}
                placeholder="employee-id"
                className="w-[200px]"
              />
            </div>
            <Button
              onClick={() => {
                if (generateEmployeeId) generateMutation.mutate({ employeeId: generateEmployeeId });
              }}
              disabled={generateMutation.isPending || !generateEmployeeId}
            >
              {generateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              生成信号
            </Button>
          </div>
          {generateMutation.data && (
            <div className="mt-3 text-sm text-muted-foreground">
              为 {(generateMutation.data as any).employeeName} 生成了 {((generateMutation.data as any).signals || []).length} 个信号
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> 部门
              </label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="全部"
                className="w-[140px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">信号类型</label>
              <Select value={signalType} onValueChange={setSignalType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {Object.entries(SIGNAL_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[200px]">
              <label className="text-sm font-medium">最低置信度: {minConfidence.toFixed(1)}</label>
              <Slider
                value={[minConfidence]}
                onValueChange={([v]) => setMinConfidence(v)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal Type Count Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(SIGNAL_TYPES).map(([key, { label, icon, color }]) => (
          <StatCard
            key={key}
            icon={icon}
            label={label}
            value={typeCounts[key] || 0}
            subtitle={key}
            iconColor={color}
          />
        ))}
      </div>

      {/* Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">HR 信号列表</CardTitle>
          <CardDescription>{signals.length} signals found</CardDescription>
        </CardHeader>
        <CardContent>
          {signals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead className="text-center">信号类型</TableHead>
                  <TableHead className="text-center">置信度</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((s: any) => {
                  const typeInfo = SIGNAL_TYPES[s.signal_type] || { label: s.signal_type, color: "text-gray-600" };
                  const isExpanded = expandedId === s.id;

                  return (
                    <>
                      <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                        <TableCell className="font-medium">{s.employee_name || s.employee_id}</TableCell>
                        <TableCell className="text-sm">{s.department || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={Number(s.confidence) >= 0.8 ? "default" : "secondary"}>
                            {(Number(s.confidence) * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{s.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {s.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ signalId: s.id, status: "acknowledged" }); }}
                                >
                                  确认
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-muted-foreground"
                                  onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ signalId: s.id, status: "dismissed" }); }}
                                >
                                  忽略
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${s.id}-detail`}>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="p-3 space-y-2 text-sm">
                              {s.suggested_action && (
                                <div>
                                  <span className="font-medium">建议操作: </span>
                                  <span className="text-muted-foreground">{s.suggested_action}</span>
                                </div>
                              )}
                              {s.evidence && (
                                <div>
                                  <span className="font-medium">证据: </span>
                                  <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap bg-muted/50 p-2 rounded">
                                    {typeof s.evidence === "string" ? s.evidence : JSON.stringify(s.evidence, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                创建于: {new Date(s.created_at).toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>暂无HR信号</p>
              <p className="text-sm">输入员工ID并点击"生成信号"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
