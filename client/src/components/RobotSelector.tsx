/**
 * RobotSelector — Brand-selectable robot dropdown
 *
 * Shows brand → model → robotCode hierarchy with status indicators.
 * Brand colors: KUKA=orange, FANUC=yellow, ABB=red, Stäubli=blue
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const BRAND_COLORS: Record<string, string> = {
  kuka: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  fanuc: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  abb: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  staubli: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const BRAND_LABELS: Record<string, string> = {
  kuka: "KUKA",
  fanuc: "FANUC",
  abb: "ABB",
  staubli: "Stäubli",
};

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  error: "bg-red-500",
  maintenance: "bg-yellow-500",
};

// GRT 清洗机器人 fallback 列表（后端无数据时展示）
const FALLBACK_ROBOTS = [
  { robotCode: "R-01", brand: "kuka", model: "KR 360 R2830", status: "online" },
  { robotCode: "R-02", brand: "kuka", model: "KR 210 R3100", status: "online" },
  { robotCode: "R-03", brand: "fanuc", model: "M-20iD/25", status: "online" },
  { robotCode: "R-04", brand: "fanuc", model: "R-2000iC/165F", status: "maintenance" },
  { robotCode: "R-05", brand: "abb", model: "IRB 6700-205/2.80", status: "online" },
  { robotCode: "R-06", brand: "abb", model: "IRB 4600-60/2.05", status: "offline" },
  { robotCode: "R-07", brand: "staubli", model: "TX2-90L", status: "online" },
  { robotCode: "R-08", brand: "staubli", model: "TX2-60L", status: "online" },
  { robotCode: "GRT-CL-01", brand: "kuka", model: "KR 360 清洗专用", status: "online" },
  { robotCode: "GRT-CL-02", brand: "fanuc", model: "M-20iD 清洗线A", status: "online" },
  { robotCode: "GRT-CL-03", brand: "abb", model: "IRB 6700 清洗线B", status: "online" },
  { robotCode: "GRT-CL-04", brand: "staubli", model: "TX2-90 洁净室", status: "online" },
];

interface RobotSelectorProps {
  value: string;
  onChange: (robotCode: string) => void;
  className?: string;
}

export function RobotSelector({ value, onChange, className }: RobotSelectorProps) {
  const { t } = useLanguage();
  const robotsQuery = trpc.robotFleet.registry.list.useQuery({ pageSize: 100 });

  const grouped = useMemo(() => {
    const dbRobots = robotsQuery.data?.rows ?? [];
    const robots = dbRobots.length > 0 ? dbRobots : FALLBACK_ROBOTS;
    const groups: Record<string, typeof robots> = { kuka: [], fanuc: [], abb: [], staubli: [] };
    for (const r of robots) {
      if (groups[r.brand]) groups[r.brand].push(r);
    }
    return groups;
  }, [robotsQuery.data]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-56"}>
        <SelectValue placeholder={t("robotCleaning.fleet.selectRobot")} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(grouped).map(([brand, robots]) =>
          robots.length > 0 ? (
            <SelectGroup key={brand}>
              <SelectLabel className="flex items-center gap-2">
                <Badge className={`text-[10px] ${BRAND_COLORS[brand] ?? ""}`}>
                  {BRAND_LABELS[brand] ?? brand}
                </Badge>
                <span className="text-xs text-muted-foreground">{robots.length} robots</span>
              </SelectLabel>
              {robots.map((robot) => (
                <SelectItem key={robot.robotCode} value={robot.robotCode}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[robot.status] ?? "bg-gray-400"}`} />
                    <span className="font-mono text-xs">{robot.robotCode}</span>
                    <span className="text-xs text-muted-foreground">{robot.model}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null,
        )}
      </SelectContent>
    </Select>
  );
}
