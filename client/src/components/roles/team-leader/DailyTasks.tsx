/**
 * Team Leader Daily Tasks — Role scaffold (Phase 1 placeholder)
 */
import { Clock, ClipboardCheck, Users, AlertTriangle } from "lucide-react";

export default function TeamLeaderDailyTasks() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <Clock className="w-4 h-4 text-teal-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">今日组长任务 / Daily Team Leader Tasks</h3>
      </div>
      <div className="space-y-2 text-sm text-[#605e5c]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <ClipboardCheck className="w-4 h-4 text-[#a19f9d]" /> 今日排产 (0) / Daily schedule
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <Users className="w-4 h-4 text-[#a19f9d]" /> 交接班 (0) / Shift handover
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <AlertTriangle className="w-4 h-4 text-[#a19f9d]" /> 质量巡检 (0) / QC patrol
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: Production + quality integration</p>
    </div>
  );
}
