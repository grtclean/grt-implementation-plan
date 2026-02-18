import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  BrainCircuit,
  Zap,
  BarChart3,
  Mail,
  GripVertical,
  Loader2,
  FolderOpen,
  ChevronDown,
  Sparkles,
  RefreshCw,
  GanttChart,
  Send,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ==================== 数据类型定义 ====================

type BUType = { id: string; name: string };
type TStageStatus = "Pending" | "Planned" | "In Progress" | "Risk" | "Completed";
type RoleType = "Sales" | "Mech" | "Elec" | "Assembly" | "Debug" | "Delivery" | "CS";

interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  bu: string;
  status: "active" | "completed" | "on-hold";
}

interface TStage {
  id: string;
  name: string;
  role: RoleType;
  status: TStageStatus;
  startDay: number;
  duration: number;
}

interface StageData {
  id: string;
  status: TStageStatus;
  plannedTime: string;
  actualTime: string;
  owner: string;
  sop: string;
  risks: string;
  steps: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ==================== 模拟数据 ====================

const BUs: BUType[] = [
  { id: "BU1", name: "BU1 - 海外事业部" },
  { id: "BU2", name: "BU2 - 商用车事业部" },
  { id: "BU3", name: "BU3 - 乘用车事业部" },
  { id: "BU4", name: "BU4 - 半导体事业部" },
  { id: "BU5", name: "BU5 - 工业通用事业部" },
];

const PROJECTS: Project[] = [
  { id: "p1", code: "PJ-2026-X7", name: "海外客户清洗设备", client: "FutureChip Inc.", bu: "BU1", status: "active" },
  { id: "p2", code: "PJ-2026-A3", name: "商用车发动机清洗机", client: "东风商用车", bu: "BU2", status: "active" },
  { id: "p3", code: "PJ-2026-M1", name: "乘用车变速箱清洗机", client: "吉利汽车", bu: "BU3", status: "on-hold" },
  { id: "p4", code: "PJ-2025-X9", name: "芯片载体清洗机", client: "SemiCorp", bu: "BU4", status: "completed" },
  { id: "p5", code: "PJ-2026-O1", name: "半导体晶圆清洗线", client: "中芯国际", bu: "BU4", status: "active" },
  { id: "p6", code: "PJ-2026-G1", name: "通用零件清洗系统", client: "华东工业", bu: "BU5", status: "active" },
];

const INITIAL_STAGES: TStage[] = [
  { id: "T1", name: "需求分析", role: "Sales", status: "Completed", startDay: 1, duration: 5 },
  { id: "T2", name: "方案设计", role: "Sales", status: "Completed", startDay: 6, duration: 7 },
  { id: "T3", name: "机械设计", role: "Mech", status: "Completed", startDay: 13, duration: 14 },
  { id: "T4", name: "电气设计", role: "Elec", status: "Completed", startDay: 13, duration: 12 },
  { id: "T5", name: "BOM采购", role: "Sales", status: "Completed", startDay: 20, duration: 21 },
  { id: "T6", name: "机械装配", role: "Assembly", status: "In Progress", startDay: 41, duration: 14 },
  { id: "T7", name: "电气装配", role: "Assembly", status: "In Progress", startDay: 48, duration: 10 },
  { id: "T8", name: "系统集成", role: "Debug", status: "Planned", startDay: 58, duration: 7 },
  { id: "T9", name: "调试", role: "Debug", status: "Pending", startDay: 65, duration: 10 },
  { id: "T10", name: "内部测试", role: "Debug", status: "Pending", startDay: 75, duration: 5 },
  { id: "T11", name: "拆机", role: "Assembly", status: "Pending", startDay: 80, duration: 3 },
  { id: "T12", name: "发货", role: "Delivery", status: "Pending", startDay: 83, duration: 5 },
  { id: "T13", name: "现场安装", role: "CS", status: "Pending", startDay: 88, duration: 7 },
  { id: "T14", name: "SAT测试", role: "CS", status: "Pending", startDay: 95, duration: 5 },
  { id: "T15", name: "终验收", role: "CS", status: "Pending", startDay: 100, duration: 3 },
];

const STATUS_OPTIONS: TStageStatus[] = ["Pending", "Planned", "In Progress", "Risk", "Completed"];

// M2 Kick-off Data (The "Nexus")
const M2_CONTEXT = {
  projectCode: "PJ-2026-X7",
  client: "FutureChip Inc.",
  requirements: ["UL Certification", "Class 100 Cleanroom", "CE Mark"],
  constraints: "Elevator Dimensions: 2.1m x 1.5m",
  criticalInfo: "Customer demands weekly video report via Teams.",
};

// ==================== 组件定义 ====================

const StatusBadge = ({ status, onClick }: { status: TStageStatus; onClick?: () => void }) => {
  const colors: Record<TStageStatus, string> = {
    Completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "In Progress": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Pending: "bg-slate-700/50 text-slate-500 border-slate-600",
    Planned: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    Risk: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span 
      className={cn(
        "px-2 py-0.5 rounded text-xs border transition-all",
        colors[status] || colors["Pending"],
        onClick && "cursor-pointer hover:scale-105"
      )}
      onClick={onClick}
    >
      {status}
    </span>
  );
};

const AICard = ({ title, content, type = "info", loading = false }: { title: string; content: string; type?: "info" | "risk"; loading?: boolean }) => (
  <div
    className={cn(
      "p-4 rounded-xl border mb-3 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]",
      type === "risk" ? "bg-red-900/10 border-red-500/30" : "bg-indigo-900/10 border-indigo-500/30"
    )}
  >
    <div className="flex items-center gap-2 mb-2">
      {loading ? (
        <Loader2 size={16} className="text-indigo-400 animate-spin" />
      ) : type === "risk" ? (
        <AlertTriangle size={16} className="text-red-400" />
      ) : (
        <BrainCircuit size={16} className="text-indigo-400" />
      )}
      <h4 className={`text-sm font-bold ${type === "risk" ? "text-red-300" : "text-indigo-300"}`}>{title}</h4>
    </div>
    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{loading ? "AI正在分析..." : content}</p>
  </div>
);

// 甘特图组件
const GanttChart_Component = ({ 
  stages, 
  selectedStage, 
  onSelectStage,
  onDragEnd 
}: { 
  stages: TStage[]; 
  selectedStage: string;
  onSelectStage: (id: string) => void;
  onDragEnd: (stageId: string, newStartDay: number, newDuration: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ stageId: string; type: "move" | "resize-left" | "resize-right"; startX: number; originalStart: number; originalDuration: number } | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  const totalDays = 112; // 16 weeks
  const dayWidth = 8;
  const rowHeight = 36;
  const headerHeight = 40;
  const labelWidth = 120;
  
  // 生成周标签
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < 16; i++) {
      result.push({ week: i + 1, startDay: i * 7 + 1 });
    }
    return result;
  }, []);

  const statusColors: Record<TStageStatus, string> = {
    Completed: "#10b981",
    "In Progress": "#3b82f6",
    Planned: "#6366f1",
    Risk: "#ef4444",
    Pending: "#475569",
  };

  const handleMouseDown = (e: React.MouseEvent, stageId: string, type: "move" | "resize-left" | "resize-right") => {
    e.stopPropagation();
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    
    setDragging({
      stageId,
      type,
      startX: e.clientX,
      originalStart: stage.startDay,
      originalDuration: stage.duration,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    
    const deltaX = e.clientX - dragging.startX;
    const deltaDays = Math.round(deltaX / dayWidth);
    
    // 实时预览（不实际更新状态）
  }, [dragging, dayWidth]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    
    const deltaX = e.clientX - dragging.startX;
    const deltaDays = Math.round(deltaX / dayWidth);
    
    let newStart = dragging.originalStart;
    let newDuration = dragging.originalDuration;
    
    if (dragging.type === "move") {
      newStart = Math.max(1, dragging.originalStart + deltaDays);
    } else if (dragging.type === "resize-left") {
      newStart = Math.max(1, dragging.originalStart + deltaDays);
      newDuration = Math.max(1, dragging.originalDuration - deltaDays);
    } else if (dragging.type === "resize-right") {
      newDuration = Math.max(1, dragging.originalDuration + deltaDays);
    }
    
    if (newStart !== dragging.originalStart || newDuration !== dragging.originalDuration) {
      onDragEnd(dragging.stageId, newStart, newDuration);
    }
    
    setDragging(null);
  }, [dragging, dayWidth, onDragEnd]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <GanttChart size={16} className="text-orange-400" />
          项目甘特图 - T1~T15 时间线
        </h3>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 px-2"
            onClick={() => setScrollOffset(Math.max(0, scrollOffset - 7 * dayWidth))}
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs text-slate-400">Week {Math.floor(scrollOffset / (7 * dayWidth)) + 1}</span>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 px-2"
            onClick={() => setScrollOffset(Math.min((totalDays - 28) * dayWidth, scrollOffset + 7 * dayWidth))}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="flex">
        {/* Stage Labels */}
        <div className="flex-shrink-0 border-r border-slate-800" style={{ width: labelWidth }}>
          <div className="h-10 border-b border-slate-800 px-3 flex items-center">
            <span className="text-xs text-slate-500 font-medium">阶段</span>
          </div>
          {stages.map(stage => (
            <div 
              key={stage.id}
              className={cn(
                "px-3 flex items-center gap-2 border-b border-slate-800/50 cursor-pointer transition-colors",
                selectedStage === stage.id ? "bg-orange-600/10" : "hover:bg-slate-800/30"
              )}
              style={{ height: rowHeight }}
              onClick={() => onSelectStage(stage.id)}
            >
              <span className={cn(
                "text-xs font-mono",
                selectedStage === stage.id ? "text-orange-400" : "text-slate-400"
              )}>
                {stage.id}
              </span>
              <span className="text-xs text-slate-300 truncate">{stage.name}</span>
            </div>
          ))}
        </div>
        
        {/* Timeline Grid */}
        <div className="flex-1 overflow-hidden" ref={containerRef}>
          <div 
            className="relative"
            style={{ 
              width: totalDays * dayWidth,
              transform: `translateX(-${scrollOffset}px)`,
              transition: "transform 0.2s ease-out"
            }}
          >
            {/* Week Headers */}
            <div className="flex border-b border-slate-800" style={{ height: headerHeight }}>
              {weeks.map(w => (
                <div 
                  key={w.week}
                  className="flex items-center justify-center border-r border-slate-800/50 text-xs text-slate-500"
                  style={{ width: 7 * dayWidth }}
                >
                  W{w.week}
                </div>
              ))}
            </div>
            
            {/* Grid Lines */}
            <div className="absolute top-10 left-0 right-0 bottom-0 pointer-events-none">
              {weeks.map(w => (
                <div 
                  key={w.week}
                  className="absolute top-0 bottom-0 border-r border-slate-800/30"
                  style={{ left: w.week * 7 * dayWidth }}
                />
              ))}
            </div>
            
            {/* Bars */}
            {stages.map((stage, index) => {
              const left = (stage.startDay - 1) * dayWidth;
              const width = stage.duration * dayWidth;
              const top = headerHeight + index * rowHeight + 6;
              const isSelected = selectedStage === stage.id;
              
              return (
                <div
                  key={stage.id}
                  className={cn(
                    "absolute rounded-md cursor-pointer transition-all group",
                    isSelected && "ring-2 ring-orange-400 ring-offset-1 ring-offset-[#111625]"
                  )}
                  style={{
                    left,
                    top,
                    width,
                    height: rowHeight - 12,
                    backgroundColor: statusColors[stage.status],
                    opacity: stage.status === "Pending" ? 0.5 : 0.85,
                  }}
                  onClick={() => onSelectStage(stage.id)}
                  onMouseDown={(e) => handleMouseDown(e, stage.id, "move")}
                >
                  {/* Resize Handles */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-l-md"
                    onMouseDown={(e) => handleMouseDown(e, stage.id, "resize-left")}
                  />
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-r-md"
                    onMouseDown={(e) => handleMouseDown(e, stage.id, "resize-right")}
                  />
                  
                  {/* Label */}
                  {width > 40 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium truncate px-1">
                      {stage.id}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-800 bg-slate-900/30">
        {STATUS_OPTIONS.map(status => (
          <div key={status} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: statusColors[status], opacity: status === "Pending" ? 0.5 : 0.85 }}
            />
            <span className="text-[10px] text-slate-400">{status}</span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-slate-500">
          拖拽调整时间 | 点击选择阶段
        </div>
      </div>
    </div>
  );
};

// AI对话组件
const AIChatPanel = ({ 
  projectContext, 
  currentStage 
}: { 
  projectContext: typeof M2_CONTEXT;
  currentStage: TStage | undefined;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `你好！我是Manus Copilot，你的智能项目助手。\n\n当前项目: ${projectContext.projectCode}\n客户: ${projectContext.client}\n\n我可以帮你：\n• 分析项目风险和建议\n• 查询SOP和最佳实践\n• 生成报告和文档\n• 解答技术问题\n\n请问有什么可以帮助你的？`,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // 模拟AI响应
    await new Promise(resolve => setTimeout(resolve, 1500));

    const query = inputValue.toLowerCase();
    let response = "";

    if (query.includes("风险") || query.includes("risk")) {
      response = `基于当前项目 ${projectContext.projectCode} 的分析：\n\n**主要风险点：**\n1. **供应链风险** - UL认证线缆供应商交期可能延迟2-3天\n2. **技术风险** - Class 100洁净室要求，历史数据显示15%的项目出现颗粒物问题\n3. **进度风险** - ${currentStage?.name || "当前阶段"}需要密切关注\n\n**建议措施：**\n• 启动备选供应商评估\n• 增加质量检查频率\n• 每日进度同步会议`;
    } else if (query.includes("sop") || query.includes("流程") || query.includes("标准")) {
      response = `**${currentStage?.id || "T6"} ${currentStage?.name || "机械装配"} SOP要点：**\n\n1. **准备阶段**\n   - 确认BOM物料齐套\n   - 检查工装夹具状态\n   - 核对图纸版本\n\n2. **执行要求**\n   - UL-969标准线缆标签\n   - 高低压分离≥2英寸\n   - 使用低释气材料\n\n3. **质量检查点**\n   - 每4小时自检一次\n   - 关键工序双人确认\n   - 拍照留档`;
    } else if (query.includes("进度") || query.includes("状态") || query.includes("progress")) {
      response = `**项目进度概览：**\n\n• 已完成: T1-T5 (5/15阶段)\n• 进行中: T6-T7 (机械/电气装配)\n• 待开始: T8-T15\n\n**当前阶段详情：**\n• ${currentStage?.name || "机械装配"}\n• 计划工期: ${currentStage?.duration || 14}天\n• 实际进度: 提前6小时\n• 负责人: Li Ming (Elec Lead)\n\n**预计完成时间：** 2026年3月15日`;
    } else if (query.includes("报告") || query.includes("report")) {
      response = `**可生成的报告类型：**\n\n1. **周报** - 项目进度、风险、下周计划\n2. **阶段报告** - 当前阶段详细执行情况\n3. **客户报告** - 适合发送给客户的进度更新\n4. **质量报告** - 质量检查结果汇总\n\n请告诉我你需要哪种报告，我可以立即生成草稿。`;
    } else {
      response = `感谢你的问题！\n\n基于项目 ${projectContext.projectCode} 的上下文，我的建议是：\n\n1. 当前处于 ${currentStage?.name || "装配"} 阶段，建议重点关注质量控制\n2. 客户 ${projectContext.client} 要求每周视频汇报，请确保准备好素材\n3. ${projectContext.constraints} 是关键约束，请在设计评审时确认\n\n如果你有更具体的问题，请随时告诉我！`;
    }

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#111625] border border-slate-800 rounded-2xl flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Bot size={16} className="text-orange-400" />
          Manus Copilot 对话
          <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded">在线</span>
        </h3>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 px-2 text-slate-400"
          onClick={() => setMessages([messages[0]])}
        >
          清空对话
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div 
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              msg.role === "assistant" ? "bg-orange-600/20" : "bg-blue-600/20"
            )}>
              {msg.role === "assistant" ? (
                <Bot size={16} className="text-orange-400" />
              ) : (
                <User size={16} className="text-blue-400" />
              )}
            </div>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3",
              msg.role === "assistant" 
                ? "bg-slate-800/50 text-slate-200" 
                : "bg-blue-600/20 text-blue-100"
            )}>
              <p className="text-sm whitespace-pre-line">{msg.content}</p>
              <p className="text-[10px] text-slate-500 mt-2">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center">
              <Bot size={16} className="text-orange-400" />
            </div>
            <div className="bg-slate-800/50 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-orange-400" />
                <span className="text-sm text-slate-400">AI正在思考...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入问题，如：分析当前风险、查询SOP、生成报告..."
            className="bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="bg-orange-600 hover:bg-orange-500"
          >
            <Send size={16} />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {["分析风险", "查询SOP", "查看进度", "生成报告"].map(suggestion => (
            <button
              key={suggestion}
              className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-colors"
              onClick={() => setInputValue(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function GRTOperationDashboard() {
  const { language } = useLanguage();
  const [activeBU, setActiveBU] = useState(BUs[0].id);
  const [selectedProject, setSelectedProject] = useState<Project>(PROJECTS[0]);
  const [selectedStage, setSelectedStage] = useState("T6");
  const [stages, setStages] = useState<TStage[]>(INITIAL_STAGES);
  const [userView, setUserView] = useState<"dashboard" | "tasks" | "performance">("dashboard");
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<TStage | null>(null);
  const [newStatus, setNewStatus] = useState<TStageStatus>("Pending");
  const [activeTab, setActiveTab] = useState<"pipeline" | "gantt" | "chat">("pipeline");
  
  // AI推荐状态
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSopRecommendation, setAiSopRecommendation] = useState<string>("");
  const [aiRiskRecommendation, setAiRiskRecommendation] = useState<string>("");

  // 过滤当前BU的项目
  const filteredProjects = useMemo(() => {
    return PROJECTS.filter(p => p.bu === activeBU);
  }, [activeBU]);

  // 当前选中的阶段
  const currentStage = useMemo(() => {
    return stages.find(s => s.id === selectedStage);
  }, [stages, selectedStage]);

  // 模拟阶段数据
  const stageData: StageData = useMemo(() => {
    return {
      id: selectedStage,
      status: currentStage?.status || "Pending",
      plannedTime: `${currentStage?.duration || 14} Days`,
      actualTime: "18 Hours",
      owner: "Li Ming (Elec Lead)",
      sop: aiSopRecommendation || (selectedStage === "T6"
        ? 'Based on M2 "UL Certification" req: Ensure all wire labels use UL-969 standard material. Separate HV/LV wiring by min 2 inches.'
        : "Standard operating procedure loading..."),
      risks: aiRiskRecommendation || (selectedStage === "T6"
        ? 'Risk Detected: Previous project with "Class 100" req had cable particle generation issues. Use low-outgassing cables.'
        : "No immediate risks detected."),
      steps: ["Review electrical schematics", "Prepare cable routing plan", "Install main power distribution", "Connect control circuits", "Label all connections per UL-969"],
    };
  }, [selectedStage, currentStage, aiSopRecommendation, aiRiskRecommendation]);

  // 打开状态编辑对话框
  const openStatusDialog = useCallback((stage: TStage) => {
    setEditingStage(stage);
    setNewStatus(stage.status);
    setStatusDialogOpen(true);
  }, []);

  // 更新阶段状态
  const updateStageStatus = useCallback(() => {
    if (!editingStage) return;
    
    setStages(prev => prev.map(s => 
      s.id === editingStage.id ? { ...s, status: newStatus } : s
    ));
    setStatusDialogOpen(false);
    toast.success(`${editingStage.id} 状态已更新为 ${newStatus}`);
  }, [editingStage, newStatus]);

  // 甘特图拖拽更新
  const handleGanttDragEnd = useCallback((stageId: string, newStartDay: number, newDuration: number) => {
    setStages(prev => prev.map(s => 
      s.id === stageId ? { ...s, startDay: newStartDay, duration: newDuration } : s
    ));
    toast.success(`${stageId} 时间已更新: 第${newStartDay}天开始, 持续${newDuration}天`);
  }, []);

  // 切换项目
  const switchProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setProjectSelectorOpen(false);
    setStages(INITIAL_STAGES);
    toast.success(`已切换到项目: ${project.name}`);
  }, []);

  // 获取AI推荐
  const fetchAIRecommendations = useCallback(async () => {
    setAiLoading(true);
    setAiSopRecommendation("");
    setAiRiskRecommendation("");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stageName = currentStage?.name || selectedStage;
    
    setAiSopRecommendation(
      `[AI Generated] 基于M2项目上下文和${stageName}阶段要求：\n` +
      `1. 客户要求UL认证，确保所有线缆标签使用UL-969标准材料\n` +
      `2. Class 100洁净室要求，使用低释气电缆\n` +
      `3. 高低压线缆分离间距不小于2英寸\n` +
      `4. 参考历史项目PJ-2025-X9的成功经验`
    );
    
    setAiRiskRecommendation(
      `[AI Generated] 风险预警：\n` +
      `1. 历史数据显示Class 100项目电缆颗粒物问题发生率15%\n` +
      `2. 当前进度比计划提前6小时，建议保持质量检查频率\n` +
      `3. 供应商A的UL线缆交期可能延迟2天，建议启动备选方案`
    );
    
    setAiLoading(false);
    toast.success("AI推荐已更新");
  }, [selectedStage, currentStage]);

  return (
      <div className="min-h-screen bg-[#0A0E17] text-slate-200 font-sans selection:bg-blue-500/30">
        {/* Sidebar Navigation */}
        <nav className="fixed left-0 top-0 h-full w-64 bg-[#111625] border-r border-slate-800 p-4 flex flex-col z-50">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-orange-900/20">
              G
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">GRT SYSTEM</h1>
              <p className="text-[10px] text-slate-500">Intelligent Operations</p>
            </div>
          </div>

          {/* BU Selector */}
          <div className="mb-6">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 px-2">Business Unit</p>
            <Select value={activeBU} onValueChange={setActiveBU}>
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {BUs.map((bu) => (
                  <SelectItem key={bu.id} value={bu.id}>
                    {bu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Switcher */}
          <div className="space-y-1 mb-6">
            {[
              { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
              { id: "tasks", icon: Calendar, label: "Tasks" },
              { id: "performance", icon: Activity, label: "Performance" },
            ].map((view) => (
              <button
                key={view.id}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  userView === view.id
                    ? "bg-orange-600/20 text-orange-400 border border-orange-500/30"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                )}
                onClick={() => setUserView(view.id as any)}
              >
                <view.icon size={16} />
                {view.label}
              </button>
            ))}
          </div>

          {/* Integration Status */}
          <div className="mt-auto space-y-3 pt-4 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2">Integrations</p>
            {[
              { name: "Outlook", status: "synced", color: "emerald" },
              { name: "Teams", status: "active", color: "blue" },
              { name: "WeCom", status: "ready", color: "indigo" },
            ].map((int) => (
              <div key={int.name} className="flex items-center justify-between px-2">
                <span className="text-xs text-slate-400">{int.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded bg-${int.color}-900/30 text-${int.color}-400`}>
                  {int.status}
                </span>
              </div>
            ))}
          </div>

          {/* User Info */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              LM
            </div>
            <div>
              <p className="text-xs text-slate-200 font-medium">Li Ming</p>
              <p className="text-[10px] text-slate-500">Elec Lead</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-lg font-bold text-orange-400">87</p>
              <p className="text-[9px] text-slate-500">AI Score</p>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="ml-64 p-8">
          {/* Project Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <button 
                  className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors mb-2"
                  onClick={() => setProjectSelectorOpen(true)}
                >
                  <FolderOpen size={16} />
                  <span className="text-sm font-mono">{selectedProject.code}</span>
                  <ChevronDown size={14} />
                </button>
                <h1 className="text-2xl font-bold text-white">{selectedProject.name}</h1>
                <p className="text-sm text-slate-400 mt-1">客户: {selectedProject.client}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500">M2 Context</p>
                  <p className="text-sm text-slate-300">{M2_CONTEXT.constraints}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
            <TabsList className="bg-slate-900/50 border border-slate-800">
              <TabsTrigger value="pipeline" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-400">
                <Activity size={14} className="mr-2" />
                流程管道
              </TabsTrigger>
              <TabsTrigger value="gantt" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-400">
                <GanttChart size={14} className="mr-2" />
                甘特图
              </TabsTrigger>
              <TabsTrigger value="chat" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-400">
                <MessageSquare size={14} className="mr-2" />
                AI对话
              </TabsTrigger>
            </TabsList>

            {/* Pipeline View */}
            <TabsContent value="pipeline" className="mt-6">
              {/* T1-T15 Pipeline */}
              <section className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">T1 → T15 Pipeline</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>

                <div className="flex items-start gap-1 overflow-x-auto pb-4">
                  {stages.map((stage, index) => {
                    const isActive = selectedStage === stage.id;
                    return (
                      <div key={stage.id} className="flex flex-col items-center min-w-[70px] group relative">
                        {/* Connector Line */}
                        {index > 0 && (
                          <div
                            className={cn(
                              "absolute top-5 -left-1 w-2 h-0.5",
                              stages[index - 1].status === "Completed" ? "bg-emerald-500/50" : "bg-slate-700"
                            )}
                          />
                        )}

                        {/* Node */}
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-300 relative",
                            isActive
                              ? "bg-orange-600 border-orange-400 text-white scale-125 shadow-lg shadow-orange-600/50"
                              : stage.status === "Completed"
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                              : stage.status === "In Progress"
                              ? "bg-blue-600/20 border-blue-500 text-blue-400"
                              : stage.status === "Risk"
                              ? "bg-red-600/20 border-red-500 text-red-400"
                              : stage.status === "Planned"
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                              : "bg-[#111625] border-slate-700 text-slate-600 hover:border-slate-500"
                          )}
                          onClick={() => setSelectedStage(stage.id)}
                        >
                          <GripVertical size={12} className="absolute -left-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                          {stage.id}
                        </div>

                        {/* Label */}
                        <div className={`mt-3 text-center transition-colors ${isActive ? "text-orange-400" : "text-slate-500"}`}>
                          <p className="text-xs font-bold">{stage.name}</p>
                          <p className="text-[9px] opacity-60">{stage.role}</p>
                          <StatusBadge 
                            status={stage.status} 
                            onClick={() => openStatusDialog(stage)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Detailed Stage View with AI Assistant */}
              <div className="grid grid-cols-12 gap-8">
                {/* Left: Process Details */}
                <div className="col-span-8 space-y-6">
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                          {stageData.id}: {currentStage?.name}
                        </h2>
                        <div className="flex gap-3">
                          <StatusBadge status={stageData.status} onClick={() => {
                            if (currentStage) openStatusDialog(currentStage);
                          }} />
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <Users size={12} /> Owner: {stageData.owner}
                          </span>
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <Clock size={12} /> Plan: {stageData.plannedTime}
                          </span>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 border border-slate-700 transition-colors">
                        View Files
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 border-b border-slate-800 pb-2">Execution Steps</h4>
                        <ul className="space-y-3">
                          {stageData.steps.map((step, i) => (
                            <li key={i} className="flex items-center gap-3 text-slate-300 text-sm p-3 bg-slate-900/30 rounded-lg border border-slate-800/50">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-mono">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: AI Assistant Panel */}
                <div className="col-span-4 space-y-4">
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500"></div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Zap size={16} className="text-orange-400" />
                        Manus Copilot
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">RAG Active</span>
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-indigo-400 hover:text-indigo-300"
                        onClick={fetchAIRecommendations}
                        disabled={aiLoading}
                      >
                        {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <AICard title="M2 Nexus Context" content={stageData.sop} loading={aiLoading} />
                      <AICard title="Risk Alert" content={stageData.risks} type="risk" loading={aiLoading} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <button 
                        className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                        onClick={() => setActiveTab("chat")}
                      >
                        <MessageSquare size={14} /> 与AI对话获取更多建议
                      </button>
                    </div>
                  </div>

                  {/* Daily Plan Integration */}
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      Next Actions (Outlook Synced)
                    </h3>
                    <ul className="space-y-3">
                      <li className="text-xs text-slate-400 border-l-2 border-emerald-500 pl-3">
                        <p className="text-slate-200 font-medium">14:00 - T6 Quality Review</p>
                        <p>Invited by: QA Manager</p>
                      </li>
                      <li className="text-xs text-slate-400 border-l-2 border-blue-500 pl-3">
                        <p className="text-slate-200 font-medium">16:30 - Update M2 Risk Log</p>
                        <p>Source: System Reminder</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Gantt Chart View */}
            <TabsContent value="gantt" className="mt-6">
              <GanttChart_Component
                stages={stages}
                selectedStage={selectedStage}
                onSelectStage={setSelectedStage}
                onDragEnd={handleGanttDragEnd}
              />
              
              {/* Stage Details Below Gantt */}
              <div className="mt-6 bg-[#111625] border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">
                    {selectedStage}: {currentStage?.name}
                  </h3>
                  <StatusBadge status={currentStage?.status || "Pending"} onClick={() => {
                    if (currentStage) openStatusDialog(currentStage);
                  }} />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">开始日期</p>
                    <p className="text-sm text-slate-200">第 {currentStage?.startDay} 天</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">持续时间</p>
                    <p className="text-sm text-slate-200">{currentStage?.duration} 天</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">负责角色</p>
                    <p className="text-sm text-slate-200">{currentStage?.role}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">结束日期</p>
                    <p className="text-sm text-slate-200">第 {(currentStage?.startDay || 0) + (currentStage?.duration || 0) - 1} 天</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* AI Chat View */}
            <TabsContent value="chat" className="mt-6">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8">
                  <AIChatPanel 
                    projectContext={M2_CONTEXT}
                    currentStage={currentStage}
                  />
                </div>
                <div className="col-span-4 space-y-4">
                  {/* Project Context Card */}
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <FolderOpen size={16} className="text-orange-400" />
                      项目上下文
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500">项目编号</p>
                        <p className="text-sm text-orange-400 font-mono">{M2_CONTEXT.projectCode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">客户</p>
                        <p className="text-sm text-slate-200">{M2_CONTEXT.client}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">关键要求</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {M2_CONTEXT.requirements.map(req => (
                            <span key={req} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">约束条件</p>
                        <p className="text-sm text-slate-300">{M2_CONTEXT.constraints}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-400" />
                      快速操作
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 text-left transition-colors">
                        📊 生成周报
                      </button>
                      <button className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 text-left transition-colors">
                        📋 导出SOP文档
                      </button>
                      <button className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 text-left transition-colors">
                        ⚠️ 查看风险清单
                      </button>
                      <button className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 text-left transition-colors">
                        📧 发送客户更新
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Project Selector Dialog */}
        <Dialog open={projectSelectorOpen} onOpenChange={setProjectSelectorOpen}>
          <DialogContent className="bg-[#111625] border-slate-700 text-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen size={20} className="text-orange-400" />
                切换项目
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <p className="text-slate-500 text-center py-4">当前BU没有项目</p>
              ) : (
                filteredProjects.map(project => (
                  <div
                    key={project.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]",
                      selectedProject.id === project.id
                        ? "bg-orange-600/10 border-orange-500/50"
                        : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                    )}
                    onClick={() => switchProject(project)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-orange-400">{project.code}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        project.status === "active" && "bg-emerald-900/30 text-emerald-400",
                        project.status === "completed" && "bg-blue-900/30 text-blue-400",
                        project.status === "on-hold" && "bg-yellow-900/30 text-yellow-400"
                      )}>
                        {project.status}
                      </span>
                    </div>
                    <p className="font-medium text-slate-200">{project.name}</p>
                    <p className="text-xs text-slate-500 mt-1">客户: {project.client}</p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="bg-[#111625] border-slate-700 text-slate-200">
            <DialogHeader>
              <DialogTitle>
                更新 {editingStage?.id} 状态
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TStageStatus)}>
                <SelectTrigger className="bg-slate-900 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status} />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={updateStageStatus} className="bg-orange-600 hover:bg-orange-500">
                确认更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
