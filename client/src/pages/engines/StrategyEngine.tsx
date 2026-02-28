/**
 * Strategy Engine — GRT 卓越文化与战略罗盘
 *
 * Excellence Culture Model dashboard with 6-pillar visualization,
 * RBAC-gated CSV upload, and AI alignment analysis.
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Target,
  Upload,
  Sparkles,
  Users,
  Lightbulb,
  Award,
  Handshake,
  Zap,
  Shield,
  TrendingUp,
  ChevronRight,
  FileSpreadsheet,
  Brain,
  BarChart3,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Star,
  Heart,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Users, Lightbulb, Award, Handshake, Zap, Shield, Heart, Star, Target,
};

function PillarIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICON_MAP[name] || Target;
  return <Icon className={className} style={style} />;
}

// ---------------------------------------------------------------------------
// Radar Chart (SVG)
// ---------------------------------------------------------------------------

function RadarChart({ data, size = 240 }: { data: Array<{ name: string; score: number; target: number; color: string }>; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 30;
  const n = data.length;
  if (n < 3) return null;

  const angleStep = (2 * Math.PI) / n;

  function polarToCart(angle: number, radius: number) {
    return {
      x: cx + radius * Math.cos(angle - Math.PI / 2),
      y: cy + radius * Math.sin(angle - Math.PI / 2),
    };
  }

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];
  const gridLines = rings.map((pct) => {
    const points = Array.from({ length: n }, (_, i) => {
      const p = polarToCart(i * angleStep, r * pct);
      return `${p.x},${p.y}`;
    }).join(" ");
    return <polygon key={pct} points={points} fill="none" stroke="currentColor" className="text-border" strokeWidth={0.5} />;
  });

  // Axis lines
  const axes = Array.from({ length: n }, (_, i) => {
    const p = polarToCart(i * angleStep, r);
    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" className="text-border" strokeWidth={0.5} />;
  });

  // Target polygon
  const targetPoints = data.map((d, i) => {
    const p = polarToCart(i * angleStep, r * (d.target / 100));
    return `${p.x},${p.y}`;
  }).join(" ");

  // Score polygon
  const scorePoints = data.map((d, i) => {
    const p = polarToCart(i * angleStep, r * (d.score / 100));
    return `${p.x},${p.y}`;
  }).join(" ");

  // Labels
  const labels = data.map((d, i) => {
    const p = polarToCart(i * angleStep, r + 18);
    return (
      <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
        className="fill-foreground text-[10px] font-medium">{d.name.substring(0, 4)}</text>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLines}
      {axes}
      <polygon points={targetPoints} fill="rgba(100,100,100,0.1)" stroke="rgba(150,150,150,0.5)" strokeWidth={1} strokeDasharray="4 2" />
      <polygon points={scorePoints} fill="rgba(79,107,237,0.2)" stroke="#4F6BED" strokeWidth={2} />
      {data.map((d, i) => {
        const p = polarToCart(i * angleStep, r * (d.score / 100));
        return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={d.color} stroke="white" strokeWidth={1.5} />;
      })}
      {labels}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StrategyEngine() {
  const { currentUserRole } = useUserProfile();
  const roleLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;
  const canUpload = roleLevel >= 5; // director+ or admin

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC
  const utils = trpc.useUtils();
  const modelQuery = trpc.excellenceCulture.getModel.useQuery();
  const uploadMutation = trpc.excellenceCulture.uploadCsv.useMutation({
    onSuccess: (data) => {
      utils.excellenceCulture.getModel.invalidate();
      toast.success(`Excellence Model updated — ${data.pillarCount} pillars loaded`);
    },
    onError: (err) => toast.error(err.message),
  });
  const analyzeMutation = trpc.excellenceCulture.analyzeAlignment.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      setShowAnalysis(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const model = modelQuery.data as any;
  const pillars: any[] = model?.pillars ?? [];
  const overallScore = pillars.length > 0
    ? Math.round(pillars.reduce((s: number, p: any) => s + p.score, 0) / pillars.length)
    : 0;

  // CSV upload handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      uploadMutation.mutate({ csvContent: text, userRole: currentUserRole });
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* ─── Header ─── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">GRT Excellence Culture Model</h1>
                <p className="text-sm text-muted-foreground">GRT 卓越文化与战略罗盘 — Enterprise Capability Matrix & Strategic Compass</p>
              </div>
            </div>
            {model && (
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="outline" className="gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {pillars.length} Pillars
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Overall: {overallScore}/100
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  v{model.version} · Updated by {model.updatedBy}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canUpload && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Update Culture Model (CSV)
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleCsvUpload}
                />
              </>
            )}
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              onClick={() => analyzeMutation.mutate({ employeeName: "当前用户", userRole: currentUserRole })}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI 对齐分析
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* ─── Main Content ─── */}
      <div className="flex-1 p-6 space-y-6">
        {modelQuery.isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-5 w-28 mb-2" /><Skeleton className="h-3 w-full mb-2" /><Skeleton className="h-2 w-full" /></CardContent></Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Radar Chart + Summary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Radar Chart Card */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-500" />
                    战略罗盘 · Strategic Compass
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <RadarChart
                    data={pillars.map((p: any) => ({ name: p.name, score: p.score, target: p.targetScore, color: p.color }))}
                    size={260}
                  />
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-indigo-500 rounded" /> Current
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-muted-foreground/30 rounded border border-dashed" /> Target
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Score Summary Cards */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    维度得分概览 · Pillar Score Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {pillars.map((p: any) => {
                      const pct = Math.round((p.score / p.targetScore) * 100);
                      return (
                        <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: p.color + "20" }}>
                              <PillarIcon name={p.icon} className="w-3.5 h-3.5" style={{ color: p.color } as any} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{p.nameEn}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold" style={{ color: p.color }}>{p.score}</span>
                            <span className="text-muted-foreground">/ {p.targetScore}</span>
                          </div>
                          <Progress value={pct > 100 ? 100 : pct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pillar Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pillars.map((p: any) => (
                <Card key={p.id} className="overflow-hidden">
                  <div className="h-1" style={{ backgroundColor: p.color }} />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + "15" }}>
                          <PillarIcon name={p.icon} className="w-4.5 h-4.5" style={{ color: p.color } as any} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{p.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{p.nameEn}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: p.color }}>{p.score}</p>
                        <p className="text-[10px] text-muted-foreground">Target: {p.targetScore}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2.5">
                      {(p.behaviors || []).map((b: any) => (
                        <div key={b.id} className="flex items-start gap-2">
                          <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{b.name}</p>
                              <Badge variant="secondary" className="text-[10px] ml-2 flex-shrink-0">
                                {b.weight}%
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── AI Analysis Modal ─── */}
      {showAnalysis && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAnalysis(false)}>
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold">AI 对齐分析报告</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAnalysis(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              {/* Overall */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4"
                  style={{ borderColor: analysisResult.overallScore >= 80 ? "#107C10" : analysisResult.overallScore >= 70 ? "#D83B01" : "#A80000" }}>
                  {analysisResult.overallGrade}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{analysisResult.employeeName} · 综合对齐度</p>
                  <p className="text-2xl font-bold">{analysisResult.overallScore}<span className="text-sm font-normal text-muted-foreground"> / 100</span></p>
                  <p className="text-xs text-muted-foreground mt-1">AI Model: {analysisResult.aiModel}</p>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-muted-foreground leading-relaxed">{analysisResult.summary}</p>

              {/* Per-pillar */}
              <div className="space-y-3">
                {(analysisResult.analysis || []).map((a: any) => (
                  <div key={a.pillarId} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <div className="flex-shrink-0 mt-0.5">
                      {a.gap <= 10 ? (
                        <CheckCircle className="w-4.5 h-4.5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{a.pillarName}</p>
                        <span className="text-sm font-bold">{a.alignmentScore}<span className="text-xs font-normal text-muted-foreground">/{a.targetScore}</span></span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.recommendation}</p>
                      {a.strengths.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {a.strengths.map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Generated at {new Date(analysisResult.generatedAt).toLocaleString("zh-CN")} · Results are AI-generated for reference only
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
