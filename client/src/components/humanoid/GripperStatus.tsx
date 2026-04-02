import { cn } from "@/lib/utils";

interface GripperStatusProps {
  gripperType: string;
  status: "idle" | "open" | "closed" | "error";
  forceN: number;
  maxForceN: number;
  className?: string;
}

const statusConfig = {
  idle: { color: "bg-gray-400", gap: "gap-3", label: "待机", pulse: false },
  open: { color: "bg-green-500", gap: "gap-6", label: "张开", pulse: false },
  closed: { color: "bg-blue-500", gap: "gap-1", label: "夹紧", pulse: false },
  error: { color: "bg-red-500", gap: "gap-4", label: "故障", pulse: true },
};

export function GripperStatus({ gripperType, status, forceN, maxForceN, className }: GripperStatusProps) {
  const cfg = statusConfig[status];
  const pct = Math.min((forceN / maxForceN) * 100, 100);
  const barColor = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500";
  const isVacuum = gripperType.toLowerCase().includes("vacuum") || gripperType.includes("真空");

  return (
    <div className={cn("flex flex-col items-center gap-2 p-3 rounded-lg border bg-card", className)}>
      <div className="text-xs text-muted-foreground font-medium">{gripperType}</div>

      {/* Visual gripper */}
      <div className={cn("flex items-center justify-center h-16 w-24", cfg.gap)}>
        {isVacuum ? (
          <div
            className={cn(
              "w-12 h-12 rounded-full border-4 flex items-center justify-center text-xs font-bold text-white",
              cfg.color,
              cfg.pulse && "animate-pulse"
            )}
          >
            {cfg.label}
          </div>
        ) : (
          <>
            <div className={cn("w-3 h-14 rounded-sm", cfg.color, cfg.pulse && "animate-pulse")} />
            <div className={cn("w-3 h-14 rounded-sm", cfg.color, cfg.pulse && "animate-pulse")} />
          </>
        )}
      </div>

      {/* Force meter */}
      <div className="w-full">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-center text-muted-foreground mt-1">
          {forceN}N / {maxForceN}N
        </div>
      </div>

      <span className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        status === "idle" && "bg-gray-100 text-gray-600",
        status === "open" && "bg-green-100 text-green-700",
        status === "closed" && "bg-blue-100 text-blue-700",
        status === "error" && "bg-red-100 text-red-700",
      )}>
        {cfg.label}
      </span>
    </div>
  );
}
