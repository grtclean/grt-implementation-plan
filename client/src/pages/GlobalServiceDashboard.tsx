/**
 * GlobalServiceDashboard.tsx — 全球客服展示系统
 *
 * 4-region tabs (Asia / North America / Europe / Other) + North America deep-dive:
 *  - ServiceReplicationDemo: China HQ vs NA metrics comparison
 *  - DetroitDigitalFactory: Spare parts inventory with stock health
 *  - InteractiveNAMap: SVG map with project markers
 *  - ComplianceQAPanel: Standard compliance knowledge search
 *  - TicketLifecycleViz: 7-stage ticket pipeline
 */
import { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Globe, MapPin, Search, Shield, TicketCheck, Warehouse,
  ArrowRight, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Clock, Users, Activity, Star, Package, Zap,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Region = "Asia" | "NorthAmerica" | "Europe" | "Other";

const REGION_TABS: { key: Region; label: string; labelEn: string }[] = [
  { key: "Asia", label: "亚太", labelEn: "Asia Pacific" },
  { key: "NorthAmerica", label: "北美", labelEn: "North America" },
  { key: "Europe", label: "欧洲", labelEn: "Europe" },
  { key: "Other", label: "其他", labelEn: "Other" },
];

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded ${className}`} />;
}

// ─── Region Overview Cards ─────────────────────────────────────────────────────

function RegionOverviewCards({ onSelectRegion }: { onSelectRegion: (r: Region) => void }) {
  const { data, isLoading } = trpc.serviceDashboard.getRegionOverview.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const healthColor = (score: number) =>
    score >= 90 ? "text-emerald-400" : score >= 80 ? "text-cyan-400" : score >= 70 ? "text-amber-400" : "text-red-400";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {data.map((r) => (
        <button
          key={r.region}
          onClick={() => onSelectRegion(r.region as Region)}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-left hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 font-medium">{r.regionCn}</span>
            <span className={`text-lg font-bold ${healthColor(r.healthScore)}`}>{r.healthScore}</span>
          </div>
          <div className="space-y-1 text-xs text-white/60">
            <div className="flex justify-between"><span>项目数</span><span className="text-white/80">{r.projectCount}</span></div>
            <div className="flex justify-between"><span>工程师</span><span className="text-white/80">{r.engineerCount}</span></div>
            <div className="flex justify-between"><span>活跃工单</span><span className="text-white/80">{r.activeTickets}</span></div>
            <div className="flex justify-between"><span>响应(h)</span><span className="text-white/80">{r.avgResponseHours}</span></div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Service Replication Demo ──────────────────────────────────────────────────

function ServiceReplicationDemo() {
  const { data, isLoading } = trpc.serviceDashboard.getServiceReplicationComparison.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5">
      <h3 className="text-white/90 font-semibold mb-4 flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-cyan-400" />
        服务复制对比 — 中国总部 vs 北美
      </h3>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-2">
        <div className="text-center text-xs text-cyan-400 font-medium pb-2 border-b border-white/10">中国总部 (HQ)</div>
        <div className="text-center text-xs text-white/40 pb-2 border-b border-white/10">指标</div>
        <div className="text-center text-xs text-amber-400 font-medium pb-2 border-b border-white/10">北美 (NA)</div>
        {data.metrics.map((m) => {
          const chinaVal = (data.china as any)[m.key];
          const naVal = (data.northAmerica as any)[m.key];
          const chinaBetter = m.lowerIsBetter ? chinaVal <= naVal : chinaVal >= naVal;
          const naBetter = !chinaBetter;
          return (
            <div key={m.key} className="contents">
              <div className={`text-right text-sm py-1 ${chinaBetter ? "text-emerald-400 font-medium" : "text-white/70"}`}>
                {chinaVal}{m.label.includes("%") ? "%" : ""}
              </div>
              <div className="text-center text-xs text-white/50 py-1 truncate">{m.label}</div>
              <div className={`text-left text-sm py-1 ${naBetter ? "text-emerald-400 font-medium" : "text-white/70"}`}>
                {naVal}{m.label.includes("%") ? "%" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detroit Digital Factory ───────────────────────────────────────────────────

function DetroitDigitalFactory() {
  const { data, isLoading } = trpc.serviceDashboard.getDetroitSparePartsInventory.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const naStats = trpc.serviceDashboard.getNorthAmericaStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return <Skeleton className="h-72" />;
  }

  const stats = naStats.data;
  const healthCounts = { healthy: 0, warning: 0, critical: 0 };
  data.forEach(p => { healthCounts[p.stockHealthStatus]++; });
  const totalParts = data.length;
  const capacityPct = totalParts > 0 ? Math.round((healthCounts.healthy / totalParts) * 100) : 0;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5">
      <h3 className="text-white/90 font-semibold mb-4 flex items-center gap-2">
        <Warehouse className="w-4 h-4 text-cyan-400" />
        底特律数字工厂 — 备件仓
      </h3>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-400">{healthCounts.healthy}</div>
          <div className="text-xs text-white/50">正常</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-400">{healthCounts.warning}</div>
          <div className="text-xs text-white/50">预警</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-400">{healthCounts.critical}</div>
          <div className="text-xs text-white/50">紧急</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-400">{stats?.sparePartsCoverage ?? capacityPct}%</div>
          <div className="text-xs text-white/50">覆盖率</div>
        </div>
      </div>

      {/* Parts Grid */}
      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
        {data.map((part) => {
          const pct = part.maxStockLevel ? Math.round((part.currentStock / part.maxStockLevel) * 100) : 50;
          const barColor = part.stockHealthStatus === "critical" ? "bg-red-500" : part.stockHealthStatus === "warning" ? "bg-amber-500" : "bg-emerald-500";
          return (
            <div key={part.id} className="flex items-center gap-3 p-2 rounded bg-white/5 hover:bg-white/10 transition-colors">
              {part.isCritical && <Zap className="w-3 h-3 text-red-400 shrink-0 animate-pulse" />}
              {!part.isCritical && <Package className="w-3 h-3 text-white/30 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/80 truncate">{part.materialName}</div>
                <div className="text-[10px] text-white/40">{part.partCode} · {part.category}</div>
              </div>
              <div className="w-20 shrink-0">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="text-[10px] text-white/50 text-right mt-0.5">{part.currentStock}/{part.maxStockLevel ?? "—"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Interactive NA Map (SVG) ──────────────────────────────────────────────────

function InteractiveNAMap() {
  const { data, isLoading } = trpc.serviceDashboard.getNAProjectLocations.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const [selected, setSelected] = useState<number | null>(null);

  if (isLoading || !data) {
    return <Skeleton className="h-80" />;
  }

  // Equirectangular: lat 24-50, lng -125 to -66
  const toX = (lng: number) => ((lng + 125) * (600 / 59));
  const toY = (lat: number) => ((50 - lat) * (320 / 26));

  const statusColor: Record<string, string> = {
    active: "#34d399",   // emerald
    completed: "#60a5fa", // blue
    planned: "#fbbf24",   // amber
  };

  const selectedSite = selected !== null ? data.find(d => d.id === selected) : null;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5">
      <h3 className="text-white/90 font-semibold mb-4 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-cyan-400" />
        北美项目分布 — US + Mexico
      </h3>
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <svg viewBox="0 0 600 320" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
            {/* US + Mexico simplified outline */}
            <path
              d="M 30 20 L 100 15 L 200 10 L 350 15 L 450 20 L 530 30 L 545 50 L 550 80 L 540 120 L 520 160 L 500 180 L 480 170 L 450 180 L 420 190 L 400 200 L 380 200 L 350 210 L 320 220 L 290 230 L 260 240 L 230 260 L 200 280 L 180 300 L 160 310 L 140 300 L 120 280 L 100 260 L 80 230 L 60 200 L 50 170 L 40 140 L 30 100 L 25 60 Z"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
            />
            {/* US-Mexico border approximate */}
            <path
              d="M 50 170 L 100 190 L 160 200 L 220 200 L 280 195 L 340 200 L 380 200"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {/* Project markers */}
            {data.map((site) => {
              const cx = toX(site.lng);
              const cy = toY(site.lat);
              const color = statusColor[site.status] || "#9ca3af";
              const isSelected = selected === site.id;
              return (
                <g key={site.id} onClick={() => setSelected(isSelected ? null : site.id)} className="cursor-pointer">
                  {/* Pulse ring for active */}
                  {site.status === "active" && (
                    <circle cx={cx} cy={cy} r="12" fill="none" stroke={color} strokeWidth="1" opacity="0.4">
                      <animate attributeName="r" from="6" to="16" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={cx} cy={cy} r={isSelected ? 7 : 5} fill={color} stroke={isSelected ? "#fff" : "none"} strokeWidth="2" />
                  <text x={cx} y={cy - 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8">{site.city}</text>
                </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div className="flex gap-4 mt-2 justify-center text-[10px] text-white/50">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> 运行中</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> 已完成</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 规划中</span>
          </div>
        </div>

        {/* Side panel */}
        {selectedSite && (
          <div className="w-48 bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 text-xs shrink-0">
            <div className="font-medium text-white/90">{selectedSite.clientName}</div>
            <div className="text-white/50">{selectedSite.city}, {selectedSite.state}, {selectedSite.country}</div>
            <div className="space-y-1.5 text-white/70">
              <div className="flex items-center gap-1.5"><Package className="w-3 h-3" />{selectedSite.equipmentType}</div>
              <div className="flex items-center gap-1.5"><Users className="w-3 h-3" />{selectedSite.engineerCount} 工程师</div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  selectedSite.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                  selectedSite.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                  "bg-amber-500/20 text-amber-400"
                }`}>
                  {selectedSite.status === "active" ? "运行中" : selectedSite.status === "completed" ? "已完成" : "规划中"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compliance QA Panel ───────────────────────────────────────────────────────

const STANDARD_PILLS = ["all", "UL", "CSA", "OSHA", "EPA", "NFPA", "NEC"] as const;

function ComplianceQAPanel() {
  const [query, setQuery] = useState("");
  const [standard, setStandard] = useState<typeof STANDARD_PILLS[number]>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const searchMut = trpc.serviceDashboard.getComplianceKnowledge.useMutation();

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMut.mutate({ query: query.trim(), standard: standard as any });
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5">
      <h3 className="text-white/90 font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4 text-cyan-400" />
        合规知识库 — NA Standards
      </h3>

      {/* Standard filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {STANDARD_PILLS.map(s => (
          <button
            key={s}
            onClick={() => setStandard(s)}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
              standard === s ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50" : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
          >
            {s === "all" ? "全部" : s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search compliance standards..."
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searchMut.isPending || !query.trim()}
          className="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 text-white text-sm rounded disabled:opacity-50 transition-colors"
        >
          {searchMut.isPending ? "..." : "搜索"}
        </button>
      </div>

      {/* Results */}
      <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-hide">
        {searchMut.data?.results.map((result) => (
          <div key={result.id} className="bg-white/5 rounded p-3 border border-white/5">
            <button
              onClick={() => setExpanded(expanded === result.id ? null : result.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-sm text-white/90 font-medium">{result.title}</span>
              {expanded === result.id ? <ChevronUp className="w-3.5 h-3.5 text-white/40" /> : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
            </button>
            {expanded === result.id && (
              <div className="mt-2 text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{result.content}</div>
            )}
          </div>
        ))}
        {searchMut.data?.results.length === 0 && (
          <div className="text-center text-sm text-white/40 py-4">未找到匹配的合规文档</div>
        )}
        {!searchMut.data && !searchMut.isPending && (
          <div className="text-center text-sm text-white/30 py-4">输入关键词搜索合规标准 (UL 508A, OSHA LOTO...)</div>
        )}
      </div>
    </div>
  );
}

// ─── Ticket Lifecycle Viz ──────────────────────────────────────────────────────

function TicketLifecycleViz() {
  const { data, isLoading } = trpc.serviceDashboard.getTicketLifecycle.useQuery(undefined, {
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return <Skeleton className="h-32" />;
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/90 font-semibold flex items-center gap-2">
          <TicketCheck className="w-4 h-4 text-cyan-400" />
          工单生命周期 — {data.ticketId}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs ${
            data.priority === "Critical" ? "bg-red-500/20 text-red-400" :
            data.priority === "High" ? "bg-amber-500/20 text-amber-400" :
            "bg-white/10 text-white/60"
          }`}>{data.priority}</span>
          {data.slaCompliant && (
            <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> SLA
            </span>
          )}
        </div>
      </div>

      {/* 7-stage pipeline */}
      <div className="flex items-start gap-1 overflow-x-auto scrollbar-hide pb-2">
        {data.stages.map((stage, i) => (
          <div key={stage.stage} className="flex items-start min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center w-16 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                stage.status === "completed" ? "bg-emerald-500/30 border-emerald-500 text-emerald-300" :
                stage.status === "active" ? "bg-cyan-500/30 border-cyan-500 text-cyan-300 animate-pulse" :
                "bg-white/5 border-white/20 text-white/30"
              }`}>
                {stage.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <div className="text-[10px] text-white/60 mt-1 text-center leading-tight">{stage.label}</div>
              {stage.timestamp && (
                <div className="text-[9px] text-white/30 mt-0.5">
                  {new Date(stage.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              {stage.actor && (
                <div className="text-[9px] text-cyan-400/60 mt-0.5 truncate max-w-[60px]">{stage.actor}</div>
              )}
            </div>
            {/* Connector */}
            {i < data.stages.length - 1 && (
              <div className={`w-4 h-0.5 mt-4 shrink-0 ${
                stage.status === "completed" ? "bg-emerald-500/50" : "bg-white/10"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Region Placeholder ────────────────────────────────────────────────────────

function RegionPlaceholder({ region }: { region: { region: string; regionCn: string; projectCount: number; engineerCount: number; activeTickets: number; healthScore: number } }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 text-center">
      <Globe className="w-12 h-12 text-white/20 mx-auto mb-4" />
      <h3 className="text-white/80 font-semibold text-lg mb-2">{region.regionCn}区域服务中心</h3>
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-4">
        <div><div className="text-2xl font-bold text-cyan-400">{region.projectCount}</div><div className="text-xs text-white/50">项目</div></div>
        <div><div className="text-2xl font-bold text-cyan-400">{region.engineerCount}</div><div className="text-xs text-white/50">工程师</div></div>
        <div><div className="text-2xl font-bold text-cyan-400">{region.activeTickets}</div><div className="text-xs text-white/50">活跃工单</div></div>
      </div>
      <p className="text-white/40 text-sm">详细面板即将上线 — 敬请期待</p>
    </div>
  );
}

// ─── NA Stats Bar ──────────────────────────────────────────────────────────────

function NAStatsBar() {
  const { data, isLoading } = trpc.serviceDashboard.getNorthAmericaStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return <Skeleton className="h-14 mb-4" />;
  }

  const kpis = [
    { label: "项目", value: data.projectCount, icon: Globe },
    { label: "工程师", value: data.engineerCount, icon: Users },
    { label: "备件覆盖", value: `${data.sparePartsCoverage}%`, icon: Package },
    { label: "响应(h)", value: data.avgResponseTimeHours, icon: Clock },
    { label: "开放工单", value: data.ticketsOpen, icon: AlertTriangle },
    { label: "已关闭", value: data.ticketsClosed, icon: CheckCircle2 },
    { label: "满意度", value: `${data.customerSatisfaction}/5`, icon: Star },
    { label: "MTTR(h)", value: data.mttr, icon: Activity },
  ];

  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
      {kpis.map(k => (
        <div key={k.label} className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
          <k.icon className="w-3.5 h-3.5 text-cyan-400/60 mx-auto mb-1" />
          <div className="text-sm font-bold text-white/90">{k.value}</div>
          <div className="text-[10px] text-white/40">{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GlobalServiceDashboard() {
  const [activeRegion, setActiveRegion] = useState<Region>("NorthAmerica");
  const regionOverview = trpc.serviceDashboard.getRegionOverview.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const selectedRegionData = regionOverview.data?.find(r => r.region === activeRegion);

  return (
    <div className="space-y-4">
      {/* Region Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
        {REGION_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveRegion(tab.key)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeRegion === tab.key
                ? "bg-cyan-600/80 text-white shadow-lg shadow-cyan-500/20"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            {tab.label}
            <span className="text-[10px] ml-1 opacity-60">{tab.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Region Overview Cards */}
      <RegionOverviewCards onSelectRegion={setActiveRegion} />

      {/* Region Content */}
      {activeRegion === "NorthAmerica" ? (
        <div className="space-y-4">
          <NAStatsBar />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ServiceReplicationDemo />
            <DetroitDigitalFactory />
          </div>
          <InteractiveNAMap />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ComplianceQAPanel />
            <TicketLifecycleViz />
          </div>
        </div>
      ) : (
        selectedRegionData && <RegionPlaceholder region={selectedRegionData} />
      )}
    </div>
  );
}
