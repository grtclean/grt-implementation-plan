/**
 * Supply Chain RFQ Kanban — AI询价Bot (/supply-chain-rfq)
 *
 * KPI summary row and 5-column Kanban board for RFQ workflow.
 * All data is mock (no RFQ router).
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  FileText,
  Clock,
  TrendingDown,
  Send,
  CheckCircle,
  XCircle,
  Award,
  DollarSign,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Kanban column config
// ---------------------------------------------------------------------------
type KanbanColumn = "draft" | "sent" | "quoted" | "awarded" | "rejected";

const COLUMNS: { key: KanbanColumn; labelZh: string; labelEn: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "draft",    labelZh: "草稿",   labelEn: "Draft",    color: "#605e5c", icon: FileText },
  { key: "sent",     labelZh: "已发送", labelEn: "Sent",     color: "#0078D4", icon: Send },
  { key: "quoted",   labelZh: "已报价", labelEn: "Quoted",   color: "#CA5010", icon: DollarSign },
  { key: "awarded",  labelZh: "已中标", labelEn: "Awarded",  color: "#107C10", icon: Award },
  { key: "rejected", labelZh: "已拒绝", labelEn: "Rejected", color: "#A80000", icon: XCircle },
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
interface RFQCard {
  id: string;
  titleZh: string;
  titleEn: string;
  supplier: string;
  amount: string;
  dueDate: string;
  status: KanbanColumn;
}

const MOCK_RFQS: RFQCard[] = [
  { id: "RFQ-001", titleZh: "超声换能器 ×50",      titleEn: "Ultrasonic Transducer ×50",    supplier: "供应商A",   amount: "¥85,000",  dueDate: "03-05", status: "draft" },
  { id: "RFQ-002", titleZh: "304不锈钢板 20T",     titleEn: "304 SS Sheet 20T",              supplier: "供应商B",   amount: "¥220,000", dueDate: "03-03", status: "draft" },
  { id: "RFQ-003", titleZh: "PLC控制模块 ×10",     titleEn: "PLC Module ×10",                supplier: "供应商C",   amount: "¥45,000",  dueDate: "03-08", status: "sent" },
  { id: "RFQ-004", titleZh: "高压泵组 ×5",         titleEn: "High-pressure Pump ×5",         supplier: "供应商D",   amount: "¥128,000", dueDate: "03-01", status: "sent" },
  { id: "RFQ-005", titleZh: "过滤器组件 ×100",     titleEn: "Filter Assembly ×100",           supplier: "供应商E",   amount: "¥32,000",  dueDate: "03-10", status: "quoted" },
  { id: "RFQ-006", titleZh: "电加热管 ×30",        titleEn: "Heating Element ×30",            supplier: "供应商F",   amount: "¥18,500",  dueDate: "02-28", status: "quoted" },
  { id: "RFQ-007", titleZh: "传送链条 50m",        titleEn: "Conveyor Chain 50m",             supplier: "供应商A",   amount: "¥67,000",  dueDate: "02-25", status: "awarded" },
  { id: "RFQ-008", titleZh: "温控仪表 ×20",        titleEn: "Temp Controller ×20",            supplier: "供应商G",   amount: "¥24,000",  dueDate: "02-20", status: "awarded" },
  { id: "RFQ-009", titleZh: "密封圈 ×500",         titleEn: "O-Ring ×500",                    supplier: "供应商H",   amount: "¥8,200",   dueDate: "03-12", status: "quoted" },
  { id: "RFQ-010", titleZh: "废液处理泵 ×2",       titleEn: "Waste Fluid Pump ×2",            supplier: "供应商B",   amount: "¥95,000",  dueDate: "02-18", status: "rejected" },
  { id: "RFQ-011", titleZh: "触摸屏HMI ×8",       titleEn: "HMI Touchscreen ×8",             supplier: "供应商I",   amount: "¥56,000",  dueDate: "03-15", status: "sent" },
];

export default function SupplyChainRFQKanban() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const totalRFQs = MOCK_RFQS.length;
  const avgResponseDays = 3.2;
  const savingsPercent = 8.5;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isZh ? "AI 询价 Bot" : "AI RFQ Bot"}</h1>
            <p className="text-sm text-muted-foreground">{isZh ? "智能询价管理与供应商报价跟踪" : "Intelligent RFQ management & supplier quote tracking"}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <FileText className="w-4 h-4 text-blue-500" />
                <p className="text-3xl font-bold text-blue-600">{totalRFQs}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "询价单总数" : "Total RFQs"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <p className="text-3xl font-bold text-orange-600">{avgResponseDays}d</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "平均响应时间" : "Avg Response"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="w-4 h-4 text-green-500" />
                <p className="text-3xl font-bold text-green-600">{savingsPercent}%</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "采购节约率" : "Cost Savings"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const cards = MOCK_RFQS.filter((r) => r.status === col.key);
            return (
              <div key={col.key} className="flex-shrink-0 w-60">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{isZh ? col.labelZh : col.labelEn}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{cards.length}</Badge>
                </div>
                <div className="space-y-2">
                  {cards.map((card) => (
                    <Card key={card.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">{card.id}</span>
                          <span className="text-xs text-muted-foreground">{card.dueDate}</span>
                        </div>
                        <p className="text-sm font-medium leading-tight">{isZh ? card.titleZh : card.titleEn}</p>
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="outline" className="text-[10px]">{card.supplier}</Badge>
                          <span className="font-semibold" style={{ color: col.color }}>{card.amount}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {cards.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                      {isZh ? "暂无" : "Empty"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
