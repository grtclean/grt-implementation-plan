/**
 * 电气设计页面 (TX-004)
 * 电气控制系统设计、PLC程序、电气图纸管理
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
import { Zap, Plus, Building2, Cpu, CheckCircle2, Clock, AlertTriangle, FileText } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "编程中": "blue",
  "已完成": "green",
  "审核中": "orange",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_DESIGNS = [
  { id: "ED-001", name: "主控PLC程序设计", project: "缸体清洗线", status: "编程中", bu: "BU3", engineer: "陈工", progress: 60 },
  { id: "ED-002", name: "HMI界面开发", project: "变速箱清洗", status: "已完成", bu: "BU1", engineer: "周工", progress: 100 },
  { id: "ED-003", name: "电气原理图设计", project: "晶圆清洗", status: "审核中", bu: "BU4", engineer: "吴工", progress: 85 },
  { id: "ED-004", name: "IO分配表", project: "柴油机清洗", status: "编程中", bu: "BU2", engineer: "郑工", progress: 30 },
];

export default function ElectricalDesign() {
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

    const newId = `ED-${String(designs.length + 1).padStart(3, "0")}`;
    const newDesign = {
      id: newId,
      name: formData.name.trim(),
      project: formData.project.trim(),
      status: "编程中",
      bu: currentBU || "BU3",
      engineer: formData.engineer.trim(),
      progress: 0,
    };

    setDesigns(prev => [newDesign, ...prev]);
    setShowCreateDialog(false);
    setFormData({ name: "", project: "", engineer: "" });
    toast.success("电气设计任务创建成功");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Zap}
        title="电气设计"
        description="TX-004 · 电气控制系统设计与PLC编程"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />新建设计</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="总设计任务" value={designs.length} />
        <StatCard icon={Clock} label="编程中" value={designs.filter(d => d.status === "编程中").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="审核中" value={designs.filter(d => d.status === "审核中").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={designs.filter(d => d.status === "已完成").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>电气设计任务</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Cpu className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{d.id}</span>
                    <Badge variant="outline">{d.bu}</Badge>
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
                <Zap className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无设计任务</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建电气设计</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ed-name">设计名称 *</Label>
              <Input
                id="ed-name"
                placeholder="例如：主控PLC程序设计"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-project">所属项目 *</Label>
              <Input
                id="ed-project"
                placeholder="例如：缸体清洗线"
                value={formData.project}
                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-engineer">工程师 *</Label>
              <Input
                id="ed-engineer"
                placeholder="例如：陈工"
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
