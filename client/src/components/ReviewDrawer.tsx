import { useState, useEffect, useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2, AlertCircle, AlertTriangle, Loader2, FileCheck,
  User, Wrench, Zap, Shield, HeadphonesIcon, ShoppingCart,
  ClipboardCheck, TestTube, Cog,
} from "lucide-react";
import {
  M3_DIMENSIONS, M4_CARRIAGES, M5_REVIEW_CATEGORIES,
  type ReviewConclusion,
} from "../../../shared/stage-definitions";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileCheck, User, AlertTriangle, Wrench, Zap, Shield,
  HeadphonesIcon, ShoppingCart, ClipboardCheck, TestTube, Cog,
};

function resolveIcon(name: string) {
  return ICON_MAP[name] ?? FileCheck;
}

interface ReviewEntry {
  id: string;
  conclusion: ReviewConclusion;
  owner: string;
  risks: string;
  notes: string;
}

export interface ReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageCode: "M3" | "M4" | "M5";
  projectId: number;
  projectName: string;
}

const CONCLUSION_OPTIONS: {
  value: ReviewConclusion; label: string; color: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "PASS", label: "通过", color: "bg-green-500", Icon: CheckCircle2 },
  { value: "CONDITIONAL", label: "有条件通过", color: "bg-yellow-500", Icon: AlertCircle },
  { value: "FAIL", label: "不通过", color: "bg-red-500", Icon: AlertTriangle },
];

const STAGE_META: Record<string, { title: string; desc: string }> = {
  M3: { title: "M3 立项评审", desc: "项目立项与资源分配评审" },
  M4: { title: "M4 方案冻结 P1", desc: "设计评审与方案确认" },
  M5: { title: "M5 详细设计评审", desc: "机械/电气/软件详细设计评审" },
};

function getDimensions(stageCode: "M3" | "M4" | "M5") {
  if (stageCode === "M3")
    return M3_DIMENSIONS.map(d => ({ id: d.id, name: d.name, icon: d.icon, desc: d.description }));
  if (stageCode === "M4")
    return M4_CARRIAGES.map(c => ({ id: c.id, name: c.name, icon: c.icon, desc: c.color }));
  return M5_REVIEW_CATEGORIES.map(c => ({ id: c.id, name: c.name, icon: c.icon, desc: c.description }));
}

export default function ReviewDrawer({
  open, onOpenChange, stageCode, projectId, projectName,
}: ReviewDrawerProps) {
  const dimensions = useMemo(() => getDimensions(stageCode), [stageCode]);
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [activeTab, setActiveTab] = useState(dimensions[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReviews(dimensions.map(d => ({
        id: d.id, conclusion: "PASS" as ReviewConclusion,
        owner: "", risks: "", notes: "",
      })));
      setActiveTab(dimensions[0]?.id ?? "");
    }
  }, [open, stageCode, dimensions]);

  const submitM3 = trpc.pos.review.submitM3Review.useMutation();
  const submitM4 = trpc.pos.review.submitM4Review.useMutation();

  const updateField = (id: string, field: keyof ReviewEntry, value: string) => {
    setReviews(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const completedCount = reviews.filter(r => r.owner.trim() !== "").length;
  const progress = dimensions.length > 0 ? (completedCount / dimensions.length) * 100 : 0;

  const handleSubmit = async () => {
    const incomplete = reviews.filter(r => !r.owner.trim());
    if (incomplete.length > 0) {
      toast.error("请为所有评审项指定责任人");
      return;
    }
    setIsSubmitting(true);
    try {
      if (stageCode === "M3") {
        await submitM3.mutateAsync({
          projectId,
          reviews: reviews.map(r => ({
            dimensionId: r.id, conclusion: r.conclusion,
            owner: r.owner, risks: r.risks, notes: r.notes,
          })),
        });
      } else if (stageCode === "M4") {
        await submitM4.mutateAsync({
          projectId,
          carriages: reviews.map(r => ({
            carriageId: r.id, conclusion: r.conclusion,
            owner: r.owner, risks: r.risks, notes: r.notes,
          })) as never,
        });
      } else {
        toast.info("M5评审已记录（服务端待接入）");
        onOpenChange(false);
        return;
      }
      toast.success(stageCode + " 评审已提交");
      onOpenChange(false);
    } catch {
      toast.error("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const meta = STAGE_META[stageCode];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] sm:w-[800px] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {stageCode === "M4" && <span className="text-xl">🚂</span>}
            {meta.title}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {projectName} — {meta.desc}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Progress value={progress} className="flex-1" />
            <span className="text-sm font-medium whitespace-nowrap">
              {Math.round(progress)}%
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full"
              style={{ gridTemplateColumns:`repeat(${dimensions.length}, 1fr)` }}>{dimensions.map(dim => {
                const Icon = resolveIcon(dim.icon);
                return (
                  <TabsTrigger key={dim.id} value={dim.id}
                    className="flex items-center gap-1 text-xs">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline truncate">{dim.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {dimensions.map(dim => {
              const review = reviews.find(r => r.id === dim.id);
              if (!review) return null;
              const DimIcon = resolveIcon(dim.icon);
              return (
                <TabsContent key={dim.id} value={dim.id} className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DimIcon className="w-5 h-5" />
                    <h3 className="font-semibold">{dim.name}</h3>
                  </div>

                  <div>
                    <Label>评审结论 <span className="text-red-500">*</span></Label>
                    <Select value={review.conclusion}
                      onValueChange={v => updateField(dim.id, "conclusion", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONCLUSION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <opt.Icon className="w-4 h-4" />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>责任人 <span className="text-red-500">*</span></Label>
                    <Input className="mt-1" placeholder="输入责任人姓名"
                      value={review.owner}
                      onChange={e => updateField(dim.id, "owner", e.target.value)} />
                  </div>

                  <div>
                    <Label>风险与问题</Label>
                    <Textarea className="mt-1" placeholder="记录评审中发现的风险和问题..." rows={3}
                      value={review.risks}
                      onChange={e => updateField(dim.id, "risks", e.target.value)} />
                  </div>

                  <div>
                    <Label>评审备注</Label>
                    <Textarea className="mt-1" placeholder="其他备注信息..." rows={2}
                      value={review.notes}
                      onChange={e => updateField(dim.id, "notes", e.target.value)} />
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <SheetFooter className="shrink-0 border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              已完成 {completedCount}/{dimensions.length}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                提交评审
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
