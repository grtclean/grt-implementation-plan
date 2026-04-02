import { cn } from "@/lib/utils";

interface Schedule {
  id: number | string;
  scheduleName: string;
  maintenanceType: string;
  nextDueDate: string;
}

interface WorkOrder {
  id: number | string;
  scheduledStartAt: string;
  status: string;
  priority: string;
}

interface MaintenanceCalendarProps {
  schedules: Schedule[];
  workOrders: WorkOrder[];
  month?: Date;
  onDateClick?: (date: string) => void;
  className?: string;
}

const dayNames = ["一", "二", "三", "四", "五", "六", "日"];

const typeColor: Record<string, string> = {
  daily: "bg-green-500",
  weekly: "bg-blue-500",
  monthly: "bg-orange-500",
  quarterly: "bg-purple-500",
  runtime_based: "bg-cyan-500",
  event_triggered: "bg-yellow-500",
};

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function MaintenanceCalendar({ schedules, workOrders, month, onDateClick, className }: MaintenanceCalendarProps) {
  const today = new Date();
  const base = month ?? today;
  const year = base.getFullYear();
  const mo = base.getMonth();

  const firstDay = new Date(year, mo, 1);
  // Monday=0, Sunday=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, mo + 1, 0).getDate();

  const todayKey = formatDateKey(today);

  // Build date→dots map
  const dateDots: Record<string, string[]> = {};
  for (const s of schedules) {
    const key = s.nextDueDate.slice(0, 10);
    if (!dateDots[key]) dateDots[key] = [];
    dateDots[key].push(typeColor[s.maintenanceType] ?? "bg-gray-400");
  }

  // Overdue detection
  const overdueKeys = new Set<string>();
  for (const s of schedules) {
    const dueKey = s.nextDueDate.slice(0, 10);
    if (dueKey < todayKey) overdueKeys.add(dueKey);
  }

  // Work order dots
  for (const wo of workOrders) {
    const key = wo.scheduledStartAt.slice(0, 10);
    if (!dateDots[key]) dateDots[key] = [];
    if (wo.priority === "critical") dateDots[key].push("bg-red-500");
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="text-center font-semibold mb-3">
        {year}年{mo + 1}月
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-10" />;
          const key = `${year}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dots = dateDots[key] ?? [];
          const isToday = key === todayKey;
          const isOverdue = overdueKeys.has(key);

          return (
            <div
              key={key}
              onClick={() => onDateClick?.(key)}
              className={cn(
                "h-10 flex flex-col items-center justify-center rounded cursor-pointer hover:bg-accent transition-colors relative",
                isToday && "ring-2 ring-blue-500 font-bold",
                isOverdue && "bg-red-50"
              )}
            >
              <span className="text-xs">{day}</span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dots.slice(0, 3).map((c, di) => (
                    <span key={di} className={cn("w-1.5 h-1.5 rounded-full", c)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />日常</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />每周</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />月度</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />季度</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" />运行时</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />逾期</span>
      </div>
    </div>
  );
}
