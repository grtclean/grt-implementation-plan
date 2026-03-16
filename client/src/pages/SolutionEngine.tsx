/**
 * Solution Engine — 清洗工艺方案推演引擎页面
 *
 * 完整功能:
 * - P1: 创建/编辑技术需求
 * - P2: AI 方案推演与展示
 * - 确认并推入 M3
 */
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SolutionProposalUI } from '@/components/SolutionProposalUI';
import { BenchmarkProjectManager } from '@/components/BenchmarkProjectManager';
import {
  Beaker,
  FileText,
  Sparkles,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Factory,
  Droplets,
  Gauge,
  Target,
  ArrowLeft,
  History,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── 需求创建表单 ────────────────────────────────────────────

function RequirementForm({ onSuccess }: { onSuccess: (id: number) => void }) {
  const [formData, setFormData] = useState({
    workpieceName: '',
    workpieceNameEn: '',
    workpieceMaterial: '',
    customerName: '',
    projectNo: '',
    cycleTime: '',
    dailyCapacity: '',
    maxParticleSize: '',
    maxParticleCount: '',
    particleStandard: 'VDA 19.1',
    preferredCleaningType: 'COMBINATION' as const,
    specialRequirements: '',
  });

  const createMutation = trpc.solutionEngine.createRequirement.useMutation({
    onSuccess: (data) => {
      onSuccess(data.requirementId);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      workpieceName: formData.workpieceName,
      workpieceNameEn: formData.workpieceNameEn || undefined,
      workpieceMaterial: formData.workpieceMaterial || undefined,
      customerName: formData.customerName || undefined,
      projectNo: formData.projectNo || undefined,
      cycleTime: formData.cycleTime ? parseInt(formData.cycleTime) : undefined,
      dailyCapacity: formData.dailyCapacity ? parseInt(formData.dailyCapacity) : undefined,
      particleLimit: {
        maxParticleSize: formData.maxParticleSize ? parseFloat(formData.maxParticleSize) : undefined,
        maxParticleCount: formData.maxParticleCount ? parseInt(formData.maxParticleCount) : undefined,
        standard: formData.particleStandard,
      },
      preferredCleaningType: formData.preferredCleaningType,
      specialRequirements: formData.specialRequirements || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          基本信息
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              工件名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例: EV电机壳体"
              value={formData.workpieceName}
              onChange={(e) => setFormData({ ...formData, workpieceName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">英文名称</label>
            <Input
              placeholder="e.g., EV Motor Housing"
              value={formData.workpieceNameEn}
              onChange={(e) => setFormData({ ...formData, workpieceNameEn: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">工件材料</label>
            <Input
              placeholder="例: 铝合金 ADC12"
              value={formData.workpieceMaterial}
              onChange={(e) => setFormData({ ...formData, workpieceMaterial: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">客户名称</label>
            <Input
              placeholder="例: 某新能源汽车集团"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 清洁度要求 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          清洁度要求
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">最大颗粒物尺寸 (μm)</label>
            <Input
              type="number"
              placeholder="例: 500"
              value={formData.maxParticleSize}
              onChange={(e) => setFormData({ ...formData, maxParticleSize: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">最大颗粒物数量</label>
            <Input
              type="number"
              placeholder="例: 1000"
              value={formData.maxParticleCount}
              onChange={(e) => setFormData({ ...formData, maxParticleCount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">执行标准</label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-white"
              value={formData.particleStandard}
              onChange={(e) => setFormData({ ...formData, particleStandard: e.target.value })}
            >
              <option value="VDA 19.1">VDA 19.1</option>
              <option value="VDA 19.2">VDA 19.2</option>
              <option value="ISO 16232">ISO 16232</option>
              <option value="Custom">自定义标准</option>
            </select>
          </div>
        </div>
      </div>

      <Separator />

      {/* 产能要求 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          产能要求
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">节拍时间 (秒/件)</label>
            <Input
              type="number"
              placeholder="例: 60"
              value={formData.cycleTime}
              onChange={(e) => setFormData({ ...formData, cycleTime: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">日产能 (件/天)</label>
            <Input
              type="number"
              placeholder="例: 500"
              value={formData.dailyCapacity}
              onChange={(e) => setFormData({ ...formData, dailyCapacity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">偏好工艺</label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-white"
              value={formData.preferredCleaningType}
              onChange={(e) => setFormData({ ...formData, preferredCleaningType: e.target.value as typeof formData.preferredCleaningType })}
            >
              <option value="ULTRASONIC">超声波清洗</option>
              <option value="SPRAY">喷淋清洗</option>
              <option value="IMMERSION">浸泡清洗</option>
              <option value="COMBINATION">组合工艺</option>
            </select>
          </div>
        </div>
      </div>

      <Separator />

      {/* 特殊要求 */}
      <div>
        <label className="block text-sm text-slate-600 mb-1">特殊要求</label>
        <textarea
          className="w-full border rounded-md p-2 text-sm min-h-[80px]"
          placeholder="请输入其他特殊要求..."
          value={formData.specialRequirements}
          onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
        />
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={!formData.workpieceName || createMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {createMutation.isPending ? "创建中..." : "创建需求并生成方案"}
        </Button>
      </div>

      {createMutation.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {createMutation.error?.message || "创建失败"}
        </div>
      )}
    </form>
  );
}

// ─── 需求列表 ────────────────────────────────────────────

function RequirementList({ onSelect }: { onSelect: (id: number) => void }) {
  const { data: requirements, isLoading } = trpc.solutionEngine.listRequirements.useQuery({
    limit: 20,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!requirements?.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Beaker className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>暂无技术需求</p>
        <p className="text-sm">点击"新建需求"开始创建</p>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    DRAFT: { label: "草稿", variant: "secondary" },
    PENDING_REVIEW: { label: "待评审", variant: "outline" },
    APPROVED: { label: "已批准", variant: "default" },
    PROPOSAL_READY: { label: "方案已生成", variant: "default" },
    REJECTED: { label: "已驳回", variant: "destructive" },
  };

  return (
    <div className="space-y-3">
      {(requirements as Array<{
        id: number;
        project_no: string | null;
        customer_name: string | null;
        workpiece_name: string;
        workpiece_material: string | null;
        particle_limit: { maxParticleSize?: number; standard?: string } | null;
        cycle_time: number | null;
        status: string;
        created_at: string;
      }>).map((req) => (
        <Card
          key={req.id}
          className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
          onClick={() => onSelect(req.id)}
        >
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-800">{req.workpiece_name}</span>
                  <Badge variant={statusConfig[req.status]?.variant || 'secondary'}>
                    {statusConfig[req.status]?.label || req.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  {req.customer_name && <span>{req.customer_name}</span>}
                  {req.workpiece_material && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{req.workpiece_material}</span>
                  )}
                  {req.cycle_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {req.cycle_time}秒
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── 主页面组件 ────────────────────────────────────────────

export default function SolutionEngine() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'history' | 'proposal'>('list');
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(null);

  const handleRequirementCreated = (id: number) => {
    setSelectedRequirementId(id);
    setActiveTab('proposal');
  };

  const handleRequirementSelected = (id: number) => {
    setSelectedRequirementId(id);
    setActiveTab('proposal');
  };

  const handleBack = () => {
    setSelectedRequirementId(null);
    setActiveTab('list');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white border-0">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Beaker className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">清洗工艺方案推演引擎</h1>
                <p className="text-white/80">
                  Solution Engine · AI 驱动的工艺方案智能生成
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 方案推演视图 */}
        {activeTab === 'proposal' && selectedRequirementId ? (
          <div className="space-y-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              返回需求列表
            </Button>
            <SolutionProposalUI
              requirementId={selectedRequirementId}
              onPushToM3={(proposalId?: number) => {
                if (proposalId) {
                  setLocation(`/design-station-matrix?proposalId=${proposalId}`);
                } else {
                  handleBack();
                }
              }}
            />
          </div>
        ) : (
          /* 需求管理视图 */
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="list" className="gap-2">
                  <FileText className="w-4 h-4" />
                  需求列表
                </TabsTrigger>
                <TabsTrigger value="create" className="gap-2">
                  <Plus className="w-4 h-4" />
                  新建需求
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  历史项目
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">技术需求列表</CardTitle>
                  <CardDescription>
                    选择一个需求查看或生成 AI 工艺方案
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RequirementList onSelect={handleRequirementSelected} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    创建技术需求
                  </CardTitle>
                  <CardDescription>
                    填写客户技术需求后，AI 将自动生成工艺方案
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RequirementForm onSuccess={handleRequirementCreated} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    历史标杆项目管理
                  </CardTitle>
                  <CardDescription>
                    维护历史项目数据，供 AI 方案推演时检索参考
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BenchmarkProjectManager />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
