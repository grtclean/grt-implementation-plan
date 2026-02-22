/**
 * 方案设计页面 (TX-002)
 * 清洗方案配置、3D布局、技术参数计算
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
import { Lightbulb, Plus, CheckCircle2, Clock, Building2, Layers, AlertTriangle } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "设计中": "blue",
  "已评审": "green",
  "修改中": "orange",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_SOLUTIONS = [
  { id: "SOL-001", project: "缸体清洗线", customer: "上海大众", status: "设计中", bu: "BU3", version: "V2.1", engineer: "王工" },
  { id: "SOL-002", project: "变速箱清洗方案", customer: "宝马慕尼黑", status: "已评审", bu: "BU1", version: "V1.0", engineer: "李工" },
  { id: "SOL-003", project: "晶圆清洗设备", customer: "英飞凌", status: "修改中", bu: "BU4", version: "V3.2", engineer: "张工" },
];

export default function SolutionDesign() {
  const { currentBU } = useUserProfile();
  const [solutions, setSolutions] = useState(MOCK_SOLUTIONS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ project: "", customer: "", engineer: "" });

  const filtered = solutions.filter(s => !currentBU || s.bu === currentBU);

  const handleCreate = () => {
    if (!formData.project.trim()) {
      toast.error("请输入项目名称");
      return;
    }
    if (!formData.customer.trim()) {
      toast.error("请输入客户名称");
      return;
    }
    if (!formData.engineer.trim()) {
      toast.error("请输入工程师");
      return;
    }

    const newId = `SOL-${String(solutions.length + 1).padStart(3, "0")}`;
    const newSolution = {
      id: newId,
      project: formData.project.trim(),
      customer: formData.customer.trim(),
      status: "设计中",
      bu: currentBU || "BU3",
      version: "V1.0",
      engineer: formData.engineer.trim(),
    };

    setSolutions(prev => [newSolution, ...prev]);
    setShowCreateDialog(false);
    setFormData({ project: "", customer: "", engineer: "" });
    toast.success("方案创建成功");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Lightbulb}
        title="方案设计"
        description="TX-002 · 清洗方案配置与技术评审"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />新建方案</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Clock} label="进行中方案" value={solutions.filter(s => s.status === "设计中").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="已通过评审" value={solutions.filter(s => s.status === "已评审").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label="待修改" value={solutions.filter(s => s.status === "修改中").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>方案列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(sol => (
              <div key={sol.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Layers className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{sol.id}</span>
                    <Badge variant="outline">{sol.bu}</Badge>
                    <Badge variant="secondary">{sol.version}</Badge>
                  </div>
                  <p className="font-medium mt-1">{sol.project}</p>
                  <p className="text-sm text-muted-foreground">客户: {sol.customer} · 工程师: {sol.engineer}</p>
                </div>
                <StatusBadge color={statusColorMap[sol.status as keyof typeof statusColorMap] ?? 'gray'}>
                  {sol.status}
                </StatusBadge>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无方案数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建方案</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sol-project">项目名称 *</Label>
              <Input
                id="sol-project"
                placeholder="例如：缸体清洗线"
                value={formData.project}
                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sol-customer">客户 *</Label>
              <Input
                id="sol-customer"
                placeholder="例如：上海大众"
                value={formData.customer}
                onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sol-engineer">工程师 *</Label>
              <Input
                id="sol-engineer"
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
