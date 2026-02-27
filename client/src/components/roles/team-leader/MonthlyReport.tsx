/**
 * Team Leader Monthly Report — Role scaffold (Phase 1 placeholder)
 */
import { BarChart3 } from "lucide-react";

export default function TeamLeaderMonthlyReport() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-cyan-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">月度产能分析 / Monthly Capacity Analysis</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">产能利用率 / Capacity %</p>
        </div>
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">人员考勤 / Attendance</p>
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: Attendance + capacity integration</p>
    </div>
  );
}
