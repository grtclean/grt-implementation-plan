/**
 * Manager Weekly Review — Role scaffold (Phase 1 placeholder)
 */
import { BarChart3, Target } from "lucide-react";

export default function ManagerWeeklyReview() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-teal-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">本周里程碑 / Weekly Milestones</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">里程碑 / Milestones</p>
        </div>
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">OKR进度 / OKR %</p>
        </div>
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">团队周报 / Team Weekly</p>
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: Project + OKR integration</p>
    </div>
  );
}
