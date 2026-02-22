import { cn } from "@/lib/utils";

export interface FluentColumn<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface FluentTableProps<T> {
  columns: FluentColumn<T>[];
  data: T[];
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
}

export default function FluentTable<T extends Record<string, unknown>>({
  columns,
  data,
  className,
  onRowClick,
  emptyMessage = "No data",
}: FluentTableProps<T>) {
  return (
    <div className={cn("bg-white rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden", className)}>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-[#faf9f8] border-b border-[#edebe9]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edebe9]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-[#a19f9d]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  "hover:bg-[#f3f2f1] transition-colors",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(row, idx)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-[#323130]">
                    {col.render
                      ? col.render(row, idx)
                      : (row[col.key] as React.ReactNode) ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
