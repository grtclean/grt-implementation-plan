/**
 * AI助手中心 - Unified AI Assistant Hub
 *
 * A navigation hub page that consolidates all AI assistants
 * scattered across the application into a single entry point.
 * Grouped by: 通用AI (General AI), 业务AI (Business AI), 系统管理 (System Admin)
 */

import { PageHeader } from "@/components/grt";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Bot,
  Gauge,
  Cpu,
  Stethoscope,
  Activity,
  Network,
  Timer,
  Calculator,
  Lightbulb,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface AssistantEntry {
  name: string;
  nameEn: string;
  description: string;
  path: string;
  icon: LucideIcon;
  /** Tailwind colour classes applied to the icon wrapper */
  color: string;
}

interface AssistantGroup {
  title: string;
  titleEn: string;
  entries: AssistantEntry[];
}

const assistantGroups: AssistantGroup[] = [
  {
    title: "通用AI",
    titleEn: "General AI",
    entries: [
      {
        name: "AI对话助手",
        nameEn: "AI Chat Assistant",
        description: "通用AI对话，智能问答与业务咨询",
        path: "/ai-assistant",
        icon: Bot,
        color: "bg-blue-500/10 text-blue-500",
      },
      {
        name: "AI KPI助手",
        nameEn: "KPI Assistant",
        description: "绩效指标分析、趋势预测与改进建议",
        path: "/ai/kpi-assistant",
        icon: Gauge,
        color: "bg-purple-500/10 text-purple-500",
      },
      {
        name: "数字助理",
        nameEn: "Digital Assistants",
        description: "多模态数字助理，处理日常办公任务",
        path: "/digital-assistants",
        icon: Cpu,
        color: "bg-cyan-500/10 text-cyan-500",
      },
      {
        name: "AI诊断",
        nameEn: "AI Diagnostic",
        description: "系统与业务健康度智能诊断",
        path: "/ai-diagnostic",
        icon: Stethoscope,
        color: "bg-rose-500/10 text-rose-500",
      },
      {
        name: "AI效能追踪",
        nameEn: "AI Effectiveness",
        description: "追踪AI使用效果与投资回报",
        path: "/ai-effectiveness",
        icon: Activity,
        color: "bg-emerald-500/10 text-emerald-500",
      },
    ],
  },
  {
    title: "业务AI",
    titleEn: "Business AI",
    entries: [
      {
        name: "AI报价助手",
        nameEn: "AI Quotation Assistant",
        description: "基于历史数据与市场分析生成精准报价",
        path: "/ai/quotation-assistant",
        icon: Calculator,
        color: "bg-emerald-500/10 text-emerald-500",
      },
      {
        name: "AI方案助手",
        nameEn: "AI Solution Assistant",
        description: "智能分析客户需求，推荐最佳解决方案",
        path: "/ai/solution-assistant",
        icon: Lightbulb,
        color: "bg-amber-500/10 text-amber-500",
      },
      {
        name: "AI计划助手",
        nameEn: "AI Planning Assistant",
        description: "项目规划与资源调度智能辅助",
        path: "/ai/planning-assistant",
        icon: CalendarClock,
        color: "bg-blue-500/10 text-blue-500",
      },
    ],
  },
  {
    title: "系统管理",
    titleEn: "System Admin",
    entries: [
      {
        name: "模型监控",
        nameEn: "Model Performance Monitor",
        description: "监控AI模型运行状态与性能指标",
        path: "/model-performance-monitor",
        icon: Activity,
        color: "bg-orange-500/10 text-orange-500",
      },
      {
        name: "知识图谱",
        nameEn: "Knowledge Graph",
        description: "知识图谱审批与可视化管理",
        path: "/knowledge-graph-approval",
        icon: Network,
        color: "bg-indigo-500/10 text-indigo-500",
      },
      {
        name: "模型训练",
        nameEn: "Model Training Scheduler",
        description: "管理AI模型训练任务与调度",
        path: "/model-training-scheduler",
        icon: Timer,
        color: "bg-pink-500/10 text-pink-500",
      },
      {
        name: "Agent管理",
        nameEn: "Agent Unit Management",
        description: "管理自主Agent单元的配置与生命周期",
        path: "/agent-unit-management",
        icon: Cpu,
        color: "bg-teal-500/10 text-teal-500",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function AssistantCard({ entry }: { entry: AssistantEntry }) {
  const Icon = entry.icon;

  return (
    <Link href={entry.path}>
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 h-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${entry.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base group-hover:text-primary transition-colors">
                {entry.name}
              </CardTitle>
              <CardDescription className="text-xs">{entry.nameEn}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AiAssistantHubPage() {
  return (
      <div className="space-y-8">
        {/* Page header */}
        <PageHeader icon={Bot} title="AI助手中心" description="统一管理所有AI助手和智能工具" />

        {/* Groups */}
        {assistantGroups.map((group) => (
          <section key={group.title}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {group.title}
              <span className="text-sm font-normal text-muted-foreground">
                {group.titleEn}
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.entries.map((entry) => (
                <AssistantCard key={entry.path} entry={entry} />
              ))}
            </div>
          </section>
        ))}
      </div>
  );
}
