/**
 * GlobalDeliveryMap — SVG world map with project deployment pins
 */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "../lib/trpc";
import { Globe } from "lucide-react";

interface RegionPin {
  region: string;
  label: string;
  x: number;
  y: number;
  projects: number;
  active: number;
  atRisk: number;
}

const DEFAULT_REGIONS: RegionPin[] = [
  { region: "海外", label: "Overseas", x: 200, y: 120, projects: 0, active: 0, atRisk: 0 },
  { region: "商用车", label: "Commercial Vehicle", x: 580, y: 180, projects: 0, active: 0, atRisk: 0 },
  { region: "乘用车", label: "Passenger Vehicle", x: 620, y: 200, projects: 0, active: 0, atRisk: 0 },
  { region: "半导体", label: "Semiconductor", x: 660, y: 160, projects: 0, active: 0, atRisk: 0 },
  { region: "工业通用", label: "Industrial", x: 540, y: 220, projects: 0, active: 0, atRisk: 0 },
];

function getHealthColor(atRisk: number, total: number): string {
  if (total === 0) return "#94a3b8";
  const ratio = atRisk / total;
  if (ratio > 0.3) return "#ef4444";
  if (ratio > 0.1) return "#f59e0b";
  return "#22c55e";
}

export default function GlobalDeliveryMap() {
  const { data } = trpc.ceoDashboard.getGlobalDeliveryMap.useQuery({}, {
    refetchInterval: 60000,
    retry: false,
  });

  const regions = data?.regions || DEFAULT_REGIONS;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">Global Delivery Map</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <svg viewBox="0 0 800 400" className="w-full h-auto">
            {/* Simplified world map background */}
            <rect width="800" height="400" fill="#f1f5f9" rx="8" />
            {/* Grid lines */}
            {[100, 200, 300].map(y => (
              <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
            ))}
            {[200, 400, 600].map(x => (
              <line key={x} x1={x} y1="0" x2={x} y2="400" stroke="#e2e8f0" strokeWidth="0.5" />
            ))}

            {/* Continent outlines (simplified) */}
            <ellipse cx="200" cy="180" rx="120" ry="100" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            <ellipse cx="420" cy="160" rx="80" ry="90" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            <ellipse cx="600" cy="190" rx="120" ry="80" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            <ellipse cx="650" cy="310" rx="60" ry="40" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />

            {/* Region pins */}
            {regions.map((r, i) => {
              const color = getHealthColor(r.atRisk, r.projects);
              const radius = Math.max(8, Math.min(20, 8 + r.projects));

              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <g className="cursor-pointer">
                      <circle
                        cx={r.x}
                        cy={r.y}
                        r={radius}
                        fill={color}
                        opacity={0.3}
                        className="animate-pulse"
                      />
                      <circle cx={r.x} cy={r.y} r={radius * 0.6} fill={color} opacity={0.8} />
                      <text
                        x={r.x}
                        y={r.y + radius + 14}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                      >
                        {r.region}
                      </text>
                    </g>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <div className="font-bold">{r.region} — {r.label}</div>
                      <div>Projects: {r.projects}</div>
                      <div>Active: {r.active}</div>
                      <div className={r.atRisk > 0 ? "text-red-400" : ""}>At Risk: {r.atRisk}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </svg>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex gap-4 mt-2 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Healthy</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Warning</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> At Risk</div>
        </div>
      </CardContent>
    </Card>
  );
}
