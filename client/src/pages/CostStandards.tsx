/**
 * 成本标准与产品配置页面
 * 人工成本、制造费用、物料加价、产品配置
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign, Users, Factory, Package, Settings, Plus, Pencil,
  Calculator, Percent, Link2, Save,
} from "lucide-react";

// ── Mock Data ──
const LABOR_RATES = [
  { id: 1, role: "高级工程师", roleEn: "Senior Engineer", hourlyRate: 350, dailyRate: 2800, overtimeMultiplier: 1.5, effectiveFrom: "2026-01-01", isActive: true },
  { id: 2, role: "工程师", roleEn: "Engineer", hourlyRate: 250, dailyRate: 2000, overtimeMultiplier: 1.5, effectiveFrom: "2026-01-01", isActive: true },
  { id: 3, role: "技术员", roleEn: "Technician", hourlyRate: 180, dailyRate: 1440, overtimeMultiplier: 1.5, effectiveFrom: "2026-01-01", isActive: true },
  { id: 4, role: "项目经理", roleEn: "Project Manager", hourlyRate: 400, dailyRate: 3200, overtimeMultiplier: 1.5, effectiveFrom: "2026-01-01", isActive: true },
  { id: 5, role: "质检员", roleEn: "QC Inspector", hourlyRate: 200, dailyRate: 1600, overtimeMultiplier: 1.5, effectiveFrom: "2026-01-01", isActive: true },
  { id: 6, role: "装配工", roleEn: "Assembler", hourlyRate: 150, dailyRate: 1200, overtimeMultiplier: 2.0, effectiveFrom: "2026-01-01", isActive: true },
];

const OVERHEAD_CATEGORIES = [
  { id: 1, category: "厂房租赁", allocation: "按工时分摊", monthlyAmount: 180000, allocationBase: "direct_labor_hours", rate: 45, unit: "元/工时" },
  { id: 2, category: "水电气", allocation: "按产量分摊", monthlyAmount: 85000, allocationBase: "production_units", rate: 120, unit: "元/台" },
  { id: 3, category: "设备折旧", allocation: "按工时分摊", monthlyAmount: 250000, allocationBase: "machine_hours", rate: 80, unit: "元/机时" },
  { id: 4, category: "质量管理费", allocation: "按项目分摊", monthlyAmount: 60000, allocationBase: "project_count", rate: 5000, unit: "元/项目" },
  { id: 5, category: "安全环保", allocation: "按面积分摊", monthlyAmount: 35000, allocationBase: "floor_area", rate: 15, unit: "元/m2" },
];

const MATERIAL_MARKUPS = [
  { id: 1, category: "钢材类", markupPercent: 8, minMarkup: 500, applyTo: "all", notes: "含运输、仓储" },
  { id: 2, category: "电气元件", markupPercent: 12, minMarkup: 200, applyTo: "imported", notes: "含关税、质检" },
  { id: 3, category: "泵阀类", markupPercent: 10, minMarkup: 300, applyTo: "all", notes: "含安装调试" },
  { id: 4, category: "传感器", markupPercent: 15, minMarkup: 100, applyTo: "imported", notes: "含校准" },
  { id: 5, category: "标准件", markupPercent: 5, minMarkup: 50, applyTo: "domestic", notes: "批量采购折扣" },
];

const PRODUCT_CONFIGS = [
  { id: 1, model: "GRT-CL-3000", name: "缸体清洗线", bomCode: "BOM-2026-001", basePrice: 1850000, materialCost: 820000, laborCost: 350000, overheadCost: 280000, margin: 21.6 },
  { id: 2, model: "GRT-UT-2000", name: "超声波清洗机", bomCode: "BOM-2026-005", basePrice: 680000, materialCost: 310000, laborCost: 120000, overheadCost: 95000, margin: 22.8 },
  { id: 3, model: "GRT-SP-5000", name: "喷淋清洗系统", bomCode: "BOM-2026-008", basePrice: 2200000, materialCost: 980000, laborCost: 420000, overheadCost: 350000, margin: 20.5 },
  { id: 4, model: "GRT-VD-1500", name: "真空干燥机", bomCode: "BOM-2026-012", basePrice: 520000, materialCost: 240000, laborCost: 95000, overheadCost: 72000, margin: 21.7 },
];

function LaborCostTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">按角色设置标准工时费率，适用于项目成本核算</p>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />添加角色</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground">
            <th className="p-2">角色</th><th className="p-2">英文名</th><th className="p-2 text-right">时薪(元)</th><th className="p-2 text-right">日薪(元)</th><th className="p-2 text-right">加班倍率</th><th className="p-2">生效日期</th><th className="p-2">状态</th><th className="p-2">操作</th>
          </tr></thead>
          <tbody>{LABOR_RATES.map(lr => (
            <tr key={lr.id} className="border-b hover:bg-accent/30">
              <td className="p-2 font-medium">{lr.role}</td>
              <td className="p-2 text-muted-foreground">{lr.roleEn}</td>
              <td className="p-2 text-right font-mono">{lr.hourlyRate}</td>
              <td className="p-2 text-right font-mono">{lr.dailyRate}</td>
              <td className="p-2 text-right">{lr.overtimeMultiplier}x</td>
              <td className="p-2 text-muted-foreground">{lr.effectiveFrom}</td>
              <td className="p-2"><Badge className={lr.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{lr.isActive ? "生效" : "停用"}</Badge></td>
              <td className="p-2"><Button variant="ghost" size="icon"><Pencil className="h-3.5 w-3.5" /></Button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function OverheadTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">制造费用按不同分摊基准分配到项目/产品</p>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />添加费用类别</Button>
      </div>
      <div className="grid gap-4">
        {OVERHEAD_CATEGORIES.map(oc => (
          <Card key={oc.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{oc.category}</p>
                  <p className="text-sm text-muted-foreground mt-1">分摊方式: {oc.allocation}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold">{(oc.monthlyAmount / 10000).toFixed(1)}万/月</p>
                  <p className="text-sm text-muted-foreground">费率: {oc.rate} {oc.unit}</p>
                </div>
                <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MaterialMarkupTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">按物料类别设置加价规则，覆盖运输、仓储、关税等附加成本</p>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />添加规则</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground">
            <th className="p-2">物料类别</th><th className="p-2 text-right">加价比例</th><th className="p-2 text-right">最低加价(元)</th><th className="p-2">适用范围</th><th className="p-2">备注</th><th className="p-2">操作</th>
          </tr></thead>
          <tbody>{MATERIAL_MARKUPS.map(mm => (
            <tr key={mm.id} className="border-b hover:bg-accent/30">
              <td className="p-2 font-medium">{mm.category}</td>
              <td className="p-2 text-right font-mono"><span className="flex items-center justify-end gap-1"><Percent className="h-3 w-3" />{mm.markupPercent}</span></td>
              <td className="p-2 text-right font-mono">{mm.minMarkup}</td>
              <td className="p-2"><Badge variant="outline">{mm.applyTo === "all" ? "所有" : mm.applyTo === "imported" ? "进口" : "国产"}</Badge></td>
              <td className="p-2 text-muted-foreground">{mm.notes}</td>
              <td className="p-2"><Button variant="ghost" size="icon"><Pencil className="h-3.5 w-3.5" /></Button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function ProductConfigTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">设备型号与标准BOM关联，自动计算基准成本与毛利</p>
        <Dialog><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />新增产品配置</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>新增产品配置</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><label className="text-sm font-medium">设备型号</label><Input placeholder="GRT-XX-XXXX" /></div>
              <div><label className="text-sm font-medium">产品名称</label><Input placeholder="产品名称..." /></div>
              <div><label className="text-sm font-medium">关联BOM</label><Select><SelectTrigger><SelectValue placeholder="选择标准BOM" /></SelectTrigger><SelectContent><SelectItem value="BOM-2026-001">BOM-2026-001 缸体清洗线</SelectItem><SelectItem value="BOM-2026-005">BOM-2026-005 超声波清洗机</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">基准价格(元)</label><Input type="number" placeholder="0" /></div>
              <Button className="w-full"><Save className="h-4 w-4 mr-1" />保存配置</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4">
        {PRODUCT_CONFIGS.map(pc => (
          <Card key={pc.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{pc.model}</span>
                    <Badge variant="outline" className="flex items-center gap-1"><Link2 className="h-3 w-3" />{pc.bomCode}</Badge>
                  </div>
                  <p className="font-medium mt-1">{pc.name}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>物料: {(pc.materialCost / 10000).toFixed(1)}万</span>
                    <span>人工: {(pc.laborCost / 10000).toFixed(1)}万</span>
                    <span>制造费用: {(pc.overheadCost / 10000).toFixed(1)}万</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{(pc.basePrice / 10000).toFixed(1)}万</p>
                  <Badge className={pc.margin >= 22 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>毛利 {pc.margin}%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function CostStandards() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Calculator} title="成本标准与产品配置" description="人工费率、制造费用、物料加价规则及产品基准成本管理" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="人工角色" value={LABOR_RATES.length} />
          <StatCard icon={Factory} label="费用类别" value={OVERHEAD_CATEGORIES.length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Package} label="加价规则" value={MATERIAL_MARKUPS.length} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
          <StatCard icon={Settings} label="产品配置" value={PRODUCT_CONFIGS.length} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        </div>
        <Tabs defaultValue="labor">
          <TabsList><TabsTrigger value="labor">人工成本</TabsTrigger><TabsTrigger value="overhead">制造费用</TabsTrigger><TabsTrigger value="markup">物料加价</TabsTrigger><TabsTrigger value="products">产品配置</TabsTrigger></TabsList>
          <TabsContent value="labor"><LaborCostTab /></TabsContent>
          <TabsContent value="overhead"><OverheadTab /></TabsContent>
          <TabsContent value="markup"><MaterialMarkupTab /></TabsContent>
          <TabsContent value="products"><ProductConfigTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
