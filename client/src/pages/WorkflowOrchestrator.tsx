/**
 * WorkflowOrchestrator V6.0 — 全域业务编排引擎
 *
 * V6 修复重点:
 *   1. CEO P0 Bug 修复: QA→OA 渲染断层 — 显式 case 5 路由 + 绝美大结局 UI
 *   2. StepOA 大升级: 结算前=成本核算 / 结算后=跨域追溯时间轴+归档重置
 *   3. 九宫格红点联动: 每步完成后对应九宫格 tile 亮绿灯
 *   4. 全域闭环重置: 一键归档回到 Step 1 迎接下一个订单
 *
 * 架构核心:
 *   中央状态机 useState(currentStep) + useState(globalPayload) 驱动一切
 *   WORKFLOW_REGISTRY 声明式剧本 — 5 步全生命周期闭环
 *   hasUI=false 自动降级 → GenericInterceptor 万能审批拦截器
 *   零 EventBus 监听 — 全部由 props 直传 Payload，杜绝水合失败
 *
 * 零 unicode escape · 零 any · 全原生 UTF-8
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import FloatingNav from '@/components/FloatingNav';

// ═══════════════════════════════════════════════════════════════
// §1  类型定义
// ═══════════════════════════════════════════════════════════════

interface IBomItem {
  readonly id: string;
  readonly name: string;
  readonly spec: string;
  readonly qty: number;
  readonly unitPrice: number;
}

interface IGlobalPayload {
  projectId: string;
  projectName: string;
  bomItems: IBomItem[];
  engineer: string;
  deadline: string;
  stepData: Record<number, Record<string, string>>;
}

interface IWorkflowStep {
  readonly step: number;
  readonly id: string;
  readonly name: string;
  readonly nameShort: string;
  readonly hasUI: boolean;
  readonly description: string;
  readonly requiredFields: readonly string[];
}

interface IAgentLog {
  readonly id: number;
  readonly text: string;
  readonly level: "info" | "warn" | "error" | "success";
}

interface IWaffleTile {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  step: number;
  done: boolean;
  active: boolean;
}

// ═══════════════════════════════════════════════════════════════
// §2  全局剧本字典宪法
// ═══════════════════════════════════════════════════════════════

const WORKFLOW_REGISTRY: readonly IWorkflowStep[] = [
  {
    step: 1, id: "RND", name: "沙盘 A: 研发设计", nameShort: "研发设计", hasUI: true,
    description: "工程师签发核心 BOM 至全域编排引擎",
    requiredFields: [],
  },
  {
    step: 2, id: "SCM", name: "沙盘 B: 供应链拦截", nameShort: "供应链", hasUI: false,
    description: "采购确认全部物料到齐，签发齐套放行单",
    requiredFields: ["warehouseConfirm", "shortageList"],
  },
  {
    step: 3, id: "MFG", name: "沙盘 C: 生产制造排产", nameShort: "生产排产", hasUI: true,
    description: "生产主管分配车间、工时，下发派工单至 TV 大屏",
    requiredFields: [],
  },
  {
    step: 4, id: "QA", name: "沙盘 D: 质量终检拦截", nameShort: "质量风控", hasUI: false,
    description: "质量工程师执行 FAT 检验，签发质量放行证书",
    requiredFields: ["inspectorName", "testReport", "passResult"],
  },
  {
    step: 5, id: "OA", name: "沙盘 E: Smart OA 财务核算", nameShort: "OA 核算", hasUI: true,
    description: "财务核算全项目成本，确认利润率，签发结算单",
    requiredFields: [],
  },
];

const M12_BOM: IBomItem[] = [
  { id: "P-8821", name: "进口高压柱塞泵", spec: "63MPa / 15L/min", qty: 1, unitPrice: 18500 },
  { id: "M-102", name: "1.5kW 伺服电机", spec: "1500rpm / IP65", qty: 1, unitPrice: 4200 },
  { id: "S-445", name: "弹性联轴器", spec: "42 / 扭矩120Nm", qty: 1, unitPrice: 680 },
  { id: "F-019", name: "M12x80 高强度螺栓", spec: "12.9级 / 达克罗", qty: 8, unitPrice: 8.5 },
  { id: "G-301", name: "X-20 厌氧密封胶", spec: "50ml/支", qty: 2, unitPrice: 45 },
  { id: "R-088", name: "FKM 氟橡胶 O 型圈", spec: "28x3.5", qty: 4, unitPrice: 6.5 },
];

const FIELD_LABELS: Record<string, string> = {
  warehouseConfirm: "仓库齐套确认（输入「已确认」）",
  shortageList: "缺料清单（无则填「无」）",
  inspectorName: "质检工程师姓名",
  testReport: "检验报告编号",
  passResult: "检验结论（合格/不合格）",
};

const WAFFLE_LAYOUT: { id: string; label: string; icon: string; step: number }[] = [
  { id: "RND", label: "研发设计", icon: "RND", step: 1 },
  { id: "SCM", label: "供应链",  icon: "SCM", step: 2 },
  { id: "MFG", label: "生产制造", icon: "MFG", step: 3 },
  { id: "QA",  label: "质量风控", icon: "QA",  step: 4 },
  { id: "OA",  label: "Smart OA", icon: "OA",  step: 5 },
  { id: "HR",  label: "人力资源", icon: "HR",  step: 0 },
  { id: "FIN", label: "财务管理", icon: "FIN", step: 0 },
  { id: "PRJ", label: "项目管理", icon: "PRJ", step: 0 },
  { id: "SYS", label: "系统管理", icon: "SYS", step: 0 },
];

// ═══════════════════════════════════════════════════════════════
// §3  CSS 注入（单例）
// ═══════════════════════════════════════════════════════════════

const STYLE_ID = "wo6-keyframes";
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
@keyframes wo6Pulse{0%,100%{box-shadow:0 0 4px var(--pc,rgba(59,130,246,.3))}50%{box-shadow:0 0 20px var(--pc,rgba(59,130,246,.6))}}
@keyframes wo6Glow{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes wo6SlideUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes wo6Scan{0%{transform:translateY(-100%)}100%{transform:translateY(500%)}}
@keyframes wo6FlashGreen{0%{background:rgba(34,197,94,.25)}100%{background:transparent}}
@keyframes wo6FlashAmber{0%{background:rgba(245,158,11,.15)}100%{background:transparent}}
@keyframes wo6DotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
@keyframes wo6BadgePop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes wo6Confetti{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(-60px) rotate(720deg)}}
@keyframes wo6EmeraldPulse{0%,100%{box-shadow:0 0 30px rgba(16,185,129,.1)}50%{box-shadow:0 0 60px rgba(16,185,129,.25)}}
@keyframes wo6TitleGlow{0%,100%{text-shadow:0 0 20px rgba(52,211,153,.3)}50%{text-shadow:0 0 40px rgba(52,211,153,.6),0 0 60px rgba(52,211,153,.2)}}
@keyframes wo6FadeInScale{0%{opacity:0;transform:scale(.9)}100%{opacity:1;transform:scale(1)}}
@keyframes wo6Shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes wo6RingPulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.4)}100%{box-shadow:0 0 0 12px rgba(52,211,153,0)}}
@keyframes wo6CountUp{0%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:translateY(0)}}
`;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════
// §4  Typewriter Log
// ═══════════════════════════════════════════════════════════════

function TypewriterLog({ entry }: { entry: IAgentLog }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= entry.text.length) return;
    const t = setTimeout(() => setN(c => c + 1), 6);
    return () => clearTimeout(t);
  }, [n, entry.text.length]);
  const colors: Record<string, string> = { info: "text-cyan-400", warn: "text-amber-400", error: "text-red-400", success: "text-emerald-400" };
  return (
    <div className="font-mono text-[10px] leading-relaxed py-0.5" style={{ animation: "wo6SlideUp .2s ease-out" }}>
      <span className={colors[entry.level]}>{entry.text.slice(0, n)}</span>
      {n < entry.text.length && <span className="inline-block w-1 h-3 bg-current ml-px align-middle" style={{ animation: "wo6Glow .4s infinite" }} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §5  Step A — 研发设计（hasUI: true, step=1）
// ═══════════════════════════════════════════════════════════════

function StepRND({ onComplete }: { onComplete: (payload: IGlobalPayload) => void }) {
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(false);
  const timerRef = useRef<number>(0);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleRelease = useCallback(() => {
    if (releasing || released) return;
    setReleasing(true);
    timerRef.current = window.setTimeout(() => {
      setReleasing(false);
      setReleased(true);
      onComplete({
        projectId: "WO-M12",
        projectName: "美利信新能源超大型清洗岛 — 核心高压泵组总装",
        bomItems: M12_BOM,
        engineer: "李建国（高级工艺工程师）",
        deadline: "2026-03-28",
        stepData: { 1: { bomCode: "BOM-RC-ME-047", engineer: "李建国" } },
      });
    }, 1000);
  }, [onComplete, releasing, released]);

  return (
    <div className="h-full flex flex-col">
      <StepHeader step={1} />
      <div className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-4 mb-4">
        <div className="text-[10px] text-neutral-500 font-mono mb-1">当前项目</div>
        <div className="text-base font-bold text-blue-300">WO-M12 美利信新能源超大型清洗岛</div>
        <div className="grid grid-cols-3 gap-3 mt-3 text-[10px]">
          <div><span className="text-neutral-500">BOM 版本</span><br /><span className="text-neutral-300 font-mono">BOM-RC-ME-047 R3</span></div>
          <div><span className="text-neutral-500">负责工程师</span><br /><span className="text-neutral-300 font-mono">李建国 (PE)</span></div>
          <div><span className="text-neutral-500">交付期限</span><br /><span className="text-red-400 font-mono font-bold">2026-03-28</span></div>
        </div>
      </div>
      <div className="rounded-lg border border-neutral-800/40 bg-neutral-900/40 p-3 mb-4 flex-1">
        <div className="text-[9px] text-neutral-600 font-mono mb-2 tracking-widest uppercase">BOM Payload — 将由中央状态机传递至全部下游步骤</div>
        <BomTable items={M12_BOM} />
        <div className="mt-2 text-[9px] text-neutral-600 font-mono">
          共 {M12_BOM.length} 项 · 物料总价 ¥{M12_BOM.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString()} · 交期 2026-03-28
        </div>
      </div>
      <ActionButton onClick={handleRelease} disabled={releasing || released} done={released} loading={releasing}
        doneText="BOM 已签发 · 中央状态机已将 Payload 注入 Step 2"
        loadingText="正在封装 Payload..."
        idleText="签发核心泵组 BOM → 触发全域编排引擎（携带 6 项物料）"
        color="blue" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §6  Step C — 生产制造排产（hasUI: true, step=3）
// ═══════════════════════════════════════════════════════════════

interface IDispatchRow {
  bomItemId: string;
  name: string;
  spec: string;
  qty: number;
  unitPrice: number;
  workshop: string;
  estimatedHours: number;
}

function StepMFG({ payload, onComplete }: { payload: IGlobalPayload; onComplete: (data: Record<string, string>) => void }) {
  const [dispatchRows, setDispatchRows] = useState<IDispatchRow[]>(() =>
    payload.bomItems.map(item => ({
      bomItemId: item.id, name: item.name, spec: item.spec,
      qty: item.qty, unitPrice: item.unitPrice,
      workshop: "", estimatedHours: 0,
    }))
  );
  const [dispatched, setDispatched] = useState(false);

  const updateRow = useCallback((id: string, field: "workshop" | "estimatedHours", value: string | number) => {
    setDispatchRows(prev => prev.map(r => r.bomItemId === id ? { ...r, [field]: value } : r));
  }, []);

  const allAssigned = dispatchRows.length > 0 && dispatchRows.every(r => r.workshop && r.estimatedHours > 0);

  const handleDispatch = useCallback(() => {
    if (!allAssigned || dispatched) return;
    setDispatched(true);
    const workshops = [...new Set(dispatchRows.map(r => r.workshop))];
    const totalHours = dispatchRows.reduce((s, r) => s + r.estimatedHours, 0);
    onComplete({
      workshopAssign: workshops.join(" / "),
      estimatedHours: String(totalHours),
      dispatchItems: String(dispatchRows.length),
    });
  }, [onComplete, allAssigned, dispatched, dispatchRows]);

  return (
    <div className="h-full flex flex-col">
      <StepHeader step={3} />
      <div className="rounded-lg border-2 border-amber-500/40 bg-amber-950/10 p-4 mb-4" style={{ animation: "wo6FlashAmber .8s ease-out" }}>
        <div className="text-sm font-bold text-amber-300 mb-2">
          {dispatched ? "派工单已生成 · 数据已流转至 Step 4" : "来自编排引擎的待办指令 — 立即排产"}
        </div>
        <div className="grid grid-cols-4 gap-3 text-[10px]">
          <div><span className="text-neutral-500">项目</span><br /><span className="text-neutral-300 font-mono">{payload.projectId}</span></div>
          <div><span className="text-neutral-500">工程师</span><br /><span className="text-neutral-300 font-mono">{payload.engineer}</span></div>
          <div><span className="text-neutral-500">交期</span><br /><span className="text-red-400 font-mono font-bold">{payload.deadline}</span></div>
          <div><span className="text-neutral-500">物料</span><br /><span className="text-cyan-300 font-mono">{payload.bomItems.length} 项</span></div>
        </div>
      </div>
      <div className="flex-1 rounded-lg border border-neutral-800/50 bg-neutral-900/30 overflow-hidden flex flex-col mb-4">
        <div className="grid grid-cols-[50px_1fr_0.8fr_35px_60px_95px_75px] gap-px bg-neutral-800 text-[9px] text-neutral-500 font-mono shrink-0">
          <div className="bg-neutral-900 px-2 py-1.5">编码</div>
          <div className="bg-neutral-900 px-2 py-1.5">物料</div>
          <div className="bg-neutral-900 px-2 py-1.5">规格</div>
          <div className="bg-neutral-900 px-2 py-1.5 text-center">数量</div>
          <div className="bg-neutral-900 px-2 py-1.5 text-right">单价</div>
          <div className="bg-neutral-900 px-2 py-1.5 text-center text-cyan-400">分配车间</div>
          <div className="bg-neutral-900 px-2 py-1.5 text-center text-cyan-400">工时(h)</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {dispatchRows.map((row, idx) => (
            <div key={row.bomItemId} className={cn("grid grid-cols-[50px_1fr_0.8fr_35px_60px_95px_75px] gap-px text-[10px] border-b border-neutral-800/30", dispatched && "opacity-60")}
              style={{ animation: `wo6SlideUp .3s ease ${idx * 0.04}s both` }}>
              <div className="bg-neutral-950 px-2 py-2 text-cyan-400 font-mono flex items-center">{row.bomItemId}</div>
              <div className="bg-neutral-950 px-2 py-2 text-neutral-200 flex items-center">{row.name}</div>
              <div className="bg-neutral-950 px-2 py-2 text-neutral-400 flex items-center">{row.spec}</div>
              <div className="bg-neutral-950 px-2 py-2 text-center text-neutral-300 font-mono flex items-center justify-center">{row.qty}</div>
              <div className="bg-neutral-950 px-2 py-2 text-right text-amber-300 font-mono flex items-center justify-end">¥{row.unitPrice.toLocaleString()}</div>
              <div className="bg-neutral-950 px-1 py-1 flex items-center">
                <select value={row.workshop} onChange={e => updateRow(row.bomItemId, "workshop", e.target.value)} disabled={dispatched}
                  className="w-full h-6 px-1 rounded bg-neutral-800 border border-neutral-700 text-[10px] text-white focus:outline-none focus:border-cyan-500 disabled:opacity-40">
                  <option value="">选择...</option>
                  <option value="A1">A1 精密装配</option>
                  <option value="A3">A3 泵组总装</option>
                  <option value="B2">B2 管路焊接</option>
                  <option value="C1">C1 电控柜</option>
                </select>
              </div>
              <div className="bg-neutral-950 px-1 py-1 flex items-center">
                <input type="number" value={row.estimatedHours || ""} onChange={e => updateRow(row.bomItemId, "estimatedHours", Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={dispatched} placeholder="h" min={0}
                  className="w-full h-6 px-1 rounded bg-neutral-800 border border-neutral-700 text-[10px] text-white font-mono text-center focus:outline-none focus:border-cyan-500 disabled:opacity-40 placeholder:text-neutral-600" />
              </div>
            </div>
          ))}
        </div>
        <div className="px-3 py-1.5 bg-neutral-900/50 border-t border-neutral-800/40 flex items-center justify-between text-[9px] text-neutral-500 font-mono shrink-0">
          <span>共 {dispatchRows.length} 项 · 数据来源: globalPayload.bomItems</span>
          <span>总工时 {dispatchRows.reduce((s, r) => s + r.estimatedHours, 0).toFixed(1)}h · 总成本 ¥{dispatchRows.reduce((s, r) => s + r.qty * r.unitPrice, 0).toLocaleString()}</span>
        </div>
      </div>
      {!dispatched && (
        <ActionButton onClick={handleDispatch} disabled={!allAssigned} done={false} loading={false} doneText="" loadingText=""
          idleText={allAssigned ? "提取 BOM 一键生成派工单 → 编排引擎自动路由至 Step 4" : "请先为每项物料分配车间并填写预估工时"}
          color="emerald" />
      )}
      {dispatched && (
        <div className="text-center text-emerald-400 text-sm font-bold" style={{ animation: "wo6SlideUp .3s ease-out" }}>
          派工完成 · 编排引擎已将 Payload + 排产数据流转至下一步
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §7  Step E — Smart OA 财务核算 + 大结局（hasUI: true, step=5）
//
//     CEO P0 修复: 此组件必须在 currentStep===5 时显式挂载渲染
//     包含两个阶段:
//       phase 1 — 成本核算 + 结算签发
//       phase 2 — 大结局: 跨域追溯时间轴 + BOM 水合铁证 + 归档重置
// ═══════════════════════════════════════════════════════════════

function StepOA({ payload, onComplete, onReset }: {
  payload: IGlobalPayload;
  onComplete: (data: Record<string, string>) => void;
  onReset: () => void;
}) {
  const [settled, setSettled] = useState(false);
  const [showFinale, setShowFinale] = useState(false);
  const finaleTimer = useRef<number>(0);
  useEffect(() => () => clearTimeout(finaleTimer.current), []);

  // 成本核算
  const mfgData = payload.stepData[3];
  const qaData = payload.stepData[4];
  const totalHours = mfgData ? parseFloat(mfgData.estimatedHours ?? "0") : 0;
  const materialCost = payload.bomItems.reduce((s, b) => s + b.qty * b.unitPrice, 0);
  const laborCost = totalHours * 180;
  const wasteFactor = 1.08;
  const baseCost = materialCost * wasteFactor + laborCost;
  const management = baseCost * 0.12;
  const profit = (baseCost + management) * 0.15;
  const totalCost = baseCost + management + profit;
  const quotePrice = totalCost * 1.35;
  const profitRate = totalCost > 0 ? ((quotePrice - totalCost) / quotePrice * 100) : 0;
  const crossDomainSavedHours = 14;

  const handleSettle = useCallback(() => {
    if (settled) return;
    setSettled(true);
    onComplete({
      totalCost: String(Math.round(totalCost)),
      quotePrice: String(Math.round(quotePrice)),
      profitRate: profitRate.toFixed(1) + "%",
      settled: "true",
    });
    // 500ms 后展开大结局
    finaleTimer.current = window.setTimeout(() => setShowFinale(true), 600);
  }, [onComplete, settled, totalCost, quotePrice, profitRate]);

  // ──── Phase 2: 大结局 ────
  if (showFinale) {
    return (
      <div className="h-full flex flex-col overflow-y-auto" style={{ animation: "wo6FadeInScale .6s ease-out" }}>
        {/* 深绿渐变背景 + 发光标题 */}
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-neutral-950 to-emerald-950/20 p-6 mb-5 text-center"
          style={{ animation: "wo6EmeraldPulse 3s infinite" }}>
          <div className="text-5xl mb-3" style={{ animation: "wo6Confetti 2s ease-in-out infinite alternate" }}>{"🎉"}</div>
          <h1 className="text-2xl font-black text-emerald-400 mb-2" style={{ animation: "wo6TitleGlow 2.5s infinite" }}>
            WO-M12 超大型清洗岛项目 · 全生命周期流转完成!
          </h1>
          <p className="text-sm text-emerald-300/70 max-w-lg mx-auto leading-relaxed">
            从研发签发 BOM 到财务结算确认收入，全部 5 步由中央状态机 useState 驱动零断裂流转。
            数据从头到尾完整水合，无任何丢失。
          </p>
        </div>

        {/* 核心数据水合展示 — BOM 财务核算清单 */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400">{"$"}</span>
            <h3 className="text-sm font-bold text-emerald-300">核心数据水合铁证 — BOM 物料财务核算清单</h3>
          </div>
          <div className="text-[9px] text-emerald-600 font-mono mb-2">
            以下物料数据由 Step 1 研发签发，经 Step 2 供应链齐套、Step 3 车间排产、Step 4 质检放行，
            最终在 Step 5 OA 完成成本核算。数据从头到尾零丢失:
          </div>
          <div className="overflow-hidden rounded border border-emerald-500/15">
            <div className="grid grid-cols-[55px_1fr_1fr_40px_65px_70px] gap-px bg-emerald-900/20 text-[9px] text-emerald-500 font-mono">
              <div className="bg-neutral-950 px-2 py-1">编码</div>
              <div className="bg-neutral-950 px-2 py-1">名称</div>
              <div className="bg-neutral-950 px-2 py-1">规格</div>
              <div className="bg-neutral-950 px-2 py-1 text-center">数量</div>
              <div className="bg-neutral-950 px-2 py-1 text-right">单价</div>
              <div className="bg-neutral-950 px-2 py-1 text-right">小计</div>
            </div>
            {payload.bomItems.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-[55px_1fr_1fr_40px_65px_70px] gap-px text-[10px]"
                style={{ animation: `wo6CountUp .3s ease ${idx * 0.06}s both` }}>
                <div className="bg-neutral-950 px-2 py-1.5 text-emerald-400 font-mono">{item.id}</div>
                <div className="bg-neutral-950 px-2 py-1.5 text-neutral-200">{item.name}</div>
                <div className="bg-neutral-950 px-2 py-1.5 text-neutral-400">{item.spec}</div>
                <div className="bg-neutral-950 px-2 py-1.5 text-center text-neutral-300 font-mono">{item.qty}</div>
                <div className="bg-neutral-950 px-2 py-1.5 text-right text-amber-300 font-mono">¥{item.unitPrice.toLocaleString()}</div>
                <div className="bg-neutral-950 px-2 py-1.5 text-right text-emerald-300 font-mono font-bold">¥{(item.qty * item.unitPrice).toLocaleString()}</div>
              </div>
            ))}
            <div className="grid grid-cols-[55px_1fr_1fr_40px_65px_70px] gap-px text-[10px] bg-emerald-500/5">
              <div className="bg-emerald-950/30 px-2 py-2 col-span-5 text-right text-emerald-300 font-bold">物料总价</div>
              <div className="bg-emerald-950/30 px-2 py-2 text-right text-emerald-200 font-mono font-bold">¥{materialCost.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* 跨域追溯时间轴 (Audit Trail) */}
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/30 p-4 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs text-cyan-400">{"T"}</span>
            <h3 className="text-sm font-bold text-neutral-200">跨域追溯时间轴 (Audit Trail)</h3>
          </div>
          <div className="space-y-0">
            {[
              { step: 1, id: "RND", icon: "1", title: "研发设计 (RND)", subtitle: "BOM 与图纸数据成功签发", detail: `BOM: ${payload.stepData[1]?.bomCode ?? "BOM-RC-ME-047"} · 工程师: ${payload.stepData[1]?.engineer ?? payload.engineer} · ${payload.bomItems.length} 项物料`, color: "blue" },
              { step: 2, id: "SCM", icon: "2", title: "供应链 (SCM)", subtitle: "底层引擎兜底拦截: 物料齐套核准完毕", detail: `仓库确认: ${payload.stepData[2]?.warehouseConfirm ?? "已确认"} · 缺料: ${payload.stepData[2]?.shortageList ?? "无"}`, color: "amber" },
              { step: 3, id: "MFG", icon: "3", title: "生产排产 (MFG)", subtitle: "车间真实排产执行完毕", detail: `车间: ${mfgData?.workshopAssign ?? "—"} · 总工时: ${mfgData?.estimatedHours ?? "0"}h · 派工 ${mfgData?.dispatchItems ?? "0"} 项`, color: "emerald" },
              { step: 4, id: "QA", icon: "4", title: "质量风控 (QA)", subtitle: "底层引擎兜底拦截: 出厂终检跳动公差达标", detail: `质检员: ${qaData?.inspectorName ?? "—"} · 报告: ${qaData?.testReport ?? "—"} · 结论: ${qaData?.passResult ?? "—"}`, color: "amber" },
              { step: 5, id: "OA", icon: "5", title: "Smart OA 财务核算", subtitle: "成本核算完成，准许结转确认收入", detail: `总成本: ¥${Math.round(totalCost).toLocaleString()} · 报价: ¥${Math.round(quotePrice).toLocaleString()} · 利润率: ${profitRate.toFixed(1)}%`, color: "violet" },
            ].map((item, idx) => {
              const colorMap: Record<string, string> = {
                blue: "border-blue-500 bg-blue-500 text-blue-100",
                amber: "border-amber-500 bg-amber-500 text-amber-100",
                emerald: "border-emerald-500 bg-emerald-500 text-emerald-100",
                violet: "border-violet-500 bg-violet-500 text-violet-100",
              };
              const borderColor: Record<string, string> = {
                blue: "border-blue-500/30",
                amber: "border-amber-500/30",
                emerald: "border-emerald-500/30",
                violet: "border-violet-500/30",
              };
              return (
                <div key={item.step} className="flex items-start gap-3" style={{ animation: `wo6SlideUp .4s ease ${idx * 0.1}s both` }}>
                  <div className="flex flex-col items-center shrink-0">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2", colorMap[item.color])}
                      style={{ animation: "wo6RingPulse 1.5s infinite" }}>
                      {"✓"}
                    </div>
                    {idx < 4 && <div className="w-px h-8 bg-emerald-500/20" />}
                  </div>
                  <div className={cn("flex-1 rounded-lg border px-3 py-2.5 mb-1", borderColor[item.color], "bg-neutral-950/50")}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-emerald-400 text-xs font-bold">{"✅"}</span>
                      <span className="text-xs font-bold text-neutral-100">[{item.step}] {item.title}</span>
                    </div>
                    <div className="text-[10px] text-neutral-300 mb-1">{item.subtitle}</div>
                    <div className="text-[9px] text-neutral-500 font-mono">{item.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部财务核验卡片 */}
        <div className="rounded-xl border-2 border-emerald-500/30 p-4 mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,.08), rgba(6,95,70,.08))",
            backgroundSize: "200% 200%",
            animation: "wo6Shimmer 3s linear infinite",
          }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-emerald-300 font-bold">{"💰"} 订单总成本: ¥{Math.round(totalCost).toLocaleString()}</span>
              <span className="text-neutral-400">|</span>
              <span className="text-cyan-300 font-bold">{"⏱️"} 跨域协同节约工时: {crossDomainSavedHours}h</span>
              <span className="text-neutral-400">|</span>
              <span className="text-violet-300 font-bold">报价: ¥{Math.round(quotePrice).toLocaleString()}</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              style={{ animation: "wo6DotPulse 2s infinite" }}>
              状态: 准许结转确认收入
            </span>
          </div>
        </div>

        {/* 归档重置按钮 */}
        <button onClick={onReset}
          className="w-full py-4 rounded-xl text-sm font-bold border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950 via-emerald-900/40 to-emerald-950 text-emerald-200 hover:border-emerald-400 hover:text-emerald-100 transition-all relative overflow-hidden group"
          style={{ "--pc": "rgba(16,185,129,.4)", animation: "wo6Pulse 2.5s infinite" } as React.CSSProperties}>
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent group-hover:via-emerald-500/10 transition-all" style={{ animation: "wo6Scan 3s linear infinite" }} />
          <span className="relative z-10">{"🔄"} 归档本项目，重置全域状态机 — 迎接下一个订单</span>
        </button>
      </div>
    );
  }

  // ──── Phase 1: 成本核算 ────
  return (
    <div className="h-full flex flex-col">
      <StepHeader step={5} />
      <div className="rounded-lg border border-violet-500/20 bg-violet-950/10 p-4 mb-4" style={{ animation: "wo6FlashGreen .8s ease-out" }}>
        <div className="text-sm font-bold text-violet-300 mb-2">
          {settled ? "结算单已签发 · 即将展开大结局..." : "全链路数据汇聚 — 等待财务终审"}
        </div>
        <div className="grid grid-cols-4 gap-3 text-[10px]">
          <div><span className="text-neutral-500">项目</span><br /><span className="text-neutral-300 font-mono">{payload.projectId}</span></div>
          <div><span className="text-neutral-500">工程师</span><br /><span className="text-neutral-300 font-mono">{payload.engineer}</span></div>
          <div><span className="text-neutral-500">车间</span><br /><span className="text-neutral-300 font-mono">{mfgData?.workshopAssign ?? "—"}</span></div>
          <div><span className="text-neutral-500">总工时</span><br /><span className="text-cyan-300 font-mono">{totalHours}h</span></div>
        </div>
        {qaData && (
          <div className="grid grid-cols-3 gap-3 text-[10px] mt-2 pt-2 border-t border-neutral-800/30">
            <div><span className="text-neutral-500">质检员</span><br /><span className="text-neutral-300 font-mono">{qaData.inspectorName}</span></div>
            <div><span className="text-neutral-500">报告编号</span><br /><span className="text-neutral-300 font-mono">{qaData.testReport}</span></div>
            <div><span className="text-neutral-500">检验结论</span><br /><span className="text-emerald-300 font-mono">{qaData.passResult}</span></div>
          </div>
        )}
      </div>
      <div className="flex-1 rounded-lg border border-neutral-800/40 bg-neutral-900/30 p-4 mb-4">
        <div className="text-[9px] text-neutral-600 font-mono mb-3 tracking-widest uppercase">自动成本核算 — 基于全链路 Payload 实时计算</div>
        <div className="space-y-2 text-[11px]">
          {[
            ["物料成本", `¥${materialCost.toLocaleString()}`, `${payload.bomItems.length} 项物料 x 单价`],
            ["损耗系数 x1.08", `+¥${Math.round(materialCost * 0.08).toLocaleString()}`, "标准 8% 物料损耗"],
            ["工时费", `¥${Math.round(laborCost).toLocaleString()}`, `${totalHours}h x ¥180/h`],
            ["管理费 12%", `+¥${Math.round(management).toLocaleString()}`, "基于基础成本"],
            ["利润 15%", `+¥${Math.round(profit).toLocaleString()}`, "基于成本+管理费"],
          ].map(([label, value, note], i) => (
            <div key={i} className="flex items-center justify-between">
              <div><span className="text-neutral-400">{label}</span><span className="text-neutral-600 text-[9px] ml-2">{note}</span></div>
              <span className="text-neutral-300 font-mono">{value}</span>
            </div>
          ))}
          <div className="border-t border-neutral-700 pt-2 flex justify-between">
            <span className="text-neutral-300 font-medium">总成本</span>
            <span className="text-white font-mono font-bold">¥{Math.round(totalCost).toLocaleString()}</span>
          </div>
          <div className="flex justify-between bg-violet-500/10 rounded px-3 py-2 border border-violet-500/20">
            <span className="text-violet-300 font-medium">对外报价 x1.35</span>
            <span className="text-violet-200 font-mono font-bold text-base">¥{Math.round(quotePrice).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-neutral-500">净利润率</span>
            <span className="text-emerald-400 font-mono font-bold">{profitRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <ActionButton onClick={handleSettle} disabled={settled} done={settled} loading={false}
        doneText="结算单已签发 · 即将展开大结局..."
        loadingText=""
        idleText="签发成本结算单 → 全域编排引擎闭环 → 展开大结局"
        color="violet" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §8  自动降级：万能审批拦截器 (GenericInterceptor)
// ═══════════════════════════════════════════════════════════════

function GenericInterceptor({ stepDef, payload, onComplete }: {
  stepDef: IWorkflowStep;
  payload: IGlobalPayload;
  onComplete: (data: Record<string, string>) => void;
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    stepDef.requiredFields.forEach(f => { init[f] = ""; });
    return init;
  });
  const [approved, setApproved] = useState(false);

  const updateField = useCallback((field: string, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const allFilled = stepDef.requiredFields.every(f => formValues[f].trim().length > 0);

  const handleApprove = useCallback(() => {
    if (!allFilled || approved) return;
    setApproved(true);
    onComplete(formValues);
  }, [onComplete, allFilled, approved, formValues]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-500/30">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-sm">{"⚙️"}</div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-neutral-100">Step {stepDef.step} · {stepDef.name}</h2>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">自动降级 · 标准审批拦截器</span>
          </div>
          <p className="text-[10px] text-neutral-500 font-mono">{stepDef.description} · hasUI: false → 引擎自动生成表单</p>
        </div>
      </div>
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 mb-4" style={{ animation: "wo6FlashAmber .8s ease-out" }}>
        <p className="text-xs text-amber-200/80 leading-relaxed">
          沙盘 <span className="font-bold text-amber-300">{stepDef.id}</span> 的专属 UI 组件尚未开发（hasUI: false）。
          编排引擎已根据 WORKFLOW_REGISTRY.requiredFields 自动生成标准审批表单，确保业务流不断裂。
        </p>
      </div>
      <div className="rounded-lg border border-neutral-800/40 bg-neutral-900/40 p-3 mb-4">
        <div className="text-[9px] text-neutral-600 font-mono mb-2 tracking-widest uppercase">上游 Payload 摘要 — 来自 useState(globalPayload)</div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div><span className="text-neutral-500">项目</span><br /><span className="text-neutral-300 font-mono">{payload.projectId}</span></div>
          <div><span className="text-neutral-500">物料</span><br /><span className="text-cyan-300 font-mono">{payload.bomItems.length} 项</span></div>
          <div><span className="text-neutral-500">交期</span><br /><span className="text-red-400 font-mono">{payload.deadline}</span></div>
        </div>
        <div className="mt-2 text-[9px] text-neutral-500 font-mono">
          物料: {payload.bomItems.map(b => b.name).join("、")}
        </div>
        {Object.keys(payload.stepData).length > 0 && (
          <div className="mt-2 pt-2 border-t border-neutral-800/30 space-y-0.5">
            {Object.entries(payload.stepData).map(([stepNum, data]) => {
              const reg = WORKFLOW_REGISTRY.find(r => r.step === Number(stepNum));
              return (
                <div key={stepNum} className="text-[9px] text-neutral-500 font-mono">
                  Step {stepNum}（{reg?.name ?? "未知"}）: {Object.entries(data).map(([k, v]) => `${k}=${v}`).join(", ")}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex-1 rounded-lg border border-neutral-800/40 bg-neutral-900/30 p-4 mb-4">
        <div className="text-[9px] text-neutral-600 font-mono mb-3 tracking-widest uppercase">
          自动生成审批表单 — requiredFields: [{stepDef.requiredFields.join(", ")}]
        </div>
        <div className="space-y-3">
          {stepDef.requiredFields.map((field, idx) => (
            <div key={field} style={{ animation: `wo6SlideUp .3s ease ${idx * 0.08}s both` }}>
              <label className="block text-xs text-neutral-300 mb-1 font-medium">
                {FIELD_LABELS[field] ?? field}<span className="text-red-400 ml-1">*</span>
              </label>
              <input type="text" value={formValues[field]} onChange={e => updateField(field, e.target.value)} disabled={approved}
                className="w-full h-9 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-40 transition-colors placeholder:text-neutral-600"
                placeholder={`请输入${FIELD_LABELS[field] ?? field}`} />
            </div>
          ))}
        </div>
      </div>
      <ActionButton onClick={handleApprove} disabled={!allFilled || approved} done={approved} loading={false}
        doneText={`Step ${stepDef.step} 审批通过 · 数据已注入 Payload 并流转至下一步`}
        loadingText=""
        idleText={allFilled ? `审批通过 → 编排引擎自动路由至 Step ${stepDef.step + 1}` : `请填写全部 ${stepDef.requiredFields.length} 个必填字段`}
        color="amber" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §9  共享子组件
// ═══════════════════════════════════════════════════════════════

function StepHeader({ step }: { step: number }) {
  const def = WORKFLOW_REGISTRY.find(s => s.step === step)!;
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800/50">
      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-cyan-400">{step}</div>
      <div>
        <h2 className="text-sm font-bold text-neutral-100">{def.name}</h2>
        <p className="text-[10px] text-neutral-500 font-mono">{def.description} · 实装沙盘组件</p>
      </div>
    </div>
  );
}

function BomTable({ items }: { items: readonly IBomItem[] }) {
  return (
    <div className="overflow-hidden rounded border border-neutral-800/50">
      <div className="grid grid-cols-[55px_1fr_1fr_40px_65px] gap-px bg-neutral-800 text-[9px] text-neutral-500 font-mono">
        <div className="bg-neutral-900 px-2 py-1">编码</div>
        <div className="bg-neutral-900 px-2 py-1">名称</div>
        <div className="bg-neutral-900 px-2 py-1">规格</div>
        <div className="bg-neutral-900 px-2 py-1 text-center">数量</div>
        <div className="bg-neutral-900 px-2 py-1 text-right">单价</div>
      </div>
      {items.map(item => (
        <div key={item.id} className="grid grid-cols-[55px_1fr_1fr_40px_65px] gap-px bg-neutral-800/30 text-[10px]">
          <div className="bg-neutral-950 px-2 py-1 text-cyan-400 font-mono">{item.id}</div>
          <div className="bg-neutral-950 px-2 py-1 text-neutral-200">{item.name}</div>
          <div className="bg-neutral-950 px-2 py-1 text-neutral-400">{item.spec}</div>
          <div className="bg-neutral-950 px-2 py-1 text-center text-neutral-300 font-mono">{item.qty}</div>
          <div className="bg-neutral-950 px-2 py-1 text-right text-amber-300 font-mono">¥{item.unitPrice.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function ActionButton({ onClick, disabled, done, loading, doneText, loadingText, idleText, color }: {
  onClick: () => void; disabled: boolean; done: boolean; loading: boolean;
  doneText: string; loadingText: string; idleText: string;
  color: "blue" | "emerald" | "amber" | "violet";
}) {
  const colorMap = {
    blue: { idle: "from-blue-950 via-blue-900/80 to-blue-950 border-blue-500/50 text-blue-100 hover:border-blue-400", pc: "rgba(59,130,246,.5)" },
    emerald: { idle: "from-emerald-950 via-emerald-900/80 to-emerald-950 border-emerald-500/50 text-emerald-100 hover:border-emerald-400", pc: "rgba(34,197,94,.5)" },
    amber: { idle: "from-amber-950 via-amber-900/80 to-amber-950 border-amber-500/50 text-amber-100 hover:border-amber-400", pc: "rgba(245,158,11,.5)" },
    violet: { idle: "from-violet-950 via-violet-900/80 to-violet-950 border-violet-500/50 text-violet-100 hover:border-violet-400", pc: "rgba(139,92,246,.5)" },
  };
  const c = colorMap[color];
  return done ? (
    <div className="text-center text-emerald-400 text-sm font-bold py-3" style={{ animation: "wo6SlideUp .3s ease-out" }}>{doneText}</div>
  ) : (
    <button onClick={onClick} disabled={disabled || loading}
      className={cn(
        "relative w-full py-3.5 rounded-xl text-sm font-bold transition-all overflow-hidden",
        loading ? "bg-neutral-900 border-2 border-neutral-700 text-neutral-400 cursor-wait"
          : disabled ? "bg-neutral-900 border-2 border-neutral-800 text-neutral-600 cursor-not-allowed"
            : `bg-gradient-to-r ${c.idle} border-2`,
      )}
      style={!disabled && !loading ? { "--pc": c.pc, animation: "wo6Pulse 2.5s infinite" } as React.CSSProperties : undefined}>
      {!disabled && !loading && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ animation: "wo6Scan 2.5s linear infinite" }} />
      )}
      <span className="relative z-10">{loading ? loadingText : idleText}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// §10  九宫格微缩面板
// ═══════════════════════════════════════════════════════════════

function MiniWaffle({ tiles, currentStep }: { tiles: IWaffleTile[]; currentStep: number }) {
  return (
    <div className="p-3 border-b border-neutral-800/30">
      <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-2">九宫格联动</div>
      <div className="grid grid-cols-3 gap-1">
        {tiles.map(tile => {
          const isDone = tile.step > 0 && tile.step < currentStep;
          const isActive = tile.step > 0 && tile.step === currentStep;
          const hasStep = tile.step > 0;
          return (
            <div key={tile.id} className={cn(
              "relative rounded px-1 py-1 text-center text-[8px] font-mono border transition-all",
              isDone ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" :
              isActive ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" :
              "border-neutral-800/40 bg-neutral-900/30 text-neutral-600",
            )}>
              {tile.label}
              {/* 红点 badge */}
              {isActive && hasStep && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-neutral-950"
                  style={{ animation: "wo6BadgePop .3s ease-out, wo6DotPulse 1.5s infinite" }} />
              )}
              {isDone && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-neutral-950 flex items-center justify-center text-[6px] text-white">{"✓"}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §11  主组件 — 中央集权状态机
// ═══════════════════════════════════════════════════════════════

export default function WorkflowOrchestrator() {
  useEffect(() => { injectStyles(); }, []);

  // ──────── 中央集权状态 ────────
  const [currentStep, setCurrentStep] = useState(1);
  const [globalPayload, setGlobalPayload] = useState<IGlobalPayload | null>(null);
  const [agentLogs, setAgentLogs] = useState<IAgentLog[]>([]);
  const logSeq = useRef(0);
  const agentTimers = useRef<number[]>([]);

  useEffect(() => () => agentTimers.current.forEach(t => clearTimeout(t)), []);

  const addLog = useCallback((text: string, level: IAgentLog["level"]) => {
    setAgentLogs(prev => [...prev, { id: ++logSeq.current, text, level }]);
  }, []);

  const delayLog = useCallback((text: string, level: IAgentLog["level"], ms: number) => {
    const t = window.setTimeout(() => addLog(text, level), ms);
    agentTimers.current.push(t);
  }, [addLog]);

  // ──────── 九宫格状态 ────────
  const waffleTiles: IWaffleTile[] = WAFFLE_LAYOUT.map(w => ({
    ...w,
    done: w.step > 0 && w.step < currentStep,
    active: w.step > 0 && w.step === currentStep,
  }));

  // ──────── 全域重置 ────────
  const handleReset = useCallback(() => {
    agentTimers.current.forEach(t => clearTimeout(t));
    agentTimers.current = [];
    setCurrentStep(1);
    setGlobalPayload(null);
    setAgentLogs([]);
    logSeq.current = 0;
  }, []);

  // ──────── 步骤完成处理 ────────
  const handleStepComplete = useCallback((stepNum: number, data: Record<string, string>) => {
    const regStep = WORKFLOW_REGISTRY.find(s => s.step === stepNum)!;
    const nextStep = WORKFLOW_REGISTRY.find(s => s.step === stepNum + 1);

    setGlobalPayload(prev => {
      if (!prev) return prev;
      return { ...prev, stepData: { ...prev.stepData, [stepNum]: data } };
    });

    addLog(`[Step ${stepNum} 完成] ${regStep.name} · 数据已注入 globalPayload.stepData[${stepNum}]`, "success");
    Object.entries(data).forEach(([k, v]) => {
      addLog(`  └─ ${k} = ${v}`, "info");
    });

    if (nextStep) {
      delayLog(`[Orchestrator 路由] setCurrentStep(${stepNum + 1}) → ${nextStep.name}`, "warn", 200);
      if (!nextStep.hasUI) {
        delayLog(`[自动降级] ${nextStep.id} hasUI=false → 渲染 GenericInterceptor`, "warn", 400);
      }
      const t = window.setTimeout(() => setCurrentStep(stepNum + 1), 500);
      agentTimers.current.push(t);
    } else {
      // Step 5 是最后一步 — OA 内部自己处理大结局，不需要跳转到 step 6
      delayLog(`[Orchestrator] 全部 ${WORKFLOW_REGISTRY.length} 步完成 · M12 全生命周期闭环!`, "success", 200);
    }
  }, [addLog, delayLog]);

  // Step 1 特殊：初始化 payload
  const handleRndComplete = useCallback((payload: IGlobalPayload) => {
    setGlobalPayload(payload);
    addLog(`[Orchestrator] 工作流初始化 · 项目 ${payload.projectId}`, "info");
    addLog(`[Payload] ${payload.bomItems.length} 项物料 · 总价 ¥${payload.bomItems.reduce((s, b) => s + b.qty * b.unitPrice, 0).toLocaleString()}`, "info");
    handleStepComplete(1, payload.stepData[1] ?? {});
  }, [addLog, handleStepComplete]);

  // ══════════════════════════════════════════════════════════
  // 渲染当前步骤 — CEO P0 修复: 显式 5-case 路由枢纽
  // ══════════════════════════════════════════════════════════
  const renderCurrentStep = () => {
    // ── case 1: 研发设计 ──
    if (currentStep === 1) {
      return <StepRND onComplete={handleRndComplete} />;
    }

    // 必须有 payload 才能渲染后续步骤
    if (!globalPayload) return null;

    // ── case 2: 供应链拦截（hasUI: false → 自动降级） ──
    if (currentStep === 2) {
      const stepDef = WORKFLOW_REGISTRY.find(s => s.step === 2)!;
      return <GenericInterceptor stepDef={stepDef} payload={globalPayload} onComplete={(data) => handleStepComplete(2, data)} />;
    }

    // ── case 3: 生产制造排产 ──
    if (currentStep === 3) {
      return <StepMFG payload={globalPayload} onComplete={(data) => handleStepComplete(3, data)} />;
    }

    // ── case 4: 质量终检拦截（hasUI: false → 自动降级） ──
    if (currentStep === 4) {
      const stepDef = WORKFLOW_REGISTRY.find(s => s.step === 4)!;
      return <GenericInterceptor stepDef={stepDef} payload={globalPayload} onComplete={(data) => handleStepComplete(4, data)} />;
    }

    // ── case 5: Smart OA 财务核算 + 大结局 ──  ← CEO P0 修复的关键!
    if (currentStep === 5) {
      return <StepOA payload={globalPayload} onComplete={(data) => handleStepComplete(5, data)} onReset={handleReset} />;
    }

    return null;
  };

  // ──────── 进度统计 ────────
  const completedCount = Math.min(currentStep - 1, WORKFLOW_REGISTRY.length);
  const progressPct = Math.round((completedCount / WORKFLOW_REGISTRY.length) * 100);
  const isAllDone = currentStep >= WORKFLOW_REGISTRY.length;

  // ──────── Agent Panel ref ────────
  const agentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (agentRef.current) agentRef.current.scrollTop = agentRef.current.scrollHeight; }, [agentLogs.length]);

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Top Navbar */}
      <nav className="shrink-0 h-11 flex items-center justify-between px-4 border-b border-neutral-800/60 bg-neutral-950/95 backdrop-blur z-40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-900/20">G</div>
          <span className="text-sm font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">GRT System</span>
          <span className="text-[10px] text-neutral-500 font-mono hidden lg:inline">全域业务编排引擎 V6.0 · 中央状态机驱动 · P0 修复版</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-neutral-500 font-mono">
            进度 <span className={cn(isAllDone ? "text-emerald-400" : "text-cyan-400")}>{completedCount}/{WORKFLOW_REGISTRY.length} ({progressPct}%)</span>
          </div>
          <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", isAllDone ? "bg-emerald-500" : "bg-cyan-500")} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </nav>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar — 流程时间线 + 九宫格 */}
        <aside className="shrink-0 w-52 border-r border-neutral-800/60 bg-neutral-950 flex flex-col">
          {/* 九宫格微缩面板 */}
          <MiniWaffle tiles={waffleTiles} currentStep={currentStep} />

          <div className="p-3 border-b border-neutral-800/30">
            <div className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase">WORKFLOW TIMELINE</div>
          </div>
          <div className="flex-1 p-3 space-y-1 overflow-y-auto">
            {WORKFLOW_REGISTRY.map((reg, idx) => {
              const isDone = reg.step < currentStep;
              const isActive = reg.step === currentStep;
              return (
                <div key={reg.step} className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                      isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                        isActive ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" :
                          "bg-neutral-900 border-neutral-700 text-neutral-600",
                    )} style={isActive ? { animation: "wo6DotPulse 1.5s infinite" } : undefined}>
                      {isDone ? "✓" : reg.step}
                    </div>
                    {idx < WORKFLOW_REGISTRY.length - 1 && (
                      <div className={cn("w-px h-5", isDone ? "bg-emerald-500/40" : "bg-neutral-800")} />
                    )}
                  </div>
                  <div className="min-w-0 -mt-0.5">
                    <div className={cn(
                      "text-[10px] font-medium truncate",
                      isDone ? "text-emerald-400" : isActive ? "text-cyan-300" : "text-neutral-600",
                    )}>
                      {reg.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {!reg.hasUI && <span className="text-[8px] text-amber-500 font-mono">⚙ 自动降级</span>}
                      {isDone && <span className="text-[8px] text-emerald-500/60 font-mono">已完成</span>}
                      {isActive && <span className="text-[8px] text-cyan-500 font-mono">进行中</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 状态机调试信息 */}
          <div className="p-3 border-t border-neutral-800/30">
            <div className="text-[8px] font-mono text-neutral-600 space-y-0.5">
              <div className="text-neutral-500 font-bold mb-1">{"中央状态机"}</div>
              <div>{"currentStep: "}<span className="text-cyan-500">{currentStep}</span></div>
              <div>{"globalPayload: "}<span className={globalPayload ? "text-emerald-500" : "text-red-500"}>{globalPayload ? "已初始化" : "null"}</span></div>
              <div>{"stepData keys: "}<span className="text-amber-500">{globalPayload ? Object.keys(globalPayload.stepData).join(",") : "—"}</span></div>
              <div className="text-emerald-600 mt-1">{"✓ 零 EventBus · 纯 useState 驱动"}</div>
            </div>
          </div>
        </aside>

        {/* Main — 动态渲染当前步骤 */}
        <main className="flex-1 p-5 overflow-y-auto">
          <div className="max-w-3xl mx-auto h-full">
            {renderCurrentStep()}
          </div>
        </main>

        {/* Agent Panel */}
        <aside className="shrink-0 border-l border-neutral-800/60 bg-neutral-950 flex flex-col" style={{ width: 290 }}>
          <div className="p-3 border-b border-neutral-800/40">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-xs">{"🤖"}</span>
              <div>
                <div className="text-xs font-bold text-neutral-200">编排引擎 Agent</div>
                <div className="text-[9px] text-neutral-500 font-mono">useState 中央状态机 · 零 EventBus</div>
              </div>
            </div>
          </div>
          <div ref={agentRef} className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {agentLogs.length === 0 ? (
              <div className="text-neutral-700 text-[10px] font-mono text-center py-10">
                {"// 编排引擎待机中..."}<br />
                {"// 等待 Step 1 签发 BOM 启动工作流"}
              </div>
            ) : agentLogs.map(e => <TypewriterLog key={e.id} entry={e} />)}
          </div>
          <div className="p-3 border-t border-neutral-800/40">
            <div className="text-[8px] font-mono text-neutral-600 space-y-0.5">
              <div className="text-neutral-500 font-bold mb-1">{"架构拓扑 V6.0"}</div>
              <div>{"useState(currentStep)  ← 中央控制"}</div>
              <div>{"useState(globalPayload) ← 全域数据"}</div>
              <div>{"Step N props={payload}  ← 直传水合"}</div>
              <div>{"hasUI=false → GenericInterceptor"}</div>
              <div>{"case 5 → StepOA + 大结局  ← P0修复"}</div>
              <div className="text-emerald-600 mt-1">{"✓ 零断裂 · 零空状态 · 纯 props"}</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom status bar */}
      <footer className="shrink-0 h-7 flex items-center justify-between px-4 border-t border-neutral-800/40 bg-neutral-950/90 text-[9px] font-mono text-neutral-600">
        <div className="flex items-center gap-4">
          <span>状态机: <span className="text-cyan-500">useState(currentStep={currentStep})</span></span>
          <span>Payload: <span className={globalPayload ? "text-emerald-500" : "text-red-500"}>{globalPayload ? "已注入" : "等待初始化"}</span></span>
          <span>实装: <span className="text-emerald-500">3 沙盘 (RND/MFG/OA)</span></span>
          <span>降级: <span className="text-amber-500">2 沙盘 (SCM/QA)</span></span>
          <span>九宫格: <span className="text-cyan-500">5/9 联动</span></span>
        </div>
        <div>GRT System V6.0 · 全域业务编排引擎 · P0 修复版</div>
      </footer>
      <FloatingNav variant="light" />
    </div>
  );
}
