/**
 * R&D Daily Tasks — Role scaffold (Phase 1 placeholder)
 */
import { Clock, FileText, GitBranch, AlertTriangle } from "lucide-react";

export default function RnDDailyTasks() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
          <Clock className="w-4 h-4 text-purple-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">今日研发任务 / Daily R&D Tasks</h3>
      </div>
      <div className="space-y-2 text-sm text-[#605e5c]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <FileText className="w-4 h-4 text-[#a19f9d]" /> 待审图纸 (0) / Pending drawings
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <GitBranch className="w-4 h-4 text-[#a19f9d]" /> 设计变更通知 (0) / ECN alerts
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <AlertTriangle className="w-4 h-4 text-[#a19f9d]" /> BOM冲突 (0) / BOM conflicts
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: PLM/BOM data integration</p>
    </div>
  );
}
