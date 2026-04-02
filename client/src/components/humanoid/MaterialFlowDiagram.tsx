import { cn } from "@/lib/utils";

interface MaterialFlowDiagramProps {
  currentStep: string;
  inputCount: number;
  outputCount: number;
  machineStatus: "idle" | "running" | "error";
  className?: string;
}

const nodes = [
  { id: "input", label: "Input Buffer", x: 20, countKey: "input" as const },
  { id: "pick", label: "Pick", x: 180, countKey: null },
  { id: "machine", label: "Machine", x: 340, countKey: null },
  { id: "unload", label: "Unload", x: 500, countKey: null },
  { id: "output", label: "Output Buffer", x: 640, countKey: "output" as const },
];

const machineColors = { idle: "#9ca3af", running: "#22c55e", error: "#ef4444" };

export function MaterialFlowDiagram({ currentStep, inputCount, outputCount, machineStatus, className }: MaterialFlowDiagramProps) {
  const counts: Record<string, number> = { input: inputCount, output: outputCount };

  const isActive = (id: string) => currentStep.toLowerCase().includes(id);

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <svg viewBox="0 0 800 120" className="w-full h-auto min-w-[600px]" xmlns="http://www.w3.org/2000/svg">
        {/* Arrows between nodes */}
        {nodes.slice(0, -1).map((node, i) => {
          const next = nodes[i + 1];
          return (
            <g key={`arrow-${i}`}>
              <line
                x1={node.x + 120}
                y1={55}
                x2={next.x}
                y2={55}
                stroke="#94a3b8"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}

        {/* Arrowhead marker */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Nodes */}
        {nodes.map((node) => {
          const active = isActive(node.id);
          const isMachine = node.id === "machine";
          const fill = isMachine ? machineColors[machineStatus] : active ? "#3b82f6" : "#e2e8f0";
          const textColor = (isMachine || active) ? "#fff" : "#334155";
          const strokeColor = active ? "#2563eb" : "transparent";
          const count = node.countKey ? counts[node.countKey] : null;

          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={20}
                width={120}
                height={50}
                rx={10}
                ry={10}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={active ? 3 : 0}
              >
                {active && (
                  <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                )}
              </rect>
              <text x={node.x + 60} y={50} textAnchor="middle" fill={textColor} fontSize={12} fontWeight={600}>
                {node.label}
              </text>

              {count !== null && (
                <>
                  <circle cx={node.x + 105} cy={28} r={12} fill="#1e40af" />
                  <text x={node.x + 105} y={33} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>
                    {count}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Machine status label */}
        <text x={400} y={100} textAnchor="middle" fill="#64748b" fontSize={11}>
          {machineStatus === "idle" ? "空闲" : machineStatus === "running" ? "运行中" : "故障"}
        </text>
      </svg>
    </div>
  );
}
