/**
 * CustomerProjectPortal — 客户专属Portal (GRT-Oracle 战略视图)
 *
 * 将GRTS 3.0后台数据转化为客户CEO关心的3个维度:
 * 1. 设备健康得分 (16维AI → 4个客户可见维度)
 * 2. 服务承诺看板 (PLM/项目管理 → 简化进度列表)
 * 3. 免费16维智能维护试用 (AI创新 → 客户赋能)
 *
 * Route: /customer-project-portal
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";

type Lang = "zh" | "en";
const LANG_KEY = "grt_customer_lang";

// ── Customer-facing dimension scores (mapped from GRTS 3.0 backend) ──
const HEALTH_DIMENSIONS = [
  { key: "cleanliness", labelZh: "清洁度达成", labelEn: "Cleanliness Achievement", score: 96, icon: "💧", color: "from-cyan-500 to-blue-600", descZh: "ISO 16232 颗粒度 ≤50μm", descEn: "ISO 16232 Particle ≤50μm" },
  { key: "uptime", labelZh: "设备运行率", labelEn: "Equipment Uptime", score: 98, icon: "⚡", color: "from-green-500 to-emerald-600", descZh: "MES实时监测 · 计划外停机<2%", descEn: "MES Real-time · Unplanned downtime <2%" },
  { key: "predictive", labelZh: "预测性维护", labelEn: "Maintenance Predictor", score: 89, icon: "🔮", color: "from-violet-500 to-purple-600", descZh: "AI 16维模型 · 故障预判7天", descEn: "AI 16-dim Model · 7-day Prediction" },
  { key: "energy", labelZh: "能效优化", labelEn: "Energy Efficiency", score: 92, icon: "🌱", color: "from-amber-500 to-orange-600", descZh: "碳氢清洗 · 热回收 · 智能排程", descEn: "HC Cleaning · Heat Recovery · Smart Scheduling" },
];

// ── Service Commitment Board (from real WeChat dialogue + PLM data) ──
const SERVICE_COMMITMENTS = [
  { id: 1, titleZh: "原有3品种清洁度确认", titleEn: "Existing 3-Product Cleanliness Verification", status: "completed", dateZh: "已确认 — 协议内3品种清洁度达标，无问题", dateEn: "Confirmed — All 3 agreed product types meet cleanliness standards", icon: "✅" },
  { id: 2, titleZh: "新增品种工作腔升级方案", titleEn: "New Product Type Chamber Upgrade Plan", status: "in_progress", dateZh: "进行中 — 第一工作腔升级设计方案制定中", dateEn: "In Progress — 1st Chamber Upgrade Design Underway", icon: "🔧" },
  { id: 3, titleZh: "过程清洗工艺升级评估", titleEn: "Process Cleaning Upgrade Assessment", status: "review", dateZh: "评审中 — 新品种清洗参数优化与验证", dateEn: "Under Review — New Product Cleaning Parameter Optimization", icon: "📋" },
  { id: 4, titleZh: "升级订单与交付排期", titleEn: "Upgrade Order & Delivery Schedule", status: "scheduled", dateZh: "待确认 — 等待贵方确认升级范围后排产", dateEn: "Pending — Awaiting Scope Confirmation for Scheduling", icon: "📅" },
  { id: 5, titleZh: "合作共赢 · 长期服务保障", titleEn: "Win-Win · Long-term Service Commitment", status: "completed", dateZh: "已建立 — 倪亚东 (CEO) 直接对接，主动服务", dateEn: "Established — CEO Ni Yadong Direct Engagement", icon: "🤝" },
];

// ── 16-Dim Intelligent Monitoring (core) ──
const AI_DIMS_CORE = [
  { zh: "振动分析", en: "Vibration", v: 94, cat: "core" },
  { zh: "温度监控", en: "Temperature", v: 97, cat: "core" },
  { zh: "压力稳定", en: "Pressure", v: 91, cat: "core" },
  { zh: "流量一致", en: "Flow", v: 96, cat: "core" },
  { zh: "超声频率", en: "Ultrasonic Freq", v: 98, cat: "core" },
  { zh: "过滤压差", en: "Filter ΔP", v: 93, cat: "core" },
  { zh: "干燥性能", en: "Drying", v: 95, cat: "core" },
  { zh: "能耗优化", en: "Energy", v: 88, cat: "core" },
  { zh: "颗粒度趋势", en: "Particle Trend", v: 96, cat: "core" },
  { zh: "pH/电导率", en: "pH/Conductivity", v: 99, cat: "core" },
  { zh: "液位/自动补液", en: "Level/Auto-Refill", v: 97, cat: "core" },
  { zh: "泵浦状态", en: "Pump Health", v: 92, cat: "core" },
  { zh: "阀门响应", en: "Valve Response", v: 94, cat: "core" },
  { zh: "PLC通讯", en: "PLC Comm", v: 100, cat: "core" },
  { zh: "安全连锁", en: "Safety Interlock", v: 100, cat: "core" },
  { zh: "远程诊断", en: "Remote Diag", v: 87, cat: "core" },
];

// ── Performance & Commissioning Indicators (extended) ──
const PERF_INDICATORS = [
  { zh: "清洁度达成", en: "Cleanliness", v: 96, cat: "perf", unit: "ISO16232" },
  { zh: "干燥效果", en: "Drying Quality", v: 95, cat: "perf", unit: "水渍检测" },
  { zh: "节拍达成", en: "Cycle Time", v: 98, cat: "perf", unit: "s/cycle" },
  { zh: "防锈效果", en: "Anti-Rust", v: 92, cat: "optional", unit: "盐雾测试" },
  { zh: "零件温度", en: "Part Temp", v: 94, cat: "optional", unit: "°C控制" },
  { zh: "去磁效果", en: "Demagnetize", v: null, cat: "optional", unit: "高斯" },
  { zh: "油水分离", en: "Oil-Water Sep", v: 91, cat: "optional", unit: "ppm" },
  { zh: "电导率监控", en: "Conductivity", v: 99, cat: "optional", unit: "μS/cm" },
  { zh: "自动补液", en: "Auto-Refill", v: 97, cat: "optional", unit: "浓度%" },
  { zh: "过滤压差设定", en: "Filter ΔP Set", v: 93, cat: "system", unit: "bar" },
  { zh: "设备自清洁", en: "Self-Clean", v: 90, cat: "system", unit: "周期" },
  { zh: "多场景程序", en: "Multi-Recipe", v: 96, cat: "system", unit: "套" },
  { zh: "PM计划设定", en: "PM Schedule", v: 88, cat: "system", unit: "执行率%" },
];

// ── FAT Pre-Acceptance Checklist (调试→预验收) ──
const FAT_CHECKLIST = [
  // Phase 1: Commissioning (设备调试阶段)
  { phase: "commissioning", zh: "清洗工艺参数确认", en: "Cleaning Process Parameters", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "干燥参数调试", en: "Drying Parameter Tuning", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "节拍优化与确认", en: "Cycle Time Optimization", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "超声波功率/频率校准", en: "Ultrasonic Power/Freq Calibration", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "过滤系统压差设定", en: "Filter ΔP Threshold Setting", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "自动补液浓度设定", en: "Auto-Refill Concentration", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "设备自清洁周期设定", en: "Self-Clean Cycle Config", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "多场景程序逻辑验证", en: "Multi-Recipe Logic Test", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "PM保养计划设定", en: "PM Schedule Configuration", status: "done", approver: "技师", note: "" },
  { phase: "commissioning", zh: "安全连锁功能测试", en: "Safety Interlock Test", status: "done", approver: "技师", note: "" },
  // Phase 2: Pre-FAT verification (预验收前)
  { phase: "pre_fat", zh: "清洁度性能检测报告", en: "Cleanliness Performance Report", status: "done", approver: "项目工程师", note: "ISO 16232 A级" },
  { phase: "pre_fat", zh: "干燥性能检测报告", en: "Drying Performance Report", status: "done", approver: "项目工程师", note: "无水渍" },
  { phase: "pre_fat", zh: "防锈效果验证", en: "Anti-Rust Verification", status: "conditional", approver: "项目工程师", note: "客户要求时执行" },
  { phase: "pre_fat", zh: "零件温度控制验证", en: "Part Temp Control Verify", status: "conditional", approver: "项目工程师", note: "敏感零件时执行" },
  { phase: "pre_fat", zh: "去磁效果检测", en: "Demagnetization Test", status: "na", approver: "项目工程师", note: "本项目不涉及" },
  { phase: "pre_fat", zh: "油水分离效果", en: "Oil-Water Separation", status: "done", approver: "项目工程师", note: "≤5ppm" },
  { phase: "pre_fat", zh: "电导率监控校订", en: "Conductivity Calibration", status: "done", approver: "项目工程师", note: "已校准" },
  { phase: "pre_fat", zh: "客户零件traceability对接准备", en: "Traceability System Readiness", status: "planned", approver: "项目工程师", note: "待客户MES接口确认" },
  { phase: "pre_fat", zh: "客户关键参数清单确认", en: "Customer Key Params Confirmed", status: "done", approver: "项目工程师", note: "历史设定已存档" },
  { phase: "pre_fat", zh: "全生命周期服务系统对接", en: "Lifecycle Service System Link", status: "done", approver: "项目工程师", note: "GRTS 3.0 已连通" },
  // Phase 3: Approval (批准)
  { phase: "approval", zh: "调试技师确认", en: "Commissioning Tech Sign-off", status: "done", approver: "杜显文 (电气班组副班长)", note: "全部调试项通过" },
  { phase: "approval", zh: "项目工程师确认", en: "Project Engineer Sign-off", status: "done", approver: "李大鹏 (电气工程师)", note: "性能检测全部达标" },
  { phase: "approval", zh: "事业部经理批准", en: "BU Manager Approval", status: "pending", approver: "戴晓燕 (高级销售经理)", note: "待批准进入客户预验收" },
];


export default function CustomerProjectPortal() {
  const { user } = useAuth();
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "zh");
  const [showAI, setShowAI] = useState(false);
  const [trialReq, setTrialReq] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [showProjectM, setShowProjectM] = useState(false);
  const z = lang === "zh";
  const toggleLang = () => { const n = lang === "zh" ? "en" : "zh"; setLang(n); localStorage.setItem(LANG_KEY, n); };
  const overall = Math.round(HEALTH_DIMENSIONS.reduce((s, d) => s + d.score, 0) / HEALTH_DIMENSIONS.length);
  const cName = user?.company || user?.name || (z ? "尊敬的客户" : "Valued Customer");

  return (
    <div className="min-h-screen bg-[#faf9f8]" style={{ fontFamily: "'Segoe UI','PingFang SC',system-ui,sans-serif" }}>
      {/* Top Bar */}
      <div className="bg-white border-b border-[#edebe9] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/GRTlogo.gif" alt="GRT" className="w-8 h-8 rounded-lg" />
            <span className="text-sm font-semibold text-[#323130]">{z ? "GRT 客户专属门户" : "GRT Customer Portal"}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0078d4]/10 text-[#0078d4] font-mono">GRTS 3.0</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#605e5c]">{user?.name || ""}</span>
            <button onClick={toggleLang} className="text-xs text-[#605e5c] hover:text-[#323130] border border-[#edebe9] rounded px-2 py-1">{z ? "EN" : "中文"}</button>
            <button onClick={() => { fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/customer/auth"; }} className="text-xs text-[#a19f9d] hover:text-red-500">{z ? "退出" : "Logout"}</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-6">
        {/* ═══ 1: Equipment Health ═══ */}
        <section>
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-[#323130]">{z ? `${cName} · 设备运行健康总览` : `${cName} · Equipment Health Overview`}</h1>
            <p className="text-xs text-[#a19f9d] mt-1">{z ? "数据来源: GRT智能管理系统 GRTS 3.0 · 实时监测" : "Source: GRTS 3.0 · Real-time Monitoring"}</p>
          </div>
          <div className="flex justify-center mb-6">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#edebe9" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={overall >= 90 ? "#107c10" : "#0078d4"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${overall * 3.27} 327`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[#107c10]">{overall}%</span>
                <span className="text-[10px] text-[#605e5c]">{z ? "综合健康" : "Overall"}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HEALTH_DIMENSIONS.map(d => (
              <div key={d.key} className="bg-white rounded-lg border border-[#edebe9] p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{d.icon}</span>
                  <span className="text-xs font-semibold text-[#323130]">{z ? d.labelZh : d.labelEn}</span>
                </div>
                <div className="text-2xl font-bold text-[#323130] mb-1">{d.score}<span className="text-sm font-normal text-[#a19f9d]">%</span></div>
                <div className="h-1.5 rounded-full bg-[#edebe9] overflow-hidden mb-2">
                  <div className={`h-full rounded-full bg-gradient-to-r ${d.color}`} style={{ width: `${d.score}%` }} />
                </div>
                <div className="text-[10px] text-[#a19f9d]">{z ? d.descZh : d.descEn}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 2: Service Commitment Board ═══ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#0078d4] rounded-full" />
              {z ? "专项服务承诺看板" : "Service Commitment Board"}
            </h2>
            <span className="text-[10px] text-[#0078d4] font-medium">{z ? "倪亚东 (CEO) 督办" : "Overseen by CEO Ni Yadong"}</span>
          </div>
          <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm divide-y divide-[#edebe9]">
            {SERVICE_COMMITMENTS.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f3f2f1] transition-colors">
                <span className="text-lg w-8 text-center">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#323130] truncate">{z ? c.titleZh : c.titleEn}</div>
                  <div className="text-xs text-[#a19f9d]">{z ? c.dateZh : c.dateEn}</div>
                </div>
                <div className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  c.status === "completed" ? "bg-green-100 text-green-700" :
                  c.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                  c.status === "review" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                }`}>{c.status === "completed" ? (z ? "已完成" : "Done") : c.status === "in_progress" ? (z ? "进行中" : "Active") : c.status === "review" ? (z ? "评审中" : "Review") : (z ? "已排期" : "Scheduled")}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 3: Intelligent Monitoring + Performance Indicators ═══ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#8764b8] rounded-full" />
              {z ? "智能监测与性能指标" : "Intelligent Monitoring & Performance"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8764b8]/10 text-[#8764b8] font-semibold">{z ? "集团AI自主技术" : "Proprietary AI"}</span>
              {!showAI && <button onClick={() => setShowAI(true)} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0078d4] text-white">🔓 {z ? "解锁详情" : "Unlock"}</button>}
            </div>
          </div>

          {showAI ? (
            <div className="space-y-4">
              {/* 16-Dim Core Monitoring */}
              <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#323130]">🔮 {z ? "16维度实时监测" : "16-Dim Real-time"}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold animate-pulse">{z ? "实时" : "LIVE"}</span>
                  </div>
                  {!trialReq ? (
                    <button onClick={() => setTrialReq(true)} className="text-xs px-3 py-1 rounded-lg bg-[#0078d4] text-white hover:bg-[#106ebe]">{z ? "申请正式开通" : "Request Full"}</button>
                  ) : (
                    <span className="text-xs text-green-600 font-semibold">✅ {z ? "已提交" : "Submitted"}</span>
                  )}
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {AI_DIMS_CORE.map((d, i) => (
                    <div key={i} className="text-center p-2 rounded-lg border border-[#edebe9] hover:border-[#0078d4]/30 transition-colors">
                      <div className={`text-lg font-bold ${d.v >= 95 ? "text-[#107c10]" : d.v >= 85 ? "text-[#0078d4]" : "text-[#d83b01]"}`}>{d.v}</div>
                      <div className="text-[9px] text-[#605e5c] leading-tight mt-0.5">{z ? d.zh : d.en}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-4">
                <div className="text-sm font-semibold text-[#323130] mb-3">📊 {z ? "性能检测指标" : "Performance Indicators"}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PERF_INDICATORS.map((p, i) => (
                    <div key={i} className={`p-2.5 rounded-lg border ${p.v === null ? "border-dashed border-[#a19f9d]/40 opacity-50" : p.cat === "optional" ? "border-[#edebe9] bg-amber-50/30" : "border-[#edebe9]"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-[#323130]">{z ? p.zh : p.en}</span>
                        {p.cat === "optional" && <span className="text-[8px] text-amber-600">{z ? "按需" : "OPT"}</span>}
                      </div>
                      {p.v !== null ? (
                        <>
                          <div className={`text-lg font-bold mt-0.5 ${p.v >= 95 ? "text-[#107c10]" : p.v >= 85 ? "text-[#0078d4]" : "text-[#d83b01]"}`}>{p.v}<span className="text-[9px] font-normal text-[#a19f9d]">%</span></div>
                          <div className="text-[8px] text-[#a19f9d]">{p.unit}</div>
                        </>
                      ) : (
                        <div className="text-xs text-[#a19f9d] mt-1">{z ? "本项目不涉及" : "N/A"}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#8764b8]/5 to-[#0078d4]/5 rounded-lg border border-[#8764b8]/20 p-6 text-center">
              <div className="text-4xl mb-3">🔮</div>
              <h3 className="text-lg font-semibold text-[#323130] mb-2">{z ? "16维监测 + 13项性能指标" : "16-Dim Monitoring + 13 Performance Indicators"}</h3>
              <p className="text-xs text-[#605e5c] mb-4 max-w-md mx-auto">{z ? "清洁度·干燥·节拍·防锈·去磁·油水分离·电导率·自动补液·过滤压差·自清洁·多程序·PM·全生命周期" : "Cleanliness · Drying · Cycle · Anti-Rust · Demagnetize · Oil-Water · Conductivity · Auto-Refill · Filter · Self-Clean · Multi-Recipe · PM · Lifecycle"}</p>
              <button onClick={() => setShowAI(true)} className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#8764b8] to-[#0078d4] text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-[#8764b8]/20">
                🔓 {z ? "立即解锁查看" : "Unlock Now"}
              </button>
            </div>
          )}
        </section>

        {/* ═══ 3b: FAT Pre-Acceptance Checklist (调试→预验收→批准) ═══ */}
        {showAI && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#323130] flex items-center gap-2">
                <span className="w-1 h-5 bg-[#d83b01] rounded-full" />
                {z ? "调试与预验收审批流程" : "Commissioning & Pre-FAT Approval"}
              </h2>
              <span className="text-[10px] text-[#605e5c]">{z ? "技师确认 → 项目工程师确认 → 事业部经理批准" : "Tech → Engineer → BU Manager Approval"}</span>
            </div>
            <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm divide-y divide-[#edebe9]">
              {["commissioning", "pre_fat", "approval"].map(phase => (
                <div key={phase} className="p-4">
                  <div className="text-xs font-semibold text-[#605e5c] mb-2 flex items-center gap-2">
                    {phase === "commissioning" && <><span>⚙️</span>{z ? "设备调试阶段" : "Commissioning Phase"}</>}
                    {phase === "pre_fat" && <><span>📋</span>{z ? "预验收前验证" : "Pre-FAT Verification"}</>}
                    {phase === "approval" && <><span>✍️</span>{z ? "审批签字" : "Approval Sign-off"}</>}
                  </div>
                  <div className="space-y-1.5">
                    {FAT_CHECKLIST.filter(c => c.phase === phase).map((c, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#f3f2f1]">
                        <div className="flex items-center gap-2">
                          {c.status === "done" && <span className="text-green-600 text-xs">✅</span>}
                          {c.status === "pending" && <span className="text-amber-500 text-xs animate-pulse">⏳</span>}
                          {c.status === "conditional" && <span className="text-blue-500 text-xs">🔹</span>}
                          {c.status === "planned" && <span className="text-violet-500 text-xs">📅</span>}
                          {c.status === "na" && <span className="text-gray-400 text-xs">➖</span>}
                          <span className={`text-xs ${c.status === "na" ? "text-[#a19f9d] line-through" : "text-[#323130]"}`}>{z ? c.zh : c.en}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.note && <span className="text-[9px] text-[#605e5c]">{c.note}</span>}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            c.status === "done" ? "bg-green-100 text-green-700" :
                            c.status === "pending" ? "bg-amber-100 text-amber-700" :
                            c.status === "conditional" ? "bg-blue-100 text-blue-700" :
                            c.status === "planned" ? "bg-violet-100 text-violet-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {c.status === "done" ? (z ? "已完成" : "Done") :
                             c.status === "pending" ? (z ? "待批准" : "Pending") :
                             c.status === "conditional" ? (z ? "有条件执行" : "Conditional") :
                             c.status === "planned" ? (z ? "已计划" : "Planned") :
                             (z ? "不涉及" : "N/A")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-[#a19f9d] text-center">
              {z ? "💡 \"有条件预验收\"由事业部经理确认与控制，未完成项在SAT前必须闭环" : "💡 Conditional pre-acceptance controlled by BU Manager; open items must close before SAT"}
            </div>
          </section>
        )}

        {/* ═══ Section 3c: Customer Final Acceptance Confirmation ═══ */}
        {showAI && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#323130] flex items-center gap-2">
                <span className="w-1 h-5 bg-[#107c10] rounded-full" />
                {z ? "终验收前状态确认 (客户端)" : "Pre-Final Acceptance Confirmation (Customer)"}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#107c10]/10 text-[#107c10] font-semibold">{z ? "GRTS 3.0 同步" : "GRTS 3.0 Synced"}</span>
            </div>
            <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-4 space-y-3">
              <div className="text-xs text-[#605e5c] mb-2">{z ? "以下项目已由GRT内部审批通过，请贵方确认后进入终验收 (SAT)：" : "The following items have been internally approved by GRT. Please confirm to proceed to SAT:"}</div>
              {[
                { zh: "设备调试 (10项全部通过)", en: "Commissioning (10/10 passed)", status: "grt_approved", confirm: true },
                { zh: "性能检测报告 (清洁度/干燥/节拍等)", en: "Performance Reports (Cleanliness/Drying/Cycle)", status: "grt_approved", confirm: true },
                { zh: "安全功能验证", en: "Safety Function Verification", status: "grt_approved", confirm: true },
                { zh: "操作培训完成", en: "Operator Training Completed", status: "grt_approved", confirm: false },
                { zh: "备品备件移交", en: "Spare Parts Handover", status: "grt_approved", confirm: true },
                { zh: "技术资料移交 (操作手册/电气图/BOM)", en: "Technical Documents Handover", status: "grt_approved", confirm: false },
                { zh: "PM保养计划确认", en: "PM Schedule Confirmation", status: "grt_approved", confirm: false },
                { zh: "全生命周期服务系统访问确认", en: "Lifecycle Portal Access Confirmed", status: "grt_approved", confirm: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg border border-[#edebe9] hover:bg-[#f3f2f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xs">✅</span>
                    <span className="text-xs text-[#323130]">{z ? item.zh : item.en}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">{z ? "GRT已确认" : "GRT Confirmed"}</span>
                    {item.confirm ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{z ? "✅ 客户已确认" : "✅ Customer OK"}</span>
                    ) : (
                      <button className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                        {z ? "点击确认" : "Confirm"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-[#edebe9] flex items-center justify-between">
                <div className="text-[10px] text-[#a19f9d]">{z ? "5/8 项已由客户确认。全部确认后可进入SAT终验收。" : "5/8 confirmed by customer. Full confirmation required for SAT."}</div>
                <button className="text-xs px-3 py-1.5 rounded-lg bg-[#107c10] text-white hover:bg-[#0e6b0e] transition-colors">
                  {z ? "全部确认 → 进入SAT" : "Confirm All → Proceed to SAT"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ═══ Section 4: Equipment Service Hub (设备服务中心) ═══ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#107c10] rounded-full" />
              {z ? "设备全生命周期服务" : "Equipment Lifecycle Service"}
            </h2>
            <span className="text-[10px] text-[#107c10] font-medium">{z ? "GRTS 3.0 联通" : "GRTS 3.0 Integrated"}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { z: "备品备件库存", e: "Spare Parts Inventory", i: "📦", d: z ? "交付件清单 · 库存预警 · 一键采购" : "Delivered list · Stock alerts · Quick order", c: "border-l-blue-500" },
              { z: "PM保养计划", e: "PM Schedule", i: "🔧", d: z ? "每日/周/月/季度保养 · 检查清单" : "Daily/Weekly/Monthly/Quarterly PM", c: "border-l-green-500" },
              { z: "维修记录", e: "Repair History", i: "📋", d: z ? "故障描述 · 维修过程 · 零件使用" : "Fault log · Repair steps · Parts used", c: "border-l-amber-500" },
              { z: "远程支持", e: "Remote Support", i: "📹", d: z ? "GRT工程师视频指导 · 摄像头支持" : "GRT engineer video guidance · Camera", c: "border-l-violet-500" },
              { z: "设备健康档案", e: "Health Records", i: "❤️", d: z ? "16维健康评分 · 趋势分析 · AI预测" : "16-dim health score · Trends · AI", c: "border-l-red-500" },
              { z: "🤖 智能维护指导 (预览)", e: "🤖 Smart Guidance (Preview)", i: "", d: z ? "GRTS 8.0 人型机器人 · 现场指导维护" : "GRTS 8.0 Humanoid Robot · On-site Guide", c: "border-l-cyan-500 opacity-60" },
            ].map((item, i) => (
              <div key={i} className={`bg-white rounded-lg border border-[#edebe9] border-l-4 ${item.c} p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {item.i && <span className="text-lg">{item.i}</span>}
                  <span className="text-sm font-semibold text-[#323130]">{z ? item.z : item.e}</span>
                </div>
                <div className="text-[10px] text-[#a19f9d] leading-relaxed">{item.d}</div>
                {i === 5 && <div className="mt-2 text-[9px] text-cyan-600 font-mono">{z ? "即将推出 · GRTS 8.0" : "Coming Soon · GRTS 8.0"}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Section 5: Industry Selector + Smart Resources ═══ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#d83b01] rounded-full" />
              {z ? "行业方案与资源中心" : "Industry Solutions & Resources"}
            </h2>
            <span className="text-[10px] text-[#605e5c]">{z ? "可多选 · 资料按行业智能排序" : "Multi-select · Smart sorting"}</span>
          </div>

          {/* Industry Tags (multi-select) */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: "fuel_injection", z: "燃油喷射", e: "Fuel Injection", i: "💉" },
              { id: "die_casting_al", z: "铝压铸加工装配", e: "Al Die Casting", i: "🔩" },
              { id: "die_casting_mg", z: "镁压铸加工装配", e: "Mg Die Casting", i: "⚙️" },
              { id: "powertrain", z: "发动机变速箱", e: "Powertrain", i: "🏎️" },
              { id: "energy_storage", z: "储能", e: "Energy Storage", i: "🔋" },
              { id: "telecom", z: "电信", e: "Telecom", i: "📡" },
              { id: "semiconductor", z: "半导体", e: "Semiconductor", i: "💎" },
              { id: "engineering", z: "工程", e: "Engineering", i: "🏗️" },
              { id: "machining", z: "机加工", e: "Machining", i: "🔧" },
              { id: "integrated", z: "集成系统", e: "Integrated System", i: "🔗" },
              { id: "other", z: "其他", e: "Other", i: "📂" },
            ].map(ind => {
              const selected = selectedIndustries.includes(ind.id);
              return (
                <button key={ind.id}
                  onClick={() => setSelectedIndustries(prev => selected ? prev.filter(x => x !== ind.id) : [...prev, ind.id])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    selected ? "bg-[#0078d4] text-white shadow-md" : "bg-white border border-[#edebe9] text-[#605e5c] hover:border-[#0078d4]/40"
                  }`}>
                  <span>{ind.i}</span>
                  {z ? ind.z : ind.e}
                </button>
              );
            })}
          </div>

          {/* Resources Grid — sorted by selected industries */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(() => {
              const allResources = [
                { z: "GRT 公司介绍", e: "About GRT", h: "/showcase/company-intro", i: "🌍", ind: ["all"], d: z ? "中/英/德/法 四语言 · 20+年发展历程" : "4 Languages · 20+ Years", prio: 0 },
                { z: "闭环自适应清洗展厅", e: "Adaptive Showroom", h: "/showroom", i: "🏭", ind: ["all"], d: z ? "实时数据 · 闭环控制 · 性能桥接" : "Real-time · Closed-loop · Performance", prio: 1 },
                { z: "燃油喷射精密清洗方案", e: "Fuel Injection Cleaning", h: "/showcase/fuel-injection", i: "💉", ind: ["fuel_injection"], d: z ? "喷油嘴 · 高压共轨 · 阀芯 · 残油≤0.5mg" : "Injectors · Rail · Oil≤0.5mg", prio: 2 },
                { z: "新能源清洗方案", e: "NEV Solutions", h: "/showcase/new-energy", i: "⚡", ind: ["energy_storage","die_casting_al","powertrain"], d: z ? "电驱壳体 · 电池托盘 · IoT集成" : "E-drive · Battery · IoT", prio: 3 },
                { z: "铝压铸清洗方案", e: "Die Casting Solutions", h: "/showcase/die-casting", i: "🔩", ind: ["die_casting_al","die_casting_mg","powertrain"], d: z ? "一体化压铸 · Mega Casting · 全自动" : "Mega Casting · Full-Auto", prio: 4 },
                { z: "发动机变速箱清洗", e: "Powertrain Cleaning", h: "/showcase/ice", i: "🏎️", ind: ["powertrain","machining"], d: z ? "缸体 · 缸盖 · 曲轴 · 碳氢清洗" : "Blocks · Heads · HC Cleaning", prio: 5 },
                { z: "典型设备操作手册 (DEMO)", e: "Equipment Manual (Demo)", h: "#", i: "📖", ind: ["all"], d: z ? "USC/KLT/TSL/MCL 系列操作指南" : "USC/KLT/TSL/MCL Series Manual", prio: 6 },
                { z: "维修保养案例库", e: "Maintenance Case Library", h: "#", i: "🔧", ind: ["all"], d: z ? "典型故障诊断 · 保养作业标准 · 备件参考" : "Fault diagnosis · PM standards · Parts ref", prio: 7 },
                { z: "备品备件参考清单", e: "Spare Parts Catalog", h: "#", i: "📦", ind: ["all"], d: z ? "标准备件清单 · 建议库存 · 采购参考价" : "Standard list · Stock · Reference price", prio: 8 },
              ];
              // Sort: selected industries first, then all
              const sel = selectedIndustries;
              return allResources
                .filter(r => r.ind.includes("all") || (sel.length === 0) || r.ind.some(x => sel.includes(x)))
                .sort((a, b) => {
                  const aMatch = a.ind.some(x => sel.includes(x)) ? -1 : 0;
                  const bMatch = b.ind.some(x => sel.includes(x)) ? -1 : 0;
                  return aMatch - bMatch || a.prio - b.prio;
                })
                .map((r, i) => (
                  <a key={i} href={r.h} target={r.h.startsWith("/") ? "_blank" : undefined} rel="noopener"
                    className="flex flex-col gap-1.5 p-4 rounded-lg bg-white border border-[#edebe9] hover:border-[#0078d4]/30 hover:shadow-md transition-all shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{r.i}</span>
                      <span className="text-sm font-semibold text-[#323130]">{z ? r.z : r.e}</span>
                    </div>
                    <div className="text-[10px] text-[#a19f9d] leading-relaxed">{r.d}</div>
                  </a>
                ));
            })()}
          </div>
        </section>

        {/* ═══ Section 6: Project Management (M0-M12) ═══ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#0078d4] rounded-full" />
              {z ? "项目管理与交付 (M0-M12)" : "Project Management & Delivery (M0-M12)"}
            </h2>
            <button onClick={() => setShowProjectM(!showProjectM)}
              className="text-[10px] px-2 py-1 rounded border border-[#0078d4]/30 text-[#0078d4] hover:bg-[#0078d4]/5">
              {showProjectM ? (z ? "收起" : "Collapse") : (z ? "展开项目阶段" : "Show Phases")}
            </button>
          </div>
          {showProjectM && (
            <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-4">
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {[
                  { m: "M0", z: "项目立项", e: "Initiation", s: "completed" },
                  { m: "M1", z: "概念设计", e: "Concept", s: "completed" },
                  { m: "M2", z: "详细设计", e: "Detail Design", s: "completed" },
                  { m: "M3", z: "物料采购", e: "Procurement", s: "in_progress" },
                  { m: "M4", z: "组装制造", e: "Assembly", s: "scheduled" },
                  { m: "M5", z: "内部调试", e: "Internal Test", s: "scheduled" },
                  { m: "M6", z: "FAT验收", e: "FAT", s: "scheduled" },
                  { m: "M7", z: "发运安装", e: "Delivery", s: "scheduled" },
                  { m: "M8", z: "现场调试", e: "On-site Test", s: "scheduled" },
                  { m: "M9", z: "SAT验收", e: "SAT", s: "scheduled" },
                  { m: "M10", z: "培训移交", e: "Training", s: "scheduled" },
                  { m: "M11", z: "质保服务", e: "Warranty", s: "scheduled" },
                  { m: "M12", z: "终验结项", e: "Closeout", s: "scheduled" },
                ].map((phase) => (
                  <div key={phase.m} className={`text-center p-2.5 rounded-lg border ${
                    phase.s === "completed" ? "border-green-200 bg-green-50" :
                    phase.s === "in_progress" ? "border-blue-200 bg-blue-50" :
                    "border-[#edebe9]"
                  }`}>
                    <div className={`text-xs font-bold ${
                      phase.s === "completed" ? "text-green-700" :
                      phase.s === "in_progress" ? "text-blue-700" : "text-[#605e5c]"
                    }`}>{phase.m}</div>
                    <div className="text-[9px] text-[#605e5c] mt-0.5">{z ? phase.z : phase.e}</div>
                    <div className="mt-1">
                      {phase.s === "completed" && <span className="text-[9px] text-green-600">✅</span>}
                      {phase.s === "in_progress" && <span className="text-[9px] text-blue-600 animate-pulse">🔄</span>}
                      {phase.s === "scheduled" && <span className="text-[9px] text-[#a19f9d]">⏳</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#edebe9] flex items-center justify-between">
                <span className="text-[10px] text-[#a19f9d]">{z ? "项目文档与交流记录同步自 GRTS 3.0 项目管理模块" : "Project docs synced from GRTS 3.0 PM Module"}</span>
                <span className="text-[10px] text-[#0078d4]">{z ? "查看完整项目文档 →" : "View Full Project Docs →"}</span>
              </div>
            </div>
          )}
        </section>

        {/* Footer with Version */}
        <div className="text-center py-6 border-t border-[#edebe9]">
          <div className="text-[10px] text-[#a19f9d]">© 2026 GRT · Global Robot Technology · {z ? "无锡 · 斯图加特 · 底特律" : "Wuxi · Stuttgart · Detroit"}</div>
          <div className="text-[10px] text-[#a19f9d] mt-1">Powered by GRTS 3.0 · {z ? "客户门户" : "Customer Portal"} v1.2.0</div>
          <div className="text-[9px] text-[#a19f9d] mt-0.5">{z ? "设备序列号与项目资料将在新设备采购后自动更新" : "Equipment S/N & project data auto-update on new purchase"}</div>
        </div>
      </div>
    </div>
  );
}
