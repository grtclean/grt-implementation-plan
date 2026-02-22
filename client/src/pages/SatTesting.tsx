/**
 * SAT测试页面 (TX-014)
 * 现场验收测试、测试报告、缺陷跟踪
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
import { TestTube, Plus, Building2, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "测试中": "blue",
  "已通过": "green",
  "待测试": "slate",
  "有缺陷": "red",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_TESTS = [
  { id: "SAT-001", project: "缸体清洗线", customer: "上海大众", bu: "BU3", status: "测试中", passRate: 85, totalItems: 48, passed: 41, failed: 3, pending: 4 },
  { id: "SAT-002", project: "半导体清洗", customer: "英飞凌", bu: "BU4", status: "已通过", passRate: 100, totalItems: 32, passed: 32, failed: 0, pending: 0 },
  { id: "SAT-003", project: "商用车清洗", customer: "潍柴动力", bu: "BU2", status: "待测试", passRate: 0, totalItems: 36, passed: 0, failed: 0, pending: 36 },
];

export default function SatTesting() {
  const { currentBU } = useUserProfile();
  const [tests, setTests] = useState(MOCK_TESTS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ project: "", customer: "", totalItems: "" });

  const filtered = tests.filter(t => !currentBU || t.bu === currentBU);

  const handleCreate = () => {
    if (!formData.project.trim()) {
      toast.error("请输入项目名称");
      return;
    }
    if (!formData.customer.trim()) {
      toast.error("请输入客户名称");
      return;
    }
    if (!formData.totalItems || Number(formData.totalItems) <= 0) {
      toast.error("请输入有效的测试项数量");
      return;
    }

    const totalItems = Number(formData.totalItems);
    const newId = `SAT-${String(tests.length + 1).padStart(3, "0")}`;
    const newTest = {
      id: newId,
      project: formData.project.trim(),
      customer: formData.customer.trim(),
      bu: currentBU || "BU3",
      status: "待测试",
      passRate: 0,
      totalItems,
      passed: 0,
      failed: 0,
      pending: totalItems,
    };

    setTests(prev => [newTest, ...prev]);
    setShowCreateDialog(false);
    setFormData({ project: "", customer: "", totalItems: "" });
    toast.success("SAT测试计划创建成功");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TestTube}
        title="SAT测试"
        description="TX-014 · 现场验收测试管理"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />新建测试计划</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={TestTube} label="测试计划总数" value={tests.length} />
        <StatCard icon={Clock} label="测试中" value={tests.filter(t => t.status === "测试中").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="已通过" value={tests.filter(t => t.status === "已通过").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label="有缺陷" value={tests.filter(t => t.status === "有缺陷").length} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>SAT测试列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{t.id}</span>
                    <Badge variant="outline">{t.bu}</Badge>
                  </div>
                  <p className="font-medium mt-1">{t.project} - {t.customer}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />{t.passed}通过</span>
                    <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />{t.failed}失败</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" />{t.pending}待测</span>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge color={statusColorMap[t.status as keyof typeof statusColorMap] ?? "gray"}>{t.status}</StatusBadge>
                  <p className="text-lg font-bold mt-1">{t.passRate}%</p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <TestTube className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无测试计划</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建SAT测试计划</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sat-project">项目名称 *</Label>
              <Input
                id="sat-project"
                placeholder="例如：缸体清洗线"
                value={formData.project}
                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sat-customer">客户 *</Label>
              <Input
                id="sat-customer"
                placeholder="例如：上海大众"
                value={formData.customer}
                onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sat-total">测试项数量 *</Label>
              <Input
                id="sat-total"
                type="number"
                min="1"
                placeholder="例如：48"
                value={formData.totalItems}
                onChange={e => setFormData(prev => ({ ...prev, totalItems: e.target.value }))}
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
