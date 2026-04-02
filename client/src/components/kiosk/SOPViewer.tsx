import { useState, useEffect } from "react";
import { BookOpen, ClipboardCheck, Wrench, AlertTriangle, Loader2, ChevronDown, ChevronUp, Phone } from "lucide-react";
import { useKioskSessionContext } from "@/hooks/useKioskSession";

interface SOPViewerProps {
  projectId: string;
  processCode: string;
}

interface SOPStep {
  id: number;
  stepNumber: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  tools: string[];
  safetyWarning: string | null;
  imageUrl: string | null;
}

interface QualityCheckpoint {
  id: number;
  name: string;
  type: string;
  criteria: string;
  isMandatory: boolean;
}

interface SOPData {
  sop: { id: number; name: string; version: string; processCode: string; difficultyLevel: string } | null;
  steps: SOPStep[];
  checkpoints: QualityCheckpoint[];
}

type TabKey = "steps" | "quality" | "tools";

const CHECKPOINT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  visual_inspection: { label: "目视", color: "bg-blue-500/10 text-blue-400" },
  ccd_detection: { label: "CCD", color: "bg-purple-500/10 text-purple-400" },
  dimensional_check: { label: "尺寸", color: "bg-green-500/10 text-green-400" },
  functional_test: { label: "功能", color: "bg-orange-500/10 text-orange-400" },
  pressure_test: { label: "压力", color: "bg-red-500/10 text-red-400" },
  cleanliness_test: { label: "清洁", color: "bg-cyan-500/10 text-cyan-400" },
};

export default function SOPViewer({ projectId, processCode }: SOPViewerProps) {
  const session = useKioskSessionContext();
  const [data, setData] = useState<SOPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("steps");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    const fetchSOP = async () => {
      setLoading(true);
      try {
        const params = { json: { projectId: Number(projectId) || projectId, processCode } };
        const res = await fetch(
          "/api/trpc/kiosk.getStationSOP?input=" + encodeURIComponent(JSON.stringify(params)),
          { credentials: "include" }
        );
        const json = await res.json();
        setData(json?.result?.data?.json ?? json?.result?.data ?? null);
      } catch (err) {
        console.error("[Kiosk] Failed to fetch SOP:", err);
      }
      setLoading(false);
    };

    if (projectId && processCode) {
      fetchSOP();
    }
  }, [projectId, processCode]);

  // Extract unique tools from all steps
  const allTools = data?.steps
    ? [...new Set(data.steps.flatMap((s) => (Array.isArray(s.tools) ? s.tools : [])))]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* SOP Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        {data?.sop ? (
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm truncate">{data.sop.name}</h3>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                v{data.sop.version}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{processCode}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">SOP缺失，请联系工艺工程师</span>
          </div>
        )}
      </div>

      {/* Tab Selector */}
      <div className="flex-shrink-0 flex border-b border-border">
        {([
          { key: "steps" as TabKey, label: "操作步骤", icon: BookOpen },
          { key: "quality" as TabKey, label: "质量要求", icon: ClipboardCheck },
          { key: "tools" as TabKey, label: "工具清单", icon: Wrench },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors min-h-[48px] ${
              activeTab === key
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Steps Tab */}
        {activeTab === "steps" && (
          <div className="space-y-2">
            {(data?.steps || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无操作步骤</p>
            ) : (
              data!.steps.map((step) => (
                <div key={step.id} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors min-h-[48px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {step.stepNumber}
                      </span>
                      <span className="text-sm font-medium text-left">{step.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.estimatedMinutes > 0 && (
                        <span className="text-xs text-muted-foreground">{step.estimatedMinutes}min</span>
                      )}
                      {expandedStep === step.id ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedStep === step.id && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border/50">
                      {step.description && (
                        <p className="text-sm text-muted-foreground mt-2">{step.description}</p>
                      )}
                      {step.safetyWarning && (
                        <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2 text-yellow-400 text-xs">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{step.safetyWarning}</span>
                        </div>
                      )}
                      {Array.isArray(step.tools) && step.tools.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Wrench className="w-3 h-3 text-muted-foreground" />
                          {step.tools.map((tool, i) => (
                            <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">{tool}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === "quality" && (
          <div className="space-y-2">
            {(data?.checkpoints || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无质量检查点</p>
            ) : (
              data!.checkpoints.map((cp) => {
                const typeInfo = CHECKPOINT_TYPE_LABELS[cp.type] || { label: cp.type, color: "bg-muted text-muted-foreground" };
                return (
                  <div key={cp.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{cp.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    {cp.criteria && (
                      <p className="text-xs text-muted-foreground">{cp.criteria}</p>
                    )}
                    {cp.isMandatory && (
                      <span className="text-xs text-red-400 mt-1 inline-block">必检</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === "tools" && (
          <div className="space-y-2">
            {allTools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无工具清单</p>
            ) : (
              allTools.map((tool, i) => (
                <div key={i} className="flex items-center gap-3 border border-border rounded-lg p-3 min-h-[48px]">
                  <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{tool}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-border">
        <button
          onClick={() => alert("已呼叫班组长，请等待")}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors min-h-[48px]"
        >
          <Phone className="w-4 h-4" />
          无法理解？呼叫班组长
        </button>
      </div>
    </div>
  );
}
