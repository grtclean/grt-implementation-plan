import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

const STATUS_COLORS = {
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  slate: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  gray: "bg-gray-500/20 text-gray-400 border-gray-500/30",
} as const;

export type StatusColor = keyof typeof STATUS_COLORS;

interface StatusBadgeProps {
  color: StatusColor;
  children: ReactNode;
  icon?: ReactNode;
}

export function StatusBadge({ color, children, icon }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[color]}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </Badge>
  );
}

/**
 * Create a typed mapping from status strings to StatusColors.
 *
 * Usage:
 *   const projectStatusColors = createStatusColorMap({
 *     draft: "slate",
 *     active: "green",
 *     completed: "emerald",
 *     cancelled: "red",
 *   });
 */
export function createStatusColorMap<T extends string>(
  mapping: Record<T, StatusColor>,
): Record<T, StatusColor> {
  return mapping;
}

export { STATUS_COLORS };
