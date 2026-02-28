/**
 * ViolationAlert — Inline alert card for violation events
 *
 * Displays severity-based colored cards with event details.
 * Used in BUPerformanceDashboard and HRSandboxCapability.
 */
import { AlertTriangle, ShieldAlert, Info, Clock, CheckCircle, XCircle } from "lucide-react";

interface ViolationItem {
  id: number;
  eventType: string;
  severity: "MINOR" | "MAJOR" | "CRITICAL";
  title: string;
  description?: string | null;
  status: string;
  sourceModule?: string | null;
  createdAt?: string | null;
  frozePerformanceId?: number | null;
}

interface ViolationAlertProps {
  violations: ViolationItem[];
  onViewDetail?: (id: number) => void;
  compact?: boolean;
}

const SEVERITY_CONFIG = {
  MINOR: {
    bg: "bg-yellow-50 border-yellow-200",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-700",
    icon: Info,
    label: "一般",
  },
  MAJOR: {
    bg: "bg-orange-50 border-orange-300",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-700",
    icon: AlertTriangle,
    label: "重大",
  },
  CRITICAL: {
    bg: "bg-red-50 border-red-300",
    text: "text-red-800",
    badge: "bg-red-100 text-red-700",
    icon: ShieldAlert,
    label: "严重",
  },
};

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  open: { icon: Clock, label: "待处理", color: "text-gray-500" },
  investigating: { icon: AlertTriangle, label: "调查中", color: "text-orange-500" },
  confirmed: { icon: ShieldAlert, label: "已确认", color: "text-red-500" },
  resolved: { icon: CheckCircle, label: "已解决", color: "text-green-500" },
  dismissed: { icon: XCircle, label: "已驳回", color: "text-gray-400" },
};

export default function ViolationAlert({ violations, onViewDetail, compact = false }: ViolationAlertProps) {
  if (!violations || violations.length === 0) return null;

  return (
    <div className="space-y-2">
      {violations.map((v) => {
        const sev = SEVERITY_CONFIG[v.severity] || SEVERITY_CONFIG.MINOR;
        const st = STATUS_CONFIG[v.status] || STATUS_CONFIG.open;
        const Icon = sev.icon;
        const StatusIcon = st.icon;

        return (
          <div
            key={v.id}
            className={`border rounded-lg p-3 ${sev.bg} ${compact ? "p-2" : "p-3"} ${onViewDetail ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
            onClick={() => onViewDetail?.(v.id)}
          >
            <div className="flex items-start gap-2">
              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${sev.text}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${sev.badge}`}>
                    {sev.label}
                  </span>
                  <span className={`text-sm font-medium ${sev.text} truncate`}>
                    {v.title}
                  </span>
                </div>
                {!compact && v.description && (
                  <p className={`text-xs mt-1 ${sev.text} opacity-80 line-clamp-2`}>
                    {v.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <StatusIcon className={`h-3 w-3 ${st.color}`} />
                    {st.label}
                  </span>
                  {v.sourceModule && (
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                      {v.sourceModule}
                    </span>
                  )}
                  {v.frozePerformanceId && (
                    <span className="text-red-500 font-medium">
                      已冻结绩效 #{v.frozePerformanceId}
                    </span>
                  )}
                  {v.createdAt && (
                    <span>{new Date(v.createdAt).toLocaleDateString("zh-CN")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
