/**
 * BenchmarkProjectManager — 历史标杆项目管理组件
 *
 * 用于手动维护历史项目数据，供 AI 方案推演时检索参考
 */
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  Factory,
  Calendar,
  Building,
  FileText,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Search,
} from 'lucide-react';

// ─── 项目表单数据类型 ────────────────────────────────────────────

interface ProjectFormData {
  projectNo: string;
  customerName: string;
  workpiece: string;
  workpieceMaterial: string;
  cleaningType: string;
  equipmentModel: string;
  deliveryYear: string;
  cycleTime: string;
  particleSizeLimit: string;
  particleCountLimit: string;
  highlights: string;
  description: string;
}

const emptyFormData: ProjectFormData = {
  projectNo: '',
  customerName: '',
  workpiece: '',
  workpieceMaterial: '',
  cleaningType: 'COMBINATION',
  equipmentModel: '',
  deliveryYear: new Date().getFullYear().toString(),
  cycleTime: '',
  particleSizeLimit: '',
  particleCountLimit: '',
  highlights: '',
  description: '',
};

// ─── 项目表单组件 ────────────────────────────────────────────

function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<ProjectFormData>(initialData || emptyFormData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            项目编号 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="例: GRT-2024-001"
            value={formData.projectNo}
            onChange={(e) => setFormData({ ...formData, projectNo: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            客户名称 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="例: 某新能源汽车集团"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            清洗工件 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="例: EV电机壳体"
            value={formData.workpiece}
            onChange={(e) => setFormData({ ...formData, workpiece: e.target.value })}
            required
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
          <label className="block text-sm text-slate-600 mb-1">清洗工艺类型</label>
          <select
            className="w-full border rounded-md p-2 text-sm bg-white"
            value={formData.cleaningType}
            onChange={(e) => setFormData({ ...formData, cleaningType: e.target.value })}
          >
            <option value="ULTRASONIC">超声波清洗</option>
            <option value="SPRAY">喷淋清洗</option>
            <option value="IMMERSION">浸泡清洗</option>
            <option value="VACUUM_DRY">真空干燥</option>
            <option value="HOT_AIR_DRY">热风干燥</option>
            <option value="COMBINATION">组合工艺</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            设备型号 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="例: GRT-UC-5000"
            value={formData.equipmentModel}
            onChange={(e) => setFormData({ ...formData, equipmentModel: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            交付年份 <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            placeholder="例: 2024"
            value={formData.deliveryYear}
            onChange={(e) => setFormData({ ...formData, deliveryYear: e.target.value })}
            required
            min="2000"
            max="2030"
          />
        </div>
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
          <label className="block text-sm text-slate-600 mb-1">颗粒物尺寸限值 (μm)</label>
          <Input
            type="number"
            placeholder="例: 500"
            value={formData.particleSizeLimit}
            onChange={(e) => setFormData({ ...formData, particleSizeLimit: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">颗粒物数量限值</label>
          <Input
            type="number"
            placeholder="例: 1000"
            value={formData.particleCountLimit}
            onChange={(e) => setFormData({ ...formData, particleCountLimit: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">项目亮点 (逗号分隔)</label>
        <Input
          placeholder="例: 超低节拍时间, 高清洁度达标, 全自动化生产线"
          value={formData.highlights}
          onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">项目描述</label>
        <textarea
          className="w-full border rounded-md p-2 text-sm min-h-[80px]"
          placeholder="请输入项目详细描述..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="w-4 h-4 mr-1" />
          取消
        </Button>
        <Button
          type="submit"
          disabled={!formData.projectNo || !formData.customerName || !formData.workpiece || !formData.equipmentModel || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-1" />
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── 项目卡片组件 ────────────────────────────────────────────

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: {
    id: number;
    projectNo: string;
    customerName: string;
    workpiece: string;
    workpieceMaterial?: string;
    cleaningType?: string;
    equipmentModel: string;
    deliveryYear: number;
    cycleTime?: number;
    particleSizeLimit?: number;
    highlights?: string[];
    isActive: boolean;
  };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cleaningTypeLabels: Record<string, string> = {
    ULTRASONIC: '超声波清洗',
    SPRAY: '喷淋清洗',
    IMMERSION: '浸泡清洗',
    VACUUM_DRY: '真空干燥',
    HOT_AIR_DRY: '热风干燥',
    COMBINATION: '组合工艺',
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${!project.isActive ? 'opacity-60' : ''}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-slate-800 truncate">{project.workpiece}</span>
              <Badge variant="outline" className="shrink-0">
                {project.projectNo}
              </Badge>
              {!project.isActive && (
                <Badge variant="secondary" className="shrink-0">
                  已停用
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Building className="w-3 h-3" />
                {project.customerName}
              </div>
              <div className="flex items-center gap-1">
                <Factory className="w-3 h-3" />
                {project.equipmentModel}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {project.deliveryYear}年
              </div>
              {project.cleaningType && (
                <div className="text-xs bg-slate-100 px-2 py-0.5 rounded w-fit">
                  {cleaningTypeLabels[project.cleaningType] || project.cleaningType}
                </div>
              )}
            </div>
            {project.highlights && project.highlights.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {project.highlights.slice(0, 3).map((h, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {h}
                  </span>
                ))}
                {project.highlights.length > 3 && (
                  <span className="text-xs text-slate-400">+{project.highlights.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Pencil className="w-4 h-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 hover:bg-red-50">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 主组件 ────────────────────────────────────────────

export function BenchmarkProjectManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [deletingProject, setDeletingProject] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // 查询列表
  const { data: projectsRaw, isLoading, error } = trpc.solutionEngine.listBenchmarkProjects.useQuery(
    { limit: 50 },
    { placeholderData: (prev) => prev }
  );

  // Cast + client-side search filter (router doesn't support search param)
  const projects = (projectsRaw as Array<{
    id: number;
    project_no: string;
    customer_name: string;
    workpiece: string;
    workpiece_material?: string;
    cleaning_type?: string;
    equipment_model: string;
    delivery_year: number;
    cycle_time?: number;
    particle_standard?: string;
    highlights?: string[];
    is_active: boolean;
  }> | undefined)?.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.project_no?.toLowerCase().includes(term) ||
      p.customer_name?.toLowerCase().includes(term) ||
      p.workpiece?.toLowerCase().includes(term)
    );
  });

  // 查询单个项目（编辑时）
  const { data: editingDataRaw } = trpc.solutionEngine.getBenchmarkProject.useQuery(
    { id: editingProject! },
    { enabled: editingProject !== null }
  );
  const editingData = editingDataRaw as {
    project_no: string; customer_name: string; workpiece: string;
    workpiece_material?: string; cleaning_type?: string; equipment_model: string;
    delivery_year: number; cycle_time?: number; particle_size_limit?: number;
    particle_count_limit?: number; highlights?: string[]; description?: string;
  } | undefined;

  // 创建
  const createMutation = trpc.solutionEngine.createBenchmarkProject.useMutation({
    onSuccess: () => {
      utils.solutionEngine.listBenchmarkProjects.invalidate();
      setIsCreateDialogOpen(false);
    },
  });

  // 更新
  const updateMutation = trpc.solutionEngine.updateBenchmarkProject.useMutation({
    onSuccess: () => {
      utils.solutionEngine.listBenchmarkProjects.invalidate();
      setEditingProject(null);
    },
  });

  // 删除
  const deleteMutation = trpc.solutionEngine.deleteBenchmarkProject.useMutation({
    onSuccess: () => {
      utils.solutionEngine.listBenchmarkProjects.invalidate();
      setDeletingProject(null);
    },
  });

  type CleaningTypeEnum = 'ULTRASONIC' | 'SPRAY' | 'IMMERSION' | 'VACUUM_DRY' | 'COMBINATION' | 'OTHER';

  const handleCreate = (data: ProjectFormData) => {
    createMutation.mutate({
      projectNo: data.projectNo,
      customerName: data.customerName,
      workpiece: data.workpiece,
      workpieceMaterial: data.workpieceMaterial || undefined,
      cleaningType: (data.cleaningType as CleaningTypeEnum) || undefined,
      equipmentModel: data.equipmentModel,
      deliveryYear: parseInt(data.deliveryYear),
      cycleTime: data.cycleTime ? parseInt(data.cycleTime) : undefined,
      particleSizeLimit: data.particleSizeLimit ? parseFloat(data.particleSizeLimit) : undefined,
      particleCountLimit: data.particleCountLimit ? parseInt(data.particleCountLimit) : undefined,
      highlights: data.highlights ? data.highlights.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      notes: data.description || undefined,
    });
  };

  const handleUpdate = (data: ProjectFormData) => {
    if (!editingProject) return;
    updateMutation.mutate({
      id: editingProject,
      projectNo: data.projectNo,
      customerName: data.customerName,
      workpiece: data.workpiece,
      workpieceMaterial: data.workpieceMaterial || undefined,
      cleaningType: (data.cleaningType as CleaningTypeEnum) || undefined,
      equipmentModel: data.equipmentModel,
      deliveryYear: parseInt(data.deliveryYear),
      cycleTime: data.cycleTime ? parseInt(data.cycleTime) : undefined,
      particleSizeLimit: data.particleSizeLimit ? parseFloat(data.particleSizeLimit) : undefined,
      particleCountLimit: data.particleCountLimit ? parseInt(data.particleCountLimit) : undefined,
      highlights: data.highlights ? data.highlights.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      notes: data.description || undefined,
    });
  };

  const handleDelete = () => {
    if (!deletingProject) return;
    deleteMutation.mutate({ id: deletingProject });
  };

  // 转换编辑数据为表单格式 (DB returns snake_case column names)
  const editFormData: ProjectFormData | undefined = editingData
    ? {
        projectNo: editingData.project_no ?? '',
        customerName: editingData.customer_name ?? '',
        workpiece: editingData.workpiece ?? '',
        workpieceMaterial: editingData.workpiece_material || '',
        cleaningType: editingData.cleaning_type || 'COMBINATION',
        equipmentModel: editingData.equipment_model ?? '',
        deliveryYear: editingData.delivery_year?.toString() ?? '',
        cycleTime: editingData.cycle_time?.toString() || '',
        particleSizeLimit: editingData.particle_size_limit?.toString() || '',
        particleCountLimit: editingData.particle_count_limit?.toString() || '',
        highlights: Array.isArray(editingData.highlights) ? editingData.highlights.join(', ') : '',
        description: editingData.description || '',
      }
    : undefined;

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索项目编号、客户、工件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" />
          新增项目
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {error.message || '加载失败'}
        </div>
      )}

      {/* 项目列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !projects?.length ? (
        <div className="text-center py-12 text-slate-500">
          <Factory className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无历史标杆项目</p>
          <p className="text-sm">点击"新增项目"添加历史项目数据</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={{
                id: p.id,
                projectNo: p.project_no,
                customerName: p.customer_name,
                workpiece: p.workpiece,
                workpieceMaterial: p.workpiece_material,
                cleaningType: p.cleaning_type,
                equipmentModel: p.equipment_model,
                deliveryYear: p.delivery_year,
                cycleTime: p.cycle_time,
                highlights: p.highlights,
                isActive: p.is_active,
              }}
              onEdit={() => setEditingProject(p.id)}
              onDelete={() => setDeletingProject(p.id)}
            />
          ))}
        </div>
      )}

      {/* 创建对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              新增历史标杆项目
            </DialogTitle>
            <DialogDescription>
              添加历史项目数据，供 AI 方案推演时作为参考依据
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <ProjectForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createMutation.isPending}
          />
          {createMutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              {createMutation.error?.message || '创建失败'}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={editingProject !== null} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              编辑历史标杆项目
            </DialogTitle>
            <DialogDescription>
              修改项目信息
            </DialogDescription>
          </DialogHeader>
          <Separator />
          {editFormData && (
            <ProjectForm
              initialData={editFormData}
              onSubmit={handleUpdate}
              onCancel={() => setEditingProject(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
          {updateMutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              {updateMutation.error?.message || '更新失败'}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deletingProject !== null} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              确定要删除这个历史项目吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingProject(null)} disabled={deleteMutation.isPending}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
          {deleteMutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              {deleteMutation.error?.message || '删除失败'}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
