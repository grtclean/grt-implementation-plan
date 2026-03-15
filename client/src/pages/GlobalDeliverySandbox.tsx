/**
 * GlobalDeliverySandbox — WO-US-429 Chart Cleaning Machine
 * Global Joint-Delivery & Collaborative Acceptance Sandbox
 *
 * 21-step cross-border joint SOP with RACI party isolation,
 * dependency locking, bilingual AI copilot, and dual-timezone header.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckCircle2, Lock, AlertTriangle, Clock, Upload, Send,
  FileText, Camera, Globe, ChevronRight, Shield, Zap,
  Users, Phone, Mail, Eye, ExternalLink, Wifi,
  Wrench, Package, BarChart3, Play, Pause, Radio,
  MessageSquare, Bot, Sparkles, ArrowRight, Info,
  Pen, Languages, MonitorPlay, Truck, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════
// LocalStorage Persistence Helpers
// ═══════════════════════════════════════════════════════════

const LS_PREFIX = "grt-global-delivery";

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown): void {
  try { localStorage.setItem(`${LS_PREFIX}:${key}`, JSON.stringify(value)); } catch { /* quota exceeded — silent */ }
}

// ═══════════════════════════════════════════════════════════
// Type System — GRT Encoding First Principle: Zero `any`
// ═══════════════════════════════════════════════════════════

type IPartyRole = "GERRYTECH" | "CHART" | "JOINT";

type ITaskStatus =
  | "completed"
  | "in_progress"
  | "action_required"
  | "locked"
  | "upcoming";

type IDependencyType = "hard" | "soft";

interface IDependency {
  taskId: number;
  type: IDependencyType;
  description: string;
}

interface IDeliveryTask {
  id: number;
  titleEn: string;
  titleZh: string;
  party: IPartyRole;
  status: ITaskStatus;
  scheduledDate: string;       // ISO date, corrected to 2026-03
  actualDate: string | null;
  dependencies: IDependency[];
  lockedBy: number | null;     // task ID that blocks this
  descriptionEn: string;
  descriptionZh: string;
  deliverableEn: string;
  deliverableZh: string;
  assigneeEn: string;
  assigneeZh: string;
  durationHours: number;
}

interface ICopilotMessage {
  id: number;
  type: "greeting" | "alert" | "action" | "info";
  textEn: string;
  textZh: string;
  timestamp: string;
}

type ILanguage = "en" | "zh";

// ═══════════════════════════════════════════════════════════
// Constants & Seed Data — SOP workflow steps (Year corrected → 2026-03)
// ═══════════════════════════════════════════════════════════

const WO_CODE = "WO-US-429";
const PROJECT_EN = "Chart Industries — Cleaning Machine Delivery";
const PROJECT_ZH = "\u67E5\u7279\u5DE5\u4E1A \u2014 \u6E05\u6D17\u673A\u4EA4\u4ED8";

const PARTY_STYLES: Record<IPartyRole, {
  bgCard: string; borderCard: string; textLabel: string;
  badgeBg: string; badgeText: string; label: string; labelZh: string;
  icon: string;
}> = {
  GERRYTECH: {
    bgCard: "bg-blue-500/8", borderCard: "border-blue-500/30",
    textLabel: "text-blue-400", badgeBg: "bg-blue-500/10", badgeText: "text-blue-400",
    label: "GERRYTECH", labelZh: "\u6770\u745E\u5FB7", icon: "\u{1F535}",
  },
  CHART: {
    bgCard: "bg-amber-500/8", borderCard: "border-amber-500/30",
    textLabel: "text-amber-400", badgeBg: "bg-amber-500/10", badgeText: "text-amber-400",
    label: "CHART", labelZh: "\u67E5\u7279", icon: "\u{1F7E0}",
  },
  JOINT: {
    bgCard: "bg-emerald-500/8", borderCard: "border-emerald-500/30",
    textLabel: "text-emerald-400", badgeBg: "bg-emerald-500/10", badgeText: "text-emerald-400",
    label: "JOINT", labelZh: "\u8054\u5408", icon: "\u{1F7E2}",
  },
};

const STATUS_STYLES: Record<ITaskStatus, {
  label: string; labelZh: string; cls: string; icon: React.ElementType;
}> = {
  completed:       { label: "Completed",       labelZh: "\u5DF2\u5B8C\u6210", cls: "bg-green-500/10 text-green-400 border-green-500/30", icon: CheckCircle2 },
  in_progress:     { label: "In Progress",     labelZh: "\u8FDB\u884C\u4E2D", cls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", icon: Activity },
  action_required: { label: "ACTION REQUIRED",  labelZh: "\u5F85\u5BA2\u6237\u64CD\u4F5C", cls: "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse", icon: AlertTriangle },
  locked:          { label: "Locked",           labelZh: "\u5DF2\u9501\u5B9A", cls: "bg-gray-700/50 text-gray-500 border-gray-600", icon: Lock },
  upcoming:        { label: "Upcoming",         labelZh: "\u5F85\u5F00\u59CB", cls: "bg-slate-700/30 text-slate-400 border-slate-600", icon: Clock },
};

const TASKS: IDeliveryTask[] = [
  { id: 1, titleEn: "Equipment & tooling shipment from CN warehouse", titleZh: "\u8BBE\u5907\u4ECE\u4E2D\u56FD\u4ED3\u5E93\u53D1\u8D27", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-01", actualDate: "2026-03-01", dependencies: [], lockedBy: null, descriptionEn: "Container loading, customs docs, ocean freight booking", descriptionZh: "\u96C6\u88C5\u7BB1\u88C5\u8F7D\u3001\u6D77\u5173\u6587\u4EF6\u3001\u6D77\u8FD0\u8BA2\u8236", deliverableEn: "B/L + Packing List", deliverableZh: "\u63D0\u5355 + \u88C5\u7BB1\u5355", assigneeEn: "GRT Logistics Team", assigneeZh: "\u6770\u745E\u5FB7\u7269\u6D41\u7EC4", durationHours: 8 },
  { id: 2, titleEn: "Ocean freight transit (Shanghai \u2192 Houston)", titleZh: "\u6D77\u8FD0\u8FC7\u6E21 (\u4E0A\u6D77\u2192\u4F11\u65AF\u987F)", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-03", actualDate: "2026-03-02", dependencies: [{ taskId: 1, type: "hard", description: "Shipment must depart first" }], lockedBy: null, descriptionEn: "25-day ocean transit, real-time vessel tracking", descriptionZh: "25\u5929\u6D77\u8FD0\u3001\u5B9E\u65F6\u8239\u8236\u8DDF\u8E2A", deliverableEn: "Vessel Tracking URL", deliverableZh: "\u8239\u8236\u8DDF\u8E2A\u94FE\u63A5", assigneeEn: "GRT Logistics", assigneeZh: "\u6770\u745E\u5FB7\u7269\u6D41", durationHours: 600 },
  { id: 3, titleEn: "US customs clearance & inland trucking", titleZh: "\u7F8E\u56FD\u6E05\u5173\u53CA\u5185\u9646\u8FD0\u8F93", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-05", actualDate: "2026-03-05", dependencies: [{ taskId: 2, type: "hard", description: "Vessel arrival" }], lockedBy: null, descriptionEn: "CBP clearance, ISF filing, last-mile trucking to Chart facility", descriptionZh: "CBP\u6E05\u5173\u3001ISF\u7533\u62A5\u3001\u5C3E\u7A0B\u5361\u8F66\u8FD0\u8F93", deliverableEn: "Customs Release + POD", deliverableZh: "\u6D77\u5173\u653E\u884C\u5355 + \u7B7E\u6536\u5355", assigneeEn: "US Freight Broker", assigneeZh: "\u7F8E\u56FD\u8D27\u4EE3", durationHours: 48 },
  { id: 4, titleEn: "Unloading & visual damage inspection", titleZh: "\u5378\u8D27\u53CA\u5916\u89C2\u635F\u4F24\u68C0\u67E5", party: "JOINT", status: "completed", scheduledDate: "2026-03-07", actualDate: "2026-03-07", dependencies: [{ taskId: 3, type: "hard", description: "Delivery to site" }], lockedBy: null, descriptionEn: "Joint unloading with Chart rigging crew, photo documentation of all crates", descriptionZh: "\u8054\u5408\u5378\u8D27\u3001\u62CD\u7167\u8BB0\u5F55\u6240\u6709\u7BB1\u4F53", deliverableEn: "Damage Inspection Report", deliverableZh: "\u635F\u4F24\u68C0\u67E5\u62A5\u544A", assigneeEn: "GRT Lead + Chart Receiving", assigneeZh: "\u6770\u745E\u5FB7\u9886\u961F + \u67E5\u7279\u6536\u8D27", durationHours: 4 },
  { id: 5, titleEn: "Machine positioning per layout M-01", titleZh: "\u6309\u5E03\u5C40\u56FE M-01 \u5B9A\u4F4D\u8BBE\u5907", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-08", actualDate: "2026-03-08", dependencies: [{ taskId: 4, type: "hard", description: "Unloading complete" }], lockedBy: null, descriptionEn: "Precision leveling \u00B10.5mm, anchor bolt marking", descriptionZh: "\u7CBE\u5BC6\u627E\u5E73 \u00B10.5mm\u3001\u5730\u811A\u5B9A\u4F4D", deliverableEn: "Leveling Certificate", deliverableZh: "\u627E\u5E73\u8BC1\u4E66", assigneeEn: "GRT Installation Lead", assigneeZh: "\u6770\u745E\u5FB7\u5B89\u88C5\u7EC4\u957F", durationHours: 6 },
  { id: 6, titleEn: "Electrical cable routing & termination", titleZh: "\u7535\u6C14\u5E03\u7EBF\u53CA\u63A5\u7EBF", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-09", actualDate: "2026-03-09", dependencies: [{ taskId: 5, type: "hard", description: "Machine positioned" }], lockedBy: null, descriptionEn: "Main power cable, control cable, grounding per NEC", descriptionZh: "\u4E3B\u7535\u7F06\u3001\u63A7\u5236\u7F06\u3001NEC\u63A5\u5730", deliverableEn: "Wiring Completion Certificate", deliverableZh: "\u5E03\u7EBF\u5B8C\u5DE5\u8BC1\u4E66", assigneeEn: "GRT Electrical Engineer", assigneeZh: "\u6770\u745E\u5FB7\u7535\u6C14\u5DE5\u7A0B\u5E08", durationHours: 8 },
  { id: 7, titleEn: "Pneumatic piping installation", titleZh: "\u6C14\u8DEF\u7BA1\u9053\u5B89\u88C5", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-10", actualDate: "2026-03-09", dependencies: [{ taskId: 5, type: "hard", description: "Machine positioned" }], lockedBy: null, descriptionEn: "Compressed air manifold, FRL units, leak test", descriptionZh: "\u538B\u7F29\u7A7A\u6C14\u5206\u6C14\u7F38\u3001FRL\u5355\u5143\u3001\u6CC4\u6F0F\u6D4B\u8BD5", deliverableEn: "Leak Test Report", deliverableZh: "\u6CC4\u6F0F\u6D4B\u8BD5\u62A5\u544A", assigneeEn: "GRT Mechanical Eng.", assigneeZh: "\u6770\u745E\u5FB7\u673A\u68B0\u5DE5\u7A0B\u5E08", durationHours: 6 },
  { id: 8, titleEn: "DI water plumbing rough-in", titleZh: "DI \u7EAF\u6C34\u7BA1\u9053\u9884\u57CB", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-10", actualDate: "2026-03-10", dependencies: [{ taskId: 5, type: "hard", description: "Machine positioned" }], lockedBy: null, descriptionEn: "SS316L tubing from machine inlet to Chart DI loop stub-out", descriptionZh: "SS316L\u7BA1\u9053\u4ECE\u8BBE\u5907\u8FDB\u53E3\u5230\u67E5\u7279DI\u73AF\u8DEF\u9884\u7559\u53E3", deliverableEn: "Plumbing As-Built Drawing", deliverableZh: "\u7BA1\u9053\u7AE3\u5DE5\u56FE", assigneeEn: "GRT Mechanical Eng.", assigneeZh: "\u6770\u745E\u5FB7\u673A\u68B0\u5DE5\u7A0B\u5E08", durationHours: 8 },
  { id: 9, titleEn: "Drain & exhaust routing", titleZh: "\u6392\u6C34\u6392\u6C14\u7BA1\u8DEF", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-11", actualDate: "2026-03-10", dependencies: [{ taskId: 5, type: "hard", description: "Machine positioned" }], lockedBy: null, descriptionEn: "Waste water drain to Chart floor trench, exhaust duct to roof penetration", descriptionZh: "\u5E9F\u6C34\u6392\u81F3\u67E5\u7279\u5730\u6C9F\u3001\u6392\u6C14\u81F3\u5C4B\u9876\u7A7F\u5B54", deliverableEn: "Drain/Exhaust Completion Report", deliverableZh: "\u6392\u6C34\u6392\u6C14\u5B8C\u5DE5\u62A5\u544A", assigneeEn: "GRT Installation Team", assigneeZh: "\u6770\u745E\u5FB7\u5B89\u88C5\u7EC4", durationHours: 6 },
  { id: 10, titleEn: "PLC program upload & I/O check", titleZh: "PLC\u7A0B\u5E8F\u4E0A\u4F20\u53CAI/O\u68C0\u67E5", party: "GERRYTECH", status: "completed", scheduledDate: "2026-03-11", actualDate: "2026-03-11", dependencies: [{ taskId: 6, type: "hard", description: "Wiring complete" }], lockedBy: null, descriptionEn: "Upload latest PLC firmware, verify all digital/analog I/O signals", descriptionZh: "\u4E0A\u4F20\u6700\u65B0PLC\u56FA\u4EF6\u3001\u9A8C\u8BC1\u6240\u6709I/O\u4FE1\u53F7", deliverableEn: "I/O Verification Checklist", deliverableZh: "I/O\u9A8C\u8BC1\u6E05\u5355", assigneeEn: "GRT Controls Engineer", assigneeZh: "\u6770\u745E\u5FB7\u63A7\u5236\u5DE5\u7A0B\u5E08", durationHours: 8 },
  { id: 11, titleEn: "Safety device validation (E-Stop, interlocks)", titleZh: "\u5B89\u5168\u88C5\u7F6E\u9A8C\u8BC1 (\u6025\u505C\u3001\u8054\u9501)", party: "GERRYTECH", status: "in_progress", scheduledDate: "2026-03-12", actualDate: null, dependencies: [{ taskId: 10, type: "hard", description: "PLC programmed" }], lockedBy: null, descriptionEn: "Test all E-Stop circuits, door interlocks, light curtains per OSHA/NFPA", descriptionZh: "\u6D4B\u8BD5\u6240\u6709\u6025\u505C\u3001\u95E8\u8054\u9501\u3001\u5149\u5E55 (OSHA/NFPA)", deliverableEn: "Safety Validation Protocol", deliverableZh: "\u5B89\u5168\u9A8C\u8BC1\u534F\u8BAE", assigneeEn: "GRT Safety Lead", assigneeZh: "\u6770\u745E\u5FB7\u5B89\u5168\u8D1F\u8D23\u4EBA", durationHours: 6 },
  { id: 12, titleEn: "Connect 480V power, 6-bar air, DI water to machine", titleZh: "\u5C06 480V \u7535\u6E90\u3001\u538B\u7F29\u7A7A\u6C14\u3001DI \u7EAF\u6C34\u63A5\u5165\u8BBE\u5907", party: "CHART", status: "action_required", scheduledDate: "2026-03-13", actualDate: null, dependencies: [{ taskId: 9, type: "hard", description: "GRT piping complete" }], lockedBy: null, descriptionEn: "Chart Facility Team to energize 480V disconnect, open compressed air valve to 6 bar, and turn on DI water supply per Layout M-01.", descriptionZh: "\u67E5\u7279\u5382\u52A1\u56E2\u961F\u63A5\u901A480V\u7535\u6E90\u3001\u5F00\u542F6bar\u538B\u7F29\u7A7A\u6C14\u3001\u5F00\u542FDI\u7EAF\u6C34\u4F9B\u5E94", deliverableEn: "Facility Readiness Photo + E-Sign", deliverableZh: "\u8BBE\u65BD\u5C31\u7EEA\u7167\u7247 + \u7535\u5B50\u7B7E\u540D", assigneeEn: "John Miller (Chart Facility Mgr)", assigneeZh: "John Miller (\u67E5\u7279\u5382\u52A1\u7ECF\u7406)", durationHours: 4 },
  { id: 13, titleEn: "Utility verification & pressure test", titleZh: "\u516C\u7528\u5DE5\u7A0B\u9A8C\u8BC1\u4E0E\u538B\u529B\u6D4B\u8BD5", party: "GERRYTECH", status: "locked", scheduledDate: "2026-03-14", actualDate: null, dependencies: [{ taskId: 12, type: "hard", description: "Chart must connect utilities first" }], lockedBy: 12, descriptionEn: "Verify 480V phase rotation, air pressure stability, DI water quality (conductivity < 1 \u00B5S/cm)", descriptionZh: "\u9A8C\u8BC1\u76F8\u5E8F\u3001\u6C14\u538B\u7A33\u5B9A\u6027\u3001DI\u6C34\u8D28 (\u7535\u5BFC\u7387<1\u00B5S/cm)", deliverableEn: "Utility Test Report", deliverableZh: "\u516C\u7528\u5DE5\u7A0B\u6D4B\u8BD5\u62A5\u544A", assigneeEn: "GRT Service Engineer", assigneeZh: "\u6770\u745E\u5FB7\u670D\u52A1\u5DE5\u7A0B\u5E08", durationHours: 4 },
  { id: 14, titleEn: "Chemical fill & cleaning agent preparation", titleZh: "\u6CE8\u5165\u5316\u5B66\u54C1\u53CA\u6E05\u6D17\u5242\u914D\u5236", party: "GERRYTECH", status: "locked", scheduledDate: "2026-03-15", actualDate: null, dependencies: [{ taskId: 13, type: "hard", description: "Utilities verified" }], lockedBy: 12, descriptionEn: "Fill tanks with specified cleaning agents per Process Recipe PR-429", descriptionZh: "\u6309\u5DE5\u827A\u914D\u65B9PR-429\u6CE8\u5165\u6E05\u6D17\u5242", deliverableEn: "Chemical Fill Record", deliverableZh: "\u5316\u5B66\u54C1\u6CE8\u5165\u8BB0\u5F55", assigneeEn: "GRT Process Engineer", assigneeZh: "\u6770\u745E\u5FB7\u5DE5\u827A\u5DE5\u7A0B\u5E08", durationHours: 4 },
  { id: 15, titleEn: "Dry run & motion test (no product)", titleZh: "\u7A7A\u8F7D\u8BD5\u8FD0\u884C\u4E0E\u8FD0\u52A8\u6D4B\u8BD5", party: "GERRYTECH", status: "locked", scheduledDate: "2026-03-16", actualDate: null, dependencies: [{ taskId: 14, type: "hard", description: "Chemicals filled" }, { taskId: 11, type: "hard", description: "Safety validated" }], lockedBy: 12, descriptionEn: "Run full machine cycle without parts: conveyor, spray, vacuum, blow-off", descriptionZh: "\u65E0\u4EA7\u54C1\u5168\u6D41\u7A0B\u8FD0\u884C: \u8F93\u9001\u3001\u55B7\u6DCB\u3001\u771F\u7A7A\u3001\u5439\u5E72", deliverableEn: "Dry Run Report", deliverableZh: "\u7A7A\u8F7D\u8BD5\u8FD0\u62A5\u544A", assigneeEn: "GRT Commissioning Lead", assigneeZh: "\u6770\u745E\u5FB7\u8C03\u8BD5\u7EC4\u957F", durationHours: 8 },
  { id: 16, titleEn: "Wet run with Chart sample parts", titleZh: "\u4F7F\u7528\u67E5\u7279\u6837\u4EF6\u8FDB\u884C\u6E7F\u8BD5", party: "JOINT", status: "locked", scheduledDate: "2026-03-17", actualDate: null, dependencies: [{ taskId: 15, type: "hard", description: "Dry run passed" }], lockedBy: 12, descriptionEn: "Process 20 sample parts, measure cleanliness with Chart QA team", descriptionZh: "\u8FD0\u884C20\u4EF6\u6837\u54C1\u3001\u4E0E\u67E5\u7279QA\u5171\u540C\u68C0\u6D4B\u6E05\u6D01\u5EA6", deliverableEn: "First Article Inspection Report", deliverableZh: "\u9996\u4EF6\u68C0\u9A8C\u62A5\u544A", assigneeEn: "GRT Process + Chart QA", assigneeZh: "\u6770\u745E\u5FB7\u5DE5\u827A + \u67E5\u7279QA", durationHours: 8 },
  { id: 17, titleEn: "Parameter optimization & recipe lock", titleZh: "\u53C2\u6570\u4F18\u5316\u4E0E\u914D\u65B9\u9501\u5B9A", party: "GERRYTECH", status: "locked", scheduledDate: "2026-03-18", actualDate: null, dependencies: [{ taskId: 16, type: "hard", description: "Wet run data" }], lockedBy: 12, descriptionEn: "Fine-tune spray pressure, temperature, cycle time; lock recipe in PLC", descriptionZh: "\u5FAE\u8C03\u55B7\u6DCB\u538B\u529B/\u6E29\u5EA6/\u5468\u671F; PLC\u9501\u5B9A\u914D\u65B9", deliverableEn: "Final Recipe Document", deliverableZh: "\u6700\u7EC8\u914D\u65B9\u6587\u4EF6", assigneeEn: "GRT Process Engineer", assigneeZh: "\u6770\u745E\u5FB7\u5DE5\u827A\u5DE5\u7A0B\u5E08", durationHours: 8 },
  { id: 18, titleEn: "Operator training (Chart production team)", titleZh: "\u64CD\u4F5C\u57F9\u8BAD (\u67E5\u7279\u751F\u4EA7\u56E2\u961F)", party: "JOINT", status: "locked", scheduledDate: "2026-03-19", actualDate: null, dependencies: [{ taskId: 17, type: "hard", description: "Parameters locked" }], lockedBy: 12, descriptionEn: "2-day hands-on training: operation, changeover, daily PM, troubleshooting", descriptionZh: "2\u5929\u5B9E\u64CD\u57F9\u8BAD: \u64CD\u4F5C/\u6362\u578B/\u65E5\u5E38\u4FDD\u517B/\u6545\u969C\u6392\u9664", deliverableEn: "Training Attendance + Exam Score", deliverableZh: "\u57F9\u8BAD\u7B7E\u5230 + \u8003\u8BD5\u6210\u7EE9", assigneeEn: "GRT Trainer + Chart Ops", assigneeZh: "\u6770\u745E\u5FB7\u57F9\u8BAD\u5E08 + \u67E5\u7279\u8FD0\u8425", durationHours: 16 },
  { id: 19, titleEn: "72-hour continuous run test", titleZh: "72\u5C0F\u65F6\u8FDE\u7EED\u8FD0\u884C\u6D4B\u8BD5", party: "JOINT", status: "locked", scheduledDate: "2026-03-21", actualDate: null, dependencies: [{ taskId: 18, type: "hard", description: "Training complete" }], lockedBy: 12, descriptionEn: "Uninterrupted 72h production run, Chart operators running machine, GRT monitoring", descriptionZh: "72\u5C0F\u65F6\u4E0D\u95F4\u65AD\u751F\u4EA7, \u67E5\u7279\u64CD\u4F5C\u5458\u8FD0\u884C, \u6770\u745E\u5FB7\u76D1\u63A7", deliverableEn: "72h Run Report + Cpk Data", deliverableZh: "72h\u8FD0\u884C\u62A5\u544A + Cpk\u6570\u636E", assigneeEn: "Chart Ops + GRT Monitor", assigneeZh: "\u67E5\u7279\u64CD\u4F5C + \u6770\u745E\u5FB7\u76D1\u63A7", durationHours: 72 },
  { id: 20, titleEn: "Final acceptance & SAT sign-off", titleZh: "\u6700\u7EC8\u9A8C\u6536\u4E0E SAT \u7B7E\u7F72", party: "JOINT", status: "locked", scheduledDate: "2026-03-24", actualDate: null, dependencies: [{ taskId: 19, type: "hard", description: "72h run passed" }], lockedBy: 12, descriptionEn: "Joint review of all deliverables, SAT protocol execution, formal sign-off", descriptionZh: "\u8054\u5408\u5BA1\u67E5\u6240\u6709\u4EA4\u4ED8\u7269\u3001\u6267\u884CSAT\u534F\u8BAE\u3001\u6B63\u5F0F\u7B7E\u7F72", deliverableEn: "SAT Certificate", deliverableZh: "SAT\u8BC1\u4E66", assigneeEn: "GRT Director + Chart VP Ops", assigneeZh: "\u6770\u745E\u5FB7\u603B\u76D1 + \u67E5\u7279VP", durationHours: 4 },
  { id: 21, titleEn: "Warranty handover & remote support activation", titleZh: "\u4FDD\u4FEE\u79FB\u4EA4\u4E0E\u8FDC\u7A0B\u652F\u6301\u6FC0\u6D3B", party: "GERRYTECH", status: "locked", scheduledDate: "2026-03-25", actualDate: null, dependencies: [{ taskId: 20, type: "hard", description: "SAT signed" }], lockedBy: 12, descriptionEn: "Activate 12-month warranty, configure IoT remote monitoring, handover spare parts kit", descriptionZh: "\u6FC0\u6D3B12\u4E2A\u6708\u4FDD\u4FEE\u3001\u914D\u7F6EIoT\u8FDC\u7A0B\u76D1\u63A7\u3001\u79FB\u4EA4\u5907\u4EF6\u5305", deliverableEn: "Warranty Certificate + IoT Access", deliverableZh: "\u4FDD\u4FEE\u8BC1\u4E66 + IoT\u8BBF\u95EE\u6743", assigneeEn: "GRT After-Sales", assigneeZh: "\u6770\u745E\u5FB7\u552E\u540E", durationHours: 4 },
];

const COPILOT_MESSAGES: ICopilotMessage[] = [
  {
    id: 1, type: "greeting", timestamp: "09:01 CT",
    textEn: "\u{1F44B} Good morning, Chart Management Team! The GERRYTECH service crew has successfully positioned the main unit and completed all electrical wiring \u2014 1 day ahead of schedule. Your team is doing a phenomenal job with site coordination.",
    textZh: "\u{1F44B} \u67E5\u7279\u7BA1\u7406\u56E2\u961F\u65E9\u4E0A\u597D\uFF01\u6770\u745E\u5FB7\u670D\u52A1\u56E2\u961F\u5DF2\u5B8C\u6210\u8BBE\u5907\u5B9A\u4F4D\u548C\u5168\u90E8\u7535\u6C14\u5E03\u7EBF\uFF0C\u6BD4\u8BA1\u5212\u63D0\u524D1\u5929\u3002\u60A8\u7684\u56E2\u961F\u73B0\u573A\u534F\u8C03\u505A\u5F97\u975E\u5E38\u51FA\u8272\u3002",
  },
  {
    id: 2, type: "alert", timestamp: "09:02 CT",
    textEn: "\u26A0\uFE0F Critical Path Attention: According to our joint schedule, we need your Facility Team to complete [Step 12: Utility Connection] today. Our GERRYTECH engineers are on standby for testing, but the system workflow is currently \u{1F6D1} blocked pending your action.",
    textZh: "\u26A0\uFE0F \u5173\u952E\u8DEF\u5F84\u63D0\u9192\uFF1A\u6309\u8054\u5408\u8BA1\u5212\uFF0C\u4ECA\u5929\u9700\u8981\u8D35\u65B9\u5382\u52A1\u56E2\u961F\u5B8C\u6210[\u6B65\u9AA412: \u516C\u7528\u5DE5\u7A0B\u63A5\u5165]\u3002\u6770\u745E\u5FB7\u5DE5\u7A0B\u5E08\u5DF2\u5C31\u4F4D\u7B49\u5F85\u6D4B\u8BD5\uFF0C\u4F46\u7CFB\u7EDF\u6D41\u7A0B\u5F53\u524D\u5904\u4E8E\u{1F6D1}\u9501\u5B9A\u72B6\u6001\u3002",
  },
  {
    id: 3, type: "action", timestamp: "09:03 CT",
    textEn: "\u{1F4A1} Agent Action: I have automatically drafted a reminder email attaching the utility spec sheet (480V/60Hz 3-phase, 6-bar CDA, DI water @ 2 GPM) to John Miller (Chart Facility Manager). Would you like me to send it now?",
    textZh: "\u{1F4A1} Agent \u64CD\u4F5C\uFF1A\u6211\u5DF2\u81EA\u52A8\u8D77\u8349\u4E00\u5C01\u9644\u5E26\u516C\u7528\u5DE5\u7A0B\u89C4\u683C\u4E66 (480V/60Hz\u4E09\u76F8\u3001 6bar CDA\u3001DI\u6C34 @ 2 GPM) \u7684\u50AC\u529E\u90AE\u4EF6\u53D1\u7ED9 John Miller\u3002\u662F\u5426\u7ACB\u5373\u53D1\u9001\uFF1F",
  },
];

// ═══════════════════════════════════════════════════════════
// Dual-Timezone Clock Hook
// ═══════════════════════════════════════════════════════════

function useDualClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fmt = (tz: string) =>
    now.toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });

  return { beijing: fmt("Asia/Shanghai"), usCentral: fmt("America/Chicago") };
}

// ═══════════════════════════════════════════════════════════
// Streaming Text Hook
// ═══════════════════════════════════════════════════════════

function useStreamText(text: string, speed: number = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); setDone(true); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return { displayed, done };
}

// ═══════════════════════════════════════════════════════════
// Copilot Streaming Message
// ═══════════════════════════════════════════════════════════

function CopilotStreamMsg({ msg, lang, delay }: { msg: ICopilotMessage; lang: ILanguage; delay: number }) {
  const text = lang === "en" ? msg.textEn : msg.textZh;
  const [visible, setVisible] = useState(false);
  const { displayed, done } = useStreamText(visible ? text : "", 12);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;

  const borderCls =
    msg.type === "alert" ? "border-l-red-500" :
    msg.type === "action" ? "border-l-amber-500" :
    msg.type === "greeting" ? "border-l-cyan-500" : "border-l-gray-600";

  return (
    <div className={cn("rounded-lg bg-slate-800/50 border border-slate-700/50 border-l-2 p-3 transition-all", borderCls)}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Bot className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] text-cyan-400 font-mono uppercase">Field Copilot</span>
        </div>
        <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
        {displayed}
        {!done && <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 animate-pulse" />}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function GlobalDeliverySandbox() {
  const [lang, setLang] = useState<ILanguage>("en");
  const [selectedTaskId, setSelectedTaskId] = useState<number>(12);
  const clock = useDualClock();

  const t = useCallback((en: string, zh: string) => lang === "en" ? en : zh, [lang]);

  const selectedTask = useMemo(() => TASKS.find(tk => tk.id === selectedTaskId) ?? TASKS[11], [selectedTaskId]);
  const completedCount = TASKS.filter(tk => tk.status === "completed").length;

  // Upload state for Step 12 — persisted via localStorage
  const [uploadDone, setUploadDone] = useState(() => lsGet("upload-done", false));
  const [uploadFiles, setUploadFiles] = useState<string[]>(() => lsGet("upload-files", []));
  const [uploadedAt, setUploadedAt] = useState<string | null>(() => lsGet("uploaded-at", null));
  const [signed, setSigned] = useState(() => lsGet("signed", false));
  const [signedAt, setSignedAt] = useState<string | null>(() => lsGet("signed-at", null));
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-200 overflow-hidden">

      {/* ═══ HEADER ═══ */}
      <header className="shrink-0 px-5 py-3 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400">{WO_CODE}</span>
                <span className="text-slate-600">|</span>
                <h1 className="text-sm font-bold text-slate-100">{t(PROJECT_EN, PROJECT_ZH)}</h1>
              </div>
              <p className="text-[10px] text-slate-500">
                {t("Global Joint-Delivery & Collaborative Acceptance Hub", "\u8DE8\u56FD\u8054\u5408\u4EA4\u4ED8\u4E0E\u534F\u540C\u9A8C\u6536\u4E2D\u5FC3")}
                {" \u00B7 "}{completedCount}/{TASKS.length} {t("steps complete", "\u6B65\u5DF2\u5B8C\u6210")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Dual timezone */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>{"\u{1F1E8}\u{1F1F3}"}</span>
                <span className="text-slate-400">Beijing</span>
                <span className="text-slate-200 font-mono font-bold">{clock.beijing}</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>{"\u{1F1FA}\u{1F1F8}"}</span>
                <span className="text-slate-400">US Central</span>
                <span className="text-slate-200 font-mono font-bold">{clock.usCentral}</span>
              </div>
            </div>

            {/* Language toggle */}
            <button
              onClick={() => setLang(prev => prev === "en" ? "zh" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/50 hover:border-slate-500 transition-colors"
            >
              <Languages className="h-3.5 w-3.5 text-slate-400" />
              <span className={cn("text-[10px] font-bold", lang === "en" ? "text-blue-400" : "text-slate-500")}>EN</span>
              <span className="text-slate-600">/</span>
              <span className={cn("text-[10px] font-bold", lang === "zh" ? "text-amber-400" : "text-slate-500")}>{"\u4E2D\u6587"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══ THREE-COLUMN BODY ═══ */}
      <div className="flex flex-1 min-h-0">

        {/* ══ LEFT 30%: Joint SOP Stepper ══ */}
        <aside className="w-[30%] min-w-[300px] border-r border-slate-700/50 bg-slate-900 overflow-y-auto">
          <div className="p-3 border-b border-slate-700/30 bg-slate-800/30 sticky top-0 z-10 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                {t("21-Step Joint SOP Timeline", "21\u6B65\u8054\u5408SOP\u65F6\u95F4\u7EBF")}
              </p>
              <div className="flex items-center gap-3 text-[9px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> GRT</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Chart</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Joint</span>
              </div>
            </div>
            {/* Mini progress bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(completedCount / TASKS.length) * 100}%` }} />
              </div>
              <span className="text-[10px] font-mono text-slate-400">{Math.round((completedCount / TASKS.length) * 100)}%</span>
            </div>
          </div>

          <div className="p-2 space-y-1">
            {TASKS.map(task => {
              const party = PARTY_STYLES[task.party];
              const status = STATUS_STYLES[task.status];
              const StatusIcon = status.icon;
              const isSelected = task.id === selectedTaskId;
              const isBlocked = task.lockedBy !== null;

              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={cn(
                    "w-full text-left rounded-lg p-2.5 border transition-all",
                    isSelected
                      ? `${party.bgCard} ${party.borderCard} ring-1 ring-offset-0`
                      : "border-transparent hover:bg-slate-800/40",
                    isSelected && task.party === "GERRYTECH" && "ring-blue-500/20",
                    isSelected && task.party === "CHART" && "ring-amber-500/20",
                    isSelected && task.party === "JOINT" && "ring-emerald-500/20",
                    task.status === "locked" && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Step number */}
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold font-mono shrink-0 border",
                      task.status === "completed" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                      task.status === "action_required" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                      task.status === "locked" ? "bg-slate-800 border-slate-700 text-slate-500" :
                      task.status === "in_progress" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" :
                      "bg-slate-800 border-slate-700 text-slate-400",
                    )}>
                      {task.id < 10 ? `0${task.id}` : task.id}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge className={cn("text-[8px] px-1 py-0 h-4", party.badgeBg, party.badgeText, `border-${task.party === "GERRYTECH" ? "blue" : task.party === "CHART" ? "amber" : "emerald"}-500/30`)}
                          style={{ borderColor: task.party === "GERRYTECH" ? "#3b82f640" : task.party === "CHART" ? "#f59e0b40" : "#10b98140" }}
                        >
                          {party.label}
                        </Badge>
                        <StatusIcon className={cn("h-3 w-3", status.cls.split(" ").find(c => c.startsWith("text-")))} />
                      </div>
                      <p className={cn("text-[11px] leading-snug", task.status === "locked" ? "text-slate-500" : "text-slate-200")}>
                        {t(task.titleEn, task.titleZh)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px]">
                        <span className="text-slate-500 font-mono">{task.scheduledDate.slice(5)}</span>
                        {task.actualDate && task.actualDate < task.scheduledDate && (
                          <span className="text-green-400">{t("Early", "\u63D0\u524D")}</span>
                        )}
                        {isBlocked && (
                          <span className="text-slate-500 flex items-center gap-0.5">
                            <Lock className="h-2.5 w-2.5" /> {t(`by #${task.lockedBy}`, `\u88AB #${task.lockedBy} \u9501\u5B9A`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ══ CENTER 45%: Execution Workspace ══ */}
        <main className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-900/50">

          {/* Dependency lockout banner */}
          {selectedTask.status === "locked" && selectedTask.lockedBy && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-300">
                  {t("Dependency Lock Active", "\u4F9D\u8D56\u9501\u5B9A\u751F\u6548\u4E2D")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {t(
                    `This task is blocked. Awaiting completion of Task #${selectedTask.lockedBy} before work can begin.`,
                    `\u6B64\u4EFB\u52A1\u5DF2\u88AB\u9501\u5B9A\u3002\u9700\u7B49\u5F85\u4EFB\u52A1 #${selectedTask.lockedBy} \u5B8C\u6210\u540E\u65B9\u53EF\u5F00\u59CB\u3002`,
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Active blocking alert — when viewing a task that blocks others */}
          {selectedTask.id === 12 && selectedTask.status === "action_required" && (
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-red-500/5 p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-300">
                    {t(
                      "\u26A0\uFE0F Dependency Alert: Tasks 13\u201321 are currently LOCKED",
                      "\u26A0\uFE0F \u4F9D\u8D56\u8B66\u62A5: \u4EFB\u52A1 13\u201321 \u5F53\u524D\u5DF2\u88AB\u9501\u5B9A",
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {t(
                      "Awaiting CHART TEAM to complete Task 12 (facility utility connection). GERRYTECH engineers are on standby for testing but the workflow is blocked.",
                      "\u7B49\u5F85\u67E5\u7279\u56E2\u961F\u5B8C\u6210\u4EFB\u52A1 12 (\u8BBE\u65BD\u516C\u7528\u5DE5\u7A0B\u63A5\u5165)\u3002\u6770\u745E\u5FB7\u5DE5\u7A0B\u5E08\u5DF2\u5C31\u4F4D\u7B49\u5F85\u6D4B\u8BD5\uFF0C\u4F46\u6D41\u7A0B\u88AB\u9501\u5B9A\u3002",
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Task detail card */}
          <div className={cn("rounded-xl border p-5", PARTY_STYLES[selectedTask.party].bgCard, PARTY_STYLES[selectedTask.party].borderCard)}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">
                    {t("Step", "\u6B65\u9AA4")} {selectedTask.id < 10 ? `0${selectedTask.id}` : selectedTask.id}
                  </span>
                  <Badge className={cn("text-[9px]", PARTY_STYLES[selectedTask.party].badgeBg, PARTY_STYLES[selectedTask.party].badgeText)}
                    style={{ borderColor: selectedTask.party === "GERRYTECH" ? "#3b82f640" : selectedTask.party === "CHART" ? "#f59e0b40" : "#10b98140" }}
                  >
                    {PARTY_STYLES[selectedTask.party].icon} {PARTY_STYLES[selectedTask.party].label} {t("Responsibility", "\u8D23\u4EFB")}
                  </Badge>
                  <Badge className={cn("text-[9px]", STATUS_STYLES[selectedTask.status].cls)}>
                    {t(STATUS_STYLES[selectedTask.status].label, STATUS_STYLES[selectedTask.status].labelZh)}
                  </Badge>
                </div>
                <h2 className="text-base font-bold text-slate-100">{t(selectedTask.titleEn, selectedTask.titleZh)}</h2>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                <p>{t("Scheduled", "\u8BA1\u5212")}: <span className="text-slate-200 font-mono">{selectedTask.scheduledDate}</span></p>
                {selectedTask.actualDate && <p className="text-green-400">{t("Actual", "\u5B9E\u9645")}: {selectedTask.actualDate}</p>}
                <p className="mt-1">{selectedTask.durationHours}h {t("est.", "\u9884\u4F30")}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {t(selectedTask.descriptionEn, selectedTask.descriptionZh)}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {t("Deliverable", "\u4EA4\u4ED8\u7269")}
                </p>
                <p className="text-xs text-slate-200">{t(selectedTask.deliverableEn, selectedTask.deliverableZh)}</p>
              </div>
              <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" /> {t("Assignee", "\u8D23\u4EFB\u4EBA")}
                </p>
                <p className="text-xs text-slate-200">{t(selectedTask.assigneeEn, selectedTask.assigneeZh)}</p>
              </div>
            </div>

            {/* Dependencies */}
            {selectedTask.dependencies.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/30">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                  {t("Dependencies", "\u4F9D\u8D56\u5173\u7CFB")}
                </p>
                <div className="space-y-1.5">
                  {selectedTask.dependencies.map(dep => {
                    const depTask = TASKS.find(tk => tk.id === dep.taskId);
                    const depDone = depTask?.status === "completed";
                    return (
                      <div key={dep.taskId} className="flex items-center gap-2 text-[11px]">
                        {depDone
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        }
                        <span className={depDone ? "text-slate-400 line-through" : "text-slate-200"}>
                          #{dep.taskId}: {depTask ? t(depTask.titleEn, depTask.titleZh) : dep.description}
                        </span>
                        <Badge className={cn("text-[8px]", dep.type === "hard" ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-slate-700 text-slate-400 border-slate-600")}>
                          {dep.type}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 12 Customer Interaction Area ── */}
          {selectedTask.id === 12 && selectedTask.status === "action_required" && (
            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-slate-900 to-amber-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-amber-200">
                  {t("Chart Site Manager \u2014 Action Required", "\u67E5\u7279\u73B0\u573A\u7ECF\u7406 \u2014 \u5F85\u64CD\u4F5C")}
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {t(
                  "Please upload photos of the completed 480V power disconnect, 6-bar compressed air connection, and DI water supply hookup based on Layout Diagram M-01. All three utilities must be verified before GERRYTECH can proceed with testing.",
                  "\u8BF7\u4E0A\u4F20\u5DF2\u5B8C\u6210\u7684 480V \u7535\u6E90\u65AD\u8DEF\u5668\u30016bar \u538B\u7F29\u7A7A\u6C14\u63A5\u53E3\u548C DI \u7EAF\u6C34\u63A5\u5165\u7684\u7167\u7247\uFF0C\u53C2\u7167\u5E03\u5C40\u56FE M-01\u3002\u4E09\u9879\u516C\u7528\u5DE5\u7A0B\u5747\u987B\u786E\u8BA4\u540E\u6770\u745E\u5FB7\u65B9\u53EF\u5F00\u59CB\u6D4B\u8BD5\u3002",
                )}
              </p>

              {/* Upload zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  const names = Array.from(files).map(f => f.name);
                  const ts = new Date().toISOString();
                  setUploadFiles(names);
                  setUploadedAt(ts);
                  setUploadDone(true);
                  lsSet("upload-done", true);
                  lsSet("upload-files", names);
                  lsSet("uploaded-at", ts);
                  toast.success(t("Files recorded successfully", "\u6587\u4EF6\u5DF2\u6210\u529F\u8BB0\u5F55"), {
                    description: `${names.length} ${t("photo(s)", "\u5F20\u7167\u7247")}: ${names.join(", ")}`,
                  });
                  e.target.value = "";
                }}
              />
              <div
                className={cn(
                  "rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer",
                  uploadDone
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-slate-600 bg-slate-800/30 hover:border-amber-500/40 hover:bg-amber-500/5",
                )}
                onClick={() => !uploadDone && fileInputRef.current?.click()}
              >
                {uploadDone ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-green-400" />
                    <p className="text-sm text-green-300 font-medium">
                      {t(`${uploadFiles.length || 3} Photo(s) Uploaded`, `${uploadFiles.length || 3} \u5F20\u7167\u7247\u5DF2\u4E0A\u4F20`)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {uploadFiles.length > 0 ? uploadFiles.join(", ") : "480V_disconnect.jpg, CDA_valve.jpg, DI_water_meter.jpg"}
                    </p>
                    {uploadedAt && (
                      <p className="text-[9px] text-slate-600">{new Date(uploadedAt).toLocaleString()}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-xl bg-slate-700/50 flex items-center justify-center">
                      <Camera className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-300 font-medium">
                      {t("Upload Facility Ready Proof", "\u4E0A\u4F20\u8BBE\u65BD\u5C31\u7EEA\u51ED\u8BC1\u7167")}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {t("Drag & drop photos or click to browse", "\u62D6\u653E\u7167\u7247\u6216\u70B9\u51FB\u6D4F\u89C8")}
                    </p>
                  </div>
                )}
              </div>

              {/* Utility checklist */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { en: "480V / 60Hz 3-Phase Power", zh: "480V/60Hz \u4E09\u76F8\u7535\u6E90", icon: Zap },
                  { en: "6-bar Compressed Dry Air", zh: "6bar \u538B\u7F29\u5E72\u71E5\u7A7A\u6C14", icon: Wifi },
                  { en: "DI Water Supply @ 2 GPM", zh: "DI\u7EAF\u6C34 @ 2 GPM", icon: Activity },
                ].map((util, i) => (
                  <label key={i} className="flex items-center gap-2 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <input type="checkbox" defaultChecked={uploadDone} className="w-4 h-4 rounded border-slate-600 accent-green-500" />
                    <util.icon className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-slate-300">{t(util.en, util.zh)}</span>
                  </label>
                ))}
              </div>

              {/* E-Sign button */}
              <button
                onClick={() => {
                  if (!uploadDone || signed) return;
                  // Confirmation dialog before signing
                  const confirmed = window.confirm(
                    t(
                      "Are you sure you want to e-sign this document as John Miller, Chart Facility Manager? This action will be recorded and cannot be undone.",
                      "\u786E\u8BA4\u4EE5 John Miller (Chart \u73B0\u573A\u7ECF\u7406) \u8EAB\u4EFD\u7535\u5B50\u7B7E\u7F72\u6B64\u6587\u4EF6\uFF1F\u6B64\u64CD\u4F5C\u5C06\u88AB\u8BB0\u5F55\u4E14\u4E0D\u53EF\u64A4\u9500\u3002",
                    ),
                  );
                  if (!confirmed) return;
                  const ts = new Date().toISOString();
                  setSigned(true);
                  setSignedAt(ts);
                  lsSet("signed", true);
                  lsSet("signed-at", ts);
                  lsSet("sign-record", {
                    signer: "John Miller",
                    role: "Chart Facility Manager",
                    timestamp: ts,
                    workOrder: WO_CODE,
                    taskId: 12,
                  });
                  toast.success(
                    t("Document signed successfully", "\u6587\u4EF6\u7B7E\u7F72\u6210\u529F"),
                    {
                      description: t(
                        `Signed by John Miller, Chart Facility Manager at ${new Date(ts).toLocaleString()}`,
                        `\u5DF2\u7531 John Miller (Chart \u73B0\u573A\u7ECF\u7406) \u4E8E ${new Date(ts).toLocaleString("zh-CN")} \u7B7E\u7F72`,
                      ),
                    },
                  );
                }}
                disabled={!uploadDone || signed}
                className={cn(
                  "w-full rounded-xl py-4 text-center font-bold transition-all border-2",
                  signed
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : uploadDone
                      ? "bg-green-600 border-green-500 text-white hover:bg-green-700 shadow-lg shadow-green-500/20 animate-pulse"
                      : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed",
                )}
              >
                {signed ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    {t("Signed by John Miller, Chart Facility Manager \u2014 ", "\u5DF2\u7531 John Miller \u7B7E\u7F72 \u2014 ")}
                    <span className="font-mono text-sm">{signedAt ? new Date(signedAt).toLocaleString() : new Date().toISOString().slice(0, 19).replace("T", " ")}</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 text-lg">
                    <Pen className="h-5 w-5" />
                    {t(
                      "I confirm facility is ready (Chart Site Manager E-Sign)",
                      "\u6211\u786E\u8BA4\u8BBE\u65BD\u5DF2\u5C31\u7EEA (Chart \u73B0\u573A\u7ECF\u7406\u7535\u5B50\u7B7E\u540D)",
                    )}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Completion card for completed tasks */}
          {selectedTask.status === "completed" && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-300">{t("Task Completed", "\u4EFB\u52A1\u5DF2\u5B8C\u6210")}</p>
                <p className="text-[11px] text-slate-400">
                  {t("Completed on", "\u5B8C\u6210\u65E5\u671F")}: <span className="font-mono text-green-400">{selectedTask.actualDate}</span>
                  {selectedTask.actualDate && selectedTask.actualDate < selectedTask.scheduledDate && (
                    <span className="ml-2 text-green-400">{t(" \u2014 Ahead of schedule!", " \u2014 \u63D0\u524D\u5B8C\u6210\uFF01")}</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ══ RIGHT 25%: Bilingual AI Field Copilot ══ */}
        <aside className="w-[25%] min-w-[280px] border-l border-slate-700/50 bg-slate-900 flex flex-col">
          <div className="p-3 border-b border-slate-700/30 bg-slate-800/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">{t("Bilingual Field Copilot", "\u53CC\u8BED\u73B0\u573A\u653F\u59D4")}</p>
                <p className="text-[9px] text-slate-500">{t("Bridging 12h timezone + language gap", "\u6D88\u9664 12 \u5C0F\u65F6\u65F6\u5DEE\u4E0E\u8BED\u8A00\u969C\u788D")}</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {COPILOT_MESSAGES.map((msg, idx) => (
              <CopilotStreamMsg key={msg.id} msg={msg} lang={lang} delay={idx * 1800} />
            ))}
          </div>

          {/* Quick action chips */}
          <div className="p-3 border-t border-slate-700/30 space-y-2">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{t("Quick Actions", "\u5FEB\u6377\u64CD\u4F5C")}</p>
            <div className="flex flex-wrap gap-2">
              {[
                { en: "View Spec Diagram", zh: "\u67E5\u770B\u89C4\u683C\u56FE", icon: Eye, toastEn: "Opening spec diagram for WO-US-429", toastZh: "\u6B63\u5728\u6253\u5F00 WO-US-429 \u89C4\u683C\u56FE" },
                { en: "Send Urgency Ping to Chart", zh: "\u53D1\u9001\u7D27\u6025\u50AC\u529E\u7ED9\u67E5\u7279", icon: Send, toastEn: "Urgency ping sent to John Miller (Chart Facility Mgr)", toastZh: "\u7D27\u6025\u50AC\u529E\u5DF2\u53D1\u9001\u7ED9 John Miller" },
                { en: "View Layout M-01", zh: "\u67E5\u770B\u5E03\u5C40\u56FE M-01", icon: FileText, toastEn: "Opening Layout Diagram M-01", toastZh: "\u6B63\u5728\u6253\u5F00\u5E03\u5C40\u56FE M-01" },
              ].map((chip, i) => (
                <button
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700/50 text-[10px] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
                  onClick={() => toast.info(t(chip.toastEn, chip.toastZh))}
                >
                  <chip.icon className="h-3 w-3" />
                  {t(chip.en, chip.zh)}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
