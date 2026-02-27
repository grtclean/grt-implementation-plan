/**
 * Sales Weekly Pipeline — Role scaffold (Phase 1 placeholder)
 */
import { TrendingUp, BarChart3 } from "lucide-react";

export default function SalesWeeklyPipeline() {
  return (
    <div className="rounded-xl border border-[#edebe9] bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-[#323130]">本周管道 / Weekly Pipeline</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">新线索 / New Leads</p>
        </div>
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">转化率 / Win Rate</p>
        </div>
        <div className="p-3 rounded-lg bg-[#faf9f8]">
          <p className="text-lg font-bold text-[#323130]">—</p>
          <p className="text-xs text-[#a19f9d]">管道金额 / Pipeline $</p>
        </div>
      </div>
      <p className="text-xs text-[#c8c6c4] italic">Phase 2: CRM pipeline data integration</p>
    </div>
  );
}
