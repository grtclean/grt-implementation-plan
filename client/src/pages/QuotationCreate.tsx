/**
 * 报价生成页面 - 多步骤报价创建向导
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Calculator, Search, ChevronRight, ChevronLeft, Users, Package,
  BarChart3, DollarSign, FileText, Sparkles, Download, Plus, Minus,
} from "lucide-react";

const CUSTOMERS = [
  { id: 1, name: "上海大众汽车", tier: "OEM", industry: "汽车", contact: "张经理" },
  { id: 2, name: "宝马慕尼黑工厂", tier: "OEM", industry: "汽车", contact: "Herr Mueller" },
  { id: 3, name: "博世苏州", tier: "Tier1", industry: "汽车零部件", contact: "李总" },
  { id: 4, name: "采埃孚上海", tier: "Tier1", industry: "传动系统", contact: "王总" },
  { id: 5, name: "潍柴动力", tier: "Tier2", industry: "发动机", contact: "赵经理" },
  { id: 6, name: "英飞凌科技", tier: "OEM", industry: "半导体", contact: "陈总" },
];

const EQUIPMENT = [
  { model: "IC-2000", name: "通过式清洗机", basePrice: 1850000 },
  { model: "IC-1800", name: "喷淋清洗机", basePrice: 1420000 },
  { model: "IC-1650", name: "超声波清洗机", basePrice: 1280000 },
  { model: "SC800W", name: "单槽清洗站", basePrice: 680000 },
  { model: "DC880W", name: "双槽清洗站", basePrice: 880000 },
  { model: "MC888W", name: "多槽清洗线", basePrice: 1560000 },
  { model: "TC2100W", name: "隧道式清洗机", basePrice: 2100000 },
  { model: "RW2000", name: "机器人清洗工作站", basePrice: 2350000 },
];

const OPTIONS = [
  { id: "opt1", name: "真空干燥系统", price: 185000 },
  { id: "opt2", name: "油水分离装置", price: 65000 },
  { id: "opt3", name: "PLC远程监控模块", price: 42000 },
  { id: "opt4", name: "CCD视觉检测", price: 128000 },
  { id: "opt5", name: "清洁度检测模块", price: 235000 },
  { id: "opt6", name: "自动上下料机械臂", price: 320000 },
];

const STRATEGIES = [
  { id: "competitive", name: "竞争定价", margin: 18, desc: "低毛利抢占市场" },
  { id: "value", name: "价值定价", margin: 28, desc: "强调技术差异化" },
  { id: "cost-plus", name: "成本加成", margin: 22, desc: "标准毛利策略" },
  { id: "penetration", name: "渗透定价", margin: 12, desc: "新客户/新市场开拓" },
];

const STEPS = ["客户选择", "设备配置", "成本分析", "定价策略", "预览与导出"];

function tierColor(tier: string) {
  if (tier === "OEM") return "bg-blue-500/20 text-blue-400";
  if (tier === "Tier1") return "bg-green-500/20 text-green-400";
  return "bg-orange-500/20 text-orange-400";
}

export default function QuotationCreate() {
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [selectedEquip, setSelectedEquip] = useState<string | null>(null);
  const [selectedOpts, setSelectedOpts] = useState<string[]>([]);
  const [strategy, setStrategy] = useState("cost-plus");
  const [discount, setDiscount] = useState(0);

  const customer = CUSTOMERS.find(c => c.id === selectedCustomer);
  const equip = EQUIPMENT.find(e => e.model === selectedEquip);
  const optsCost = OPTIONS.filter(o => selectedOpts.includes(o.id)).reduce((s, o) => s + o.price, 0);
  const baseCost = (equip?.basePrice ?? 0) + optsCost;
  const materialCost = Math.round(baseCost * 0.45);
  const laborCost = Math.round(baseCost * 0.18);
  const overhead = Math.round(baseCost * 0.08);
  const logistics = Math.round(baseCost * 0.04);
  const installation = Math.round(baseCost * 0.06);
  const training = Math.round(baseCost * 0.03);
  const warranty = Math.round(baseCost * 0.05);
  const totalCost = materialCost + laborCost + overhead + logistics + installation + training + warranty;
  const strat = STRATEGIES.find(s => s.id === strategy);
  const marginPct = strat?.margin ?? 22;
  const priceBeforeDiscount = Math.round(totalCost / (1 - marginPct / 100));
  const finalPrice = Math.round(priceBeforeDiscount * (1 - discount / 100));

  const toggleOpt = (id: string) =>
    setSelectedOpts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const fmt = (v: number) => "¥" + v.toLocaleString();

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />报价生成
            </h1>
            <p className="text-muted-foreground mt-1">多步骤智能报价向导</p>
          </div>
          <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />AI辅助定价</Badge>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <button onClick={() => setStep(i)} className={"flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full " + (i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground")}>
                <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span className="hidden md:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />

        {/* Step 1: Customer */}
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />客户选择</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索客户名称..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="grid gap-3">
                {CUSTOMERS.filter(c => !search || c.name.includes(search)).map(c => (
                  <button key={c.id} onClick={() => setSelectedCustomer(c.id)} className={"flex items-center gap-4 p-4 rounded-lg border transition-all " + (selectedCustomer === c.id ? "border-primary bg-primary/10" : "hover:bg-accent/50")}>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.industry} · {c.contact}</p>
                    </div>
                    <Badge className={tierColor(c.tier)}>{c.tier}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Equipment */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />设备选型</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {EQUIPMENT.map(e => (
                    <button key={e.model} onClick={() => setSelectedEquip(e.model)} className={"p-4 rounded-lg border text-center transition-all " + (selectedEquip === e.model ? "border-primary bg-primary/10" : "hover:bg-accent/50")}>
                      <p className="font-mono font-bold">{e.model}</p>
                      <p className="text-sm text-muted-foreground mt-1">{e.name}</p>
                      <p className="text-primary font-medium mt-2">{fmt(e.basePrice)}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>可选配置</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {OPTIONS.map(o => (
                    <button key={o.id} onClick={() => toggleOpt(o.id)} className={"flex items-center gap-3 p-3 rounded-lg border transition-all " + (selectedOpts.includes(o.id) ? "border-primary bg-primary/10" : "hover:bg-accent/50")}>
                      {selectedOpts.includes(o.id) ? <Minus className="h-4 w-4 text-red-400" /> : <Plus className="h-4 w-4 text-green-400" />}
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(o.price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-right text-lg font-bold">BOM合计: <span className="text-primary">{fmt(baseCost)}</span></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Cost */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />成本分析</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "原材料成本", value: materialCost, pct: 45 },
                  { label: "人工成本", value: laborCost, pct: 18 },
                  { label: "制造费用", value: overhead, pct: 8 },
                  { label: "物流运输", value: logistics, pct: 4 },
                  { label: "安装调试", value: installation, pct: 6 },
                  { label: "培训费用", value: training, pct: 3 },
                  { label: "质保费用", value: warranty, pct: 5 },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-4">
                    <span className="w-24 text-sm">{row.label}</span>
                    <div className="flex-1"><Progress value={row.pct * 2} className="h-3" /></div>
                    <span className="w-28 text-right font-mono text-sm">{fmt(row.value)}</span>
                    <span className="w-12 text-right text-xs text-muted-foreground">{row.pct}%</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>总成本</span><span className="text-primary">{fmt(totalCost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Pricing */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />定价策略</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {STRATEGIES.map(s => (
                    <button key={s.id} onClick={() => setStrategy(s.id)} className={"p-4 rounded-lg border text-center transition-all " + (strategy === s.id ? "border-primary bg-primary/10" : "hover:bg-accent/50")}>
                      <p className="font-bold">{s.name}</p>
                      <p className="text-2xl font-bold text-primary mt-1">{s.margin}%</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm w-20">折扣比例</span>
                    <Input type="number" min={0} max={30} value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-24" />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 gap-1"><Sparkles className="h-3 w-3" />AI建议: 基于历史数据推荐毛利率 25%，该客户历史成交折扣 5%</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-sm text-muted-foreground">成本价</p><p className="text-xl font-bold">{fmt(totalCost)}</p></div>
                  <div><p className="text-sm text-muted-foreground">标价</p><p className="text-xl font-bold">{fmt(priceBeforeDiscount)}</p></div>
                  <div><p className="text-sm text-muted-foreground">成交价</p><p className="text-2xl font-bold text-primary">{fmt(finalPrice)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Preview */}
        {step === 4 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />报价预览</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">客户</p>
                  <p className="font-medium">{customer?.name ?? "-"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">客户等级</p>
                  <Badge className={tierColor(customer?.tier ?? "")}>{customer?.tier ?? "-"}</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">设备型号</p>
                  <p className="font-mono font-bold">{equip?.model ?? "-"} {equip?.name ?? ""}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">选配模块</p>
                  <div className="flex flex-wrap gap-1">{selectedOpts.length > 0 ? OPTIONS.filter(o => selectedOpts.includes(o.id)).map(o => <Badge key={o.id} variant="secondary">{o.name}</Badge>) : <span className="text-muted-foreground">无</span>}</div>
                </div>
              </div>
              <div className="border-t pt-4 grid grid-cols-4 gap-4 text-center">
                <div><p className="text-xs text-muted-foreground">总成本</p><p className="font-bold">{fmt(totalCost)}</p></div>
                <div><p className="text-xs text-muted-foreground">毛利率</p><p className="font-bold">{marginPct}%</p></div>
                <div><p className="text-xs text-muted-foreground">折扣</p><p className="font-bold">{discount}%</p></div>
                <div><p className="text-xs text-muted-foreground">最终报价</p><p className="text-xl font-bold text-primary">{fmt(finalPrice)}</p></div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => alert("PDF报价单已生成（模拟）")}><Download className="h-4 w-4 mr-2" />生成PDF</Button>
                <Button onClick={() => alert("报价单已提交审批（模拟）")}>提交审批</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nav */}
        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />上一步
          </Button>
          <Button disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>
            下一步<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
