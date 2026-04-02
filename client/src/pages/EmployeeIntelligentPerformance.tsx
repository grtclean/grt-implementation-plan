/**
 * 员工智能绩效页面 - 增强版
 * 整合日周月季年绩效、工作计划输出、会议表现、项目表现、员工询问、红黑榜等
 * 包含丰富的图表可视化：雷达图、折线图、热力图、分布图
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import FeatureGuide from "@/components/FeatureGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Star,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Video,
  Briefcase,
  FileText,
  Bot,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Activity,
  Heart,
  HeartOff,
  Shield,
  Medal,
  Trophy,
  Flame,
  UserPlus,
  Building2,
  Settings,
  Eye,
  Edit,
  Share,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Mic,
  MessageCircle,
  ChartLine,
  Radar,
  PieChart,
  Layers,
  Zap,
  GitBranch,
  Users,
  FileCheck,
  RefreshCw,
  Search,
  Minus,
  MinusCircle,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Radar as RadarIcon,
  Activity as ActivityIcon,
  Maximize2,
  Grid3x3,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================================
// 类型定义
// ============================================================================

interface PerformanceMetrics {
  id: string;
  periodType: "day" | "week" | "month" | "quarter" | "year";
  periodValue: string;
  totalScore: number;
  scoreLevel: "excellent" | "good" | "satisfactory" | "needs_improvement" | "unsatisfactory";
  ranking?: number;
  breakdown: PerformanceBreakdown[];
  aiAnalysis: string;
  aiSuggestions: string[];
  createdAt: string;
}

interface PerformanceBreakdown {
  category: string;
  weight: number;
  score: number;
  items: {
    name: string;
    value: number;
    target?: number;
  }[];
}

interface WorkPlanOutput {
  id: string;
  planId: string;
  planTitle: string;
  period: string;
  timelinessScore: number;
  qualityScore: number;
  customerFeedbackScore: number;
  overallScore: number;
  completedTasks: number;
  totalTasks: number;
  overdueTasks: number;
  customerRatings: CustomerRating[];
  issues: PlanIssue[];
  aiInsights: string;
}

interface CustomerRating {
  id: string;
  customerName: string;
  rating: number;
  feedback: string;
  timestamp: string;
}

interface PlanIssue {
  id: string;
  type: "delay" | "quality" | "customer_issue";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  createdAt: string;
  resolved: boolean;
}

interface MeetingPerformance {
  id: string;
  meetingId: string;
  meetingTitle: string;
  date: string;
  duration: number;
  role: "participant" | "presenter" | "facilitator";
  performanceScore: number;
  technicalClarity: number;
  proactivity: number;
  communicationSkill: number;
  problemSolving: number;
  aiFeedback: string;
  actionItemsCompleted: number;
  totalActionItems: number;
  minutesGenerated: boolean;
}

interface ProjectPerformance {
  id: string;
  projectId: string;
  projectName: string;
  role: string;
  status: "active" | "completed" | "delayed";
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
  qualityScore: number;
  onTimeDeliveryScore: number;
  collaborationScore: number;
  customerSatisfactionScore: number;
  overallScore: number;
  milestones: ProjectMilestone[];
}

interface ProjectMilestone {
  id: string;
  name: string;
  targetDate: string;
  completedAt?: string;
  status: "pending" | "in_progress" | "completed" | "delayed";
  score: number;
}

interface EmployeeInquiry {
  id: string;
  employeeId: string;
  inquirerName: string;
  inquirerType: "customer" | "colleague" | "manager";
  category: "question" | "feedback" | "complaint" | "request";
  content: string;
  response?: string;
  responseTime?: number;
  timestamp: string;
  status: "pending" | "responded" | "resolved";
  aiSuggestedResponse?: string;
}

interface ConversationRecord {
  id: string;
  employeeId: string;
  participant: string;
  conversationType: "performance_discussion" | "feedback" | "coaching" | "learning" | "chat";
  duration: number;
  angle: string;
  topics: string[];
  outcome: string;
  timestamp: string;
  materials?: string[];
}

interface EmployeeData {
  id: string;
  name: string;
  avatar?: string;
  department: string;
  position: string;
  joinDate: string;
  manager: string;
  performanceTrend: number[];
}

// ============================================================================
// 模拟数据
// ============================================================================

const mockEmployeeData: EmployeeData = {
  id: "EMP-001",
  name: "胡杨",
  avatar: "",
  department: "AI数智部",
  position: "IT工程师",
  joinDate: "2023-01-15",
  manager: "金晓锋",
  performanceTrend: [72, 75, 78, 82, 85, 83, 88, 92, 90, 87, 89, 91, 93],
};

const mockPerformanceMetrics: PerformanceMetrics[] = [
  {
    id: "PERF-2024-M001",
    periodType: "month",
    periodValue: "2024-02",
    totalScore: 92,
    scoreLevel: "excellent",
    ranking: 1,
    createdAt: "2024-02-11",
    breakdown: [
      {
        category: "工作计划",
        weight: 30,
        score: 90,
        items: [
          { name: "及时性", value: 95, target: 90 },
          { name: "质量", value: 88, target: 90 },
          { name: "客户反馈", value: 85, target: 85 },
        ],
      },
      {
        category: "会议表现",
        weight: 20,
        score: 88,
        items: [
          { name: "参与度", value: 90 },
          { name: "贡献度", value: 85 },
        ],
      },
      {
        category: "项目表现",
        weight: 30,
        score: 94,
        items: [
          { name: "任务完成率", value: 98 },
          { name: "交付质量", value: 92 },
          { name: "协作表现", value: 92 },
        ],
      },
      {
        category: "客户反馈",
        weight: 20,
        score: 95,
        items: [
          { name: "客户满意度", value: 96 },
          { name: "响应速度", value: 94 },
        ],
      },
    ],
    aiAnalysis: "本月表现优秀，各项工作按时完成，客户反馈积极。在项目A中展现了出色的技术能力和团队协作精神。",
    aiSuggestions: [
      "建议继续保持当前工作状态，争取获得本月最佳员工",
      "可以关注项目B的质量细节，确保代码规范",
    ],
  },
];

const mockHistoricalPerformance = [
  { period: "1月", workPlan: 88, meeting: 85, project: 90, customer: 82, total: 86 },
  { period: "2月", workPlan: 90, meeting: 88, project: 94, customer: 95, total: 92 },
  { period: "3月", workPlan: 85, meeting: 92, project: 88, customer: 90, total: 89 },
  { period: "4月", workPlan: 82, meeting: 85, project: 86, customer: 88, total: 85 },
  { period: "5月", workPlan: 88, meeting: 90, project: 92, customer: 94, total: 91 },
  { period: "6月", workPlan: 91, meeting: 88, project: 90, customer: 92, total: 90 },
];

const mockWorkPlanOutputs: WorkPlanOutput[] = [
  {
    id: "WPO-001",
    planId: "WP-2024-02",
    planTitle: "2024年2月工作计划",
    period: "month",
    timelinessScore: 92,
    qualityScore: 88,
    customerFeedbackScore: 95,
    overallScore: 91,
    completedTasks: 24,
    totalTasks: 28,
    overdueTasks: 1,
    customerRatings: [
      { id: "CR-001", customerName: "大众汽车", rating: 5, feedback: "技术响应及时，方案专业", timestamp: "2024-02-08" },
      { id: "CR-002", customerName: "宝马中国", rating: 4, feedback: "沟通顺畅，交付质量高", timestamp: "2024-02-10" },
    ],
    issues: [
      { id: "ISS-001", type: "delay", severity: "medium", title: "任务延迟", description: "文档审核任务延迟2天", createdAt: "2024-02-05", resolved: true },
    ],
    aiInsights: "本月工作计划执行情况良好，及时性得分92分。客户反馈积极，满意度达95%。需注意任务管理，减少延迟情况。",
  },
];

const mockMeetingPerformances: MeetingPerformance[] = [
  {
    id: "MP-001",
    meetingId: "MT-2024-015",
    meetingTitle: "项目A技术评审会",
    date: "2024-02-10",
    duration: 90,
    role: "presenter",
    performanceScore: 92,
    technicalClarity: 95,
    proactivity: 88,
    communicationSkill: 92,
    problemSolving: 90,
    aiFeedback: "会议表现优秀，技术方案阐述清晰，能够主动回应团队提问，展现出色的技术领导力。建议后续会议可以更主动地引导讨论方向。",
    actionItemsCompleted: 4,
    totalActionItems: 5,
    minutesGenerated: true,
  },
  {
    id: "MP-002",
    meetingId: "MT-2024-014",
    meetingTitle: "客户需求讨论会",
    date: "2024-02-08",
    duration: 60,
    role: "participant",
    performanceScore: 85,
    technicalClarity: 88,
    proactivity: 82,
    communicationSkill: 88,
    problemSolving: 82,
    aiFeedback: "会议参与度较高，能够有效记录客户需求。建议在后续项目中更主动地提出技术建议。",
    actionItemsCompleted: 2,
    totalActionItems: 3,
    minutesGenerated: false,
  },
];

const mockProjectPerformances: ProjectPerformance[] = [
  {
    id: "PP-001",
    projectId: "PROJ-2024-001",
    projectName: "大众汽车清洗线项目",
    role: "技术负责人",
    status: "active",
    progress: 75,
    tasksCompleted: 45,
    totalTasks: 60,
    qualityScore: 92,
    onTimeDeliveryScore: 88,
    collaborationScore: 90,
    customerSatisfactionScore: 95,
    overallScore: 91,
    milestones: [
      { id: "MS-001", name: "需求分析", targetDate: "2024-01-20", completedAt: "2024-01-18", status: "completed", score: 95 },
      { id: "MS-002", name: "方案设计", targetDate: "2024-02-05", completedAt: "2024-02-03", status: "completed", score: 92 },
      { id: "MS-003", name: "开发实施", targetDate: "2024-02-28", status: "in_progress", score: 75 },
      { id: "MS-004", name: "测试验收", targetDate: "2024-03-15", status: "pending", score: 0 },
    ],
  },
];

const mockEmployeeInquiries: EmployeeInquiry[] = [
  {
    id: "INQ-001",
    employeeId: "EMP-001",
    inquirerName: "王经理",
    inquirerType: "manager",
    category: "feedback",
    content: "关于上周项目的反馈，整体表现良好，但在技术方案上可以更创新一些",
    response: "感谢王经理的反馈，我会认真思考，在后续项目中尝试更多创新的解决方案",
    responseTime: 2,
    timestamp: "2024-02-10",
    status: "responded",
    aiSuggestedResponse: "建议回复：感谢您的反馈，我会认真思考您的建议，在后续项目中努力提升创新能力。同时，我会与团队分享更多创新的技术方案。",
  },
];

const mockConversationRecords: ConversationRecord[] = [
  {
    id: "CONV-001",
    employeeId: "EMP-001",
    participant: "金晓锋",
    conversationType: "performance_discussion",
    duration: 45,
    angle: "正向激励",
    topics: ["本月绩效", "项目表现", "能力提升"],
    outcome: "制定下季度目标",
    timestamp: "2024-02-10",
    materials: ["绩效报告", "能力评估表"],
  },
  {
    id: "CONV-002",
    employeeId: "EMP-001",
    participant: "HR专员",
    conversationType: "feedback",
    duration: 30,
    angle: "问题指出",
    topics: ["沟通协调", "跨部门协作"],
    outcome: "达成改进共识",
    timestamp: "2024-02-05",
    materials: ["沟通记录"],
  },
];

const mockLeaderboard = [
  { id: "LB-001", employeeName: "胡杨", department: "AI数智部", score: 92, change: 5, rank: 1, trend: "up" },
  { id: "LB-002", employeeName: "刘健康", department: "事业一部", score: 90, change: 8, rank: 2, trend: "up" },
  { id: "LB-003", employeeName: "杨勇", department: "事业三部", score: 88, change: -2, rank: 3, trend: "down" },
  { id: "LB-004", employeeName: "焦斌", department: "事业一部", score: 87, change: 3, rank: 4, trend: "up" },
  { id: "LB-005", employeeName: "马林山", department: "事业二部", score: 85, change: -1, rank: 5, trend: "down" },
];

// ============================================================================
// 辅助函数和组件
// ============================================================================

const scoreLevelColors: Record<string, string> = {
  excellent: "bg-green-500/20 text-green-400",
  good: "bg-blue-500/20 text-blue-400",
  satisfactory: "bg-yellow-500/20 text-yellow-400",
  needs_improvement: "bg-orange-500/20 text-orange-400",
  unsatisfactory: "bg-red-500/20 text-red-400",
};

const scoreLevelLabels: Record<string, string> = {
  excellent: "优秀",
  good: "良好",
  satisfactory: "满意",
  needs_improvement: "待改进",
  unsatisfactory: "不合格",
};

const periodTypeLabels: Record<string, string> = {
  day: "日",
  week: "周",
  month: "月",
  quarter: "季",
  year: "年",
};

// 雷达图组件
interface PerformanceRadarChartProps {
  data: PerformanceBreakdown[];
}

function PerformanceRadarChart({ data }: PerformanceRadarChartProps) {
  const chartData = useMemo(() => {
    const maxValue = 100;
    return data.map((item, index) => {
      const angle = (index / data.length) * 2 * Math.PI - Math.PI / 2;
      const value = (item.score / maxValue) * 0.8; // 最大半径80%
      const x = 50 + 40 * Math.cos(angle);
      const y = 50 + 40 * Math.sin(angle);

      return {
        ...item,
        x,
        y,
        value,
      };
    });
  }, [data]);

  const polygonPoints = useMemo(() => {
    return chartData.map(d => `${d.x},${d.y}`).join(" ");
  }, [chartData]);

  return (
    <div className="relative w-full max-w-md mx-auto" style={{ aspectRatio: "1" }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* 背景圆圈 */}
        {[1, 2, 3, 4, 5].map((level) => (
          <circle
            key={level}
            cx="50"
            cy="50"
            r={level * 16}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
        ))}

        {/* 轴线 */}
        {chartData.map((d, index) => {
          const angle = (index / chartData.length) * 2 * Math.PI - Math.PI / 2;
          return (
            <line
              key={index}
              x1="50"
              y1="50"
              x2={50 + 40 * Math.cos(angle)}
              y2={50 + 40 * Math.sin(angle)}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              strokeOpacity="0.3"
            />
          );
        })}

        {/* 数据多边形 */}
        <polygon
          points={polygonPoints}
          fill="hsl(var(--primary))"
          fillOpacity="0.3"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {/* 数据点 */}
        {chartData.map((d, index) => (
          <circle
            key={index}
            cx={d.x}
            cy={d.y}
            r="3"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth="1"
          />
        ))}

        {/* 标签 */}
        {chartData.map((d, index) => {
          const angle = (index / chartData.length) * 2 * Math.PI - Math.PI / 2;
          const labelX = 50 + 52 * Math.cos(angle);
          const labelY = 50 + 52 * Math.sin(angle);
          return (
            <text
              key={index}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="6"
              fill="hsl(var(--foreground))"
            >
              {d.category}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// 趋势折线图组件
interface TrendLineChartProps {
  data: { period: string; value: number }[];
  color?: string;
}

function TrendLineChart({ data, color = "#f97316" }: TrendLineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = useMemo(() => {
    return data.map((d, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((d.value - minValue) / range) * 80 - 10;
      return `${x},${y}`;
    }).join(" ");
  }, [data, minValue, range]);

  return (
    <div className="relative w-full h-32">
      <svg viewBox="0 0 100 60" className="w-full h-full preserve-none">
        {/* 网格线 */}
        {[0, 20, 40, 60, 80, 100].map((y, index) => (
          <line
            key={index}
            x1="0"
            y1={y * 0.5 + 10}
            x2="100"
            y2={y * 0.5 + 10}
            stroke="hsl(var(--border))"
            strokeWidth="0.2"
            strokeOpacity="0.3"
          />
        ))}

        {/* 折线 */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 数据点 */}
        {data.map((d, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((d.value - minValue) / range) * 80 - 10;
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r="2"
                fill="white"
                stroke={color}
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={y - 4}
                textAnchor="middle"
                fontSize="4"
                fill="hsl(var(--foreground))"
              >
                {d.value}
              </text>
            </g>
          );
        })}

        {/* X轴标签 */}
        {data.map((d, index) => {
          const x = (index / (data.length - 1)) * 100;
          return (
            <text
              key={index}
              x={x}
              y="58"
              textAnchor="middle"
              fontSize="4"
              fill="hsl(var(--muted-foreground))"
            >
              {d.period}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// 热力图组件
interface HeatmapProps {
  data: { period: string; category: string; score: number }[];
  categories: string[];
  periods: string[];
}

function PerformanceHeatmap({ data, categories, periods }: HeatmapProps) {
  const getHeatColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-blue-500";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="w-12 text-xs text-muted-foreground"></div>
        {categories.map((cat) => (
          <div key={cat} className="flex-1 text-center text-xs text-muted-foreground">
            {cat}
          </div>
        ))}
      </div>
      {periods.map((period) => (
        <div key={period} className="flex gap-2">
          <div className="w-12 text-xs text-muted-foreground text-right pr-2">
            {period}
          </div>
          {categories.map((cat) => {
            const cell = data.find(d => d.period === period && d.category === cat);
            return (
              <div
                key={cat}
                className={`flex-1 aspect-square rounded ${getHeatColor(cell?.score || 0)}`}
                title={`${cat} - ${period}: ${cell?.score}分`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// 饼图组件
interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  total?: number;
}

function PerformancePieChart({ data, total }: PieChartProps) {
  const chartTotal = total || data.reduce((sum, d) => sum + d.value, 0);

  let currentAngle = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {data.map((item, idx) => {
            const angle = (item.value / chartTotal) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
            const largeArc = angle > 180 ? 1 : 0;
            const isLast = idx === data.length - 1;

            return (
              <path
                key={idx}
                d={isLast
                  ? `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
                  : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L 50 50 Z`
                }
                fill={item.color}
                className="hover:opacity-80 transition-opacity"
              />
            );
          })}
        </svg>
        {/* 中心文字 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold">{data[0].value}</div>
            <div className="text-xs text-muted-foreground">次</div>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((item) => {
          const percentage = ((item.value / chartTotal) * 100).toFixed(0);
          return (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  <span className="text-sm font-medium">{percentage}%</span>
                </div>
                <Progress value={parseFloat(percentage)} className="h-1.5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function EmployeeIntelligentPerformance() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const [periodType, setPeriodType] = useState<"day" | "week" | "month" | "quarter" | "year">("month");
  const [selectedEmployee, setSelectedEmployee] = useState<string>(mockEmployeeData.id);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [isComparisonDialogOpen, setIsComparisonDialogOpen] = useState(false);

  const currentEmployee = mockEmployeeData;
  const currentMetric = mockPerformanceMetrics[0];

  // 热力图数据
  const heatmapData = useMemo(() => {
    const categories = ["工作计划", "会议表现", "项目表现", "客户反馈"];
    const periods = mockHistoricalPerformance.map(d => d.period);
    const flatData: { period: string; category: string; score: number }[] = [];

    mockHistoricalPerformance.forEach((d) => {
      flatData.push({ period: d.period, category: "工作计划", score: d.workPlan });
      flatData.push({ period: d.period, category: "会议表现", score: d.meeting });
      flatData.push({ period: d.period, category: "项目表现", score: d.project });
      flatData.push({ period: d.period, category: "客户反馈", score: d.customer });
    });

    return { data: flatData, categories, periods };
  }, []);

  // 绩效分布数据
  const performanceDistribution = [
    { label: t("hr.intellPerf.gradeExcellent"), value: 12, color: "#22c55e" },
    { label: t("hr.intellPerf.gradeGood"), value: 25, color: "#3b82f6" },
    { label: t("hr.intellPerf.gradeSatisfactory"), value: 35, color: "#eab308" },
    { label: t("hr.intellPerf.gradeNeedsImprove"), value: 8, color: "#f97316" },
  ];

  // 对话角度分布数据
  const conversationAngleDistribution = [
    { label: t("hr.intellPerf.positiveMotivation"), value: 8, color: "#22c55e" },
    { label: t("hr.intellPerf.issuePointing"), value: 3, color: "#f97316" },
    { label: t("hr.intellPerf.techGuidance"), value: 2, color: "#3b82f6" },
    { label: t("hr.intellPerf.learningExchange"), value: 1, color: "#eab308" },
  ];

  return (
      <>
      <FeatureGuide
        featureId="employee-intelligent-performance"
        title={t("hr.intellPerf.title")}
        description={t("hr.intellPerf.featureGuideDesc")}
        steps={[
          { title: t("hr.intellPerf.tab.overview"), description: t("hr.intellPerf.guide.overviewDesc") },
          { title: t("hr.intellPerf.tab.charts"), description: t("hr.intellPerf.guide.chartsDesc") },
          { title: t("hr.intellPerf.guide.historyTrend"), description: t("hr.intellPerf.guide.historyTrendDesc") },
          { title: t("hr.intellPerf.comparison"), description: t("hr.intellPerf.guide.comparisonDesc") },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={User}
          title={t("hr.intellPerf.title")}
          description={t("hr.intellPerf.description")}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsComparisonDialogOpen(true)}>
                <ActivityIcon className="w-4 h-4 mr-2" />
                {t("hr.intellPerf.comparison")}
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {t("hr.intellPerf.exportReport")}
              </Button>
              <Button>
                <Sparkles className="w-4 h-4 mr-2" />
                {t("hr.intellPerf.aiAnalysis")}
              </Button>
            </div>
          }
        />

        {/* 员工选择 */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>{t("hr.intellPerf.employeeInfo")}</CardTitle>
            <CardDescription>{t("hr.intellPerf.selectEmployee")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={currentEmployee.avatar} alt={currentEmployee.name} />
                <AvatarFallback>{currentEmployee.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-lg">{currentEmployee.name}</div>
                <div className="text-sm text-muted-foreground">
                  {currentEmployee.department} · {currentEmployee.position}
                </div>
              </div>
              <div className="flex-1" />
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span>{t("hr.intellPerf.joinDate")}: {currentEmployee.joinDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>{t("hr.intellPerf.manager")}: {currentEmployee.manager}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 主选项卡 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card/50 border border-border flex-wrap">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              {t("hr.intellPerf.tab.overview")}
            </TabsTrigger>
            <TabsTrigger value="charts">
              <ChartLine className="w-4 h-4 mr-2" />
              {t("hr.intellPerf.tab.charts")}
            </TabsTrigger>
            <TabsTrigger value="work-plan">
              <Calendar className="w-4 h-4 mr-2" />
              {t("hr.intellPerf.tab.workPlan")}
            </TabsTrigger>
            <TabsTrigger value="meeting">
              <Video className="w-4 h-4 mr-2" />
              {t("hr.intellPerf.tab.meeting")}
            </TabsTrigger>
            <TabsTrigger value="project">
              <Briefcase className="w-4 h-4 mr-2" />
              {t("hr.intellPerf.tab.project")}
            </TabsTrigger>
            <TabsTrigger value="inquiry">
              <MessageSquare className="w-4 h-4 mr-2" />
              {t("hr.intellPerf.tab.inquiry")}
            </TabsTrigger>
            <TabsTrigger value="conversation">
              <Mic className="w-4 h-4 mr-2" />
              {t("hr.intellPerf.tab.conversation")}
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="w-4 h-4 mr-2" />
              {t("hr.intellPerf.tab.leaderboard")}
            </TabsTrigger>
            <TabsTrigger value="annual-goal">
              <Target className="w-4 h-4 mr-2" />
              年度目标
            </TabsTrigger>
          </TabsList>

          {/* 周期选择器 */}
          <div className="flex items-center justify-between">
            <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t("hr.intellPerf.daily")}</SelectItem>
                <SelectItem value="week">{t("hr.intellPerf.weekly")}</SelectItem>
                <SelectItem value="month">{t("hr.intellPerf.monthly")}</SelectItem>
                <SelectItem value="quarter">{t("hr.intellPerf.quarterly")}</SelectItem>
                <SelectItem value="year">{t("hr.intellPerf.yearly")}</SelectItem>
              </SelectContent>
            </Select>
            {currentMetric && (
              <div className="text-sm text-muted-foreground">
                {t("hr.intellPerf.statPeriod")}: {periodTypeLabels[periodType]} ({currentMetric.periodValue})
              </div>
            )}
          </div>

          {/* 绩效总览 Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${scoreLevelColors[currentMetric?.scoreLevel || "satisfactory"]} mb-4`}>
                      <span className="text-4xl font-bold">{currentMetric?.totalScore || 0}</span>
                    </div>
                    <div className="text-sm font-medium mb-1">{scoreLevelLabels[currentMetric?.scoreLevel || "satisfactory"]}</div>
                    {currentMetric?.ranking && <div className="text-xs text-muted-foreground">{t("hr.intellPerf.rankNo")} {currentMetric.ranking}</div>}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-2">{t("hr.intellPerf.workPlan")}</div>
                  <div className="text-2xl font-bold">
                    {currentMetric?.breakdown[0]?.score || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("hr.intellPerf.weight")} {currentMetric?.breakdown[0]?.weight}%</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-2">{t("hr.intellPerf.meetingPerf")}</div>
                  <div className="text-2xl font-bold">
                    {currentMetric?.breakdown[1]?.score || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("hr.intellPerf.weight")} {currentMetric?.breakdown[1]?.weight}%</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-2">{t("hr.intellPerf.projectPerf")}</div>
                  <div className="text-2xl font-bold">
                    {currentMetric?.breakdown[2]?.score || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("hr.intellPerf.weight")} {currentMetric?.breakdown[2]?.weight}%</div>
                </CardContent>
              </Card>
            </div>

            {/* AI 分析 */}
            <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  {t("hr.intellPerf.aiSmartAnalysis")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{currentMetric?.aiAnalysis}</p>
                <div>
                  <div className="text-sm font-medium mb-2">{t("hr.intellPerf.improveSuggestions")}:</div>
                  <div className="space-y-2">
                    {currentMetric?.aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                        <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 图表分析 Tab */}
          <TabsContent value="charts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 雷达图 */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RadarIcon className="w-5 h-5 text-primary" />
                    {t("hr.intellPerf.radarChart")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceRadarChart data={currentMetric?.breakdown || []} />
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {currentMetric?.breakdown.map((b, idx) => (
                      <div key={idx} className="p-2 bg-muted/50 rounded-lg">
                        <div className="text-muted-foreground mb-1">{b.category}</div>
                        <div className="font-bold">{b.score}{t("hr.intellPerf.points")}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 趋势折线图 */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartLine className="w-5 h-5 text-blue-400" />
                    {t("hr.intellPerf.trendChart")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendLineChart data={mockHistoricalPerformance.map(d => ({ period: d.period, value: d.total }))} color="#f97316" />
                </CardContent>
              </Card>

              {/* 热力图 */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3x3 className="w-5 h-5 text-orange-400" />
                    {t("hr.intellPerf.heatmap")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceHeatmap
                    data={heatmapData.data}
                    categories={heatmapData.categories}
                    periods={heatmapData.periods}
                  />
                </CardContent>
              </Card>

              {/* 分布图 */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-green-400" />
                    {t("hr.intellPerf.gradeDistribution")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformancePieChart data={performanceDistribution} />
                </CardContent>
              </Card>
            </div>

            {/* 历史趋势 */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>{t("hr.intellPerf.monthlyHistory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockHistoricalPerformance.map((d, idx) => {
                    const trend = idx > 0 ? d.total - mockHistoricalPerformance[idx - 1].total : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-12 text-sm">{d.period}</div>
                        <div className="flex-1">
                          <Progress value={d.total} className="h-3" />
                        </div>
                        <div className="w-16 text-center">
                          <span className="font-bold">{d.total}</span>
                          {trend !== 0 && (
                            <div className={`flex items-center justify-center text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {trend > 0 ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 工作计划 Tab */}
          <TabsContent value="work-plan" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle>{t("hr.intellPerf.planExecutionOverview")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockWorkPlanOutputs.map((output) => (
                      <div key={output.id}>
                        <div className="font-medium mb-3">{output.planTitle}</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t("hr.intellPerf.timeliness")}</span>
                            <span className="font-medium">{output.timelinessScore}{t("hr.intellPerf.points")}</span>
                          </div>
                          <Progress value={output.timelinessScore} className="h-2" />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t("hr.intellPerf.quality")}</span>
                            <span className="font-medium">{output.qualityScore}{t("hr.intellPerf.points")}</span>
                          </div>
                          <Progress value={output.qualityScore} className="h-2" />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t("hr.intellPerf.customerFeedback")}</span>
                            <span className="font-medium">{output.customerFeedbackScore}{t("hr.intellPerf.points")}</span>
                          </div>
                          <Progress value={output.customerFeedbackScore} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle>{t("hr.intellPerf.taskStats")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {mockWorkPlanOutputs.map((output) => (
                    <div key={output.id} className="mb-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-400">{output.completedTasks}</div>
                          <div className="text-xs text-muted-foreground">{t("hr.intellPerf.completed")}</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-400">{output.totalTasks}</div>
                          <div className="text-xs text-muted-foreground">{t("hr.intellPerf.totalTasks")}</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-400">{output.overdueTasks}</div>
                          <div className="text-xs text-muted-foreground">{t("hr.intellPerf.overdueTasks")}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* 客户评价 */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>{t("hr.intellPerf.customerRatings")}</CardTitle>
                <CardDescription>{t("hr.intellPerf.customerRatingsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockWorkPlanOutputs[0].customerRatings.map((rating) => (
                    <div key={rating.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium mb-1">{rating.customerName}</div>
                        <p className="text-sm text-muted-foreground mb-2">{rating.feedback}</p>
                        <div className="text-xs text-muted-foreground">{new Date(rating.timestamp).toLocaleDateString()}</div>
                      </div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${star <= rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 会议表现 Tab */}
          <TabsContent value="meeting" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockMeetingPerformances.map((perf) => (
                <Card key={perf.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium mb-1">{perf.meetingTitle}</div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(perf.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{perf.duration}{t("hr.intellPerf.minutes")}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {perf.role === "presenter" ? t("hr.intellPerf.presenter") : perf.role === "facilitator" ? t("hr.intellPerf.facilitator") : t("hr.intellPerf.participant")}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-muted-foreground mb-2">{t("hr.intellPerf.perfScore")}</div>
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold">{perf.performanceScore}</div>
                        <Badge className={scoreLevelColors[perf.performanceScore >= 90 ? "excellent" : perf.performanceScore >= 80 ? "good" : "satisfactory"]}>
                          {scoreLevelLabels[perf.performanceScore >= 90 ? "excellent" : perf.performanceScore >= 80 ? "good" : "satisfactory"]}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("hr.intellPerf.techClarity")}</span>
                        <Progress value={perf.technicalClarity} className="w-32 h-2" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("hr.intellPerf.proactivity")}</span>
                        <Progress value={perf.proactivity} className="w-32 h-2" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("hr.intellPerf.commSkill")}</span>
                        <Progress value={perf.communicationSkill} className="w-32 h-2" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("hr.intellPerf.problemSolving")}</span>
                        <Progress value={perf.problemSolving} className="w-32 h-2" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{t("hr.intellPerf.actionItems")}: {perf.actionItemsCompleted}/{perf.totalActionItems}</span>
                      {perf.minutesGenerated && (
                        <Badge className="bg-green-500/20 text-green-400">
                          <FileCheck className="w-3 h-3 mr-1" />
                          {t("hr.intellPerf.minutesGenerated")}
                        </Badge>
                      )}
                    </div>

                    <Dialog open={isPerformanceDialogOpen} onOpenChange={setIsPerformanceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full mt-3">
                          <Eye className="w-4 h-4 mr-1" />
                          {t("hr.intellPerf.viewAiFeedback")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-purple-400" />
                            {t("hr.intellPerf.aiMeetingFeedback")}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <p className="text-sm">{perf.aiFeedback}</p>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsPerformanceDialogOpen(false)}>
                            {t("hr.intellPerf.close")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 项目表现 Tab */}
          <TabsContent value="project" className="space-y-4">
            {mockProjectPerformances.map((perf) => (
              <Card key={perf.id} className="bg-card/50 border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{perf.projectName}</CardTitle>
                      <CardDescription>{perf.role}</CardDescription>
                    </div>
                    <Badge className={
                      perf.status === "active" ? "bg-blue-500/20 text-blue-400" :
                      perf.status === "completed" ? "bg-green-500/20 text-green-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }>
                      {perf.status === "active" ? t("hr.intellPerf.inProgress") : perf.status === "completed" ? t("hr.intellPerf.completedStatus") : t("hr.intellPerf.delayed")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{t("hr.intellPerf.projectProgress")}</span>
                      <span className="font-medium">{perf.progress}%</span>
                    </div>
                    <Progress value={perf.progress} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t("hr.intellPerf.taskCompletionRate")}</div>
                      <div className="text-2xl font-bold">{perf.tasksCompleted}/{perf.totalTasks}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t("hr.intellPerf.overallScore")}</div>
                      <div className="text-2xl font-bold text-green-400">{perf.overallScore}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">{t("hr.intellPerf.milestones")}</div>
                    <div className="space-y-2">
                      {perf.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                          <div className={`w-3 h-3 rounded-full ${milestone.status === "completed" ? "bg-green-500" : milestone.status === "in_progress" ? "bg-blue-500" : milestone.status === "delayed" ? "bg-red-500" : "bg-gray-400"}`} />
                          <div className="flex-1">
                            <div className="text-sm">{milestone.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {milestone.completedAt && `${t("hr.intellPerf.completedAt")}: ${new Date(milestone.completedAt).toLocaleDateString()}`}
                              {!milestone.completedAt && `${t("hr.intellPerf.targetDate")}: ${new Date(milestone.targetDate).toLocaleDateString()}`}
                            </div>
                          </div>
                          {milestone.score > 0 && (
                            <div className="text-sm font-bold text-blue-400">{milestone.score}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* 员工询问 Tab */}
          <TabsContent value="inquiry" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle>{t("hr.intellPerf.recentInquiries")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockEmployeeInquiries.map((inquiry) => (
                      <div key={inquiry.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>{inquiry.inquirerName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{inquiry.inquirerName}</div>
                              <div className="text-xs text-muted-foreground">{inquiry.inquirerType === "customer" ? t("hr.intellPerf.customer") : t("hr.intellPerf.colleague")}</div>
                            </div>
                          </div>
                          <Badge className={
                            inquiry.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                            inquiry.status === "responded" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                          }>
                            {inquiry.status === "pending" ? t("hr.intellPerf.pending") : inquiry.status === "responded" ? t("hr.intellPerf.responded") : t("hr.intellPerf.resolved")}
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Badge variant="outline">{inquiry.category === "question" ? t("hr.intellPerf.question") : inquiry.category === "feedback" ? t("hr.intellPerf.feedback") : t("hr.intellPerf.other")}</Badge>
                            <span>{new Date(inquiry.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-sm">{inquiry.content}</p>
                        </div>
                        {inquiry.responseTime && (
                          <div className="text-xs text-muted-foreground">
                            {t("hr.intellPerf.responseTime")}: {inquiry.responseTime} {t("hr.intellPerf.hours")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle>{t("hr.intellPerf.aiSuggestedReply")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockEmployeeInquiries
                      .filter(i => !i.response)
                      .map((inquiry) => (
                        <div key={inquiry.id} className="p-3 bg-purple-500/10 rounded-lg">
                          <div className="flex items-start gap-2 mb-2">
                            <Bot className="w-5 h-5 text-purple-400 flex-shrink-0" />
                            <span className="text-sm font-medium">{t("hr.intellPerf.aiSuggestedReply")}:</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{inquiry.aiSuggestedResponse}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm">{t("hr.intellPerf.adopt")}</Button>
                            <Button size="sm" variant="outline">{t("hr.intellPerf.edit")}</Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 对话记录 Tab */}
          <TabsContent value="conversation" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>{t("hr.intellPerf.conversationRecords")}</CardTitle>
                <CardDescription>{t("hr.intellPerf.conversationRecordsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {mockConversationRecords.map((record) => (
                    <div key={record.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{record.participant.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{record.participant}</div>
                            <div className="text-sm text-muted-foreground">{new Date(record.timestamp).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    {t("hr.intellPerf.aiConversationAnalysis")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-white/50 rounded-lg">
                      <div className="text-sm font-medium mb-2">{t("hr.intellPerf.angleDistribution")}</div>
                      <PerformancePieChart data={conversationAngleDistribution} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("hr.intellPerf.aiConversationSuggestion")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle>{t("hr.intellPerf.conversationStats")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">{t("hr.intellPerf.avgDuration")}</div>
                      <div className="text-3xl font-bold">45 {t("hr.intellPerf.minutes")}</div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">{t("hr.intellPerf.convTypeDistribution")}</div>
                      <div className="space-y-2">
                        {[
                          { type: t("hr.intellPerf.perfDiscussion"), count: 4 },
                          { type: t("hr.intellPerf.feedback"), count: 3 },
                          { type: t("hr.intellPerf.coaching"), count: 2 },
                          { type: t("hr.intellPerf.learning"), count: 1 },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm">{item.type}</span>
                            <Badge variant="secondary">{item.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 红黑榜 Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>{t("hr.intellPerf.leaderboard")}</CardTitle>
                <CardDescription>{t("hr.intellPerf.leaderboardDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">{t("hr.intellPerf.topBoard")} - Top 5</span>
                  </div>
                  {mockLeaderboard.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index < 3 ? 'bg-yellow-500 text-white' : index < 5 ? 'bg-gray-500 text-white' : 'bg-gray-400 text-white'}`}>
                          {index + 1}
                        </div>
                        <Avatar>
                          <AvatarFallback>{item.employeeName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{item.employeeName}</div>
                          <div className="text-sm text-muted-foreground">{item.department}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xl font-bold">{item.score}</div>
                        </div>
                        <Badge className={`flex items-center gap-1 ${item.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {item.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {Math.abs(item.change)}
                        </Badge>
                        {item.trend === "up" && <TrendingUpIcon className="w-4 h-4 text-green-400" />}
                        {item.trend === "down" && <TrendingDownIcon className="w-4 h-4 text-red-400" />}
                      </div>
                    </div>
                  ))}
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-gray-500/20 to-red-500/20 rounded-lg mt-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="font-medium">{t("hr.intellPerf.bottomBoard")} - Last 5</span>
                </div>
                {mockLeaderboard.slice().reverse().slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-gray-400 text-white">
                        {mockLeaderboard.length - index}
                      </div>
                      <Avatar>
                        <AvatarFallback>{item.employeeName.charAt(0)}</AvatarFallback>
                        </Avatar>
                      <div>
                        <div className="font-medium">{item.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{item.department}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{item.score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 年度目标 Tab (integrated from AnnualGoalAgreement) ═══ */}
          <TabsContent value="annual-goal" className="space-y-4">
            <AnnualGoalInlinePanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* 对比分析对话框 */}
      <Dialog open={isComparisonDialogOpen} onOpenChange={setIsComparisonDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-primary" />
              {t("hr.intellPerf.comparisonAnalysis")}
            </DialogTitle>
            <DialogDescription>
              {t("hr.intellPerf.comparisonAnalysisDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <Label>{t("hr.intellPerf.selectCompareEmployees")}</Label>
              <div className="flex gap-2 mt-2">
                {mockLeaderboard.slice(0, 5).map((emp) => (
                  <div key={emp.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <Checkbox id={`emp-${emp.id}`} />
                    <label htmlFor={`emp-${emp.id}`} className="flex items-center gap-2 cursor-pointer">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>{emp.employeeName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{emp.employeeName}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("hr.intellPerf.compareDimensions")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[t("hr.intellPerf.workPlan"), t("hr.intellPerf.meetingPerf"), t("hr.intellPerf.projectPerf"), t("hr.intellPerf.customerFeedback")].map((dim) => (
                    <div key={dim} className="flex items-center gap-2">
                      <Checkbox id={`dim-${dim}`} defaultChecked />
                      <label htmlFor={`dim-${dim}`} className="text-sm cursor-pointer">{dim}</label>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("hr.intellPerf.comparePeriod")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <RadioGroup defaultValue="thisMonth">
                    {[
                      { value: "thisMonth", label: t("hr.intellPerf.thisMonth") },
                      { value: "lastMonth", label: t("hr.intellPerf.lastMonth") },
                      { value: "quarter", label: t("hr.intellPerf.quarterPeriod") },
                      { value: "annual", label: t("hr.intellPerf.annualPeriod") },
                    ].map((item) => (
                      <div key={item.value} className="flex items-center gap-2">
                        <RadioGroupItem value={item.value} id={`period-${item.value}`} />
                        <Label htmlFor={`period-${item.value}`} className="cursor-pointer">{item.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsComparisonDialogOpen(false)}>
                {t("hr.intellPerf.cancel")}
              </Button>
              <Button>
                <ActivityIcon className="w-4 h-4 mr-2" />
                {t("hr.intellPerf.generateCompareReport")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </>
  );
}

// ═══════════════════════════════════════════════════════
// Inline Panel: Annual Goal within Performance page
// ═══════════════════════════════════════════════════════
function AnnualGoalInlinePanel() {
  const { user } = useAuth();
  const employeeId = user?.id ?? 0;
  const year = new Date().getFullYear();

  const goalQ = trpc.annualGoalIncentive.dashboard.employeeSummary.useQuery(
    { employeeId, year },
    { enabled: !!employeeId }
  );

  const agreement = goalQ.data?.agreement;
  const dimensions = goalQ.data?.dimensions || [];
  const checkpoints = goalQ.data?.checkpoints || [];
  const projection = goalQ.data?.projection;

  if (!agreement) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
        {year} 年度目标协定尚未创建。请联系主管在「年度目标协定」页面创建。
      </CardContent></Card>
    );
  }

  const compositeScore = dimensions.reduce(
    (s: number, d: any) => s + (parseFloat(d.currentScore || "0") * parseFloat(d.weight || "0")) / 100, 0
  );
  const perfLevels = (agreement.performanceLevelsJson as any[]) || [];

  return (
    <div className="space-y-4">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{compositeScore.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">综合得分</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{agreement.projectedBonusMonths || "0"}</div>
            <div className="text-xs text-muted-foreground">预估奖金(月)</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{checkpoints.filter((c: any) => c.status === "completed").length}/{checkpoints.length}</div>
            <div className="text-xs text-muted-foreground">检查点完成</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{dimensions.length}</div>
            <div className="text-xs text-muted-foreground">考核维度</div>
          </CardContent>
        </Card>
      </div>

      {/* Dimensions Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">考核维度与进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dimensions.map((d: any) => {
              const score = parseFloat(d.currentScore || "0");
              const weight = parseFloat(d.weight || "0");
              return (
                <div key={d.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.dimensionName} <span className="text-muted-foreground font-normal">({weight}%)</span></span>
                    <span className="font-mono"><span className="font-bold">{score}</span>/100 = <span className="text-blue-600 font-bold">{((score * weight) / 100).toFixed(1)}</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${score >= 70 ? "bg-green-500" : score >= 40 ? "bg-blue-500" : "bg-amber-400"}`}
                      style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Checkpoints + Performance Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">检查点时间线</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checkpoints.map((cp: any) => (
                <div key={cp.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {cp.status === "completed"
                      ? <div className="w-2 h-2 rounded-full bg-green-500" />
                      : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                    <span className="text-sm">{cp.checkpointType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(cp.scheduledDate).toLocaleDateString()}</span>
                    {cp.overallScore && <span className="text-xs font-mono font-bold">{cp.overallScore}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">绩效等级 → 激励映射</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {perfLevels.map((l: any) => (
                <div key={l.code} className={`text-center p-3 rounded-lg border ${l.code === "A" ? "border-green-200 bg-green-50" : l.code === "B" ? "border-blue-200 bg-blue-50" : l.code === "C" ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}`}>
                  <div className="text-lg font-bold">{l.level}</div>
                  <div className="text-xs text-muted-foreground">{l.code}级</div>
                  <div className="text-sm font-semibold mt-1">{l.bonusMonths}月</div>
                </div>
              ))}
            </div>
            {(agreement.careerPathOptionJson as any)?.upgradeRole && (
              <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                🚀 升级路径: {(agreement.careerPathOptionJson as any).upgradeRole} → 奖金×{(agreement.careerPathOptionJson as any).bonusCapMultiplier || 2} + 基数+{(agreement.careerPathOptionJson as any).salaryDeltaPct || 20}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
