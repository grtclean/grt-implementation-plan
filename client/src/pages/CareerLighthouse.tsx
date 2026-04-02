/**
 * 职业灯塔 (Career Lighthouse)
 *
 * GRT System 作为每个员工的导师：
 *  ① 3条发展路线 — 激进/稳健/保守 × 你的岗位 → 个人目标地图
 *  ② 我的位置     — 当前绩效·积分·能力·人格画像
 *  ③ 岗位路线图   — 职业路径 + 关键技能 + 每条路线的薪资/机会/出差
 *  ④ 导师寄语     — 每日/周/月阶段性赋能建议
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  Compass, Rocket, TrendingUp, Shield, Star, Target,
  Globe, Users, DollarSign, Plane, ChevronRight, Sparkles,
  Award, Heart, MapPin, Lightbulb, Clock, CheckCircle2,
  Zap, Crown,
} from "lucide-react";

export default function CareerLighthouse() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("routes");

  return (
    <div className="space-y-4 p-4 md:p-6 pb-20">
      <header className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3">
          <Compass className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold">{isZh ? "职业灯塔" : "Career Lighthouse"}</h1>
        <p className="text-sm text-muted-foreground">{isZh ? "GRT System 作为你的导师 — 减少方向内耗，加快成长" : "GRT System as your mentor — clarity drives growth"}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1 justify-center">
          <TabsTrigger value="routes" className="gap-1"><Globe className="w-3.5 h-3.5" />{isZh ? "3条路线" : "3 Routes"}</TabsTrigger>
          <TabsTrigger value="mymap" className="gap-1"><MapPin className="w-3.5 h-3.5" />{isZh ? "我的地图" : "My Map"}</TabsTrigger>
          <TabsTrigger value="mentor" className="gap-1"><Sparkles className="w-3.5 h-3.5" />{isZh ? "导师寄语" : "Mentor"}</TabsTrigger>
        </TabsList>

        <TabsContent value="routes"><ThreeRoutesTab /></TabsContent>
        <TabsContent value="mymap"><MyCareerMapTab /></TabsContent>
        <TabsContent value="mentor"><MentorTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══ Tab ①: 3条发展路线 ═══
function ThreeRoutesTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.careerLighthouse.scenario.getThreeScenarios.useQuery(undefined, { retry: false });
  const scenarios = (q.data as any[]) || [];
  const [selected, setSelected] = useState<string | null>(null);

  const icons = { aggressive: Rocket, steady: TrendingUp, conservative: Shield };
  const colors = { aggressive: "#dc2626", steady: "#2563eb", conservative: "#16a34a" };
  const bgColors = { aggressive: "#fee2e2", steady: "#dbeafe", conservative: "#dcfce7" };

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-center text-muted-foreground">{isZh ? "GRT 2026-2030 三条可能的发展路线，选择最适合你的" : "GRT 2026-2030: 3 growth scenarios, choose yours"}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s: any) => {
          const Icon = (icons as any)[s.id] || TrendingUp;
          const color = (colors as any)[s.id] || "#2563eb";
          const bg = (bgColors as any)[s.id] || "#dbeafe";
          const isSelected = selected === s.id;
          return (
            <button key={s.id} onClick={() => setSelected(s.id)} className="text-left touch-feedback">
              <Card className={`h-full transition-all ${isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{isZh ? s.nameZh : s.nameEn}</p>
                      <p className="text-[10px] text-muted-foreground">{isZh ? s.tagZh : s.tagEn}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">{isZh ? s.descZh : s.descEn}</p>

                  {/* 营收曲线 */}
                  <div className="flex items-end gap-1 h-12 mb-2">
                    {Object.entries(s.revenue).map(([yr, val]: any) => (
                      <div key={yr} className="flex-1 flex flex-col items-center">
                        <div className="w-full rounded-t" style={{ height: `${(val / 5) * 48}px`, backgroundColor: color + "40" }} />
                        <span className="text-[8px] text-muted-foreground">{yr.slice(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* 区域变化 */}
                  <div className="flex gap-1 text-[9px]">
                    <span style={{ color }}>🇨🇳{s.regionMix[2030]?.cn}%</span>
                    <span style={{ color }}>🇺🇸{s.regionMix[2030]?.na}%</span>
                    <span style={{ color }}>🇪🇺{s.regionMix[2030]?.eu}%</span>
                    <span className="text-muted-foreground">(2030)</span>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t">
                      <Badge className="text-[10px]" style={{ backgroundColor: bg, color }}>{isZh ? "已选择此路线" : "Selected"}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {selected && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-sm font-semibold">{isZh ? "你选择了自己的方向" : "You've chosen your path"}</p>
            <p className="text-xs text-muted-foreground mt-1">{isZh ? "这不是承诺，而是内心的罗盘。随时可以调整。" : "This isn't a commitment — it's your compass. Adjust anytime."}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══ Tab ②: 我的职业地图 ═══
function MyCareerMapTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.careerLighthouse.scenario.getMyCareerMap.useQuery(undefined, { retry: false });
  const data = q.data as any;

  if (!data) return <p className="text-center text-muted-foreground py-8">{isZh ? "加载中..." : "Loading..."}</p>;

  const { employee, currentState, roleModel, scenarios } = data;

  return (
    <div className="mt-4 space-y-4">
      {/* 当前状态 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold">{employee.name || (isZh ? "我" : "Me")}</p>
              <p className="text-xs text-muted-foreground">{roleModel.titleZh} · {employee.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded bg-blue-50 dark:bg-blue-950/20">
              <p className="text-lg font-bold text-blue-600">{currentState.perfScore}</p>
              <p className="text-[10px] text-muted-foreground">{isZh ? "绩效分" : "Perf"}</p>
            </div>
            <div className="text-center p-2 rounded bg-purple-50 dark:bg-purple-950/20">
              <p className="text-lg font-bold text-purple-600">{currentState.points}</p>
              <p className="text-[10px] text-muted-foreground">{isZh ? "积分" : "Points"}</p>
            </div>
            <div className="text-center p-2 rounded bg-amber-50 dark:bg-amber-950/20">
              <p className="text-lg font-bold text-amber-600">{currentState.personaTier || "—"}</p>
              <p className="text-[10px] text-muted-foreground">{isZh ? "人格" : "Persona"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 职业路径 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isZh ? "职业路径" : "Career Path"}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm font-mono mb-2">{isZh ? roleModel.pathZh : roleModel.pathEn}</p>
          <div className="flex flex-wrap gap-1">
            {roleModel.keySkills.map((s: string, i: number) => (
              <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3条路线对你的影响 */}
      <h3 className="text-sm font-semibold">{isZh ? "3条路线对你的影响" : "Impact on You"}</h3>
      {scenarios.map((s: any) => (
        <Card key={s.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{isZh ? s.nameZh : s.nameEn}</span>
              <Badge variant="outline" className="text-[10px]">{isZh ? "适配度" : "Fit"} {s.fitnessScore}%</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <DollarSign className="w-3 h-3 inline text-green-600" />
                <span className="text-muted-foreground ml-0.5">{isZh ? "薪资" : "Salary"}</span>
                <p className="font-semibold text-green-700">{s.personalImpact.salary}</p>
              </div>
              <div>
                <Zap className="w-3 h-3 inline text-blue-600" />
                <span className="text-muted-foreground ml-0.5">{isZh ? "机会" : "Opportunity"}</span>
                <p className="font-semibold text-blue-700 line-clamp-2">{s.personalImpact.opportunity}</p>
              </div>
              <div>
                <Plane className="w-3 h-3 inline text-purple-600" />
                <span className="text-muted-foreground ml-0.5">{isZh ? "出差" : "Travel"}</span>
                <p className="font-semibold text-purple-700">{s.personalImpact.travel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══ Tab ③: 导师寄语 ═══
function MentorTab() {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const isZh = language === "zh";
  const q = trpc.careerLighthouse.mentor.getDailyGuidance.useQuery(undefined, { retry: false });
  const data = q.data as any;
  const messages = (data?.messages as any[]) || [];

  const typeIcons: Record<string, typeof Sparkles> = {
    morning: Clock, midday: Target, evening: CheckCircle2,
    weekly: Rocket, monthly: Crown, growth: Lightbulb,
  };
  const typeColors: Record<string, string> = {
    morning: "#ea580c", midday: "#2563eb", evening: "#16a34a",
    weekly: "#9333ea", monthly: "#dc2626", growth: "#0891b2",
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="text-center mb-4">
        <Sparkles className="w-8 h-8 mx-auto text-amber-500 mb-2" />
        <p className="text-sm font-semibold">{isZh ? "你的导师今天说" : "Your Mentor Says"}</p>
      </div>

      {messages.map((m: any, i: number) => {
        const Icon = typeIcons[m.type] || Lightbulb;
        const color = typeColors[m.type] || "#6b7280";
        return (
          <Card key={i} className="border-l-4" style={{ borderLeftColor: color }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-xs font-semibold" style={{ color }}>{isZh ? m.titleZh : m.titleEn}</span>
              </div>
              <p className="text-sm leading-relaxed">{isZh ? m.messageZh : m.messageEn}</p>
              {m.actionPath && (
                <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => navigate(m.actionPath)}>
                  {m.actionZh || "Go"} <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {messages.length === 0 && <p className="text-center text-muted-foreground py-8">{isZh ? "加载中..." : "Loading..."}</p>}
    </div>
  );
}
