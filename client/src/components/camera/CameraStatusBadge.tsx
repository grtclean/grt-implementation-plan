interface CameraStatusBadgeProps {
  status: "online" | "offline" | "maintenance" | "error";
  showText?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; pulse: boolean }> = {
  online: { color: "bg-green-500", label: "在线", pulse: true },
  offline: { color: "bg-gray-500", label: "离线", pulse: false },
  maintenance: { color: "bg-yellow-500", label: "维护", pulse: false },
  error: { color: "bg-red-500", label: "故障", pulse: false },
};

export function CameraStatusBadge({ status, showText = false, className = "" }: CameraStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`} />
      {showText && <span className="text-xs text-gray-300">{cfg.label}</span>}
    </span>
  );
}
