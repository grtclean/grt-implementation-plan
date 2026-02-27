/**
 * Manager Daily Tasks — Role scaffold (Phase 1 placeholder)
 */
import { Clock, CheckCircle, AlertTriangle, Calendar } from "lucide-react";

export default function ManagerDailyTasks() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Clock className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">今日管理任务 / Daily Manager Tasks</h3>
      </div>
      <div className="space-y-2 text-sm text-[#605e5c]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <CheckCircle className="w-4 h-4 text-[#a19f9d]" /> 待审批 (0) / Pending approvals
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <AlertTriangle className="w-4 h-4 text-[#a19f9d]" /> 异常升级 (0) / Escalations
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <Calendar className="w-4 h-4 text-[#a19f9d]" /> 今日会议 (0) / Meetings today
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: OA approval + meeting integration</p>
    </div>
  );
}
