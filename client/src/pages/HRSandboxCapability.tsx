/**
 * HR Sandbox Capability — ai_tasks queue-driven TSDCKL parsing
 *
 * 4 Tabs:
 *   1. 能力解析 — Employee select + freeform text → radar chart + gaps + recommendations
 *   2. 沙盘模拟 — 6 sliders + what-if comparison
 *   3. 批量解析 — Department batch parsing with polling
 *   4. 任务队列 — ai_task stats + task list
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Brain,
  Loader2,
  Users,
  Target,
  BarChart3,
  ListChecks,
  Play,
  RefreshCw,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  ShieldAlert,
} from "lucide-react";
import ViolationAlert from "@/components/ViolationAlert";

// ─── Types ──────────────────────────────────────────────────
type ParsedScores = { T: number; S: number; D: number; C: number; K: number; L: number };

interface GapItem {
  pillar: string; code: string; actual: number; target: number; gap: number;
  priority: "high" | "medium" | "low";
}

interface Recommendation {
  pillar: string; code: string; action: string; timeframe: string;
  expectedLift: number; priority: "high" | "medium" | "low";
}

interface ParsingResult {
  parsedScores: ParsedScores;
  gaps: GapItem[];
  recommendations: Recommendation[];
  developmentPath: string;
  confidenceLevel: number;
  overallScore: number;
  overallGrade: string;
  source: "llm" | "algorithmic";
}

// ─── SVG Radar Chart ────────────────────────────────────────
const PILLAR_CODES: (keyof ParsedScores)[] = ["T", "S", "D", "C", "K", "L"];
const RADAR_SIZE = 280;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 110;

function polarToCartesian(angle: number, radius: number): [number, number] {
  const rad = (angle - 90) * (Math.PI / 180);
  return [RADAR_CENTER + radius * Math.cos(rad), RADAR_CENTER + radius * Math.sin(rad)];
}

function RadarChart({
  actual,
  target,
  labels,
  colors,
  size = RADAR_SIZE,
}: {
  actual: ParsedScores;
  target?: Record<string, number>;
  labels: Record<string, string>;
  colors: Record<string, string>;
  size?: number;
}) {
  const scale = size / RADAR_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = RADAR_RADIUS * scale;

  const toXY = (angle: number, r: number): [number, number] => {
    const rad = (angle - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  const angleStep = 360 / PILLAR_CODES.length;

  // Grid rings
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Actual polygon
  const actualPoints = PILLAR_CODES.map((code, i) => {
    const angle = i * angleStep;
    const val = actual[code] / 100;
    const [x, y] = toXY(angle, maxR * val);
    return `${x},${y}`;
  }).join(" ");

  // Target polygon
  const targetPoints = target ? PILLAR_CODES.map((code, i) => {
    const angle = i * angleStep;
    const val = (target[code] || 60) / 100;
    const [x, y] = toXY(angle, maxR * val);
    return `${x},${y}`;
  }).join(" ") : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {rings.map(r => (
        <polygon
          key={r}
          points={PILLAR_CODES.map((_, i) => {
            const [x, y] = toXY(i * angleStep, maxR * r);
            return `${x},${y}`;
          }).join(" ")}
          fill="none" stroke="#e5e7eb" strokeWidth={0.5}
        />
      ))}
      {/* Axes */}
      {PILLAR_CODES.map((code, i) => {
        const angle = i * angleStep;
        const [x, y] = toXY(angle, maxR);
        const [lx, ly] = toXY(angle, maxR + 18 * scale);
        return (
          <g key={code}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#d1d5db" strokeWidth={0.5} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
              fontSize={11 * scale} fontWeight={600} fill={colors[code] || "#666"}>
              {labels[code] || code}
            </text>
          </g>
        );
      })}
      {/* Target polygon (dashed) */}
      {targetPoints && (
        <polygon points={targetPoints}
          fill="rgba(234,179,8,0.08)" stroke="#eab308" strokeWidth={1.5}
          strokeDasharray="4 3" />
      )}
      {/* Actual polygon */}
      <polygon points={actualPoints}
        fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth={2} />
      {/* Actual dots */}
      {PILLAR_CODES.map((code, i) => {
        const angle = i * angleStep;
        const val = actual[code] / 100;
        const [x, y] = toXY(angle, maxR * val);
        return <circle key={code} cx={x} cy={y} r={3 * scale} fill={colors[code] || "#3b82f6"} />;
      })}
    </svg>
  );
}

// ─── Stat Card ──────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Priority Badge ─────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priority === "high" ? { bg: "bg-red-100 text-red-700", label: "高" }
    : priority === "medium" ? { bg: "bg-amber-100 text-amber-700", label: "中" }
    : { bg: "bg-green-100 text-green-700", label: "低" };
  return <Badge className={cfg.bg}>{cfg.label}</Badge>;
}

// ─── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />完成</Badge>;
  if (status === "processing") return <Badge className="bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 mr-1 animate-spin" />处理中</Badge>;
  if (status === "failed") return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />失败</Badge>;
  return <Badge className="bg-gray-100 text-gray-600"><Clock className="h-3 w-3 mr-1" />待处理</Badge>;
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function HRSandboxCapability() {
  const { t } = useLanguage();
  const { currentUserRole } = useUserProfile();
  const roleLevel = ROLE_HIERARCHY[currentUserRole] ?? 1;

  const [activeTab, setActiveTab] = useState<"parse" | "simulate" | "batch" | "queue" | "docParse" | "violations">("parse");

  // Init data
  const { data: sandbox } = trpc.hrSandbox.initSandbox.useQuery();
  const dictionary = sandbox?.dictionary || [];
  const employees = sandbox?.employees || [];
  const departments = sandbox?.departments || [];
  const roleCriteria = sandbox?.roleCriteria || [];

  // Labels & colors from dictionary
  const labels = useMemo(() => Object.fromEntries(dictionary.map(d => [d.code, d.code])), [dictionary]);
  const colors = useMemo(() => Object.fromEntries(dictionary.map(d => [d.code, d.color])), [dictionary]);

  const tabs = [
    { key: "parse" as const, label: "能力解析", icon: Brain },
    { key: "simulate" as const, label: "沙盘模拟", icon: SlidersHorizontal },
    { key: "batch" as const, label: "批量解析", icon: Users },
    { key: "docParse" as const, label: "文档解析", icon: FileText },
    { key: "violations" as const, label: "风控事件", icon: ShieldAlert },
    { key: "queue" as const, label: "任务队列", icon: ListChecks },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Brain className="h-6 w-6 text-purple-600" />
        <h1 className="text-xl font-bold">HR沙盘能力模型解析</h1>
        <Badge className="bg-purple-100 text-purple-700">AI + 算法</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "parse" && (
        <TabParse employees={employees} roleCriteria={roleCriteria} labels={labels} colors={colors} dictionary={dictionary} />
      )}
      {activeTab === "simulate" && (
        <TabSimulate employees={employees} roleCriteria={roleCriteria} labels={labels} colors={colors} />
      )}
      {activeTab === "batch" && (
        <TabBatch departments={departments} employees={employees} roleLevel={roleLevel} currentUserRole={currentUserRole} labels={labels} colors={colors} />
      )}
      {activeTab === "docParse" && (
        <TabDocParse />
      )}
      {activeTab === "violations" && (
        <TabViolations />
      )}
      {activeTab === "queue" && (
        <TabQueue />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 1: 能力解析
// ═══════════════════════════════════════════════════════════
function TabParse({ employees, roleCriteria, labels, colors, dictionary }: {
  employees: any[]; roleCriteria: any[]; labels: Record<string, string>;
  colors: Record<string, string>; dictionary: any[];
}) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [freeformText, setFreeformText] = useState("");
  const [result, setResult] = useState<ParsingResult | null>(null);

  const selectedEmp = employees.find(e => String(e.employeeId) === selectedEmpId);
  const empRole = selectedEmp?.role || "employee";
  const criteria = roleCriteria.find((r: any) => r.role === empRole) || roleCriteria.find((r: any) => r.role === "employee");
  const targets = criteria?.targets || {};

  const submitMutation = trpc.hrSandbox.submitParsing.useMutation({
    onSuccess: (data) => {
      if (data.status === "completed" && data.result) {
        setResult(data.result as unknown as ParsingResult);
        toast.success("能力解析完成");
      } else {
        toast.error((data as any).error || "解析失败");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!selectedEmpId) { toast.error("请选择员工"); return; }
    submitMutation.mutate({
      employeeId: Number(selectedEmpId),
      role: empRole,
      freeformText: freeformText || undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left — Input */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> 员工选择与输入
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">员工</label>
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger><SelectValue placeholder="选择员工..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.employeeId} value={String(e.employeeId)}>
                      {e.name} ({e.nameEn}) — {e.department} · {e.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">自由文本（可选）</label>
              <Textarea
                placeholder="描述员工的能力特长、项目经验、资质证书等..."
                value={freeformText}
                onChange={(e) => setFreeformText(e.target.value)}
                rows={4}
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending || !selectedEmpId}
              className="w-full">
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              提交解析
            </Button>
          </CardContent>
        </Card>

        {/* Current scores preview */}
        {selectedEmp && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">当前评分 — {selectedEmp.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {PILLAR_CODES.map(code => {
                  const pillar = dictionary.find((d: any) => d.code === code);
                  return (
                    <div key={code} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[code] }} />
                      <span className="text-muted-foreground">{pillar?.name || code}:</span>
                      <span className="font-semibold">{selectedEmp.scores[code]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">综合:</span>
                <span className="font-bold">{selectedEmp.overallScore}</span>
                <Badge>{selectedEmp.overallGrade}</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right — Results */}
      <div className="space-y-4">
        {result ? (
          <>
            {/* Confidence badge */}
            <div className="flex items-center gap-2">
              <Badge className={result.source === "llm" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {result.source === "llm" ? "LLM分析" : "算法估算"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                置信度: {Math.round(result.confidenceLevel * 100)}%
              </span>
              <span className="ml-auto text-sm font-bold">
                综合 {result.overallScore} · {result.overallGrade}
              </span>
            </div>

            {/* Radar chart */}
            <Card>
              <CardContent className="flex justify-center pt-4 pb-2">
                <RadarChart actual={result.parsedScores} target={targets} labels={labels} colors={colors} />
              </CardContent>
              <CardContent className="pt-0 pb-3">
                <div className="flex justify-center gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> 实际</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-dashed border-yellow-500 inline-block" /> 目标</span>
                </div>
              </CardContent>
            </Card>

            {/* Gaps table */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">差距分析</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-1.5 font-medium">维度</th>
                        <th className="py-1.5 font-medium">实际</th>
                        <th className="py-1.5 font-medium">目标</th>
                        <th className="py-1.5 font-medium">差距</th>
                        <th className="py-1.5 font-medium">优先级</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.gaps.map(g => (
                        <tr key={g.code} className="border-b last:border-0">
                          <td className="py-1.5 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[g.code] }} />
                            {g.pillar}
                          </td>
                          <td className="py-1.5">{g.actual}</td>
                          <td className="py-1.5">{g.target}</td>
                          <td className="py-1.5 font-semibold" style={{ color: g.gap > 0 ? "#dc2626" : "#16a34a" }}>
                            {g.gap > 0 ? `+${g.gap}` : g.gap}
                          </td>
                          <td className="py-1.5"><PriorityBadge priority={g.priority} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">改进建议</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.recommendations.slice(0, 4).map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[r.code] }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {r.pillar}
                        <PriorityBadge priority={r.priority} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.action}</div>
                      <div className="text-xs text-muted-foreground">
                        时间框架: {r.timeframe} · 预期提升: +{r.expectedLift}分
                      </div>
                    </div>
                  </div>
                ))}
                {result.developmentPath && (
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-purple-50 rounded">
                    <strong>发展路径:</strong> {result.developmentPath}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Brain className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">选择员工并提交解析后，结果将显示在此</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 2: 沙盘模拟
// ═══════════════════════════════════════════════════════════
function TabSimulate({ employees, roleCriteria, labels, colors }: {
  employees: any[]; roleCriteria: any[];
  labels: Record<string, string>; colors: Record<string, string>;
}) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const selectedEmp = employees.find(e => String(e.employeeId) === selectedEmpId);
  const empRole = selectedEmp?.role || "employee";
  const criteria = roleCriteria.find((r: any) => r.role === empRole) || roleCriteria.find((r: any) => r.role === "employee");
  const targets = criteria?.targets || {};

  const [sliders, setSliders] = useState<ParsedScores>({ T: 50, S: 50, D: 50, C: 50, K: 50, L: 50 });

  // Load employee scores into sliders
  useEffect(() => {
    if (selectedEmp) {
      setSliders({ ...selectedEmp.scores } as ParsedScores);
    }
  }, [selectedEmpId]);

  const whatIfMutation = trpc.hrSandbox.whatIfSimulation.useMutation();

  // Debounced simulation
  useEffect(() => {
    if (!selectedEmp) return;
    const timer = setTimeout(() => {
      whatIfMutation.mutate({
        employeeId: selectedEmp.employeeId,
        role: empRole,
        baseScores: selectedEmp.scores as ParsedScores,
        adjustments: sliders,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [sliders, selectedEmpId]);

  const result = whatIfMutation.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> 选择员工
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
            <SelectTrigger><SelectValue placeholder="选择员工..." /></SelectTrigger>
            <SelectContent>
              {employees.map((e: any) => (
                <SelectItem key={e.employeeId} value={String(e.employeeId)}>
                  {e.name} — {e.department} · {e.roleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEmp && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sliders */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-sm">调整维度分数</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {PILLAR_CODES.map(code => (
                <div key={code}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium" style={{ color: colors[code] }}>{code}</span>
                    <span className="font-bold">{sliders[code]}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={sliders[code]}
                    onChange={e => setSliders(prev => ({ ...prev, [code]: Number(e.target.value) }))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: colors[code] }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Before / After comparison */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                前后对比
                {whatIfMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  {/* Grade change */}
                  <div className="flex items-center gap-3 justify-center text-lg">
                    <Badge variant="outline" className="text-base px-3">{result.before.grade}</Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    <Badge className={result.after.grade > result.before.grade ? "bg-green-100 text-green-700" : result.after.grade < result.before.grade ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"} >
                      {result.after.grade}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({result.before.overallScore} → {result.after.overallScore})
                    </span>
                  </div>

                  {/* Dual radar */}
                  <div className="flex justify-center gap-4 flex-wrap">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">调整前</div>
                      <RadarChart actual={result.before.scores as ParsedScores} target={targets} labels={labels} colors={colors} size={200} />
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">调整后</div>
                      <RadarChart actual={result.after.scores as ParsedScores} target={targets} labels={labels} colors={colors} size={200} />
                    </div>
                  </div>

                  {/* Delta table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-1.5 font-medium">维度</th>
                          <th className="py-1.5 font-medium">调整前</th>
                          <th className="py-1.5 font-medium">调整后</th>
                          <th className="py-1.5 font-medium">变化</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.deltas.map(d => (
                          <tr key={d.code} className="border-b last:border-0">
                            <td className="py-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[d.code] }} />
                              {d.pillar}
                            </td>
                            <td className="py-1.5">{d.before}</td>
                            <td className="py-1.5">{d.after}</td>
                            <td className="py-1.5 font-semibold" style={{ color: d.delta > 0 ? "#16a34a" : d.delta < 0 ? "#dc2626" : "#666" }}>
                              {d.delta > 0 ? `+${d.delta}` : d.delta}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  拖动滑块查看模拟结果
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 3: 批量解析
// ═══════════════════════════════════════════════════════════
function TabBatch({ departments, employees, roleLevel, currentUserRole, labels, colors }: {
  departments: string[]; employees: any[]; roleLevel: number; currentUserRole: string;
  labels: Record<string, string>; colors: Record<string, string>;
}) {
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [batchTaskIds, setBatchTaskIds] = useState<number[]>([]);

  const batchMutation = trpc.hrSandbox.batchParse.useMutation({
    onSuccess: (data) => {
      setBatchTaskIds(data.taskIds);
      toast.success(`批量解析完成: ${data.totalEmployees}名员工`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Poll results when we have task IDs
  const reportQuery = trpc.hrSandbox.exportReport.useQuery(
    { taskIds: batchTaskIds },
    { enabled: batchTaskIds.length > 0, refetchInterval: batchTaskIds.length > 0 ? 3000 : false },
  );

  const reportItems = reportQuery.data?.items || [];
  const allDone = reportItems.length > 0 && reportItems.every(i => i.status === "completed" || i.status === "failed");

  // Stop polling once all done
  useEffect(() => {
    if (allDone && reportQuery.isRefetching) {
      // tRPC auto-stops refetchInterval when component unmounts
    }
  }, [allDone]);

  const handleBatch = () => {
    if (!selectedDept) { toast.error("请选择部门"); return; }
    batchMutation.mutate({ department: selectedDept, userRole: currentUserRole });
  };

  if (roleLevel < 3) {
    return (
      <Card className="flex items-center justify-center h-48">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>仅部门经理及以上角色 (Level ≥ 3) 可使用批量解析</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-end gap-3 pt-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">选择部门</label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger><SelectValue placeholder="选择部门..." /></SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleBatch} disabled={batchMutation.isPending || !selectedDept}>
            {batchMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            开始批量解析
          </Button>
        </CardContent>
      </Card>

      {reportItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              解析结果 ({reportItems.length}名)
              {!allDone && <Loader2 className="h-3 w-3 animate-spin" />}
              {allDone && <CheckCircle className="h-3 w-3 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-1.5 font-medium w-8"></th>
                    <th className="py-1.5 font-medium">姓名</th>
                    <th className="py-1.5 font-medium">部门</th>
                    <th className="py-1.5 font-medium">岗位</th>
                    {PILLAR_CODES.map(c => <th key={c} className="py-1.5 font-medium text-center" style={{ color: colors[c] }}>{c}</th>)}
                    <th className="py-1.5 font-medium">综合</th>
                    <th className="py-1.5 font-medium">等级</th>
                    <th className="py-1.5 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {reportItems.map(item => {
                    const isExpanded = expandedRow === item.taskId;
                    return (
                      <>
                        <tr key={item.taskId} className="border-b cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedRow(isExpanded ? null : item.taskId)}>
                          <td className="py-1.5">
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </td>
                          <td className="py-1.5 font-medium">{item.employeeName}</td>
                          <td className="py-1.5">{item.department}</td>
                          <td className="py-1.5">{item.role}</td>
                          {PILLAR_CODES.map(c => (
                            <td key={c} className="py-1.5 text-center">{item.parsedScores?.[c] ?? "-"}</td>
                          ))}
                          <td className="py-1.5 font-bold">{item.overallScore || "-"}</td>
                          <td className="py-1.5"><Badge>{item.overallGrade}</Badge></td>
                          <td className="py-1.5"><StatusBadge status={item.status} /></td>
                        </tr>
                        {isExpanded && item.parsedScores && (
                          <tr key={`${item.taskId}-expand`}>
                            <td colSpan={11} className="py-2 px-4 bg-muted/30">
                              <div className="flex items-start gap-6">
                                <RadarChart
                                  actual={item.parsedScores as ParsedScores}
                                  labels={labels}
                                  colors={colors}
                                  size={180}
                                />
                                <div className="flex-1 space-y-1">
                                  <div className="text-xs font-medium mb-2">差距分析</div>
                                  {(item.gaps as GapItem[]).filter(g => g.gap > 0).slice(0, 3).map(g => (
                                    <div key={g.code} className="text-xs flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[g.code] }} />
                                      {g.pillar}: 差距 {g.gap}分
                                      <PriorityBadge priority={g.priority} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 5: 文档解析 (Async DOC_PARSING via task worker)
// ═══════════════════════════════════════════════════════════
function TabDocParse() {
  const [docText, setDocText] = useState("");
  const [empName, setEmpName] = useState("");
  const [role, setRole] = useState("employee");
  const [taskId, setTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitMut = trpc.hrSandbox.submitDocParsing.useMutation({
    onSuccess: (data) => {
      setTaskId(data.taskId);
      setError(null);
      toast.success(`文档解析任务已提交 (#${data.taskId})`);
    },
    onError: (err) => setError(err.message),
  });

  // Poll task result
  const resultQuery = trpc.hrSandbox.getParsingResult.useQuery(
    { taskId: taskId! },
    {
      enabled: taskId !== null,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "completed" || status === "failed") return false;
        return 2000;
      },
    },
  );

  const taskResult = resultQuery.data;
  const isProcessing = taskResult?.status === "pending" || taskResult?.status === "processing";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> 文档能力解析（异步）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">员工姓名</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="张三"
                value={empName}
                onChange={e => setEmpName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">岗位角色</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">普通员工</SelectItem>
                  <SelectItem value="team_lead">组长</SelectItem>
                  <SelectItem value="bu_mech">机械工程师</SelectItem>
                  <SelectItem value="bu_elec">电气工程师</SelectItem>
                  <SelectItem value="dept_manager">部门经理</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">文档内容 / 简历 / 评估材料</label>
              <Textarea
                placeholder="粘贴员工简历、绩效评估报告、项目总结等文档内容..."
                value={docText}
                onChange={e => setDocText(e.target.value)}
                rows={8}
              />
            </div>
            <Button
              onClick={() => submitMut.mutate({ documentText: docText, employeeName: empName || undefined, role })}
              disabled={submitMut.isPending || !docText.trim()}
              className="w-full"
            >
              {submitMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              提交异步解析
            </Button>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {taskId !== null ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                任务 #{taskId}
                {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                {taskResult?.status === "completed" && <CheckCircle className="h-3 w-3 text-green-500" />}
                {taskResult?.status === "failed" && <XCircle className="h-3 w-3 text-red-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isProcessing && (
                <div className="space-y-3">
                  {/* Skeleton loading */}
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-32 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">AI正在分析文档内容，请稍候...</p>
                </div>
              )}
              {taskResult?.status === "completed" && taskResult.result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={(taskResult.result as any).source === "llm" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                      {(taskResult.result as any).source === "llm" ? "LLM分析" : "算法估算"}
                    </Badge>
                    <span className="text-sm font-bold">
                      综合 {(taskResult.result as any).overallScore} · {(taskResult.result as any).overallGrade || (taskResult.result as any).grade}
                    </span>
                  </div>
                  {(taskResult.result as any).scores && (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {PILLAR_CODES.map(code => (
                        <div key={code} className="flex items-center gap-1">
                          <span className="font-medium">{code}:</span>
                          <span>{(taskResult.result as any).scores?.[code] ?? (taskResult.result as any).parsedScores?.[code] ?? "-"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(taskResult.result as any).narrative && (
                    <div className="text-xs bg-purple-50 p-2 rounded">{(taskResult.result as any).narrative}</div>
                  )}
                  {(taskResult.result as any).keyFindings?.length > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="font-medium">关键发现:</div>
                      {(taskResult.result as any).keyFindings.map((f: string, i: number) => (
                        <div key={i} className="flex gap-1"><CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" /> {f}</div>
                      ))}
                    </div>
                  )}
                  {(taskResult.result as any).improvementAreas?.length > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="font-medium">改进领域:</div>
                      {(taskResult.result as any).improvementAreas.map((a: any, i: number) => (
                        <div key={i} className="flex gap-1 text-amber-700">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {a.dimension}: {a.recommendation} (当前{a.currentScore}分)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {taskResult?.status === "failed" && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>{taskResult.error || "解析失败"}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">粘贴文档并提交后，AI将异步分析并在此显示结果</p>
              <p className="text-xs mt-1">解析通过后台任务队列执行，无需等待</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 6: 风控事件 (Violation Events)
// ═══════════════════════════════════════════════════════════
function TabViolations() {
  const violationsQuery = trpc.violationEvent.list.useQuery({ limit: 20 });
  const statsQuery = trpc.violationEvent.stats.useQuery();
  const violations = violationsQuery.data?.items || [];
  const stats = statsQuery.data;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="活跃事件" value={stats?.activeCount ?? 0} icon={ShieldAlert} color="#dc2626" />
        <StatCard label="一般" value={stats?.bySeverity?.MINOR ?? 0} icon={AlertTriangle} color="#eab308" />
        <StatCard label="重大" value={stats?.bySeverity?.MAJOR ?? 0} icon={AlertTriangle} color="#f97316" />
        <StatCard label="严重" value={stats?.bySeverity?.CRITICAL ?? 0} icon={ShieldAlert} color="#dc2626" />
      </div>

      {/* Violation list */}
      {violationsQuery.isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : violations.length > 0 ? (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">风控事件列表</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => violationsQuery.refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" /> 刷新
            </Button>
          </CardHeader>
          <CardContent>
            <ViolationAlert violations={violations as any} />
          </CardContent>
        </Card>
      ) : (
        <Card className="flex items-center justify-center h-48 text-muted-foreground">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无风控事件</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 4: 任务队列
// ═══════════════════════════════════════════════════════════
function TabQueue() {
  const [dialogTask, setDialogTask] = useState<any>(null);

  const statsQuery = trpc.aiTask.stats.useQuery();
  const listQuery = trpc.aiTask.list.useQuery({ taskType: "HR_CAPABILITY_PARSING", limit: 50 });

  const stats = statsQuery.data || { pending: 0, processing: 0, completed: 0, failed: 0 };
  const tasks = listQuery.data || [];

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="待处理" value={stats.pending} icon={Clock} color="#6b7280" />
        <StatCard label="处理中" value={stats.processing} icon={Loader2} color="#3b82f6" />
        <StatCard label="已完成" value={stats.completed} icon={CheckCircle} color="#16a34a" />
        <StatCard label="失败" value={stats.failed} icon={XCircle} color="#dc2626" />
      </div>

      {/* Task list */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">HR能力解析任务列表</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { statsQuery.refetch(); listQuery.refetch(); }}>
            <RefreshCw className="h-3 w-3 mr-1" /> 刷新
          </Button>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">暂无任务</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-1.5 font-medium">ID</th>
                    <th className="py-1.5 font-medium">状态</th>
                    <th className="py-1.5 font-medium">创建人</th>
                    <th className="py-1.5 font-medium">创建时间</th>
                    <th className="py-1.5 font-medium">完成时间</th>
                    <th className="py-1.5 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task: any) => (
                    <tr key={task.id} className="border-b last:border-0">
                      <td className="py-1.5">#{task.id}</td>
                      <td className="py-1.5"><StatusBadge status={task.status} /></td>
                      <td className="py-1.5">{task.createdBy || "-"}</td>
                      <td className="py-1.5 text-xs">{task.createdAt ? new Date(task.createdAt).toLocaleString() : "-"}</td>
                      <td className="py-1.5 text-xs">{task.completedAt ? new Date(task.completedAt).toLocaleString() : "-"}</td>
                      <td className="py-1.5">
                        {task.status === "completed" && (
                          <Button variant="ghost" size="sm" onClick={() => setDialogTask(task)}>
                            <Eye className="h-3 w-3 mr-1" /> 查看
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result dialog */}
      <Dialog open={!!dialogTask} onOpenChange={() => setDialogTask(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>任务 #{dialogTask?.id} 解析结果</DialogTitle>
          </DialogHeader>
          {dialogTask?.resultData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={dialogTask.resultData.source === "llm" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                  {dialogTask.resultData.source === "llm" ? "LLM分析" : "算法估算"}
                </Badge>
                <span className="text-sm">
                  综合: {dialogTask.resultData.overallScore} · {dialogTask.resultData.overallGrade}
                </span>
              </div>
              {dialogTask.resultData.parsedScores && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {PILLAR_CODES.map(code => (
                    <div key={code} className="flex items-center gap-1">
                      <span className="font-medium">{code}:</span>
                      <span>{dialogTask.resultData.parsedScores[code]}</span>
                    </div>
                  ))}
                </div>
              )}
              {dialogTask.resultData.developmentPath && (
                <div className="text-xs bg-muted p-2 rounded">{dialogTask.resultData.developmentPath}</div>
              )}
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
                {JSON.stringify(dialogTask.resultData, null, 2)}
              </pre>
            </div>
          )}
          {dialogTask?.errorMessage && (
            <div className="text-sm text-red-600">{dialogTask.errorMessage}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
