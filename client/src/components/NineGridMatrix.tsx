import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface Employee {
  id: number;
  name: string;
  performance: number;
  potential: number;
  avatar?: string;
}

interface CellMeta {
  label: string;
  color: string;
}

interface NineGridMatrixProps {
  data: Employee[];
  onCellClick?: (cell: { row: number; col: number; employees: Employee[] }) => void;
}

/**
 * Cell labels arranged [row][col] where row 0 = top (high performance),
 * col 0 = left (low potential).
 */
const CELL_META: CellMeta[][] = [
  // row 0 = High Performance (top)
  [
    { label: "Workhorses", color: "bg-yellow-100 border-yellow-300 text-yellow-800" },
    { label: "Stars", color: "bg-green-100 border-green-300 text-green-800" },
    { label: "Stars", color: "bg-green-200 border-green-400 text-green-900" },
  ],
  // row 1 = Medium Performance
  [
    { label: "Effective", color: "bg-blue-100 border-blue-300 text-blue-800" },
    { label: "Core", color: "bg-yellow-100 border-yellow-300 text-yellow-800" },
    { label: "High Potential", color: "bg-green-100 border-green-300 text-green-800" },
  ],
  // row 2 = Low Performance (bottom)
  [
    { label: "At Risk", color: "bg-red-200 border-red-400 text-red-900" },
    { label: "Developing", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Enigma", color: "bg-blue-100 border-blue-300 text-blue-800" },
  ],
];

const Y_LABELS = ["High", "Medium", "Low"];
const X_LABELS = ["Low", "Medium", "High"];

function classifyBucket(value: number): number {
  if (value <= 33) return 0;
  if (value <= 66) return 1;
  return 2;
}

export default function NineGridMatrix({ data, onCellClick }: NineGridMatrixProps) {
  // Distribute employees into cells.
  // Grid rows: 0=high perf (top), 1=mid, 2=low perf (bottom).
  // Grid cols: 0=low potential (left), 1=mid, 2=high potential (right).
  const grid = useMemo(() => {
    const cells: Employee[][][] = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => [] as Employee[])
    );
    for (const emp of data) {
      const perfBucket = classifyBucket(emp.performance);
      const potBucket = classifyBucket(emp.potential);
      // Invert performance so high perf is row 0 (visual top)
      const row = 2 - perfBucket;
      const col = potBucket;
      cells[row][col].push(emp);
    }
    return cells;
  }, [data]);

  return (
    <div className="w-full select-none">
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex flex-col justify-between items-center pr-2 py-1 w-8 shrink-0">
          {Y_LABELS.map((label) => (
            <span
              key={label}
              className="text-[10px] text-muted-foreground font-medium leading-none -rotate-90 whitespace-nowrap"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-1.5">
            {grid.flatMap((row, ri) =>
              row.map((employees, ci) => {
                const meta = CELL_META[ri][ci];
                return (
                  <Tooltip key={`${ri}-${ci}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          onCellClick?.({ row: ri, col: ci, employees })
                        }
                        className={`relative border rounded-lg p-2 min-h-[72px] flex flex-col items-center justify-center gap-1 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${meta.color}`}
                      >
                        <span className="text-[10px] font-semibold leading-tight text-center">
                          {meta.label}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs font-bold">
                          <Users className="w-3 h-3" />
                          {employees.length}
                        </span>
                        {/* Avatar stack preview (max 3) */}
                        {employees.length > 0 && (
                          <div className="flex -space-x-1.5">
                            {employees.slice(0, 3).map((emp) => (
                              <div
                                key={emp.id}
                                className="w-5 h-5 rounded-full bg-background border border-current flex items-center justify-center text-[8px] font-medium"
                                title={emp.name}
                              >
                                {emp.avatar
                                  ? <img src={emp.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                  : emp.name.charAt(0)
                                }
                              </div>
                            ))}
                            {employees.length > 3 && (
                              <div className="w-5 h-5 rounded-full bg-muted border flex items-center justify-center text-[8px] text-muted-foreground font-medium">
                                +{employees.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="font-semibold text-xs mb-1">
                        {meta.label} ({employees.length})
                      </p>
                      {employees.length > 0 ? (
                        <ul className="text-[11px] space-y-0.5">
                          {employees.slice(0, 8).map((emp) => (
                            <li key={emp.id}>
                              {emp.name} (P:{emp.performance} / T:{emp.potential})
                            </li>
                          ))}
                          {employees.length > 8 && (
                            <li className="text-muted-foreground">
                              +{employees.length - 8} more
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">No employees</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>

          {/* X-axis labels */}
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {X_LABELS.map((label) => (
              <span
                key={label}
                className="text-[10px] text-muted-foreground font-medium text-center"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Axis titles */}
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        <span className="pl-10">Potential &rarr;</span>
        <span className="pr-1">&uarr; Performance</span>
      </div>
    </div>
  );
}
