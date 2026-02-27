/**
 * Sales Daily Tasks — Role scaffold (Phase 1 placeholder)
 * Will be filled with real tRPC data in Phase 2.
 */
import { Clock, Phone, Mail, Target } from "lucide-react";

export default function SalesDailyTasks() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
          <Clock className="w-4 h-4 text-green-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">今日销售任务 / Daily Sales Tasks</h3>
      </div>
      <div className="space-y-2 text-sm text-[#605e5c]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <Phone className="w-4 h-4 text-[#a19f9d]" /> 待跟进客户 (0) / Follow-up clients
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <Mail className="w-4 h-4 text-[#a19f9d]" /> 待回复询价 (0) / Pending RFQs
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#faf9f8]">
          <Target className="w-4 h-4 text-[#a19f9d]" /> 今日拜访计划 (0) / Visit schedule
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: tRPC integration pending</p>
    </div>
  );
}
