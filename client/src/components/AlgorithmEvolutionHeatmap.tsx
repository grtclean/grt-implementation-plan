/**
 * AlgorithmEvolutionHeatmap — GitHub-style heatmap of PLC/AI iteration history
 */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "../lib/trpc";
import { GitBranch } from "lucide-react";

const INTENSITY_COLORS = [
  "#f1f5f9", // 0 — no activity
  "#bbf7d0", // 1 — low
  "#4ade80", // 2 — medium
  "#16a34a", // 3 — high
  "#166534", // 4 — very high
];

export default function AlgorithmEvolutionHeatmap() {
  const { data } = trpc.ceoDashboard.getAlgorithmEvolution.useQuery(
    { monthsBack: 12 },
    { refetchInterval: 300000, retry: false },
  );

  const months = data?.months || [];
  const cellSize = 28;
  const gap = 3;
  const width = months.length * (cellSize + gap) + 60;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">Algorithm Evolution</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <svg width={width} height={120} className="min-w-full">
              {/* Row labels */}
              <text x="0" y="32" fontSize="10" fill="#64748b">PLC</text>
              <text x="0" y="67" fontSize="10" fill="#64748b">AI</text>

              {/* Heatmap cells */}
              {months.map((m, i) => {
                const x = 50 + i * (cellSize + gap);
                const plcIntensity = Math.min(4, Math.ceil(m.plcIterations / 3));
                const aiIntensity = Math.min(4, Math.ceil(m.aiUpdates / 3));

                return (
                  <g key={m.month}>
                    {/* PLC row */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <rect
                          x={x}
                          y={20}
                          width={cellSize}
                          height={cellSize}
                          rx={4}
                          fill={INTENSITY_COLORS[plcIntensity]}
                          stroke="#e2e8f0"
                          strokeWidth={0.5}
                          className="cursor-pointer hover:stroke-blue-400 hover:stroke-2"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-bold">{m.month} — PLC</div>
                          <div>{m.plcIterations} version(s)</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* AI row */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <rect
                          x={x}
                          y={55}
                          width={cellSize}
                          height={cellSize}
                          rx={4}
                          fill={INTENSITY_COLORS[aiIntensity]}
                          stroke="#e2e8f0"
                          strokeWidth={0.5}
                          className="cursor-pointer hover:stroke-blue-400 hover:stroke-2"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-bold">{m.month} — AI</div>
                          <div>{m.aiUpdates} update(s)</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Month label */}
                    <text
                      x={x + cellSize / 2}
                      y={105}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#94a3b8"
                    >
                      {m.month.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center gap-1 mt-2 justify-end">
          <span className="text-xs text-muted-foreground mr-1">Less</span>
          {INTENSITY_COLORS.map((color, i) => (
            <span key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, border: "1px solid #e2e8f0" }} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">More</span>
        </div>
      </CardContent>
    </Card>
  );
}
