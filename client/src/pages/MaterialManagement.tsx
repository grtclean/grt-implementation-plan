/**
 * 物料管理页面
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Download, Upload, Search, Edit2, Trash2, Package, AlertTriangle, XCircle, BarChart3 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface LocalMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  categoryCode: string;
  specificationCode: string;
  quantityOnHand: number;
  standardCost: number;
  status: string;
}

export default function MaterialManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  // 新增物料 Dialog 状态
  const [createOpen, setCreateOpen] = useState(false);
  const [formMaterialCode, setFormMaterialCode] = useState('');
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formCategoryCode, setFormCategoryCode] = useState('');
  const [formSpecificationCode, setFormSpecificationCode] = useState('');
  const [formQuantityOnHand, setFormQuantityOnHand] = useState('');
  const [formStandardCost, setFormStandardCost] = useState('');

  // 本地新增物料（无后端mutation时追加到本地）
  const [localMaterials, setLocalMaterials] = useState<LocalMaterial[]>([]);

  const resetForm = () => {
    setFormMaterialCode('');
    setFormMaterialName('');
    setFormCategoryCode('');
    setFormSpecificationCode('');
    setFormQuantityOnHand('');
    setFormStandardCost('');
  };

  const handleCreateSubmit = () => {
    if (!formMaterialCode || !formMaterialName) {
      toast({ title: '请填写必填项', description: '物料编码和物料名称为必填项', variant: 'destructive' });
      return;
    }
    const newMaterial: LocalMaterial = {
      id: `local_${Date.now()}`,
      materialCode: formMaterialCode,
      materialName: formMaterialName,
      categoryCode: formCategoryCode,
      specificationCode: formSpecificationCode,
      quantityOnHand: Number(formQuantityOnHand) || 0,
      standardCost: Number(formStandardCost) || 0,
      status: 'active',
    };
    setLocalMaterials((prev) => [newMaterial, ...prev]);
    setCreateOpen(false);
    resetForm();
    toast({ title: '新增成功', description: `物料 "${newMaterial.materialName}" 已添加` });
  };

  const handleDeleteMaterial = (material: LocalMaterial) => {
    setLocalMaterials((prev) => prev.filter((m) => m.id !== material.id));
    toast({ title: '已删除', description: `物料 "${material.materialName}" 已删除` });
  };

  // 获取物料列表
  const { data: materialsData, isLoading } = trpc.materials.getAllMaterials.useQuery({
    categoryCode: selectedCategory || undefined,
    page: 1,
    pageSize: 20,
  });

  // 获取物料分类
  const { data: categoriesData } = trpc.materials.getCategories.useQuery();

  // 获取库存统计
  const { data: statsData } = trpc.materials.getInventoryStats.useQuery();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Package}
        title="物料管理"
        description="管理工业清洗设备物料编码和库存"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新增物料
            </Button>
          </>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label="总物料数" value={statsData?.totalMaterials || 0} subtitle="活跃物料" iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="库存不足" value={statsData?.lowStockMaterials || 0} subtitle="需要补货" iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={XCircle} label="缺货物料" value={statsData?.outOfStockMaterials || 0} subtitle="紧急采购" iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={BarChart3} label="库存总值" value={`¥${(statsData?.totalInventoryValue || 0).toLocaleString()}`} subtitle="评估价值" iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      {/* 选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">物料列表</TabsTrigger>
          <TabsTrigger value="categories">物料分类</TabsTrigger>
          <TabsTrigger value="import">导入物料</TabsTrigger>
          <TabsTrigger value="coding">编码规则</TabsTrigger>
        </TabsList>

        {/* 物料列表标签页 */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>物料列表</CardTitle>
              <CardDescription>查看和管理所有物料信息</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 搜索和筛选 */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索物料编码或名称..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="选择物料分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部分类</SelectItem>
                    {categoriesData?.categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.categoryCode}>
                        {cat.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 物料表格 */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料编码</TableHead>
                      <TableHead>物料名称</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>库存</TableHead>
                      <TableHead>单价</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : (() => {
                      const serverItems: any[] = materialsData?.items ?? [];
                      const allItems = [...localMaterials, ...serverItems];
                      if (allItems.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              暂无物料数据
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return allItems.map((material: any) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-mono text-sm">{material.materialCode}</TableCell>
                          <TableCell>{material.materialName}</TableCell>
                          <TableCell>{material.categoryCode}</TableCell>
                          <TableCell>{material.specificationCode || '-'}</TableCell>
                          <TableCell>{material.quantityOnHand || 0}</TableCell>
                          <TableCell>¥{material.standardCost || 0}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              material.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {material.status === 'active' ? '活跃' : '停用'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toast({ title: '编辑物料', description: `正在编辑 "${material.materialName}"` })}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (String(material.id).startsWith('local_')) {
                                    handleDeleteMaterial(material as LocalMaterial);
                                  } else {
                                    toast({ title: '删除', description: `物料 "${material.materialName}" 删除功能即将上线` });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 物料分类标签页 */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>物料分类管理</CardTitle>
              <CardDescription>管理物料的分类体系</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => toast({ title: '功能即将上线', description: '新增分类功能即将上线' })}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增分类
                </Button>
                {/* 分类列表将在这里显示 */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 导入物料标签页 */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>导入物料</CardTitle>
              <CardDescription>从天思ERP或Excel导入物料数据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">拖拽文件到此处或点击选择</p>
                  <p className="text-xs text-muted-foreground">支持 Excel、CSV 格式</p>
                </div>
                <Button className="w-full" onClick={() => toast({ title: '功能即将上线', description: '导入功能即将上线' })}>导入物料</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 编码规则标签页 */}
        <TabsContent value="coding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>物料编码规则</CardTitle>
              <CardDescription>查看和管理物料编码体系</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-2">编码格式</h3>
                  <p className="text-sm text-muted-foreground font-mono">大类-中类-规格-序号</p>
                  <p className="text-sm text-muted-foreground mt-2">示例: UC-PMP-DN50-0001</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">物料大类</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• UC - 超声波清洗设备</div>
                    <div>• SP - 喷淋清洗设备</div>
                    <div>• VP - 真空清洗设备</div>
                    <div>• DG - 脱脂清洗设备</div>
                    <div>• PMP - 泵类</div>
                    <div>• VLV - 阀门</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 新增物料 Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增物料</DialogTitle>
            <DialogDescription>填写物料基本信息，物料编码和物料名称为必填项。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="materialCode">物料编码 *</Label>
              <Input
                id="materialCode"
                placeholder="如 UC-PMP-DN50-0001"
                value={formMaterialCode}
                onChange={(e) => setFormMaterialCode(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="materialName">物料名称 *</Label>
              <Input
                id="materialName"
                placeholder="如 离心泵 DN50"
                value={formMaterialName}
                onChange={(e) => setFormMaterialName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoryCode">分类编码</Label>
              <Input
                id="categoryCode"
                placeholder="如 PMP"
                value={formCategoryCode}
                onChange={(e) => setFormCategoryCode(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="specificationCode">规格编码</Label>
              <Input
                id="specificationCode"
                placeholder="如 DN50"
                value={formSpecificationCode}
                onChange={(e) => setFormSpecificationCode(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantityOnHand">库存数量</Label>
              <Input
                id="quantityOnHand"
                type="number"
                placeholder="0"
                value={formQuantityOnHand}
                onChange={(e) => setFormQuantityOnHand(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="standardCost">标准成本 (¥)</Label>
              <Input
                id="standardCost"
                type="number"
                placeholder="0.00"
                value={formStandardCost}
                onChange={(e) => setFormStandardCost(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>取消</Button>
            <Button onClick={handleCreateSubmit}>确认新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
