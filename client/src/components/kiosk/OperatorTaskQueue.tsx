import { useState, useRef, useEffect } from "react";
import { Search, AlertTriangle, Clock, ChevronRight, Loader2, ScanLine } from "lucide-react";
import { useKioskSessionContext } from "@/hooks/useKioskSession";

interface TaskItem {
  id: number;
  projectId: string;
  projectCode: string;
  processCode: string;
  processName: string;
  status: string;
  priority: string;
  customerName: string;
  updatedAt: string;
}

interface OperatorTaskQueueProps {
  onSelectTask: (task: TaskItem) => void;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dotClass: string }> = {
  overdue: { label: "逾期", color: "text-red-400", dotClass: "bg-red-500" },
  urgent: { label: "紧急", color: "text-orange-400", dotClass: "bg-orange-500" },
  high: { label: "高", color: "text-yellow-400", dotClass: "bg-yellow-500" },
  normal: { label: "正常", color: "text-blue-400", dotClass: "bg-blue-500" },
  low: { label: "低", color: "text-muted-foreground", dotClass: "bg-muted-foreground" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待检验",
  ready: "就绪",
  in_progress: "进行中",
};

export default function OperatorTaskQueue({ onSelectTask }: OperatorTaskQueueProps) {
  const session = useKioskSessionContext();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch tasks on mount and when operator changes
  useEffect(() => {
    if (!session.isIdentified) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const params = {
          stationId: session.stationId,
          operatorId: session.operator!.id,
        };
        const res = await fetch(
          "/api/trpc/kiosk.getStationQueue?input=" + encodeURIComponent(JSON.stringify(params)),
          { credentials: "include" }
        );
        const json = await res.json();
        const data = json?.result?.data;
        setTasks(data?.tasks || []);
      } catch (err) {
        console.error("[Kiosk] Failed to fetch task queue:", err);
      }
      setLoading(false);
    };

    fetchTasks();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [session.isIdentified, session.operator?.id, session.stationId]);

  // Filter tasks by search/barcode
  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.projectCode.toLowerCase().includes(q) ||
      t.processCode.toLowerCase().includes(q) ||
      t.processName.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">我的任务</h2>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {filteredTasks.length}
            </span>
          </div>
        </div>

        {/* Search / barcode override */}
        <div className="relative">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="扫描项目条码或搜索..."
            className="w-full h-12 pl-10 pr-4 text-base bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">加载任务...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2" />
            <p>{searchQuery ? "没有匹配的任务" : "暂无待处理任务"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
              const statusLabel = STATUS_LABELS[task.status] || task.status;

              return (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-accent/50 active:bg-accent transition-colors min-h-[80px]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${priority.dotClass}`} />
                      <span className="font-mono font-semibold text-sm">{task.projectCode}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-primary">{task.processName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">
                      {task.customerName || "—"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : task.status === "in_progress"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-green-500/10 text-green-400"
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                    {task.priority === "overdue" || task.priority === "urgent" ? (
                      <div className={`flex items-center gap-1 text-xs ${priority.color}`}>
                        <AlertTriangle className="w-3 h-3" />
                        <span>{priority.label}</span>
                      </div>
                    ) : (
                      <div />
                    )}
                    <div className="flex items-center gap-1 text-primary text-sm font-medium">
                      开始检验
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
