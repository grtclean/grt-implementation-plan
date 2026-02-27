/**
 * R&D Weekly Review — Role scaffold (Phase 1 placeholder)
 */
import { CalendarCheck, Shield } from "lucide-react";

export default function RnDWeeklyReview() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <CalendarCheck className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">本周设计评审 / Weekly Design Reviews</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">评审通过 / Approved</p>
        </div>
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">BOM冻结 / BOM Frozen</p>
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: Stage-gate integration</p>
    </div>
  );
}
