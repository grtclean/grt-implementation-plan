/**
 * 物料管理页面
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, Upload, Search, Edit2, Trash2, Package, AlertTriangle, XCircle, BarChart3 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function MaterialManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  const showPlaceholder = (featureName: string) => {
    toast({
      title: '功能完善中',
      description: `${featureName}功能正在开发完善中，敬请期待`,
    });
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
    <Layout>
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
            <Button size="sm">
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
                    ) : materialsData?.items && materialsData.items.length > 0 ? (
                      materialsData.items.map((material: any) => (
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
                              <Button variant="ghost" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          暂无物料数据
                        </TableCell>
                      </TableRow>
                    )}
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
                <Button>
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
                <Button className="w-full" onClick={() => showPlaceholder('导入物料')}>导入物料</Button>
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
    </div>
    </Layout>
  );
}
