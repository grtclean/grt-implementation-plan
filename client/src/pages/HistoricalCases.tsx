/**
 * 历史案例库 + AI推荐
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Search, Sparkles, Star, Filter, Cpu,
  Beaker,
} from "lucide-react";

// Historical cases mock data
const CASES = [
  { id: "CS-001", customer: "宝马慕尼黑", industry: "汽车", equipment: "IC-2000", standard: "VDA19.1", workpiece: "缸体", material: "铝合金", cycleTime: "45s", result: "颗粒度<500μm", satisfaction: 4.9, year: 2025 },
  { id: "CS-002", customer: "博世苏州", industry: "汽车零部件", equipment: "IC-1800", standard: "ISO16232", workpiece: "喷油嘴", material: "不锈钢", cycleTime: "30s", result: "颗粒度<200μm", satisfaction: 4.8, year: 2025 },
  { id: "CS-003", customer: "采埃孚上海", industry: "传动系统", equipment: "MC888W", standard: "VDA19.1", workpiece: "齿轮箱", material: "铸铁", cycleTime: "60s", result: "颗粒度<1000μm", satisfaction: 4.6, year: 2024 },
  { id: "CS-004", customer: "英飞凌科技", industry: "半导体", equipment: "SC800W", standard: "ISO16232", workpiece: "晶圆载具", material: "特种塑料", cycleTime: "120s", result: "颗粒度<50μm", satisfaction: 4.9, year: 2025 },
  { id: "CS-005", customer: "潍柴动力", industry: "发动机", equipment: "TC2100W", standard: "VDA19.1", workpiece: "缸盖", material: "铝合金", cycleTime: "55s", result: "颗粒度<600μm", satisfaction: 4.5, year: 2024 },
  { id: "CS-006", customer: "大陆集团", industry: "汽车电子", equipment: "DC880W", standard: "ISO16232", workpiece: "传感器壳体", material: "锌合金", cycleTime: "25s", result: "颗粒度<100μm", satisfaction: 4.7, year: 2025 },
  { id: "CS-007", customer: "舍弗勒太仓", industry: "轴承", equipment: "IC-1650", standard: "VDA19.1", workpiece: "轴承套圈", material: "轴承钢", cycleTime: "40s", result: "颗粒度<300μm", satisfaction: 4.8, year: 2024 },
  { id: "CS-008", customer: "马勒上海", industry: "汽车零部件", equipment: "RW2000", standard: "VDA19.1", workpiece: "活塞", material: "铝合金", cycleTime: "35s", result: "颗粒度<400μm", satisfaction: 4.6, year: 2025 },
];

const INDUSTRIES = ["全部", "汽车", "汽车零部件", "传动系统", "半导体", "发动机", "汽车电子", "轴承"];
const MODELS = ["全部", "IC-2000", "IC-1800", "IC-1650", "SC800W", "DC880W", "MC888W", "TC2100W", "RW2000"];
const STANDARDS = ["全部", "VDA19.1", "ISO16232"];

function CaseCard({ c }: { c: typeof CASES[0] }) {
  return (
    <Card className="hover:border-primary/50 transition-all">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-muted-foreground">{c.id}</span>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium">{c.satisfaction}</span>
          </div>
        </div>
        <div>
          <p className="font-medium">{c.customer}</p>
          <p className="text-sm text-muted-foreground">{c.industry} · {c.year}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{c.equipment}</Badge>
          <Badge variant="secondary">{c.standard}</Badge>
          <Badge className="bg-blue-500/20 text-blue-400">{c.workpiece}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">材质: </span>{c.material}</div>
          <div><span className="text-muted-foreground">节拍: </span>{c.cycleTime}</div>
        </div>
        <div className="text-sm p-2 rounded bg-green-500/10 text-green-400">
          清洁度结果: {c.result}
        </div>
      </CardContent>
    </Card>
  );
}

// AI recommendation mock
interface ReqForm {
  workpiece: string;
  material: string;
  standard: string;
  cycleTime: string;
}

interface Recommendation {
  caseId: string;
  confidence: number;
  model: string;
  reason: string;
}

function getRecommendations(form: ReqForm): Recommendation[] {
  const results: Recommendation[] = [];
  for (const c of CASES) {
    let score = 0;
    if (c.material.includes(form.material) || form.material.includes(c.material)) score += 35;
    if (c.standard === form.standard) score += 25;
    if (c.workpiece.includes(form.workpiece) || form.workpiece.includes(c.workpiece)) score += 25;
    const targetCycle = parseInt(form.cycleTime) || 45;
    const caseCycle = parseInt(c.cycleTime);
    if (Math.abs(targetCycle - caseCycle) < 20) score += 15;
    if (score > 20) {
      results.push({ caseId: c.id, confidence: Math.min(score, 98), model: c.equipment, reason: `${c.customer}案例 - ${c.workpiece}清洗方案，采用${c.equipment}，清洁度${c.result}` });
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

export default function HistoricalCases() {
  const [tab, setTab] = useState("cases");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("全部");
  const [model, setModel] = useState("全部");
  const [standard, setStandard] = useState("全部");

  // AI form
  const [reqForm, setReqForm] = useState<ReqForm>({ workpiece: "", material: "", standard: "VDA19.1", cycleTime: "" });
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [searched, setSearched] = useState(false);

  const filtered = CASES.filter(c => {
    if (search && !c.customer.includes(search) && !c.workpiece.includes(search)) return false;
    if (industry !== "全部" && c.industry !== industry) return false;
    if (model !== "全部" && c.equipment !== model) return false;
    if (standard !== "全部" && c.standard !== standard) return false;
    return true;
  });

  const handleAISearch = () => {
    setRecs(getRecommendations(reqForm));
    setSearched(true);
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader icon={BookOpen} title="历史案例库" description="知识沉淀 · AI智能推荐" actions={<Badge variant="outline" className="gap-1">{CASES.length} 条案例</Badge>} />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="cases" className="gap-2"><BookOpen className="h-4 w-4" />案例库</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Sparkles className="h-4 w-4" />AI推荐</TabsTrigger>
          </TabsList>

          {/* Cases Tab */}
          <TabsContent value="cases" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="搜索客户或工件..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-1"><Filter className="h-4 w-4 text-muted-foreground" />
                    <select className="bg-background border rounded px-2 py-1.5 text-sm" value={industry} onChange={e => setIndustry(e.target.value)}>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <select className="bg-background border rounded px-2 py-1.5 text-sm" value={model} onChange={e => setModel(e.target.value)}>
                    {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className="bg-background border rounded px-2 py-1.5 text-sm" value={standard} onChange={e => setStandard(e.target.value)}>
                    {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => <CaseCard key={c.id} c={c} />)}
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <BookOpen className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>未找到匹配案例，请调整筛选条件</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />输入新客户需求</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">工件类型</label>
                    <Input placeholder="如: 缸体、齿轮..." value={reqForm.workpiece} onChange={e => setReqForm({ ...reqForm, workpiece: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">材质</label>
                    <Input placeholder="如: 铝合金、铸铁..." value={reqForm.material} onChange={e => setReqForm({ ...reqForm, material: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">清洁度标准</label>
                    <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={reqForm.standard} onChange={e => setReqForm({ ...reqForm, standard: e.target.value })}>
                      <option value="VDA19.1">VDA19.1</option>
                      <option value="ISO16232">ISO16232</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">目标节拍 (秒)</label>
                    <Input type="number" placeholder="如: 45" value={reqForm.cycleTime} onChange={e => setReqForm({ ...reqForm, cycleTime: e.target.value })} />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleAISearch}><Sparkles className="h-4 w-4 mr-2" />AI智能匹配</Button>
                </div>
              </CardContent>
            </Card>

            {searched && (
              <div className="space-y-4">
                {recs.length > 0 ? recs.map((r, i) => {
                  const c = CASES.find(x => x.id === r.caseId);
                  return (
                    <Card key={r.caseId} className={i === 0 ? "border-primary" : ""}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-primary/20 flex flex-col items-center justify-center">
                            <span className="text-xs text-muted-foreground">匹配度</span>
                            <span className="text-xl font-bold text-primary">{r.confidence}%</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={i === 0 ? "default" : "secondary"}>TOP {i + 1}</Badge>
                              <span className="font-mono text-sm">{r.caseId}</span>
                              <Badge variant="outline">{r.model}</Badge>
                              {i === 0 && <Badge className="bg-green-500/20 text-green-400 gap-1"><Sparkles className="h-3 w-3" />最佳匹配</Badge>}
                            </div>
                            <p className="text-sm mt-2">{r.reason}</p>
                            {c && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline">{c.standard}</Badge>
                                <Badge variant="outline">{c.material}</Badge>
                                <Badge variant="outline">节拍 {c.cycleTime}</Badge>
                                <Badge variant="outline" className="gap-1"><Star className="h-3 w-3 text-yellow-400" />{c.satisfaction}</Badge>
                              </div>
                            )}
                          </div>
                          <Cpu className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                }) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Beaker className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>未找到匹配案例，建议拓宽搜索条件或联系技术部门</p>
                    </CardContent>
                  </Card>
                )}
                {recs.length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">AI推荐设备型号</p>
                          <p className="text-sm text-muted-foreground">基于匹配分析，推荐使用 <span className="font-bold text-primary">{recs[0].model}</span> 型号</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
