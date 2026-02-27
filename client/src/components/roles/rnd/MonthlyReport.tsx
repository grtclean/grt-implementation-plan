/**
 * R&D Monthly Report — Role scaffold (Phase 1 placeholder)
 */
import { BarChart3 } from "lucide-react";

export default function RnDMonthlyReport() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-violet-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">月度研发进展 / Monthly R&D Progress</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">完成设计 / Designs Done</p>
        </div>
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">知识沉淀 / Knowledge Items</p>
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: R&D analytics integration</p>
    </div>
  );
}
