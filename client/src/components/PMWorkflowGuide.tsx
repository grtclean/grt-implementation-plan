/**
 * PM Workflow Guide - M0-M12 阶段可视化流水线
 * 展示项目从概念提出到产品发布的完整生命周期进度
 */
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  Lightbulb,
  ClipboardList,
  PenTool,
  Ruler,
  SearchCheck,
  FileCheck,
  Cog,
  Factory,
  TestTube,
  UserCheck,
  PackageCheck,
  Rocket,
  Flag,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface PMWorkflowGuideProps {
  /** Current active stage index (0-12) */
  currentStage: number;
  /** Array of completed stage indices */
  completedStages: number[];
  /** Optional: compact mode hides the detail card */
  compact?: boolean;
  /** Optional: additional CSS class */
  className?: string;
}

interface StageDefinition {
  index: number;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  keyActions: string[];
  link: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: string;
  activeColor: string;
}

// ============================================================================
// Stage Definitions
// ============================================================================

const STAGES: StageDefinition[] = [
  {
    index: 0,
    code: "M0",
    name: "概念提出",
    nameEn: "Concept Proposal",
    description: "识别市场需求与客户痛点，提出产品概念方向",
    keyActions: ["市场调研分析", "客户需求收集", "概念方案草案"],
    link: "/pos/projects",
    icon: Lightbulb,
    color: "bg-slate-500",
    activeColor: "bg-slate-400",
  },
  {
    index: 1,
    code: "M1",
    name: "需求分析",
    nameEn: "Requirements Analysis",
    description: "深入分析技术可行性，明确产品需求规格",
    keyActions: ["URS编写", "技术可行性分析", "风险预评估"],
    link: "/pos/projects",
    icon: ClipboardList,
    color: "bg-blue-500",
    activeColor: "bg-blue-400",
  },
  {
    index: 2,
    code: "M2",
    name: "概念设计",
    nameEn: "Concept Design",
    description: "完成概念设计方案与技术路线选择",
    keyActions: ["概念方案设计", "技术路线选择", "成本初估"],
    link: "/pos/projects",
    icon: PenTool,
    color: "bg-indigo-500",
    activeColor: "bg-indigo-400",
  },
  {
    index: 3,
    code: "M3",
    name: "详细设计",
    nameEn: "Detailed Design",
    description: "完成机械/电气/软件的详细设计图纸与文档",
    keyActions: ["详细设计图纸", "BOM清单", "设计评审"],
    link: "/rd-verification",
    icon: Ruler,
    color: "bg-purple-500",
    activeColor: "bg-purple-400",
  },
  {
    index: 4,
    code: "M4",
    name: "设计验证",
    nameEn: "Design Verification",
    description: "通过仿真、原型验证设计方案的正确性",
    keyActions: ["仿真验证", "原型测试", "设计变更管理"],
    link: "/rd-verification",
    icon: SearchCheck,
    color: "bg-pink-500",
    activeColor: "bg-pink-400",
  },
  {
    index: 5,
    code: "M5",
    name: "设计评审",
    nameEn: "Design Review",
    description: "多维度评审设计方案，确保满足所有需求",
    keyActions: ["五车评审", "方案冻结", "问题闭环"],
    link: "/rd-verification",
    icon: FileCheck,
    color: "bg-rose-500",
    activeColor: "bg-rose-400",
  },
  {
    index: 6,
    code: "M6",
    name: "工艺验证",
    nameEn: "Process Validation",
    description: "验证生产工艺可行性，制定加工方案",
    keyActions: ["工艺方案制定", "工装夹具设计", "首件验证"],
    link: "/production-steps",
    icon: Cog,
    color: "bg-orange-500",
    activeColor: "bg-orange-400",
  },
  {
    index: 7,
    code: "M7",
    name: "试产",
    nameEn: "Pilot Production",
    description: "小批量试产验证工艺稳定性与产品质量",
    keyActions: ["试产计划", "工序检验", "问题记录与改善"],
    link: "/production-steps",
    icon: Factory,
    color: "bg-amber-500",
    activeColor: "bg-amber-400",
  },
  {
    index: 8,
    code: "M8",
    name: "FAT验收",
    nameEn: "Factory Acceptance Test",
    description: "工厂内部验收测试，确保设备满足技术要求",
    keyActions: ["FAT测试方案执行", "测试报告编写", "问题整改"],
    link: "/fat-coordination",
    icon: TestTube,
    color: "bg-yellow-500",
    activeColor: "bg-yellow-400",
  },
  {
    index: 9,
    code: "M9",
    name: "客户验证",
    nameEn: "Customer Validation",
    description: "客户现场验证与确认，获取客户认可",
    keyActions: ["SAT测试", "客户培训", "问题清单跟踪"],
    link: "/pos/projects",
    icon: UserCheck,
    color: "bg-lime-500",
    activeColor: "bg-lime-400",
  },
  {
    index: 10,
    code: "M10",
    name: "量产准备",
    nameEn: "Mass Production Prep",
    description: "完成量产前的各项准备工作",
    keyActions: ["量产BOM确认", "供应链就绪", "产线布局确认"],
    link: "/pos/projects",
    icon: PackageCheck,
    color: "bg-green-500",
    activeColor: "bg-green-400",
  },
  {
    index: 11,
    code: "M11",
    name: "量产",
    nameEn: "Mass Production",
    description: "正式批量生产并持续优化生产效率",
    keyActions: ["生产排程", "质量监控", "产能爬坡"],
    link: "/pos/projects",
    icon: Rocket,
    color: "bg-emerald-500",
    activeColor: "bg-emerald-400",
  },
  {
    index: 12,
    code: "M12",
    name: "产品发布",
    nameEn: "Product Launch",
    description: "产品正式发布，完成项目总结与知识沉淀",
    keyActions: ["项目总结报告", "知识库沉淀", "经验教训归档"],
    link: "/pos/projects",
    icon: Flag,
    color: "bg-teal-500",
    activeColor: "bg-teal-400",
  },
];

// ============================================================================
// Stage category grouping for visual reference
// ============================================================================

const CATEGORY_RANGES: { label: string; start: number; end: number; color: string }[] = [
  { label: "概念", start: 0, end: 2, color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  { label: "设计", start: 3, end: 5, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { label: "验证", start: 6, end: 8, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { label: "生产", start: 9, end: 11, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { label: "发布", start: 12, end: 12, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
];

// ============================================================================
// Helper: determine stage visual state
// ============================================================================

type StageState = "completed" | "current" | "upcoming";

function getStageState(
  stageIndex: number,
  currentStage: number,
  completedStages: number[]
): StageState {
  if (completedStages.includes(stageIndex)) return "completed";
  if (stageIndex === currentStage) return "current";
  return "upcoming";
}

// ============================================================================
// Sub-component: Single Stage Node (Desktop)
// ============================================================================

function StageNode({
  stage,
  state,
  onClick,
}: {
  stage: StageDefinition;
  state: StageState;
  onClick?: () => void;
}) {
  const Icon = stage.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "relative flex flex-col items-center gap-1.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1.5 transition-all duration-200",
            state === "current" && "scale-110",
          )}
        >
          {/* Node circle */}
          <div
            className={cn(
              "relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0",
              state === "completed" &&
                "bg-emerald-500/20 border-emerald-500 text-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-300",
              state === "current" &&
                "border-primary bg-primary/20 text-primary shadow-lg shadow-primary/25 animate-pulse dark:border-primary dark:bg-primary/20 dark:text-primary",
              state === "upcoming" &&
                "border-muted-foreground/30 bg-muted/50 text-muted-foreground/50 dark:border-muted-foreground/20 dark:bg-muted/30 dark:text-muted-foreground/40",
            )}
          >
            {state === "completed" ? (
              <Check className="w-5 h-5" strokeWidth={3} />
            ) : (
              <Icon className="w-4.5 h-4.5" />
            )}

            {/* Ping animation for current stage */}
            {state === "current" && (
              <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
            )}
          </div>

          {/* Stage code label */}
          <span
            className={cn(
              "text-[10px] font-bold leading-none transition-colors",
              state === "completed" && "text-emerald-500 dark:text-emerald-400",
              state === "current" && "text-primary",
              state === "upcoming" && "text-muted-foreground/50",
            )}
          >
            {stage.code}
          </span>

          {/* Stage name (hidden on very small viewport, shown via tooltip) */}
          <span
            className={cn(
              "text-[9px] leading-tight text-center max-w-[56px] truncate hidden lg:block transition-colors",
              state === "completed" && "text-emerald-600 dark:text-emerald-400/80",
              state === "current" && "text-foreground font-semibold",
              state === "upcoming" && "text-muted-foreground/40",
            )}
          >
            {stage.name}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px]">
        <div className="space-y-1">
          <p className="font-semibold">
            {stage.code} {stage.name}
          </p>
          <p className="text-[11px] opacity-80">{stage.nameEn}</p>
          <p className="text-[11px] opacity-70">{stage.description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Sub-component: Connector line between nodes (Desktop)
// ============================================================================

function Connector({ leftState, rightState }: { leftState: StageState; rightState: StageState }) {
  const isActive = leftState === "completed";
  return (
    <div className="flex items-center self-start mt-[22px] -mx-0.5">
      <div
        className={cn(
          "h-0.5 w-3 xl:w-5 transition-colors duration-300",
          isActive
            ? "bg-emerald-500/60 dark:bg-emerald-400/50"
            : rightState === "current"
              ? "bg-primary/40"
              : "bg-muted-foreground/15 dark:bg-muted-foreground/10",
        )}
      />
    </div>
  );
}

// ============================================================================
// Sub-component: Stage Node (Mobile / Vertical)
// ============================================================================

function StageNodeVertical({
  stage,
  state,
  isLast,
  onClick,
}: {
  stage: StageDefinition;
  state: StageState;
  isLast: boolean;
  onClick?: () => void;
}) {
  const Icon = stage.icon;

  return (
    <div className="flex gap-3">
      {/* Vertical line + node */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "relative w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            state === "completed" &&
              "bg-emerald-500/20 border-emerald-500 text-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-300",
            state === "current" &&
              "border-primary bg-primary/20 text-primary shadow-lg shadow-primary/25 animate-pulse dark:border-primary dark:bg-primary/20 dark:text-primary",
            state === "upcoming" &&
              "border-muted-foreground/30 bg-muted/50 text-muted-foreground/50 dark:border-muted-foreground/20 dark:bg-muted/30 dark:text-muted-foreground/40",
          )}
        >
          {state === "completed" ? (
            <Check className="w-4 h-4" strokeWidth={3} />
          ) : (
            <Icon className="w-4 h-4" />
          )}
          {state === "current" && (
            <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
          )}
        </button>
        {/* Vertical connector */}
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[20px] transition-colors duration-300",
              state === "completed"
                ? "bg-emerald-500/50 dark:bg-emerald-400/40"
                : "bg-muted-foreground/15 dark:bg-muted-foreground/10",
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("pb-4", isLast && "pb-0")}>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "text-left focus:outline-none",
            state === "upcoming" && "opacity-50",
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-bold",
                state === "completed" && "text-emerald-500 dark:text-emerald-400",
                state === "current" && "text-primary",
                state === "upcoming" && "text-muted-foreground",
              )}
            >
              {stage.code}
            </span>
            <span
              className={cn(
                "text-sm",
                state === "current" && "font-semibold text-foreground",
                state === "completed" && "text-muted-foreground line-through decoration-emerald-500/40",
                state === "upcoming" && "text-muted-foreground",
              )}
            >
              {stage.name}
            </span>
            {state === "current" && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 animate-pulse">
                当前
              </Badge>
            )}
          </div>
          {state === "current" && (
            <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-component: Current Stage Detail Card
// ============================================================================

function CurrentStageDetail({ stage }: { stage: StageDefinition }) {
  const Icon = stage.icon;
  const category = CATEGORY_RANGES.find(
    (c) => stage.index >= c.start && stage.index <= c.end
  );

  return (
    <Card className="border-primary/30 dark:border-primary/20 bg-primary/5 dark:bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 dark:bg-primary/20 flex items-center justify-center text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>{stage.code}</span>
                <span>{stage.name}</span>
                {category && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", category.color)}>
                    {category.label}阶段
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{stage.nameEn}</p>
            </div>
          </div>
          <Link href={stage.link}>
            <a className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
              前往
              <ExternalLink className="w-3 h-3" />
            </a>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">{stage.description}</p>

        {/* Key Actions */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground/80">关键动作:</p>
          <div className="flex flex-wrap gap-1.5">
            {stage.keyActions.map((action) => (
              <Badge
                key={action}
                variant="secondary"
                className="text-[11px] font-normal"
              >
                {action}
              </Badge>
            ))}
          </div>
        </div>

        {/* Quick navigation */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <Link href={stage.link}>
            <a className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-medium">
              <ChevronRight className="w-3.5 h-3.5" />
              进入{stage.name}工作区
            </a>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-component: Progress Summary Bar
// ============================================================================

function ProgressSummary({
  currentStage,
  completedStages,
}: {
  currentStage: number;
  completedStages: number[];
}) {
  const totalStages = STAGES.length;
  const completedCount = completedStages.length;
  const progressPercent = Math.round((completedCount / totalStages) * 100);

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums">
        {completedCount}/{totalStages} ({progressPercent}%)
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function PMWorkflowGuide({
  currentStage,
  completedStages,
  compact = false,
  className,
}: PMWorkflowGuideProps) {
  const currentStageData = STAGES[currentStage];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress summary */}
      <ProgressSummary currentStage={currentStage} completedStages={completedStages} />

      {/* Desktop: Horizontal pipeline */}
      <div className="hidden md:block overflow-x-auto">
        <div className="flex items-start justify-center min-w-[700px] px-2 py-2">
          {STAGES.map((stage, idx) => {
            const state = getStageState(stage.index, currentStage, completedStages);
            return (
              <div key={stage.code} className="contents">
                <StageNode stage={stage} state={state} />
                {idx < STAGES.length - 1 && (
                  <Connector
                    leftState={state}
                    rightState={getStageState(STAGES[idx + 1].index, currentStage, completedStages)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Phase category labels */}
        <div className="flex justify-center gap-3 mt-1">
          {CATEGORY_RANGES.map((cat) => (
            <Badge
              key={cat.label}
              variant="outline"
              className={cn("text-[10px] px-2 py-0 h-4 font-normal", cat.color)}
            >
              {cat.label} ({STAGES[cat.start].code}-{STAGES[cat.end].code})
            </Badge>
          ))}
        </div>
      </div>

      {/* Mobile: Vertical pipeline */}
      <div className="md:hidden">
        <div className="pl-1">
          {STAGES.map((stage, idx) => {
            const state = getStageState(stage.index, currentStage, completedStages);
            return (
              <StageNodeVertical
                key={stage.code}
                stage={stage}
                state={state}
                isLast={idx === STAGES.length - 1}
              />
            );
          })}
        </div>
      </div>

      {/* Current stage detail card */}
      {!compact && currentStageData && (
        <CurrentStageDetail stage={currentStageData} />
      )}
    </div>
  );
}

export { STAGES as PM_STAGES };
export type { StageDefinition };
