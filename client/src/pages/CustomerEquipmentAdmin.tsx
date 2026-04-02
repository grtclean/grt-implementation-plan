/**
 * CustomerEquipmentAdmin — 客户设备管理总览 (CEO/CTO/Admin)
 *
 * 1. 客户总览 — 按行业分类，设备健康状态
 * 2. 客户详情 — 设备列表、PM计划、维修记录
 * 3. 全球大厅配置 — 选择是否加入全球展示
 * 4. 客户人员管理 — 用户名/密码分配
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Building2, Monitor, Users, Settings, Globe, Shield, CheckCircle2,
  AlertTriangle, Loader2, Copy, Eye, EyeOff, Heart, Wrench, Package,
} from "lucide-react";
import { useState, useEffect } from "react";

// ── Customer data (will come from DB in production) ──
const CUSTOMERS = [
  { id: 1, openId: "cust:13812345001", name: "鲁珊杉", company: "伊洛美克动力总成有限公司", industry: "powertrain", equipCount: 1, healthAvg: 96, status: "active", lobbyVisible: true,
    staff: [
      { role: "boss", name: "鲁珊杉", username: "13812345001", password: "Ilomek@2026", desc: "管理层(CEO)" },
      { role: "engineer", name: "李工程师", username: "ilomek-eng01", password: "Ilomek@eng01", desc: "清洗设备工程师" },
      { role: "operator", name: "张班长", username: "ilomek-op01", password: "USC08-2026", desc: "班组长(与设备同密码)" },
    ]},
  { id: 2, openId: "cust:13812345002", name: "美利信客户", company: "重庆美利信科技股份有限公司", industry: "die_casting_al", equipCount: 2, healthAvg: 94, status: "active", lobbyVisible: true,
    staff: [
      { role: "boss", name: "总经理", username: "13812345002", password: "Meilixin@2026", desc: "管理层" },
      { role: "engineer", name: "设备工程师", username: "mlx-eng01", password: "Mlx@eng01", desc: "设备负责人" },
    ]},
  { id: 3, openId: "cust:13812345003", name: "比亚迪客户", company: "比亚迪股份有限公司", industry: "die_casting_al", equipCount: 2, healthAvg: 97, status: "active", lobbyVisible: true,
    staff: [
      { role: "boss", name: "设备总监", username: "13812345003", password: "BYD@grt2026", desc: "管理层" },
      { role: "engineer", name: "清洗工程师", username: "byd-eng01", password: "Byd@eng01", desc: "清洗设备负责人" },
    ]},
  { id: 4, openId: "cust:13812345004", name: "CATL客户", company: "宁德时代新能源科技有限公司", industry: "energy_storage", equipCount: 1, healthAvg: 95, status: "active", lobbyVisible: false,
    staff: [
      { role: "boss", name: "设备经理", username: "13812345004", password: "CATL@grt2026", desc: "管理层" },
    ]},
  { id: 5, openId: "cust:13812345005", name: "Bosch客户", company: "Robert Bosch GmbH", industry: "fuel_injection", equipCount: 2, healthAvg: 98, status: "active", lobbyVisible: true,
    staff: [
      { role: "boss", name: "Plant Manager", username: "13812345005", password: "Bosch@grt2026", desc: "Management" },
      { role: "engineer", name: "Process Engineer", username: "bosch-eng01", password: "Bosch@eng01", desc: "Cleaning Process" },
    ]},
];

const INDUSTRY_LABELS: Record<string, { zh: string; en: string; icon: string }> = {
  fuel_injection: { zh: "燃油喷射", en: "Fuel Injection", icon: "💉" },
  die_casting_al: { zh: "铝压铸", en: "Al Die Casting", icon: "🔩" },
  powertrain: { zh: "动力总成", en: "Powertrain", icon: "🏎️" },
  energy_storage: { zh: "储能", en: "Energy Storage", icon: "🔋" },
  semiconductor: { zh: "半导体", en: "Semiconductor", icon: "💎" },
};

export default function CustomerEquipmentAdmin() {
  const { language } = useLanguage();
  const z = language === "zh";
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [lobbyConfig, setLobbyConfig] = useState<Record<number, boolean>>(
    Object.fromEntries(CUSTOMERS.map(c => [c.id, c.lobbyVisible]))
  );

  const totalEquip = CUSTOMERS.reduce((s, c) => s + c.equipCount, 0);
  const avgHealth = Math.round(CUSTOMERS.reduce((s, c) => s + c.healthAvg, 0) / CUSTOMERS.length);

  // Group by industry
  const byIndustry = CUSTOMERS.reduce((acc, c) => {
    (acc[c.industry] = acc[c.industry] || []).push(c);
    return acc;
  }, {} as Record<string, typeof CUSTOMERS>);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{z ? "客户设备管理总览" : "Customer Equipment Admin"}</h1>
          <p className="text-sm text-muted-foreground">{z ? "CEO/CTO视角 — 客户分类 · 设备健康 · 全球大厅 · 人员管理" : "CEO/CTO View — Classification · Health · Lobby · Staff"}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{CUSTOMERS.length}</div>
          <div className="text-xs text-muted-foreground">{z ? "签约客户" : "Customers"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalEquip}</div>
          <div className="text-xs text-muted-foreground">{z ? "运行设备" : "Running Equipment"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{avgHealth}%</div>
          <div className="text-xs text-muted-foreground">{z ? "平均健康" : "Avg Health"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{Object.values(lobbyConfig).filter(Boolean).length}</div>
          <div className="text-xs text-muted-foreground">{z ? "全球大厅展示" : "Lobby Display"}</div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><Monitor className="h-3.5 w-3.5" />{z ? "客户总览" : "Overview"}</TabsTrigger>
          <TabsTrigger value="lobby" className="gap-1.5"><Globe className="h-3.5 w-3.5" />{z ? "全球大厅配置" : "Lobby Config"}</TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5"><Users className="h-3.5 w-3.5" />{z ? "人员管理" : "Staff Mgmt"}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview by Industry */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {Object.entries(byIndustry).map(([ind, custs]) => {
            const indInfo = INDUSTRY_LABELS[ind] || { zh: ind, en: ind, icon: "📂" };
            return (
              <Card key={ind}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{indInfo.icon}</span>
                    {z ? indInfo.zh : indInfo.en}
                    <Badge variant="outline" className="text-[10px]">{custs.length} {z ? "客户" : "clients"}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {custs.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => { setSelectedCustomer(c.id); setActiveTab("staff"); }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                            {c.company.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{c.company}</div>
                            <div className="text-xs text-muted-foreground">{c.equipCount} {z ? "台设备" : "devices"} · {c.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={`text-lg font-bold ${c.healthAvg >= 95 ? "text-green-600" : c.healthAvg >= 85 ? "text-blue-600" : "text-amber-600"}`}>
                              {c.healthAvg}%
                            </div>
                            <div className="text-[10px] text-muted-foreground">{z ? "健康分" : "Health"}</div>
                          </div>
                          {lobbyConfig[c.id] && <Globe className="h-4 w-4 text-blue-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Tab 2: Global Lobby Config */}
        <TabsContent value="lobby" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                {z ? "全球大厅 · 客户设备展示配置" : "Global Lobby · Customer Display Config"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{z ? "选择哪些客户的设备状态展示在全球大厅主屏" : "Select which customer equipment appears on the Global Lobby Screen"}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {CUSTOMERS.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={lobbyConfig[c.id] || false}
                          onChange={e => setLobbyConfig({ ...lobbyConfig, [c.id]: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600" />
                        <span className="text-sm font-medium">{c.company}</span>
                      </label>
                      <Badge variant="outline" className="text-[10px]">{(INDUSTRY_LABELS[c.industry] || {})[z ? "zh" : "en"] || c.industry}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{c.equipCount} {z ? "台" : "dev"}</span>
                      <Heart className={`h-3.5 w-3.5 ${c.healthAvg >= 95 ? "text-green-500" : "text-amber-500"}`} />
                      <span className="text-xs font-mono">{c.healthAvg}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {z ? `${Object.values(lobbyConfig).filter(Boolean).length} / ${CUSTOMERS.length} 客户将展示在全球大厅` :
                    `${Object.values(lobbyConfig).filter(Boolean).length} / ${CUSTOMERS.length} shown in Lobby`}
                </span>
                <Button size="sm">{z ? "保存配置" : "Save Config"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Staff Management */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          {CUSTOMERS.map(c => (
            <Card key={c.id} className={selectedCustomer === c.id ? "border-blue-400" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {c.company}
                  </span>
                  <button onClick={() => setShowPasswords({ ...showPasswords, [c.id]: !showPasswords[c.id] })}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {showPasswords[c.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPasswords[c.id] ? (z ? "隐藏" : "Hide") : (z ? "显示密码" : "Show")}
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {c.staff.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          s.role === "boss" ? "bg-amber-100 text-amber-700" :
                          s.role === "engineer" ? "bg-blue-100 text-blue-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {s.role === "boss" ? "👑" : s.role === "engineer" ? "🔧" : "👷"}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-mono text-muted-foreground">{z ? "用户名" : "User"}: <span className="text-foreground">{s.username}</span></div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {z ? "密码" : "Pass"}: <span className="text-foreground">{showPasswords[c.id] ? s.password : "••••••••"}</span>
                          </div>
                        </div>
                        <button onClick={() => navigator.clipboard?.writeText(`${z ? "用户名" : "User"}: ${s.username}\n${z ? "密码" : "Pass"}: ${s.password}`)}
                          className="p-1.5 rounded hover:bg-muted"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <Users className="h-3 w-3" /> {z ? "添加人员" : "Add Staff"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
