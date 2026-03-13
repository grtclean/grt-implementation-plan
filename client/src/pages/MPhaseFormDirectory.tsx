/**
 * M0-M12 Form Directory — 项目全生命周期表单目录
 *
 * Microsoft Fluent Design
 *
 * Layout:
 *   - Milestone accordion / grid (M0 ... M12)
 *   - Form cards under each milestone
 *   - Click card → navigate to /form-directory/:id (FormDetailPage)
 *   - Data loaded from oaForms.listTemplates (M-phase templates seeded by parse_forms.py)
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  FileText, ChevronDown, ChevronRight, Layers,
  Users, ClipboardList, PenTool, GitBranch, Lock,
  Ruler, Factory, Wrench, CheckSquare, Truck,
  Settings, ShieldCheck, Flag, Search,
  Loader2, X, BarChart3,
} from "lucide-react";

// ─── Stage Definitions ──────────────────────────────────────

interface StageInfo {
  id: string;
  name: string;
  nameEn: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
}

const STAGES: StageInfo[] = [
  { id: "M0",  name: "商机识别", nameEn: "Opportunity",    icon: Users,        color: "text-blue-600",    gradient: "from-blue-500 to-blue-600" },
  { id: "M1",  name: "需求确认", nameEn: "Requirements",   icon: ClipboardList, color: "text-cyan-600",    gradient: "from-cyan-500 to-cyan-600" },
  { id: "M2",  name: "方案设计", nameEn: "Solution Design", icon: PenTool,      color: "text-teal-600",    gradient: "from-teal-500 to-teal-600" },
  { id: "M3",  name: "立项评审", nameEn: "Project Approval", icon: GitBranch,   color: "text-green-600",   gradient: "from-green-500 to-green-600" },
  { id: "M4",  name: "方案冻结", nameEn: "Design Freeze",  icon: Lock,         color: "text-emerald-600", gradient: "from-emerald-500 to-emerald-600" },
  { id: "M5",  name: "详细设计", nameEn: "Detailed Design", icon: Ruler,       color: "text-lime-600",    gradient: "from-lime-500 to-lime-600" },
  { id: "M6",  name: "采购制造", nameEn: "Procurement",    icon: Factory,      color: "text-amber-600",   gradient: "from-amber-500 to-amber-600" },
  { id: "M7",  name: "装配调试", nameEn: "Assembly",       icon: Wrench,       color: "text-orange-600",  gradient: "from-orange-500 to-orange-600" },
  { id: "M8",  name: "FAT验收",  nameEn: "FAT",            icon: CheckSquare,  color: "text-red-600",     gradient: "from-red-500 to-red-600" },
  { id: "M9",  name: "发货安装", nameEn: "Shipping",       icon: Truck,        color: "text-purple-600",  gradient: "from-purple-500 to-purple-600" },
  { id: "M10", name: "现场调试", nameEn: "Site Commissioning", icon: Settings, color: "text-violet-600",  gradient: "from-violet-500 to-violet-600" },
  { id: "M11", name: "SAT验收",  nameEn: "SAT",            icon: ShieldCheck,  color: "text-indigo-600",  gradient: "from-indigo-500 to-indigo-600" },
  { id: "M12", name: "项目结项", nameEn: "Closure",        icon: Flag,         color: "text-gray-600",    gradient: "from-gray-500 to-gray-600" },
];

// ─── Helpers ────────────────────────────────────────────────

function extractStage(code: string): string {
  // Template code like "M0_1", "M12_2" → "M0", "M12"
  const m = code.match(/^(M\d+)/i);
  return m ? m[1].toUpperCase() : "";
}

// ─── Form Card Component ────────────────────────────────────

function FormCard({
  template,
  stageInfo,
  onClick,
}: {
  template: any;
  stageInfo: StageInfo;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const Icon = stageInfo.icon;
  const fields = Array.isArray(template.fields) ? template.fields : [];
  const groups = [...new Set(fields.map((f: any) => f.group).filter(Boolean))];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-[#edebe9] hover:border-[#0078d4] hover:shadow-md hover:scale-[1.01] transition-all p-4 group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stageInfo.gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-[#605e5c] bg-[#f3f2f1] px-1.5 py-0.5 rounded">
              {template.templateCode?.replace("_", "-")}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-[#323130] group-hover:text-[#0078d4] transition-colors truncate">
            {template.templateName}
          </h4>
          <p className="text-xs text-[#605e5c] mt-1 line-clamp-2">{template.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#a19f9d]">
            <span>{fields.length} {t("admin.mPhaseForm.fields")}</span>
            {groups.length > 0 && <span>{groups.length} {t("admin.mPhaseForm.groups")}</span>}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#c8c6c4] group-hover:text-[#0078d4] mt-1 flex-shrink-0" />
      </div>
    </button>
  );
}

// ─── Stage Section ──────────────────────────────────────────

function StageSection({
  stageInfo,
  templates,
  onSelectTemplate,
  defaultExpanded,
}: {
  stageInfo: StageInfo;
  templates: any[];
  onSelectTemplate: (t: any) => void;
  defaultExpanded: boolean;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = stageInfo.icon;

  return (
    <div className="bg-white rounded-lg border border-[#edebe9] overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#faf9f8] transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stageInfo.gradient} flex items-center justify-center`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-[#323130]">{stageInfo.id}</span>
            <span className="text-sm text-[#605e5c]">{stageInfo.name}</span>
            <span className="text-xs text-[#a19f9d]">{stageInfo.nameEn}</span>
          </div>
        </div>
        <span className="text-xs text-[#605e5c] bg-[#f3f2f1] px-2 py-0.5 rounded-full">
          {templates.length} {t("admin.mPhaseForm.forms")}
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[#605e5c]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#605e5c]" />
        )}
      </button>

      {/* Cards Grid */}
      {expanded && (
        <div className="px-5 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {templates.map((t: any) => (
            <FormCard
              key={t.id || t.templateCode}
              template={t}
              stageInfo={stageInfo}
              onClick={() => onSelectTemplate(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════

export default function MPhaseFormDirectory() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();

  // Load all templates from oaForms
  const templatesQuery = trpc.oaForms.listTemplates.useQuery(
    { activeOnly: true },
  );

  // Group templates by stage
  const { stageTemplates, totalForms, totalFields } = useMemo(() => {
    const raw = templatesQuery.data;
    const allTemplates: any[] = Array.isArray(raw) ? raw : (raw?.items || []);

    // Filter M-phase templates (templateCode starts with M\d+)
    const mTemplates = allTemplates.filter(
      (t: any) => t.templateCode && /^M\d+/i.test(t.templateCode),
    );

    // Apply search filter
    const filtered = searchTerm
      ? mTemplates.filter(
          (t: any) =>
            t.templateName?.includes(searchTerm) ||
            t.templateCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description?.includes(searchTerm),
        )
      : mTemplates;

    // Group by stage
    const grouped = new Map<string, any[]>();
    for (const t of filtered) {
      const stage = extractStage(t.templateCode || "");
      if (!stage) continue;
      if (!grouped.has(stage)) grouped.set(stage, []);
      grouped.get(stage)!.push(t);
    }

    let fieldCount = 0;
    for (const t of mTemplates) {
      fieldCount += Array.isArray(t.fields) ? (t.fields as any[]).length : 0;
    }

    return {
      stageTemplates: grouped,
      totalForms: mTemplates.length,
      totalFields: fieldCount,
    };
  }, [templatesQuery.data, searchTerm]);

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Header */}
      <div className="bg-white border-b border-[#edebe9] px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0078d4] to-[#106ebe] flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[#323130]">{t("admin.mPhaseForm.title")}</h1>
          <span className="text-xs text-[#605e5c] bg-[#f3f2f1] px-2 py-0.5 rounded">
            Form Directory
          </span>
        </div>
        <p className="text-xs text-[#a19f9d] ml-11">
          {t("admin.mPhaseForm.subtitle")}
        </p>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto">
          <div className="space-y-4">
            {/* Stats + Search Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-[#605e5c]">
                  <FileText className="w-4 h-4" />
                  <span className="font-semibold text-[#323130]">{totalForms}</span> {t("admin.mPhaseForm.forms")}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#605e5c]">
                  <BarChart3 className="w-4 h-4" />
                  <span className="font-semibold text-[#323130]">{totalFields}</span> {t("admin.mPhaseForm.fields")}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#605e5c]">
                  <Layers className="w-4 h-4" />
                  <span className="font-semibold text-[#323130]">13</span> {t("admin.mPhaseForm.stages")}
                </div>
              </div>

              {/* Search */}
              <div className="flex-1 sm:max-w-sm ml-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
                <input
                  className="w-full pl-9 pr-8 py-2 bg-[#f3f2f1] rounded-md text-sm text-[#323130] placeholder:text-[#a19f9d] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0078d4] border border-transparent focus:border-[#0078d4]"
                  placeholder={t("admin.mPhaseForm.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="w-4 h-4 text-[#a19f9d] hover:text-[#605e5c]" />
                  </button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {templatesQuery.isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#0078d4]" />
                <span className="ml-3 text-sm text-[#605e5c]">{t("admin.mPhaseForm.loadingTemplates")}</span>
              </div>
            )}

            {/* Empty State — No M-phase templates found */}
            {!templatesQuery.isLoading && totalForms === 0 && (
              <div className="text-center py-20 bg-white rounded-lg border border-[#edebe9]">
                <Layers className="w-16 h-16 mx-auto text-[#c8c6c4] mb-4" />
                <h3 className="text-lg font-semibold text-[#323130] mb-2">{t("admin.mPhaseForm.noFormsTitle")}</h3>
                <p className="text-sm text-[#605e5c] mb-4">
                  {t("admin.mPhaseForm.noFormsDesc").split("{command}")[0]}<code className="bg-[#f3f2f1] px-2 py-0.5 rounded text-xs font-mono">npx tsx scripts/seed_m_forms.ts</code>{t("admin.mPhaseForm.noFormsDesc").split("{command}")[1] || ""}
                </p>
              </div>
            )}

            {/* Stage Sections */}
            {!templatesQuery.isLoading &&
              STAGES.map((stage) => {
                const templates = stageTemplates.get(stage.id) || [];
                if (templates.length === 0 && searchTerm) return null;
                if (templates.length === 0) {
                  // Show empty placeholder for stages without templates
                  return (
                    <div key={stage.id} className="bg-white rounded-lg border border-[#edebe9] px-5 py-3.5 flex items-center gap-3 opacity-50">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stage.gradient} flex items-center justify-center`}>
                        <stage.icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className="text-base font-semibold text-[#323130]">{stage.id}</span>
                      <span className="text-sm text-[#605e5c]">{stage.name}</span>
                      <span className="text-xs text-[#a19f9d] ml-auto">{t("admin.mPhaseForm.noForms")}</span>
                    </div>
                  );
                }
                return (
                  <StageSection
                    key={stage.id}
                    stageInfo={stage}
                    templates={templates}
                    onSelectTemplate={(t: any) => navigate(`/form-directory/${t.id}`)}
                    defaultExpanded={stage.id === "M0" || stage.id === "M3" || stage.id === "M6"}
                  />
                );
              })}
          </div>
      </div>
    </div>
  );
}
