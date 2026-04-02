/**
 * EquipmentLifecycleHub — 设备全生命周期档案中心
 *
 * 统一入口：按客户→设备→查阅全部资料
 * 制造过程 | 调试检测 | BOM | 性能要求 | 验收记录 | 维修历史 | 备品备件
 * 对接 GRTS 3.0: PDM + BOM + FAT + M7-M9 + 售后
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Server, Factory, Wrench, FileText, CheckCircle2, Package,
  ClipboardList, Settings, Activity, Shield, ChevronRight,
  Cpu, Gauge, BookOpen, Camera, Search, ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

// ── Demo Equipment by Customer ──
const EQUIPMENT_DATA = [
  {
    customer: "伊洛美克动力总成有限公司", contact: "鲁珊杉",
    devices: [{
      code: "GRT-USC-08-2026-001", model: "USC-08", name: "8工位超声清洗线",
      sn: "SNUSC08-20253847", health: 96, hours: 2850,
      manufacturing: {
        projectCode: "PRJ-2025-ILM-001", startDate: "2025-03-15", completionDate: "2025-07-10",
        phases: [
          { m: "M0", name: "立项", status: "done", date: "2025-03-15" },
          { m: "M1", name: "概念设计", status: "done", date: "2025-03-28" },
          { m: "M2", name: "详细设计", status: "done", date: "2025-04-20" },
          { m: "M3", name: "物料采购", status: "done", date: "2025-05-05" },
          { m: "M4", name: "组装制造", status: "done", date: "2025-06-01" },
          { m: "M5", name: "内部调试", status: "done", date: "2025-06-15" },
          { m: "M6", name: "FAT验收", status: "done", date: "2025-06-28" },
          { m: "M7", name: "发运安装", status: "done", date: "2025-07-10" },
          { m: "M8", name: "现场调试", status: "done", date: "2025-07-18" },
          { m: "M9", name: "SAT验收", status: "done", date: "2025-07-25" },
          { m: "M10", name: "培训移交", status: "done", date: "2025-08-01" },
          { m: "M11", name: "质保服务", status: "active", date: "2025-08-01" },
          { m: "M12", name: "终验结项", status: "pending", date: "2027-07-25" },
        ],
      },
      testing: [
        { name: "超声波功率检测", result: "28kHz/3kW 合格", date: "2025-06-15", engineer: "李大鹏" },
        { name: "清洁度颗粒度检测", result: "ISO 16232 A级 ≤35μm", date: "2025-06-20", engineer: "金晓锋" },
        { name: "泄漏测试", result: "0.02MPa/30min 无泄漏", date: "2025-06-18", engineer: "杜显文" },
        { name: "温控精度测试", result: "±1.5°C (标准±2°C)", date: "2025-06-19", engineer: "李大鹏" },
        { name: "节拍测试", result: "实测58s (目标60s)", date: "2025-06-22", engineer: "吕雪冬" },
        { name: "安全连锁测试", result: "急停/光栅/门锁 全部通过", date: "2025-06-25", engineer: "杜显文" },
      ],
      bom: [
        { cat: "结构件", count: 45, weight: "2,800kg", status: "完整" },
        { cat: "电气件", count: 128, weight: "380kg", status: "完整" },
        { cat: "超声波", count: 24, weight: "85kg", status: "完整" },
        { cat: "管路阀门", count: 67, weight: "220kg", status: "完整" },
        { cat: "传感器", count: 18, weight: "12kg", status: "完整" },
        { cat: "标准件", count: 350, weight: "150kg", status: "完整" },
      ],
      specs: {
        cleanliness: "ISO 16232 Class A, ≤50μm",
        throughput: "60s/cycle, 50件/小时",
        workpiece: "≤600×400×300mm, ≤25kg",
        cleaning: "碳氢清洗+超声波+高压喷淋+真空干燥",
        automation: "全自动 PLC+HMI, MES集成",
      },
      acceptance: [
        { type: "FAT", date: "2025-06-28", result: "通过", participants: "鲁珊杉, 金晓锋, 李大鹏", items: 42, passed: 42 },
        { type: "SAT", date: "2025-07-25", result: "通过", participants: "鲁珊杉, 匡凯旋, 杜显文", items: 38, passed: 37, notes: "1项整改已完成" },
      ],
      repairs: [
        { code: "REP-001", date: "2026-02-15", fault: "干燥效果不佳，工件表面水渍", executor: "匡凯旋(远程)", downtime: 2.5, status: "已修复", parts: "喷嘴×2" },
        { code: "REP-002", date: "2026-03-10", fault: "3号工位超声功率偏低", executor: "李大鹏(现场)", downtime: 4.0, status: "已修复", parts: "换能器×1" },
      ],
    }],
  },
  {
    customer: "重庆美利信科技股份有限公司", contact: "项目经理",
    devices: [
      { code: "GRT-KLT-4200-2026-002", model: "KLT-4200", name: "双工位高洁净清洗机", sn: "SNKLT4200-20254521", health: 94, hours: 3200,
        manufacturing: { projectCode: "PRJ-2025-MLX-001", startDate: "2025-01-10", completionDate: "2025-05-20", phases: [] },
        testing: [{ name: "清洁度检测", result: "≤40μm 合格", date: "2025-05-10", engineer: "金晓锋" }],
        bom: [{ cat: "总计", count: 480, weight: "3,200kg", status: "完整" }],
        specs: { cleanliness: "ISO 16232 A", throughput: "60s/cycle" },
        acceptance: [{ type: "FAT+SAT", date: "2025-05-20", result: "通过", participants: "金晓锋", items: 45, passed: 45 }],
        repairs: [],
      },
      { code: "GRT-TSL-8000-2026-003", model: "TSL-8000", name: "多槽浸没超声系统", sn: "SNTSL8000-20266130", health: 93, hours: 1800,
        manufacturing: { projectCode: "PRJ-2025-MLX-002", startDate: "2025-06-01", completionDate: "2025-10-15", phases: [] },
        testing: [{ name: "三频超声测试", result: "28/40/68kHz 全通过", date: "2025-10-01", engineer: "李大鹏" }],
        bom: [{ cat: "总计", count: 520, weight: "4,100kg", status: "完整" }],
        specs: { cleanliness: "≤50μm", throughput: "90s/cycle" },
        acceptance: [{ type: "FAT+SAT", date: "2025-10-15", result: "通过", participants: "金晓锋, 匡凯旋", items: 50, passed: 50 }],
        repairs: [{ code: "REP-003", date: "2026-01-20", fault: "2号槽加热管故障", executor: "匡凯旋(远程)", downtime: 3.0, status: "已修复", parts: "加热管×1" }],
      },
    ],
  },
];

export default function EquipmentLifecycleHub() {
  const { language } = useLanguage();
  const z = language === "zh";
  const [selectedCustomer, setSelectedCustomer] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState(0);
  const [activeTab, setActiveTab] = useState("mfg");

  const customer = EQUIPMENT_DATA[selectedCustomer];
  const device = customer?.devices[selectedDevice];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <Server className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{z ? "设备全生命周期档案" : "Equipment Lifecycle Hub"}</h1>
          <p className="text-sm text-muted-foreground">{z ? "制造过程 · 调试检测 · BOM · 验收 · 维修 — GRTS 3.0 全链路" : "Manufacturing · Testing · BOM · Acceptance · Service — Full Chain"}</p>
        </div>
      </div>

      {/* Customer + Device Selector */}
      <div className="flex gap-3 flex-wrap">
        {EQUIPMENT_DATA.map((c, ci) => (
          <button key={ci} onClick={() => { setSelectedCustomer(ci); setSelectedDevice(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${ci === selectedCustomer ? "bg-teal-600 text-white" : "bg-white border border-[#edebe9] text-[#605e5c] hover:border-teal-300"}`}>
            {c.customer.length > 10 ? c.customer.substring(0, 10) + "..." : c.customer}
            <span className="ml-1.5 opacity-70">({c.devices.length}{z ? "台" : "dev"})</span>
          </button>
        ))}
      </div>

      {customer && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {customer.devices.map((d, di) => (
            <button key={di} onClick={() => setSelectedDevice(di)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs transition-all ${di === selectedDevice ? "bg-white border-2 border-teal-500 shadow-md" : "bg-white border border-[#edebe9] hover:border-teal-200"}`}>
              <div className="font-semibold">{d.model}</div>
              <div className="text-[10px] text-muted-foreground">{d.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${d.health >= 95 ? "bg-green-500" : "bg-amber-500"}`} />
                <span className="text-[10px] font-mono">{d.health}%</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {device && (
        <>
          {/* Device Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-3 text-center"><div className="text-lg font-bold text-teal-600">{device.health}%</div><div className="text-[10px] text-muted-foreground">{z ? "健康分" : "Health"}</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-lg font-bold">{device.hours}</div><div className="text-[10px] text-muted-foreground">{z ? "运行小时" : "Hours"}</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-lg font-bold text-green-600">{device.acceptance.length}</div><div className="text-[10px] text-muted-foreground">{z ? "验收记录" : "Acceptance"}</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-lg font-bold text-amber-600">{device.repairs.length}</div><div className="text-[10px] text-muted-foreground">{z ? "维修记录" : "Repairs"}</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xs font-mono text-muted-foreground">{device.sn}</div><div className="text-[10px] text-muted-foreground">{z ? "序列号" : "S/N"}</div></CardContent></Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="mfg" className="gap-1"><Factory className="h-3 w-3" />{z ? "制造过程" : "Manufacturing"}</TabsTrigger>
              <TabsTrigger value="test" className="gap-1"><Activity className="h-3 w-3" />{z ? "调试检测" : "Testing"}</TabsTrigger>
              <TabsTrigger value="bom" className="gap-1"><Package className="h-3 w-3" />{z ? "设备BOM" : "BOM"}</TabsTrigger>
              <TabsTrigger value="specs" className="gap-1"><Gauge className="h-3 w-3" />{z ? "性能要求" : "Specs"}</TabsTrigger>
              <TabsTrigger value="accept" className="gap-1"><CheckCircle2 className="h-3 w-3" />{z ? "验收记录" : "Acceptance"}</TabsTrigger>
              <TabsTrigger value="repair" className="gap-1"><Wrench className="h-3 w-3" />{z ? "维修历史" : "Repairs"}</TabsTrigger>
            </TabsList>

            {/* Manufacturing Process (M0-M12) */}
            <TabsContent value="mfg" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{z ? "制造过程 (M0-M12)" : "Manufacturing Process"}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{device.manufacturing.projectCode}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {device.manufacturing.phases.length > 0 ? (
                    <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                      {device.manufacturing.phases.map(p => (
                        <div key={p.m} className={`text-center p-2 rounded-lg border ${p.status === "done" ? "border-green-200 bg-green-50" : p.status === "active" ? "border-blue-200 bg-blue-50" : "border-gray-200"}`}>
                          <div className={`text-xs font-bold ${p.status === "done" ? "text-green-700" : p.status === "active" ? "text-blue-700" : "text-gray-500"}`}>{p.m}</div>
                          <div className="text-[9px] text-muted-foreground">{p.name}</div>
                          <div className="text-[8px] text-muted-foreground mt-0.5">{p.date?.substring(5)}</div>
                          {p.status === "done" && <span className="text-[9px]">✅</span>}
                          {p.status === "active" && <span className="text-[9px] animate-pulse">🔄</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">{z ? "制造过程详情请查阅 GRTS 3.0 项目管理模块" : "See GRTS 3.0 Project Management"}</div>
                  )}
                  <div className="mt-3 pt-2 border-t flex gap-2">
                    <Link href="/pdm"><Button size="sm" variant="outline" className="text-xs gap-1"><Cpu className="h-3 w-3" />PDM</Button></Link>
                    <Link href="/bom-management"><Button size="sm" variant="outline" className="text-xs gap-1"><Package className="h-3 w-3" />BOM</Button></Link>
                    <Link href="/fat-coordination"><Button size="sm" variant="outline" className="text-xs gap-1"><ClipboardList className="h-3 w-3" />FAT</Button></Link>
                    <Link href="/m7-m9-delivery"><Button size="sm" variant="outline" className="text-xs gap-1"><Factory className="h-3 w-3" />{z ? "交付" : "Delivery"}</Button></Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Testing & Commissioning */}
            <TabsContent value="test" className="mt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{z ? "调试与性能检测记录" : "Testing & Commissioning"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {device.testing.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Activity className="h-4 w-4 text-teal-500" />
                          <div>
                            <div className="text-sm font-medium">{t.name}</div>
                            <div className="text-xs text-muted-foreground">{z ? "执行" : "By"}: {t.engineer} · {t.date}</div>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-[10px]">{t.result}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* BOM */}
            <TabsContent value="bom" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {z ? "设备BOM清单" : "Equipment BOM"}
                    <Link href="/bom-management"><Button size="sm" variant="outline" className="text-xs gap-1"><ExternalLink className="h-3 w-3" />{z ? "在BOM模块查看" : "Open in BOM"}</Button></Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {device.bom.map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border">
                        <span className="text-sm font-medium">{b.cat}</span>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{b.count} {z ? "项" : "items"}</span>
                          <span>{b.weight}</span>
                          <Badge className="bg-green-100 text-green-700 text-[10px]">{b.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Specs */}
            <TabsContent value="specs" className="mt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{z ? "客户性能要求与达成" : "Performance Requirements"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(device.specs).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between p-2.5 rounded-lg border">
                        <span className="text-sm font-medium capitalize">{key === "cleanliness" ? (z ? "清洁度" : "Cleanliness") : key === "throughput" ? (z ? "产能节拍" : "Throughput") : key === "workpiece" ? (z ? "工件尺寸" : "Workpiece") : key === "cleaning" ? (z ? "清洗工艺" : "Process") : key === "automation" ? (z ? "自动化" : "Automation") : key}</span>
                        <span className="text-sm text-muted-foreground">{val}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Acceptance Records */}
            <TabsContent value="accept" className="mt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{z ? "验收记录 (FAT/SAT)" : "Acceptance Records"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {device.acceptance.map((a, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-green-50 border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold">{a.type}</span>
                            <span className="text-xs text-muted-foreground">{a.date}</span>
                          </div>
                          <Badge className="bg-green-100 text-green-700">{a.result}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>{z ? "参与人" : "Participants"}: {a.participants}</div>
                          <div>{z ? "检查项" : "Items"}: {a.passed}/{a.items} {z ? "通过" : "passed"}</div>
                          {(a as any).notes && <div className="text-amber-600">{z ? "备注" : "Note"}: {(a as any).notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Repair History */}
            <TabsContent value="repair" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {z ? "维修历史记录" : "Repair History"}
                    <Link href="/after-sales-workbench"><Button size="sm" variant="outline" className="text-xs gap-1"><ExternalLink className="h-3 w-3" />{z ? "售后工作台" : "Service Hub"}</Button></Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {device.repairs.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">{z ? "暂无维修记录 — 设备运行良好" : "No repairs — Equipment running well"}</div>
                  ) : (
                    <div className="space-y-2">
                      {device.repairs.map((r, i) => (
                        <div key={i} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-amber-500" />
                              <span className="text-sm font-medium">{r.code}</span>
                              <span className="text-xs text-muted-foreground">{r.date}</span>
                            </div>
                            <Badge className={r.status === "已修复" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"} >{r.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5 ml-6">
                            <div>{z ? "故障" : "Fault"}: {r.fault}</div>
                            <div>{z ? "执行" : "By"}: {r.executor} · {z ? "停机" : "Downtime"}: {r.downtime}h</div>
                            {r.parts && <div>{z ? "备件" : "Parts"}: {r.parts}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
