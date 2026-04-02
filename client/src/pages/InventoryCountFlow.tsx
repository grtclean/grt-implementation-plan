/**
 * 物料盘点简化流程 (Inventory Count Flow)
 *
 * Step-by-step 引导式盘点：
 *  Step 1: 选择仓库 & 盘点类型
 *  Step 2: 录入实盘数量（支持扫码/手输）
 *  Step 3: 差异分析 & 原因填写
 *  Step 4: 提交复核
 *
 * 触控优化：大按钮、大输入框、高对比差异色
 */

import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCheck, Warehouse, ScanLine, BarChart3,
  Send, ChevronRight, ChevronLeft, CheckCircle2,
  AlertTriangle, Package, Search, Plus, Minus,
} from "lucide-react";

interface CountItem {
  materialCode: string;
  materialName: string;
  bookQty: number;
  actualQty: number | null;
  unit: string;
  location: string;
  varianceReason: string;
}

const STEPS = [
  { key: "select", labelZh: "选择仓库", labelEn: "Select Warehouse", icon: Warehouse },
  { key: "count", labelZh: "录入实盘", labelEn: "Physical Count", icon: ScanLine },
  { key: "variance", labelZh: "差异分析", labelEn: "Variance", icon: BarChart3 },
  { key: "submit", labelZh: "提交复核", labelEn: "Submit", icon: Send },
];

const COUNT_TYPES = [
  { value: "cycle", labelZh: "循环盘点", labelEn: "Cycle Count" },
  { value: "full", labelZh: "全面盘点", labelEn: "Full Count" },
  { value: "spot", labelZh: "抽样盘点", labelEn: "Spot Check" },
  { value: "project_close", labelZh: "项目结案", labelEn: "Project Close" },
  { value: "year_end", labelZh: "年终盘点", labelEn: "Year End" },
];

export default function InventoryCountFlow() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const [step, setStep] = useState(0);

  // Step 1 state
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [countType, setCountType] = useState("cycle");

  // Step 2 state — 盘点条目
  const [items, setItems] = useState<CountItem[]>([
    { materialCode: "", materialName: "", bookQty: 0, actualQty: null, unit: "个", location: "", varianceReason: "" },
  ]);
  const [scanInput, setScanInput] = useState("");

  // Step 3/4
  const [notes, setNotes] = useState("");

  // 仓库列表
  const warehouseQ = trpc.warehouse.getWarehouses.useQuery({}, { retry: false });
  const warehouses = (warehouseQ.data as any[]) || [];

  // 提交盘点单
  const createCountMut = trpc.financeWorkflow.inventoryCount.create.useMutation({
    onSuccess: () => {
      toast({ title: isZh ? "盘点单已提交" : "Count submitted", description: isZh ? "等待财务复核" : "Awaiting finance review" });
      setStep(3);
    },
    onError: (err) => toast({ title: isZh ? "提交失败" : "Submit failed", description: err.message, variant: "destructive" }),
  });

  const canGoNext = (): boolean => {
    if (step === 0) return !!selectedWarehouse;
    if (step === 1) return items.some((it) => it.actualQty !== null && it.materialCode);
    if (step === 2) return true;
    return false;
  };

  const addItem = () => {
    setItems([...items, { materialCode: "", materialName: "", bookQty: 0, actualQty: null, unit: "个", location: "", varianceReason: "" }]);
  };

  const updateItem = (index: number, field: keyof CountItem, value: any) => {
    const next = [...items];
    (next[index] as any)[field] = value;
    setItems(next);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // 差异计算
  const getVariance = (book: number, actual: number | null) => {
    if (actual === null) return { diff: 0, pct: 0, status: "pending" as const };
    const diff = actual - book;
    const pct = book > 0 ? ((diff / book) * 100) : 0;
    return {
      diff,
      pct,
      status: diff === 0 ? ("match" as const) : diff > 0 ? ("surplus" as const) : ("shortage" as const),
    };
  };

  const countedItems = items.filter((it) => it.actualQty !== null && it.materialCode);
  const variances = countedItems.map((it) => getVariance(it.bookQty, it.actualQty));
  const shortages = variances.filter((v) => v.status === "shortage").length;
  const surpluses = variances.filter((v) => v.status === "surplus").length;
  const matches = variances.filter((v) => v.status === "match").length;

  const handleSubmit = () => {
    createCountMut.mutate({
      warehouseId: selectedWarehouse,
      countType,
      notes: notes || undefined,
      items: countedItems.map((it) => ({
        materialCode: it.materialCode,
        materialName: it.materialName,
        bookQuantity: it.bookQty,
        actualQuantity: it.actualQty!,
        unit: it.unit,
        location: it.location,
        varianceReason: it.varianceReason || undefined,
      })),
    } as any);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24">
      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" :
                  isDone ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isZh ? s.labelZh : s.labelEn}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {/* Step 0: 选择仓库 */}
      {step === 0 && (
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-lg font-bold">{isZh ? "选择仓库和盘点类型" : "Select Warehouse & Count Type"}</h2>

          <div>
            <label className="text-sm font-medium mb-2 block">{isZh ? "仓库" : "Warehouse"}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {warehouses.map((wh: any) => (
                <button
                  key={wh.id}
                  onClick={() => setSelectedWarehouse(wh.id?.toString() || wh.warehouseCode)}
                  className={`p-4 rounded-lg border text-left transition-colors touch-feedback ${
                    selectedWarehouse === (wh.id?.toString() || wh.warehouseCode)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-sm">{wh.warehouseName || wh.name}</p>
                      <p className="text-xs text-muted-foreground">{wh.warehouseCode || wh.code} · {wh.warehouseType || wh.type || "—"}</p>
                    </div>
                  </div>
                </button>
              ))}
              {warehouses.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 sm:col-span-2 text-center">{isZh ? "暂无仓库数据" : "No warehouses"}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{isZh ? "盘点类型" : "Count Type"}</label>
            <div className="flex flex-wrap gap-2">
              {COUNT_TYPES.map((ct) => (
                <Button key={ct.value} size="sm" variant={countType === ct.value ? "default" : "outline"} onClick={() => setCountType(ct.value)}>
                  {isZh ? ct.labelZh : ct.labelEn}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: 录入实盘 */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{isZh ? "录入实盘数量" : "Enter Physical Count"}</h2>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3.5 h-3.5 mr-1" />{isZh ? "添加行" : "Add Row"}</Button>
          </div>

          {/* 扫码输入 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 h-12 text-base sf-text"
                placeholder={isZh ? "扫码或输入物料编号..." : "Scan or type material code..."}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scanInput) {
                    const empty = items.findIndex((it) => !it.materialCode);
                    if (empty >= 0) {
                      updateItem(empty, "materialCode", scanInput);
                    } else {
                      setItems([...items, { materialCode: scanInput, materialName: "", bookQty: 0, actualQty: null, unit: "个", location: "", varianceReason: "" }]);
                    }
                    setScanInput("");
                  }
                }}
              />
            </div>
          </div>

          {/* 盘点条目列表 */}
          <div className="space-y-2">
            {items.map((item, i) => (
              <Card key={i} className="border">
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                    <div className="md:col-span-2">
                      <label className="text-[10px] text-muted-foreground">{isZh ? "物料编号" : "Code"}</label>
                      <Input className="h-10" value={item.materialCode} onChange={(e) => updateItem(i, "materialCode", e.target.value)} placeholder="GRT-MAT-001" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">{isZh ? "账面数量" : "Book Qty"}</label>
                      <Input className="h-10 font-mono" type="number" value={item.bookQty} onChange={(e) => updateItem(i, "bookQty", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold text-primary">{isZh ? "实盘数量" : "Actual"}</label>
                      <Input
                        className="h-10 font-mono font-bold border-primary/50 text-base"
                        type="number"
                        value={item.actualQty ?? ""}
                        onChange={(e) => updateItem(i, "actualQty", e.target.value ? Number(e.target.value) : null)}
                        placeholder="—"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">{isZh ? "库位" : "Location"}</label>
                      <Input className="h-10" value={item.location} onChange={(e) => updateItem(i, "location", e.target.value)} placeholder="A-01-03" />
                    </div>
                    <div className="flex items-end">
                      {item.actualQty !== null && (
                        <VarianceBadge book={item.bookQty} actual={item.actualQty} isZh={isZh} />
                      )}
                      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => removeItem(i)} disabled={items.length <= 1}>
                        <Minus className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 差异分析 */}
      {step === 2 && (
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-lg font-bold">{isZh ? "差异分析" : "Variance Analysis"}</h2>

          {/* 摘要 */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-xs text-muted-foreground">{isZh ? "账实相符" : "Match"}</p>
                <p className="text-xl font-bold text-green-700">{matches}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="w-5 h-5 mx-auto text-red-600 mb-1" />
                <p className="text-xs text-muted-foreground">{isZh ? "盘亏" : "Shortage"}</p>
                <p className="text-xl font-bold text-red-700">{shortages}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-3 text-center">
                <Package className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                <p className="text-xs text-muted-foreground">{isZh ? "盘盈" : "Surplus"}</p>
                <p className="text-xl font-bold text-amber-700">{surpluses}</p>
              </CardContent>
            </Card>
          </div>

          {/* 差异明细（仅显示有差异的） */}
          {countedItems.filter((_, i) => variances[i]?.status !== "match").map((item, idx) => {
            const v = getVariance(item.bookQty, item.actualQty);
            const origIdx = items.indexOf(item);
            return (
              <Card key={idx} className={v.status === "shortage" ? "border-red-200" : "border-amber-200"}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm">{item.materialCode}</span>
                    <VarianceBadge book={item.bookQty} actual={item.actualQty!} isZh={isZh} />
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                    <span>{isZh ? "账面" : "Book"}: {item.bookQty}</span>
                    <span>{isZh ? "实盘" : "Actual"}: {item.actualQty}</span>
                    <span className={v.diff < 0 ? "text-red-600 font-bold" : "text-amber-600 font-bold"}>
                      {isZh ? "差异" : "Diff"}: {v.diff > 0 ? "+" : ""}{v.diff} ({v.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">{isZh ? "差异原因" : "Reason"}</label>
                    <Input
                      className="h-9 text-sm"
                      value={item.varianceReason}
                      onChange={(e) => updateItem(origIdx, "varianceReason", e.target.value)}
                      placeholder={isZh ? "如: 发料未登记 / 计量误差 / 自然损耗" : "e.g. Unrecorded issue / Measurement error"}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {shortages === 0 && surpluses === 0 && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="font-semibold text-green-700">{isZh ? "全部账实相符！" : "All items match!"}</p>
              </CardContent>
            </Card>
          )}

          <div>
            <label className="text-sm font-medium">{isZh ? "盘点备注" : "Count Notes"}</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isZh ? "补充说明（选填）" : "Additional notes (optional)"} rows={3} />
          </div>
        </div>
      )}

      {/* Step 3: 提交完成 */}
      {step === 3 && (
        <div className="max-w-md mx-auto text-center py-12">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">{isZh ? "盘点单已提交" : "Count Submitted"}</h2>
          <p className="text-muted-foreground mb-6">
            {isZh ? "等待财务复核确认，请关注通知" : "Awaiting finance review, check notifications"}
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{countedItems.length}</p>
              <p className="text-xs text-muted-foreground">{isZh ? "盘点项" : "Items"}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{matches}</p>
              <p className="text-xs text-muted-foreground">{isZh ? "相符" : "Match"}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{shortages + surpluses}</p>
              <p className="text-xs text-muted-foreground">{isZh ? "差异" : "Diff"}</p>
            </div>
          </div>
          <Button onClick={() => { setStep(0); setItems([{ materialCode: "", materialName: "", bookQty: 0, actualQty: null, unit: "个", location: "", varianceReason: "" }]); setNotes(""); }}>
            {isZh ? "开始新的盘点" : "New Count"}
          </Button>
        </div>
      )}

      {/* 底部导航按钮 */}
      {step < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-between md:max-w-4xl md:mx-auto safe-area-pb z-40">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />{isZh ? "上一步" : "Back"}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canGoNext()}>
              {isZh ? "下一步" : "Next"}<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createCountMut.isPending}>
              <Send className="w-4 h-4 mr-1" />{isZh ? "提交复核" : "Submit for Review"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** 差异标签 */
function VarianceBadge({ book, actual, isZh }: { book: number; actual: number; isZh: boolean }) {
  const diff = actual - book;
  if (diff === 0) return <Badge className="bg-green-100 text-green-800 text-[10px]">{isZh ? "相符" : "OK"}</Badge>;
  if (diff < 0) return <Badge variant="destructive" className="text-[10px]">{isZh ? "盘亏" : "Short"} {diff}</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 text-[10px]">{isZh ? "盘盈" : "Over"} +{diff}</Badge>;
}
