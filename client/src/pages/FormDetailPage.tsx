/**
 * FormDetailPage — Routed page for viewing/filling a single M-phase form template
 *
 * URL: /form-directory/:id
 * Fetches template via oaForms.getTemplate({ id }) and renders UniversalDynamicForm
 */
import { useParams } from "wouter";
import { Link } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import UniversalDynamicForm from "@/components/UniversalDynamicForm";
import {
  ArrowLeft, Loader2, AlertCircle,
  Users, ClipboardList, PenTool, GitBranch, Lock,
  Ruler, Factory, Wrench, CheckSquare, Truck,
  Settings, ShieldCheck, Flag,
} from "lucide-react";

// ─── Stage Definitions (same as directory) ─────────────────

interface StageInfo {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  gradient: string;
}

const STAGES: StageInfo[] = [
  { id: "M0",  name: "商机识别",     icon: Users,        gradient: "from-blue-500 to-blue-600" },
  { id: "M1",  name: "需求确认",     icon: ClipboardList, gradient: "from-cyan-500 to-cyan-600" },
  { id: "M2",  name: "方案设计",     icon: PenTool,      gradient: "from-teal-500 to-teal-600" },
  { id: "M3",  name: "立项评审",     icon: GitBranch,    gradient: "from-green-500 to-green-600" },
  { id: "M4",  name: "方案冻结",     icon: Lock,         gradient: "from-emerald-500 to-emerald-600" },
  { id: "M5",  name: "详细设计",     icon: Ruler,        gradient: "from-lime-500 to-lime-600" },
  { id: "M6",  name: "采购制造",     icon: Factory,      gradient: "from-amber-500 to-amber-600" },
  { id: "M7",  name: "装配调试",     icon: Wrench,       gradient: "from-orange-500 to-orange-600" },
  { id: "M8",  name: "FAT验收",      icon: CheckSquare,  gradient: "from-red-500 to-red-600" },
  { id: "M9",  name: "发货安装",     icon: Truck,        gradient: "from-purple-500 to-purple-600" },
  { id: "M10", name: "现场调试",     icon: Settings,     gradient: "from-violet-500 to-violet-600" },
  { id: "M11", name: "SAT验收",      icon: ShieldCheck,  gradient: "from-indigo-500 to-indigo-600" },
  { id: "M12", name: "项目结项",     icon: Flag,         gradient: "from-gray-500 to-gray-600" },
];

function extractStage(code: string): string {
  const m = code.match(/^(M\d+)/i);
  return m ? m[1].toUpperCase() : "";
}

// ═══════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════

export default function FormDetailPage() {
  const { t, tpl } = useLanguage();
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const templateQuery = trpc.oaForms.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId },
  );

  const template = templateQuery.data;
  const fields = template ? (Array.isArray(template.fields) ? template.fields : []) : [];

  // Resolve stage info from template code
  const stageInfo = template?.templateCode
    ? STAGES.find((s) => s.id === extractStage(template.templateCode!)) || STAGES[0]
    : null;

  const handleSubmit = (values: Record<string, unknown>) => {
    toast.success(tpl("admin.formDetail.submitSuccess", { name: template?.templateName || t("admin.mPhaseForm.forms") }));
  };

  // ─── Loading ────────────────────────────────────────────
  if (templateQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f8] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0078d4]" />
          <span className="text-sm text-[#605e5c]">{t("admin.formDetail.loadingTemplate")}</span>
        </div>
      </div>
    );
  }

  // ─── Error / Not Found ──────────────────────────────────
  if (templateQuery.isError || !template) {
    return (
      <div className="min-h-screen bg-[#faf9f8] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#a4262c] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#323130] mb-2">{t("admin.formDetail.notFound")}</h2>
          <p className="text-sm text-[#605e5c] mb-4">
            {tpl("admin.formDetail.notFoundDesc", { id: templateId || "" })}
          </p>
          <Link
            href="/form-directory"
            className="inline-flex items-center gap-1.5 text-sm text-[#0078d4] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("admin.formDetail.backToDirectory")}
          </Link>
        </div>
      </div>
    );
  }

  const Icon = stageInfo?.icon || Users;

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Header */}
      <div className="bg-white border-b border-[#edebe9] px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3">
          <Link
            href="/form-directory"
            className="w-8 h-8 rounded-lg bg-[#f3f2f1] hover:bg-[#edebe9] flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-[#605e5c]" />
          </Link>
          {stageInfo && (
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stageInfo.gradient} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#323130]">{template.templateName}</h1>
              <span className="text-[10px] font-mono text-[#605e5c] bg-[#f3f2f1] px-1.5 py-0.5 rounded">
                {template.templateCode?.replace("_", "-")}
              </span>
            </div>
            <p className="text-xs text-[#605e5c]">
              {stageInfo ? `${stageInfo.id} ${stageInfo.name}` : ""} — {tpl("admin.formDetail.fieldsCount", { count: fields.length })}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 max-w-[1400px] mx-auto">
        <Link
          href="/form-directory"
          className="inline-flex items-center gap-1.5 text-sm text-[#0078d4] hover:underline mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("admin.formDetail.backToDirectory")}
        </Link>

        <div className="bg-white rounded-lg border border-[#edebe9] p-6">
          <UniversalDynamicForm
            fields={fields as any[]}
            onSubmit={handleSubmit}
            submitLabel={t("admin.formDetail.submitForm")}
            cancelLabel={t("admin.formDetail.backToDir")}
            onCancel={() => window.history.back()}
            showGroupHeaders={true}
          />
        </div>
      </div>
    </div>
  );
}
