/**
 * 机械设计页面 (TX-003)
 * 机械结构设计、图纸管理、设计变更
 */
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Cog, Plus, Upload, Building2, CheckCircle2, Clock, AlertTriangle, FileText } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "设计中": "blue",
  "已审核": "green",
  "审核中": "orange",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_DESIGNS = [
  { id: "MD-001", name: "清洗槽体结构设计", project: "缸体清洗线", status: "设计中", bu: "BU3", rev: "R3", engineer: "王工", progress: 75 },
  { id: "MD-002", name: "传送机构总装图", project: "变速箱清洗", status: "已审核", bu: "BU1", rev: "R1", engineer: "李工", progress: 100 },
  { id: "MD-003", name: "干燥室结构设计", project: "晶圆清洗", status: "审核中", bu: "BU4", rev: "R2", engineer: "张工", progress: 90 },
  { id: "MD-004", name: "框架结构优化", project: "柴油机清洗", status: "设计中", bu: "BU2", rev: "R1", engineer: "赵工", progress: 40 },
];

export default function MechanicalDesign() {
  const { currentBU } = useUserProfile();
  const [designs, setDesigns] = useState(MOCK_DESIGNS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", project: "", engineer: "" });

  const filtered = designs.filter(d => !currentBU || d.bu === currentBU);

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("请输入设计名称");
      return;
    }
    if (!formData.project.trim()) {
      toast.error("请输入所属项目");
      return;
    }
    if (!formData.engineer.trim()) {
      toast.error("请输入工程师");
      return;
    }

    const newId = `MD-${String(designs.length + 1).padStart(3, "0")}`;
    const newDesign = {
      id: newId,
      name: formData.name.trim(),
      project: formData.project.trim(),
      status: "设计中",
      bu: currentBU || "BU3",
      rev: "R1",
      engineer: formData.engineer.trim(),
      progress: 0,
    };

    setDesigns(prev => [newDesign, ...prev]);
    setShowCreateDialog(false);
    setFormData({ name: "", project: "", engineer: "" });
    toast.success("机械设计任务创建成功");
  };

  const handleUploadComingSoon = () => {
    toast.info("上传图纸功能开发中，敬请期待");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cog}
        title="机械设计"
        description="TX-003 · 机械结构设计与图纸管理"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />新建设计</Button>
            <Button variant="outline" onClick={handleUploadComingSoon}><Upload className="h-4 w-4 mr-2" />上传图纸</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="总设计任务" value={designs.length} />
        <StatCard icon={Clock} label="设计中" value={designs.filter(d => d.status === "设计中").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="审核中" value={designs.filter(d => d.status === "审核中").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={designs.filter(d => d.status === "已审核").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>设计任务列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{d.id}</span>
                    <Badge variant="outline">{d.bu}</Badge>
                    <Badge variant="secondary">{d.rev}</Badge>
                  </div>
                  <p className="font-medium mt-1">{d.name}</p>
                  <p className="text-sm text-muted-foreground">项目: {d.project} · 工程师: {d.engineer}</p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge color={statusColorMap[d.status as keyof typeof statusColorMap] ?? 'gray'}>{d.status}</StatusBadge>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${d.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{d.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Cog className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无设计任务</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建机械设计</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="md-name">设计名称 *</Label>
              <Input
                id="md-name"
                placeholder="例如：清洗槽体结构设计"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="md-project">所属项目 *</Label>
              <Input
                id="md-project"
                placeholder="例如：缸体清洗线"
                value={formData.project}
                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="md-engineer">工程师 *</Label>
              <Input
                id="md-engineer"
                placeholder="例如：王工"
                value={formData.engineer}
                onChange={e => setFormData(prev => ({ ...prev, engineer: e.target.value }))}
              />
            </div>
            {currentBU && (
              <div className="space-y-2">
                <Label>事业部</Label>
                <Input value={currentBU} disabled />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
