/**
 * Field Engineer Mobile Dashboard (Task #57)
 * Mobile-first page for field commissioning engineers.
 * Designed for one-handed phone use with large touch targets.
 */
import { PageHeader } from "@/components/grt";
import VoiceRecorder from "@/components/VoiceRecorder";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Wrench, ChevronDown, Play, Navigation, Mic, Camera,
  Search, ClipboardPlus, Package, BarChart3, FileText,
  Loader2, X, Clock, MapPin, AlertCircle, CheckCircle
} from "lucide-react";
import { useState, useRef } from "react";

// ── Types ──
interface ServiceTask {
  id: string;
  client: string;
  equipment: string;
  taskType: string;
  priority: "urgent" | "normal" | "low";
  timeRange: string;
  status: "pending" | "in_progress" | "completed";
}

interface KBArticle {
  id: string;
  title: string;
  relevance: number;
}

// ── Mock Data ──
const mockTasks: ServiceTask[] = [
  {
    id: "ST-2026-001",
    client: "博世苏州",
    equipment: "IC-2000",
    taskType: "SAT验收",
    priority: "urgent",
    timeRange: "09:00-17:00",
    status: "pending",
  },
  {
    id: "ST-2026-002",
    client: "大陆集团",
    equipment: "IC-1800",
    taskType: "维保",
    priority: "normal",
    timeRange: "明天",
    status: "pending",
  },
  {
    id: "ST-2026-003",
    client: "采埃孚",
    equipment: "IC-1650",
    taskType: "巡检",
    priority: "low",
    timeRange: "本周五",
    status: "pending",
  },
];

const mockKBArticles: KBArticle[] = [
  { id: "kb-1", title: "清洗液浓度管理指南", relevance: 0.95 },
  { id: "kb-2", title: "喷嘴堵塞排故程序", relevance: 0.89 },
  { id: "kb-3", title: "FAT/SAT 验收标准清单", relevance: 0.85 },
];

const priorityConfig = {
  urgent: { color: "bg-red-500", textColor: "text-red-600", label: "紧急", dot: "🔴" },
  normal: { color: "bg-yellow-500", textColor: "text-yellow-600", label: "普通", dot: "🟡" },
  low: { color: "bg-green-500", textColor: "text-green-600", label: "低优先", dot: "🟢" },
};

export default function FieldEngineerDashboard() {
  const { user } = useAuth();
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [kbSearchOpen, setKbSearchOpen] = useState(false);
  const [kbQuery, setKbQuery] = useState("");
  const [kbResults, setKbResults] = useState<KBArticle[]>([]);
  const [kbSearching, setKbSearching] = useState(false);
  const [tasks, setTasks] = useState<ServiceTask[]>(mockTasks);
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketEquipment, setTicketEquipment] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Try to use tRPC for real data, gracefully fall back to mock
  // const tasksQuery = trpc.afterSales.serviceLogs.list.useQuery(undefined, {
  //   retry: false, refetchOnWindowFocus: false,
  // });

  const handleStartTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "in_progress" as const } : t))
    );
  };

  const handleKBSearch = async () => {
    if (!kbQuery.trim()) return;
    setKbSearching(true);
    // Simulate KB search - in production: trpc.knowledgeBase.search
    await new Promise((resolve) => setTimeout(resolve, 800));
    setKbResults(
      mockKBArticles.filter((a) =>
        a.title.toLowerCase().includes(kbQuery.toLowerCase()) || kbQuery.length > 0
      )
    );
    setKbSearching(false);
  };

  const handleVoiceTranscription = (text: string) => {
    setTicketDescription(text);
    setVoiceModalOpen(false);
    setTicketModalOpen(true);
  };

  const handleCreateTicket = () => {
    // In production: trpc.afterSales.serviceTickets.create
    alert("工单已创建: " + ticketDescription.substring(0, 50) + "...");
    setTicketDescription("");
    setTicketEquipment("");
    setTicketModalOpen(false);
  };

  const handlePhotoCapture = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert("照片已捕获: " + file.name + " (" + (file.size / 1024).toFixed(1) + "KB)");
    }
  };

  return (
      <div className="max-w-md mx-auto pb-8">
        {/* Header */}
        <div className="p-4 border-b sticky top-0 bg-background z-10">
          <PageHeader
            icon={Wrench}
            title="现场工程师工作台"
            description="Field Engineer Dashboard"
            actions={
              <Button variant="ghost" size="sm" className="gap-1">
                <span className="text-sm">{user?.name || "陈工"}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            }
          />
        </div>

        {/* Today tasks */}
        <div className="p-4">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            今日任务 ({tasks.length})
          </h2>
          <div className="space-y-3">
            {tasks.map((task) => {
              const pc = priorityConfig[task.priority];
              return (
                <Card key={task.id} className="active:scale-[0.98] transition-transform">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{pc.dot}</span>
                        <span className="font-medium text-sm">{task.client}</span>
                        <span className="text-xs text-muted-foreground">- {task.equipment}</span>
                      </div>
                      <Badge variant="outline" className={pc.textColor + " text-xs"}>
                        {task.taskType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Badge variant="secondary" className="text-[10px]">{pc.label}</Badge>
                      <span>|</span>
                      <Clock className="w-3 h-3" />
                      <span>{task.timeRange}</span>
                    </div>
                    <div className="flex gap-2">
                      {task.status === "pending" && (
                        <Button size="sm" className="flex-1 h-10 min-h-[40px]"
                          onClick={() => handleStartTask(task.id)}>
                          <Play className="w-4 h-4 mr-1" /> 开始
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button size="sm" variant="secondary" className="flex-1 h-10 min-h-[40px]" disabled>
                          <CheckCircle className="w-4 h-4 mr-1" /> 进行中
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-10 min-h-[40px]">
                        <Navigation className="w-4 h-4 mr-1" /> 导航
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="px-4 pb-4">
          <h2 className="font-bold text-sm mb-3">快捷操作</h2>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setVoiceModalOpen(true)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent active:scale-95 transition-all min-h-[80px]">
              <Mic className="w-6 h-6 text-red-500" />
              <span className="text-xs font-medium">语音报修</span>
            </button>
            <button onClick={handlePhotoCapture}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent active:scale-95 transition-all min-h-[80px]">
              <Camera className="w-6 h-6 text-blue-500" />
              <span className="text-xs font-medium">拍照记录</span>
            </button>
            <button onClick={() => setKbSearchOpen(true)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent active:scale-95 transition-all min-h-[80px]">
              <Search className="w-6 h-6 text-purple-500" />
              <span className="text-xs font-medium">知识库搜索</span>
            </button>
            <button onClick={() => { setTicketDescription(""); setTicketEquipment(""); setTicketModalOpen(true); }}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent active:scale-95 transition-all min-h-[80px]">
              <ClipboardPlus className="w-6 h-6 text-green-500" />
              <span className="text-xs font-medium">新工单</span>
            </button>
            <Link href="/spare-parts">
              <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent active:scale-95 transition-all min-h-[80px]">
                <Package className="w-6 h-6 text-orange-500" />
                <span className="text-xs font-medium">备件申请</span>
              </div>
            </Link>
            <Link href="/service-tickets">
              <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent active:scale-95 transition-all min-h-[80px]">
                <BarChart3 className="w-6 h-6 text-cyan-500" />
                <span className="text-xs font-medium">设备历史</span>
              </div>
            </Link>
          </div>
        </div>

        {/* AI Recommended Knowledge */}
        <div className="px-4 pb-4">
          <h2 className="font-bold text-sm mb-3">AI 推荐知识</h2>
          <Card>
            <CardContent className="p-0">
              {mockKBArticles.map((article, idx) => (
                <button key={article.id}
                  className={"flex items-center gap-3 w-full p-3 text-left hover:bg-accent transition-colors" + (idx < mockKBArticles.length - 1 ? " border-b" : "")}
                  onClick={() => { setKbQuery(article.title); setKbSearchOpen(true); }}>
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{article.title}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Hidden photo input */}
        <input ref={photoInputRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handlePhotoChange} />

        {/* Voice Recording Modal */}
        <Dialog open={voiceModalOpen} onOpenChange={setVoiceModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-red-500" />
                语音报修
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <VoiceRecorder onTranscriptionComplete={handleVoiceTranscription} />
            </div>
          </DialogContent>
        </Dialog>

        {/* New Ticket Modal */}
        <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardPlus className="w-5 h-5 text-green-500" />
                创建工单
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1 block">设备型号</label>
                <Input value={ticketEquipment} onChange={(e) => setTicketEquipment(e.target.value)}
                  placeholder="例如: IC-2000" className="h-11" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">故障描述</label>
                <Textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="请描述故障现象..." rows={4} className="text-base" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTicketModalOpen(false)}>取消</Button>
              <Button onClick={handleCreateTicket}
                disabled={!ticketDescription.trim()}>提交工单</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KB Search Modal */}
        <Dialog open={kbSearchOpen} onOpenChange={setKbSearchOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-500" />
                知识库搜索
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                <Input value={kbQuery} onChange={(e) => setKbQuery(e.target.value)}
                  placeholder="搜索技术文档..." className="h-11 flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") handleKBSearch(); }} />
                <Button onClick={handleKBSearch} disabled={kbSearching} className="h-11">
                  {kbSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {kbResults.length > 0 && (
                <div className="space-y-2">
                  {kbResults.map((r) => (
                    <button key={r.id}
                      className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">相关度: {Math.round(r.relevance * 100)}%</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}
