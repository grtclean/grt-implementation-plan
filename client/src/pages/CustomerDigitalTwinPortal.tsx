import { useState, useRef, useCallback, useEffect } from "react";
import {
  LayoutDashboard,
  Box,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  ChevronRight,
  Shield,
  Pen,
  Eraser,
  Download,
  Calendar,
  User,
  Building2,
  Cpu,
  Gauge,
  Zap,
  Droplets,
  Thermometer,
  Volume2,
  Eye,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/common/BrandLogo";
import UniversalViewer from "@/components/workspace/UniversalViewer";
import { useLanguage } from "@/contexts/LanguageContext";

// ────────────────── Types ──────────────────

type PortalTab = "overview" | "digital-twin" | "fat-results";

type FATStatus = "pass" | "fail" | "running" | "pending";

interface FATCheckItem {
  id: string;
  name: string;
  nameEn: string;
  icon: typeof Gauge;
  status: FATStatus;
  value?: string;
  spec?: string;
  timestamp?: string;
}

// ────────────────── Mock Data ──────────────────

const CLIENT_INFO = {
  company: "Volkswagen AG",
  companyZh: "大众汽车集团",
  project: "GRT-CL3000 Ultrasonic Cleaning Line",
  projectZh: "GRT-CL3000 超声波清洗线",
  projectCode: "PRJ-2026-VW-0042",
  contractDate: "2025-11-15",
  fatDate: "2026-02-24",
  machineSerial: "GRT-CL3000-SN-00187",
  engineer: "Thomas Müller",
  clientRep: "Dr. Klaus Weber",
};

const INITIAL_FAT_ITEMS: FATCheckItem[] = [
  { id: "fat-1", name: "超声波空化测试", nameEn: "Ultrasonic Cavitation Test", icon: Volume2, status: "pass", value: "42 kHz ± 0.3", spec: "40–45 kHz", timestamp: "09:15:22" },
  { id: "fat-2", name: "清洗压力测试", nameEn: "Cleaning Pressure Test", icon: Gauge, status: "pass", value: "6.8 bar", spec: "6.0–8.0 bar", timestamp: "09:18:45" },
  { id: "fat-3", name: "温度控制精度", nameEn: "Temperature Control Accuracy", icon: Thermometer, status: "pass", value: "65.2°C ± 0.5", spec: "65°C ± 1.0", timestamp: "09:22:10" },
  { id: "fat-4", name: "流量一致性检测", nameEn: "Flow Rate Consistency", icon: Droplets, status: "pass", value: "12.4 L/min", spec: "12 ± 1 L/min", timestamp: "09:25:33" },
  { id: "fat-5", name: "电气安全绝缘测试", nameEn: "Electrical Safety Insulation", icon: Zap, status: "pass", value: ">500 MΩ", spec: ">100 MΩ", timestamp: "09:30:00" },
  { id: "fat-6", name: "PLC程序功能验证", nameEn: "PLC Program Verification", icon: Cpu, status: "running", value: "Step 47/52", spec: "All 52 steps", timestamp: "09:32:15" },
  { id: "fat-7", name: "干燥系统性能", nameEn: "Drying System Performance", icon: Thermometer, status: "pending", spec: "Surface moisture < 0.1%", },
  { id: "fat-8", name: "清洁度等级验证", nameEn: "Cleanliness Grade Verification", icon: Eye, status: "pending", spec: "ISO 16232 Grade A", },
  { id: "fat-9", name: "安全联锁功能", nameEn: "Safety Interlock Function", icon: Lock, status: "pending", spec: "All E-stops verified", },
  { id: "fat-10", name: "连续运行72h耐久测试", nameEn: "72h Endurance Run Test", icon: Clock, status: "pending", spec: "0 faults in 72h", },
];

// ────────────────── Status Badge ──────────────────

function StatusBadge({ status }: { status: FATStatus }) {
  switch (status) {
    case "pass":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> PASS
        </span>
      );
    case "fail":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          <XCircle className="w-3.5 h-3.5" /> FAIL
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
          <Play className="w-3.5 h-3.5 animate-pulse" /> RUNNING
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
          <Clock className="w-3.5 h-3.5" /> PENDING
        </span>
      );
  }
}

// ────────────────── Signature Canvas ──────────────────

function SignatureCanvas({ onSign }: { onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    return ctx;
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasContent(true);
  }, [getCtx, getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getCtx, getPos]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  }, []);

  const applySignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    onSign(canvas.toDataURL("image/png"));
  }, [hasContent, onSign]);

  return (
    <div className="space-y-3">
      <div className="relative border-2 border-dashed border-[#c8c6c4] rounded-xl bg-white overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full cursor-crosshair"
          style={{ height: 160 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[#c8c6c4] text-sm select-none">Draw your signature here / 在此签名</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={clearCanvas} className="text-[#605e5c]">
          <Eraser className="w-3.5 h-3.5 mr-1" /> Clear
        </Button>
        <Button
          size="sm"
          onClick={applySignature}
          disabled={!hasContent}
          className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
        >
          <Pen className="w-3.5 h-3.5 mr-1" /> Apply E-Signature
        </Button>
      </div>
    </div>
  );
}

// ────────────────── Main Component ──────────────────

export default function CustomerDigitalTwinPortal() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [activeTab, setActiveTab] = useState<PortalTab>("fat-results");
  const [fatItems, setFatItems] = useState<FATCheckItem[]>(INITIAL_FAT_ITEMS);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  // Simulate live FAT progress
  useEffect(() => {
    const interval = setInterval(() => {
      setFatItems(prev => {
        const updated = [...prev];
        const runningIdx = updated.findIndex(i => i.status === "running");
        if (runningIdx === -1) return prev;

        // Complete the running item
        updated[runningIdx] = {
          ...updated[runningIdx],
          status: "pass",
          value: updated[runningIdx].spec ?? "OK",
          timestamp: new Date().toLocaleTimeString("en-GB"),
        };

        // Start next pending item
        const nextPending = updated.findIndex(i => i.status === "pending");
        if (nextPending !== -1) {
          updated[nextPending] = {
            ...updated[nextPending],
            status: "running",
            timestamp: new Date().toLocaleTimeString("en-GB"),
          };
        }
        return updated;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSign = useCallback((dataUrl: string) => {
    setSignatureData(dataUrl);
    setSignedAt(new Date().toISOString());
  }, []);

  const passCount = fatItems.filter(i => i.status === "pass").length;
  const totalCount = fatItems.length;
  const progressPct = Math.round((passCount / totalCount) * 100);

  const NAV_ITEMS: { id: PortalTab; label: string; labelEn: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "项目概览", labelEn: "Project Overview", icon: LayoutDashboard },
    { id: "digital-twin", label: "3D数字孪生", labelEn: "3D Digital Twin", icon: Box },
    { id: "fat-results", label: "FAT实时结果", labelEn: "FAT Live Results", icon: ClipboardCheck },
  ];

  return (
    <div className="flex h-[calc(100vh-57px)] bg-gradient-to-br from-[#f8f9fc] to-[#eef1f7] overflow-hidden">
      {/* ═══════════ Premium Left Sidebar ═══════════ */}
      <div className="w-[260px] shrink-0 flex flex-col bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-white/10">
          <BrandLogo size="md" variant="full" theme="dark" />
          <div className="mt-3 px-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-300/70 font-medium">
              Customer Portal
            </p>
          </div>
        </div>

        {/* Client Info Card */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="bg-white/5 backdrop-blur rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-300" />
              <span className="text-sm font-semibold text-white/90">
                {isEn ? CLIENT_INFO.company : CLIENT_INFO.companyZh}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-300/60" />
              <span className="text-xs text-white/60">{CLIENT_INFO.clientRep}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-300/60" />
              <span className="text-xs text-white/60">FAT: {CLIENT_INFO.fatDate}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-[#0078d4] text-white shadow-lg shadow-blue-500/20"
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                }`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="font-medium">{isEn ? item.labelEn : item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Security Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <Shield className="w-3.5 h-3.5" />
            <span>Encrypted Session · ISO 27001</span>
          </div>
        </div>
      </div>

      {/* ═══════════ Main Content ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Premium Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur border-b border-[#e1e5eb] shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#0078d4] font-semibold">{CLIENT_INFO.projectCode}</span>
            <ChevronRight className="w-3 h-3 text-[#a19f9d]" />
            <span className="text-[#323130] font-medium">
              {isEn ? CLIENT_INFO.project : CLIENT_INFO.projectZh}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* FAT Progress Pill */}
            <div className="flex items-center gap-2 bg-[#f3f2f1] rounded-full px-4 py-1.5">
              <div className="w-24 h-2 bg-[#edebe9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? "linear-gradient(90deg, #107c10, #0b9a0b)"
                      : "linear-gradient(90deg, #0078d4, #2b88d8)",
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-[#323130]">
                FAT {passCount}/{totalCount}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-[#605e5c] h-8">
              <Download className="w-3.5 h-3.5 mr-1" />
              {isEn ? "Export Report" : "导出报告"}
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ─── Project Overview Tab ─── */}
          {activeTab === "overview" && (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <h2 className="text-xl font-bold text-[#323130]">
                {isEn ? "Project Overview" : "项目概览"}
              </h2>

              {/* Info Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: isEn ? "Client" : "客户", value: isEn ? CLIENT_INFO.company : CLIENT_INFO.companyZh, icon: Building2, color: "#0078d4" },
                  { label: isEn ? "Machine Serial" : "设备序列号", value: CLIENT_INFO.machineSerial, icon: Cpu, color: "#8764b8" },
                  { label: isEn ? "Contract Date" : "合同日期", value: CLIENT_INFO.contractDate, icon: Calendar, color: "#107c10" },
                  { label: isEn ? "FAT Scheduled" : "FAT计划日期", value: CLIENT_INFO.fatDate, icon: ClipboardCheck, color: "#d83b01" },
                  { label: isEn ? "GRT Engineer" : "GRT工程师", value: CLIENT_INFO.engineer, icon: User, color: "#0078d4" },
                  { label: isEn ? "Client Representative" : "客户代表", value: CLIENT_INFO.clientRep, icon: User, color: "#107c10" },
                ].map((card, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#e1e5eb] p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${card.color}15` }}>
                      <card.icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <div>
                      <p className="text-xs text-[#a19f9d] font-medium uppercase tracking-wide">{card.label}</p>
                      <p className="text-sm font-semibold text-[#323130] mt-0.5">{card.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Project Timeline */}
              <div className="bg-white rounded-xl border border-[#e1e5eb] p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-[#323130] mb-4">
                  {isEn ? "Project Milestones" : "项目里程碑"}
                </h3>
                <div className="flex items-center gap-0">
                  {[
                    { label: "M2 Design", done: true },
                    { label: "M4 Procurement", done: true },
                    { label: "M6 Assembly", done: true },
                    { label: "M8 FAT", done: false, active: true },
                    { label: "M10 SAT", done: false },
                    { label: "M12 Handover", done: false },
                  ].map((m, i, arr) => (
                    <div key={i} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          m.done ? "bg-emerald-500 text-white" : m.active ? "bg-[#0078d4] text-white ring-4 ring-blue-100" : "bg-[#edebe9] text-[#a19f9d]"
                        }`}>
                          {m.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={`text-[10px] font-medium ${m.active ? "text-[#0078d4]" : "text-[#605e5c]"}`}>{m.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 ${m.done ? "bg-emerald-400" : "bg-[#edebe9]"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── 3D Digital Twin Tab ─── */}
          {activeTab === "digital-twin" && (
            <div className="h-full flex flex-col">
              <div className="px-6 py-4">
                <h2 className="text-xl font-bold text-[#323130]">
                  {isEn ? "3D Digital Twin — Machine Preview" : "3D数字孪生 — 设备预览"}
                </h2>
                <p className="text-sm text-[#605e5c] mt-1">
                  {isEn
                    ? `${CLIENT_INFO.machineSerial} — GRT-CL3000 Ultrasonic Cleaning Line Assembly`
                    : `${CLIENT_INFO.machineSerial} — GRT-CL3000 超声波清洗线总装`}
                </p>
              </div>
              <div className="flex-1 min-h-0 px-6 pb-6">
                <div className="h-full rounded-xl overflow-hidden border border-[#e1e5eb] shadow-lg">
                  <UniversalViewer
                    fileUrl=""
                    fileType="cad"
                    fileName="GRT-CL3000_Assembly.step"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── FAT Live Results Tab ─── */}
          {activeTab === "fat-results" && (
            <div className="p-6 max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#323130]">
                    {isEn ? "FAT Live Results" : "FAT实时结果"}
                  </h2>
                  <p className="text-sm text-[#605e5c] mt-1">
                    {isEn ? "Factory Acceptance Testing — Real-time checklist" : "工厂验收测试 — 实时检查清单"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-[#0078d4]">{progressPct}%</p>
                  <p className="text-xs text-[#605e5c]">{passCount}/{totalCount} {isEn ? "tests passed" : "测试通过"}</p>
                </div>
              </div>

              {/* FAT Checklist */}
              <div className="bg-white rounded-xl border border-[#e1e5eb] shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f8f9fc] text-xs text-[#605e5c] font-semibold uppercase">
                      <th className="px-5 py-3 text-left w-10">#</th>
                      <th className="px-5 py-3 text-left">{isEn ? "Test Item" : "测试项目"}</th>
                      <th className="px-5 py-3 text-center">{isEn ? "Result" : "结果"}</th>
                      <th className="px-5 py-3 text-left">{isEn ? "Specification" : "规格要求"}</th>
                      <th className="px-5 py-3 text-center">{isEn ? "Status" : "状态"}</th>
                      <th className="px-5 py-3 text-right">{isEn ? "Time" : "时间"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fatItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-[#f3f2f1] transition-colors ${
                            item.status === "running" ? "bg-blue-50/50" : "hover:bg-[#faf9f8]"
                          }`}
                        >
                          <td className="px-5 py-3.5 text-sm text-[#a19f9d] font-mono">{String(i + 1).padStart(2, "0")}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4 text-[#0078d4]" />
                              <span className="text-sm font-medium text-[#323130]">
                                {isEn ? item.nameEn : item.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="text-sm font-mono text-[#323130]">
                              {item.value ?? "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-[#605e5c]">{item.spec}</td>
                          <td className="px-5 py-3.5 text-center"><StatusBadge status={item.status} /></td>
                          <td className="px-5 py-3.5 text-right text-xs text-[#a19f9d] font-mono">{item.timestamp ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ─── Digital Signature Section ─── */}
              <div className="bg-white rounded-xl border-2 border-[#0078d4]/20 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-[#0078d4]/5 to-transparent border-b border-[#0078d4]/10 flex items-center gap-2">
                  <Pen className="w-5 h-5 text-[#0078d4]" />
                  <h3 className="text-lg font-semibold text-[#323130]">
                    {isEn ? "Digital Sign-Off — Client Acceptance" : "数字签署 — 客户验收确认"}
                  </h3>
                </div>
                <div className="p-6">
                  {signatureData ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                        <div>
                          <p className="font-semibold text-lg">
                            {isEn ? "FAT Accepted & Signed" : "FAT已验收并签署"}
                          </p>
                          <p className="text-sm text-[#605e5c]">
                            {CLIENT_INFO.clientRep} · {signedAt ? new Date(signedAt).toLocaleString() : ""}
                          </p>
                        </div>
                      </div>
                      <div className="border border-[#edebe9] rounded-xl p-4 bg-[#faf9f8] inline-block">
                        <img src={signatureData} alt="Signature" className="h-20" />
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Download className="w-3.5 h-3.5 mr-1" />
                        {isEn ? "Download Signed FAT Certificate" : "下载已签署FAT证书"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-[#605e5c]">
                        {isEn
                          ? `By signing below, ${CLIENT_INFO.clientRep} (${CLIENT_INFO.company}) confirms acceptance of Factory Acceptance Testing for ${CLIENT_INFO.machineSerial}.`
                          : `签署以下内容即表示${CLIENT_INFO.clientRep}（${CLIENT_INFO.companyZh}）确认接受${CLIENT_INFO.machineSerial}的工厂验收测试。`}
                      </p>
                      <SignatureCanvas onSign={handleSign} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
