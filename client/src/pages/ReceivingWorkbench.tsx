/**
 * 收货质检工作台 — 仓库收货员专用
 * 流程: 扫码/选PO → 数量确认 → IQC质检 → 入库上架 → 异常处理
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Package, QrCode, ClipboardCheck, Warehouse, CheckCircle, XCircle,
  AlertTriangle, Search, Truck, Eye, Camera, ScanLine, ArrowRight,
  ThermometerSun, Ruler, FileText, MapPin, Clock
} from "lucide-react";

const PENDING_DELIVERIES = [
  { id: "DL-001", po: "PO-2025-00023", supplier: "施耐德电气", material: "接触器CJX2-32", code: "EL-00005", spec: "32A/AC3", ordered: 50, received: 30, thisDelivery: 20, eta: "2026-04-05", warehouse: "WH-04", location: "D-02-03", trackingNo: "SF1234567890", status: "arrived" },
  { id: "DL-002", po: "PO-2025-00012", supplier: "NSK轴承中国", material: "深沟球轴承6205", code: "ST-00007", spec: "25x52x15", ordered: 100, received: 0, thisDelivery: 100, eta: "2026-04-10", warehouse: "WH-01", location: "A-05-02", trackingNo: "ZTO9876543210", status: "in_transit" },
  { id: "DL-003", po: "PO-2025-00067", supplier: "陶氏化学品", material: "清洗剂SC-100", code: "AX-00001", spec: "20L/桶 pH12", ordered: 500, received: 0, thisDelivery: 200, eta: "2026-04-08", warehouse: "WH-05", location: "E-01-01", trackingNo: "YD1122334455", status: "arrived" },
  { id: "DL-004", po: "PO-2025-00001", supplier: "上海宝钢特钢", material: "45#钢棒Φ25x1000", code: "RM-00001", spec: "Φ25x1000 公差H7", ordered: 200, received: 0, thisDelivery: 200, eta: "2026-04-15", warehouse: "WH-01", location: "A-01-01", trackingNo: "", status: "confirmed" },
];

const IQC_QUEUE = [
  { id: "IQC-001", delivery: "DL-001", material: "接触器CJX2-32", supplier: "施耐德电气", qty: 20, sampleSize: 5, inspector: "金晓锋", items: ["外观检查", "尺寸测量", "功能测试", "绝缘电阻"], status: "inspecting", passRate: 100 },
  { id: "IQC-002", delivery: "DL-003", material: "清洗剂SC-100", supplier: "陶氏化学品", qty: 200, sampleSize: 3, inspector: "金晓锋", items: ["pH值测试", "浓度检测", "包装完整性", "保质期确认"], status: "pending", passRate: 0 },
];

const RECENT_RECEIPTS = [
  { id: "GRN-2026-0045", date: "2026-03-28", supplier: "米思米标准件", material: "M10x40六角螺栓", qty: 2000, iqcResult: "PASS", warehouse: "WH-04", putaway: true },
  { id: "GRN-2026-0044", date: "2026-03-27", supplier: "上海沪工焊材", material: "不锈钢焊丝ER308L", qty: 100, iqcResult: "PASS", warehouse: "WH-01", putaway: true },
  { id: "GRN-2026-0043", date: "2026-03-26", supplier: "无锡精密铸造", material: "齿轮轴毛坯", qty: 30, iqcResult: "CONDITIONAL", warehouse: "WH-02", putaway: true },
  { id: "GRN-2026-0042", date: "2026-03-25", supplier: "佛山日丰管材", material: "不锈钢管316L DN80", qty: 50, iqcResult: "FAIL", warehouse: "WH-08", putaway: false },
];

const DELIVERY_STATUS: Record<string, { label: string; color: string }> = {
  in_transit: { label: "在途", color: "bg-blue-100 text-blue-700" },
  arrived: { label: "已到货", color: "bg-green-100 text-green-700" },
  confirmed: { label: "已确认", color: "bg-yellow-100 text-yellow-700" },
  inspecting: { label: "质检中", color: "bg-purple-100 text-purple-700" },
  completed: { label: "已入库", color: "bg-emerald-100 text-emerald-700" },
};

const IQC_RESULT_COLOR: Record<string, string> = {
  PASS: "bg-green-100 text-green-700",
  CONDITIONAL: "bg-yellow-100 text-yellow-700",
  FAIL: "bg-red-100 text-red-700",
};

export default function ReceivingWorkbench() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("pending");
  const [scanInput, setScanInput] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState("");
  const [iqcNotes, setIqcNotes] = useState("");

  const handleScan = () => {
    const found = PENDING_DELIVERIES.find(d => d.trackingNo === scanInput || d.po === scanInput || d.code === scanInput);
    if (found) setSelectedDelivery(found.id);
    setScanInput("");
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-7 w-7 text-indigo-600" />
            {language === "zh" ? "收货质检工作台" : "Receiving & QC Workbench"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === "zh" ? "扫码收货 → IQC质检 → 入库上架 → 异常处理" : "Scan → IQC Inspect → Put Away → Exception Handling"}
          </p>
        </div>
      </div>

      {/* Scan Bar */}
      <Card className="border-2 border-dashed border-indigo-200 bg-indigo-50/30">
        <CardContent className="p-4">
          <div className="flex gap-3 items-center">
            <ScanLine className="h-6 w-6 text-indigo-600" />
            <Input
              placeholder={language === "zh" ? "扫描物流单号 / PO编号 / 物料编码..." : "Scan tracking# / PO# / material code..."}
              className="flex-1 text-lg h-12 bg-white"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScan()}
            />
            <Button size="lg" onClick={handleScan} className="h-12 px-6">
              <QrCode className="h-5 w-5 mr-2" /> {language === "zh" ? "扫码" : "Scan"}
            </Button>
            <Button size="lg" variant="outline" className="h-12">
              <Camera className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: language === "zh" ? "待收货" : "Pending", value: PENDING_DELIVERIES.filter(d => d.status === "arrived").length, icon: Truck, color: "text-orange-600" },
          { label: language === "zh" ? "质检中" : "Inspecting", value: IQC_QUEUE.filter(q => q.status === "inspecting").length, icon: ClipboardCheck, color: "text-purple-600" },
          { label: language === "zh" ? "今日入库" : "Today Putaway", value: 3, icon: Package, color: "text-green-600" },
          { label: language === "zh" ? "IQC合格率" : "IQC Pass Rate", value: "96%", icon: CheckCircle, color: "text-blue-600" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-60`} />
              <div>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {language === "zh" ? "待收货" : "Pending"} <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{PENDING_DELIVERIES.length}</Badge></TabsTrigger>
          <TabsTrigger value="iqc" className="flex items-center gap-1"><ClipboardCheck className="h-3.5 w-3.5" /> {language === "zh" ? "IQC质检" : "IQC"}</TabsTrigger>
          <TabsTrigger value="putaway" className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {language === "zh" ? "入库上架" : "Put Away"}</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {language === "zh" ? "收货记录" : "History"}</TabsTrigger>
        </TabsList>

        {/* Pending Deliveries */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "送货单" : "Delivery"}</TableHead>
                  <TableHead>PO#</TableHead>
                  <TableHead>{language === "zh" ? "供应商" : "Supplier"}</TableHead>
                  <TableHead>{language === "zh" ? "物料" : "Material"}</TableHead>
                  <TableHead>{language === "zh" ? "规格" : "Spec"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "本次送货" : "This Delivery"}</TableHead>
                  <TableHead>{language === "zh" ? "目标仓位" : "Target Loc"}</TableHead>
                  <TableHead>{language === "zh" ? "状态" : "Status"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PENDING_DELIVERIES.map(d => (
                  <TableRow key={d.id} className={selectedDelivery === d.id ? "bg-indigo-50 ring-1 ring-indigo-300" : ""}>
                    <TableCell className="font-mono text-sm">{d.id}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{d.po}</TableCell>
                    <TableCell className="font-medium">{d.supplier}</TableCell>
                    <TableCell>{d.material}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.spec}</TableCell>
                    <TableCell className="text-right font-bold text-lg">{d.thisDelivery}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{d.warehouse}/{d.location}</Badge></TableCell>
                    <TableCell><Badge className={DELIVERY_STATUS[d.status]?.color || ""}>{DELIVERY_STATUS[d.status]?.label || d.status}</Badge></TableCell>
                    <TableCell>
                      {d.status === "arrived" && (
                        <Button size="sm" className="h-8" onClick={() => setSelectedDelivery(d.id)}>
                          <Package className="h-3.5 w-3.5 mr-1" /> {language === "zh" ? "确认收货" : "Receive"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Quick Receive Panel */}
          {selectedDelivery && (() => {
            const d = PENDING_DELIVERIES.find(x => x.id === selectedDelivery);
            if (!d) return null;
            return (
              <Card className="mt-4 border-2 border-indigo-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-600" />
                    {language === "zh" ? `确认收货 — ${d.material}` : `Confirm Receipt — ${d.material}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">{language === "zh" ? "实收数量" : "Actual Qty"}</label>
                    <Input type="number" placeholder={String(d.thisDelivery)} value={receiveQty} onChange={e => setReceiveQty(e.target.value)} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">{language === "zh" ? `送货数量: ${d.thisDelivery}` : `Delivered: ${d.thisDelivery}`}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{language === "zh" ? "入库仓位" : "Put-away Location"}</label>
                    <Input value={`${d.warehouse}/${d.location}`} readOnly className="mt-1 bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{language === "zh" ? "备注" : "Notes"}</label>
                    <Input placeholder={language === "zh" ? "包装完好，无损坏" : "Good condition"} className="mt-1" />
                  </div>
                  <div className="col-span-3 flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setSelectedDelivery(null)}>{language === "zh" ? "取消" : "Cancel"}</Button>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" /> {language === "zh" ? "确认收货并送检" : "Receive & Send to IQC"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        {/* IQC */}
        <TabsContent value="iqc" className="mt-4 space-y-4">
          {IQC_QUEUE.map(iqc => (
            <Card key={iqc.id} className={iqc.status === "inspecting" ? "border-purple-300" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{iqc.id} — {iqc.material}</CardTitle>
                  <Badge className={iqc.status === "inspecting" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}>
                    {iqc.status === "inspecting" ? "检验中" : "待检"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{iqc.supplier} · 送检 {iqc.qty} · 抽样 {iqc.sampleSize} · 检验员: {iqc.inspector}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {iqc.items.map(item => (
                    <div key={item} className="flex items-center gap-2 p-2 border rounded-md">
                      <Select defaultValue="pending">
                        <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pass"><span className="text-green-600">PASS</span></SelectItem>
                          <SelectItem value="fail"><span className="text-red-600">FAIL</span></SelectItem>
                          <SelectItem value="pending"><span className="text-gray-400">待检</span></SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Textarea placeholder={language === "zh" ? "质检备注..." : "Inspection notes..."} rows={2} value={iqcNotes} onChange={e => setIqcNotes(e.target.value)} />
                <div className="flex gap-2 justify-end">
                  <Button variant="destructive" size="sm"><XCircle className="h-3.5 w-3.5 mr-1" /> {language === "zh" ? "判定不合格" : "Reject"}</Button>
                  <Button variant="outline" size="sm"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> {language === "zh" ? "让步接收" : "Conditional"}</Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-3.5 w-3.5 mr-1" /> {language === "zh" ? "判定合格" : "Pass"}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Put Away */}
        <TabsContent value="putaway" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> {language === "zh" ? "待上架物料" : "Pending Put-away"}</CardTitle></CardHeader>
            <CardContent className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{language === "zh" ? "当前无待上架物料" : "No items pending put-away"}</p>
              <p className="text-sm">{language === "zh" ? "质检通过后自动进入上架队列" : "Items enter queue after IQC pass"}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN#</TableHead>
                  <TableHead>{language === "zh" ? "日期" : "Date"}</TableHead>
                  <TableHead>{language === "zh" ? "供应商" : "Supplier"}</TableHead>
                  <TableHead>{language === "zh" ? "物料" : "Material"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "数量" : "Qty"}</TableHead>
                  <TableHead>IQC</TableHead>
                  <TableHead>{language === "zh" ? "仓库" : "Warehouse"}</TableHead>
                  <TableHead>{language === "zh" ? "上架" : "Put Away"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_RECEIPTS.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.id}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.supplier}</TableCell>
                    <TableCell>{r.material}</TableCell>
                    <TableCell className="text-right">{r.qty}</TableCell>
                    <TableCell><Badge className={IQC_RESULT_COLOR[r.iqcResult] || ""}>{r.iqcResult}</Badge></TableCell>
                    <TableCell>{r.warehouse}</TableCell>
                    <TableCell>{r.putaway ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-orange-500" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
