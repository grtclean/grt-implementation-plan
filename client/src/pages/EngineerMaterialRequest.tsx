/**
 * 工程师物料需求单 — BOM→采购需求自动生成
 * 机械/电气工程师: 从BOM选物料 → 填写需求 → 自动生成PR → 采购接收
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Wrench, Zap, Package, ShoppingCart, Search, Plus, Send, CheckCircle,
  Clock, AlertTriangle, FileText, ArrowRight, Box, Layers, Filter, ListChecks
} from "lucide-react";

// BOM data reflecting TianSi import
const BOM_PRODUCTS = [
  { code: "FG-00001", name: "GRT-S3超声波清洗机", version: "2.0", items: 12, status: "active" },
  { code: "FG-00002", name: "GRT-H2高压喷淋机", version: "1.1", items: 10, status: "active" },
  { code: "FG-00003", name: "GRT-V1真空干燥机", version: "3.0", items: 8, status: "active" },
  { code: "FG-00004", name: "GRT-C5链式清洗线", version: "2.1", items: 15, status: "active" },
  { code: "FG-00005", name: "GRT-R3滚筒清洗机", version: "1.0", items: 11, status: "active" },
];

const BOM_ITEMS = [
  { bomCode: "FG-00001", code: "WP-00001", name: "齿轮轴毛坯", spec: "Φ45x300 硬度HRC45-50", type: "半成品", qty: 2, unit: "件", stock: 15, minStock: 10, supplier: "无锡精密铸造", leadTime: 15, price: 850 },
  { bomCode: "FG-00001", code: "EL-00001", name: "三相异步电机7.5kW", spec: "IP55 B3", type: "电气", qty: 1, unit: "台", stock: 3, minStock: 5, supplier: "西门子电机", leadTime: 21, price: 3500 },
  { bomCode: "FG-00001", code: "RM-00001", name: "45#钢棒", spec: "Φ25x1000 公差H7", type: "原材料", qty: 4, unit: "根", stock: 85, minStock: 50, supplier: "上海宝钢特钢", leadTime: 7, price: 28.5 },
  { bomCode: "FG-00001", code: "ST-00007", name: "深沟球轴承6205", spec: "25x52x15", type: "标准件", qty: 8, unit: "个", stock: 120, minStock: 100, supplier: "NSK轴承中国", leadTime: 5, price: 45 },
  { bomCode: "FG-00001", code: "EL-00005", name: "接触器CJX2-32", spec: "32A AC3", type: "电气", qty: 3, unit: "个", stock: 8, minStock: 20, supplier: "施耐德电气", leadTime: 3, price: 120 },
  { bomCode: "FG-00001", code: "AX-00001", name: "清洗剂SC-100", spec: "20L/桶 pH12", type: "辅料", qty: 5, unit: "桶", stock: 12, minStock: 50, supplier: "陶氏化学品", leadTime: 10, price: 35 },
  { bomCode: "FG-00001", code: "RM-00005", name: "304不锈钢板", spec: "200x400x8", type: "原材料", qty: 6, unit: "张", stock: 45, minStock: 30, supplier: "上海宝钢特钢", leadTime: 10, price: 180 },
  { bomCode: "FG-00001", code: "ST-00009", name: "骨架油封30x50x10", spec: "NBR TC", type: "标准件", qty: 4, unit: "个", stock: 25, minStock: 50, supplier: "巴氏密封科技", leadTime: 5, price: 8.5 },
  { bomCode: "FG-00001", code: "WP-00002", name: "清洗篮框架", spec: "600x400x200 SUS304", type: "半成品", qty: 1, unit: "套", stock: 5, minStock: 3, supplier: "苏州精工外协", leadTime: 20, price: 2200 },
  { bomCode: "FG-00001", code: "EL-00002", name: "变频器VFD-15kW", spec: "380V 3Phase", type: "电气", qty: 1, unit: "台", stock: 2, minStock: 3, supplier: "深圳汇川伺服", leadTime: 14, price: 4800 },
  { bomCode: "FG-00001", code: "ST-00001", name: "M8x30内六角螺栓", spec: "8.8级镀锌", type: "标准件", qty: 24, unit: "个", stock: 150, minStock: 500, supplier: "晋亿实业紧固件", leadTime: 3, price: 0.85 },
  { bomCode: "FG-00001", code: "RM-00003", name: "碳钢法兰", spec: "DN100 PN16", type: "原材料", qty: 2, unit: "件", stock: 18, minStock: 10, supplier: "温州超达阀门", leadTime: 7, price: 65 },
];

const MY_REQUESTS = [
  { id: "EMR-2026-001", date: "2026-03-25", product: "GRT-S3超声波清洗机", items: 5, totalAmount: 12500, status: "approved", prId: "PR-2026-008" },
  { id: "EMR-2026-002", date: "2026-03-27", product: "GRT-H2高压喷淋机", items: 3, totalAmount: 8200, status: "submitted", prId: null },
  { id: "EMR-2026-003", date: "2026-03-29", product: "GRT-C5链式清洗线", items: 8, totalAmount: 45000, status: "draft", prId: null },
];

export default function EngineerMaterialRequest() {
  const { language } = useLanguage();
  const { currentUserRole: name } = useUserProfile();
  const [activeTab, setActiveTab] = useState("create");
  const [selectedBom, setSelectedBom] = useState("FG-00001");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [notes, setNotes] = useState("");

  const bomItems = BOM_ITEMS.filter(i => i.bomCode === selectedBom);
  const filteredItems = bomItems.filter(i => !searchTerm || `${i.code} ${i.name} ${i.spec}`.toLowerCase().includes(searchTerm.toLowerCase()));

  const shortageItems = bomItems.filter(i => i.stock < i.minStock);

  const selectedTotal = useMemo(() => {
    let total = 0;
    selectedItems.forEach(code => {
      const item = bomItems.find(i => i.code === code);
      if (item) total += (quantities[code] || item.qty) * item.price;
    });
    return total;
  }, [selectedItems, quantities, bomItems]);

  const toggleItem = (code: string) => {
    const next = new Set(selectedItems);
    if (next.has(code)) next.delete(code); else next.add(code);
    setSelectedItems(next);
  };

  const selectShortage = () => {
    const next = new Set(selectedItems);
    shortageItems.forEach(i => next.add(i.code));
    setSelectedItems(next);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-7 w-7 text-teal-600" />
            {language === "zh" ? "工程师物料需求单" : "Engineer Material Request"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === "zh" ? "从BOM选料 → 自动检库存 → 生成采购需求 → 发送采购部" : "BOM → Check Stock → Generate PR → Send to Procurement"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> {language === "zh" ? "新建需求单" : "New Request"}</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {language === "zh" ? "我的需求单" : "My Requests"}</TabsTrigger>
          <TabsTrigger value="shortage" className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {language === "zh" ? "缺料预警" : "Shortage Alert"} {shortageItems.length > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{shortageItems.length}</Badge>}</TabsTrigger>
        </TabsList>

        {/* Create New Request */}
        <TabsContent value="create" className="mt-4 space-y-4">
          {/* BOM Selector */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">{language === "zh" ? "选择产品BOM" : "Select Product BOM"}</label>
              <Select value={selectedBom} onValueChange={v => { setSelectedBom(v); setSelectedItems(new Set()); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOM_PRODUCTS.map(p => (
                    <SelectItem key={p.code} value={p.code}>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground ml-2">v{p.version} · {p.items} {language === "zh" ? "项" : "items"}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium">{language === "zh" ? "项目编号" : "Project Code"}</label>
              <Input placeholder="PRJ-2026-xxx" value={projectCode} onChange={e => setProjectCode(e.target.value)} className="mt-1" />
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === "zh" ? "搜索物料..." : "Search material..."} className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={selectShortage} className="h-9">
              <AlertTriangle className="h-3.5 w-3.5 mr-1 text-red-500" /> {language === "zh" ? "选缺料项" : "Select Shortage"}
            </Button>
          </div>

          {/* BOM Items Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>{language === "zh" ? "物料编码" : "Code"}</TableHead>
                  <TableHead>{language === "zh" ? "物料名称" : "Material"}</TableHead>
                  <TableHead>{language === "zh" ? "规格" : "Spec"}</TableHead>
                  <TableHead>{language === "zh" ? "类型" : "Type"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "BOM用量" : "BOM Qty"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "需求数量" : "Request Qty"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "当前库存" : "Stock"}</TableHead>
                  <TableHead>{language === "zh" ? "供应商" : "Supplier"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "交期(天)" : "Lead"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "单价" : "Price"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => {
                  const isShortage = item.stock < item.minStock;
                  const isSelected = selectedItems.has(item.code);
                  return (
                    <TableRow key={item.code} className={isShortage ? "bg-red-50" : isSelected ? "bg-teal-50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleItem(item.code)} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{item.spec}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {item.type === "电气" && <Zap className="h-2.5 w-2.5 mr-0.5 inline" />}
                          {item.type === "原材料" && <Box className="h-2.5 w-2.5 mr-0.5 inline" />}
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">
                        {isSelected ? (
                          <Input
                            type="number"
                            className="w-16 h-7 text-right text-sm"
                            value={quantities[item.code] ?? item.qty}
                            onChange={e => setQuantities({ ...quantities, [item.code]: parseInt(e.target.value) || 0 })}
                          />
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={isShortage ? "text-red-600 font-bold" : ""}>{item.stock}</span>
                        <span className="text-muted-foreground text-xs">/{item.minStock}</span>
                      </TableCell>
                      <TableCell className="text-sm">{item.supplier}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.leadTime > 14 ? "destructive" : item.leadTime > 7 ? "outline" : "secondary"} className="text-[10px]">{item.leadTime}d</Badge>
                      </TableCell>
                      <TableCell className="text-right">¥{item.price.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Submit Bar */}
          {selectedItems.size > 0 && (
            <Card className="border-2 border-teal-300 bg-teal-50/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ListChecks className="h-5 w-5 text-teal-600" />
                  <span className="font-medium">{language === "zh" ? `已选 ${selectedItems.size} 项物料` : `${selectedItems.size} items selected`}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="font-bold text-teal-700">¥{selectedTotal.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Textarea placeholder={language === "zh" ? "需求说明(可选)..." : "Notes..."} className="w-64 h-9 resize-none bg-white" value={notes} onChange={e => setNotes(e.target.value)} />
                  <Button variant="outline" onClick={() => setSelectedItems(new Set())}>{language === "zh" ? "清空" : "Clear"}</Button>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    <Send className="h-4 w-4 mr-1" /> {language === "zh" ? "提交采购需求" : "Submit PR"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Requests */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "需求单号" : "Request ID"}</TableHead>
                  <TableHead>{language === "zh" ? "日期" : "Date"}</TableHead>
                  <TableHead>{language === "zh" ? "产品" : "Product"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "物料项" : "Items"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "预估金额" : "Amount"}</TableHead>
                  <TableHead>{language === "zh" ? "状态" : "Status"}</TableHead>
                  <TableHead>{language === "zh" ? "采购单号" : "PR ID"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MY_REQUESTS.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.id}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="font-medium">{r.product}</TableCell>
                    <TableCell className="text-right">{r.items}</TableCell>
                    <TableCell className="text-right font-medium">¥{r.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "submitted" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}>
                        {r.status === "approved" ? "已批准" : r.status === "submitted" ? "审批中" : "草稿"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.prId || <span className="text-muted-foreground">-</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Shortage Alert */}
        <TabsContent value="shortage" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> {language === "zh" ? "BOM物料缺料预警" : "BOM Material Shortage Alert"}</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "物料" : "Material"}</TableHead>
                  <TableHead>{language === "zh" ? "当前库存" : "Stock"}</TableHead>
                  <TableHead>{language === "zh" ? "安全库存" : "Min Stock"}</TableHead>
                  <TableHead>{language === "zh" ? "缺口" : "Gap"}</TableHead>
                  <TableHead>{language === "zh" ? "供应商" : "Supplier"}</TableHead>
                  <TableHead>{language === "zh" ? "交期" : "Lead Time"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortageItems.map(item => (
                  <TableRow key={item.code} className="bg-red-50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.code} · {item.spec}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-red-600 font-bold">{item.stock}</TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell className="font-bold text-red-700">-{item.minStock - item.stock}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell><Badge variant="outline">{item.leadTime}{language === "zh" ? "天" : "d"}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" className="h-7 text-xs" onClick={() => { toggleItem(item.code); setActiveTab("create"); }}>
                        <ShoppingCart className="h-3 w-3 mr-1" /> {language === "zh" ? "加入需求" : "Add to PR"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {shortageItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                      {language === "zh" ? "所有BOM物料库存充足" : "All BOM materials in stock"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
