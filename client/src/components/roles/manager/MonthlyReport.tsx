/**
 * Manager Monthly Report — Role scaffold (Phase 1 placeholder)
 */
import { BarChart3 } from "lucide-react";

export default function ManagerMonthlyReport() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-amber-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">月度运营复盘 / Monthly Ops Review</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">预算执行 / Budget Exec %</p>
        </div>
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">人效分析 / HC Efficiency</p>
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: Finance + HR analytics integration</p>
    </div>
  );
}
