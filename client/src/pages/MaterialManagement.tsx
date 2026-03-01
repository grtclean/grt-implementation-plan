/**
 * 物料管理页面
 * Wired to real tRPC mutations (materials.createMaterial, materials.deleteMaterial)
 */

import { useState } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
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

export default function MaterialManagement() {
  const { t, tpl } = useLanguage();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formCategoryCode, setFormCategoryCode] = useState('');
  const [formSpecificationCode, setFormSpecificationCode] = useState('');
  const [formStandardCost, setFormStandardCost] = useState('');
  const [formMaterialType, setFormMaterialType] = useState<string>('component');

  const resetForm = () => {
    setFormMaterialName('');
    setFormCategoryCode('');
    setFormSpecificationCode('');
    setFormStandardCost('');
    setFormMaterialType('component');
  };

  // ── Queries ──
  const utils = trpc.useUtils();

  const { data: materialsData, isLoading } = trpc.materials.getAllMaterials.useQuery({
    categoryCode: selectedCategory || undefined,
    page: 1,
    pageSize: 20,
  }, { retry: false, throwOnError: false });

  const { data: categoriesData } = trpc.materials.getCategories.useQuery(undefined, { retry: false, throwOnError: false });

  const { data: statsData } = trpc.materials.getInventoryStats.useQuery(undefined, { retry: false, throwOnError: false });

  // ── Mutations ──
  const createMutation = trpc.materials.createMaterial.useMutation({
    onSuccess: (data: any) => {
      utils.materials.getAllMaterials.invalidate();
      utils.materials.getInventoryStats.invalidate();
      setCreateOpen(false);
      resetForm();
      toast({ title: t("supply.material.addSuccess"), description: tpl("supply.material.materialAdded", { name: data?.materialName ?? '' }) });
    },
    onError: (err: any) => {
      toast({ title: t("supply.material.fillRequired"), description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.materials.deleteMaterial.useMutation({
    onSuccess: () => {
      utils.materials.getAllMaterials.invalidate();
      utils.materials.getInventoryStats.invalidate();
    },
    onError: (err: any) => {
      toast({ title: t("supply.material.deleteTitle"), description: err.message, variant: 'destructive' });
    },
  });

  const handleCreateSubmit = () => {
    if (!formMaterialName || !formCategoryCode) {
      toast({ title: t("supply.material.fillRequired"), description: t("supply.material.codeNameRequired"), variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      materialName: formMaterialName,
      categoryCode: formCategoryCode,
      specificationCode: formSpecificationCode || undefined,
      materialType: formMaterialType as any,
      standardCost: formStandardCost ? Number(formStandardCost) : undefined,
    });
  };

  const handleDeleteMaterial = (material: any) => {
    if (typeof material.id === 'number') {
      deleteMutation.mutate({ id: material.id });
      toast({ title: t("supply.material.deleted"), description: tpl("supply.material.materialDeleted", { name: material.materialName }) });
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Package}
        title={t("supply.material.pageTitle")}
        description={t("supply.material.pageDesc")}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t("supply.material.export")}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("supply.material.addMaterial")}
            </Button>
          </>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label={t("supply.material.totalMaterials")} value={statsData?.totalMaterials || 0} subtitle={t("supply.material.activeMaterials")} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label={t("supply.material.lowStock")} value={statsData?.lowStockMaterials || 0} subtitle={t("supply.material.needReorder")} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={XCircle} label={t("supply.material.outOfStock")} value={statsData?.outOfStockMaterials || 0} subtitle={t("supply.material.urgentPurchase")} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={BarChart3} label={t("supply.material.inventoryValue")} value={`¥${(statsData?.totalInventoryValue || 0).toLocaleString()}`} subtitle={t("supply.material.estimatedValue")} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      {/* 选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">{t("supply.material.tabMaterialList")}</TabsTrigger>
          <TabsTrigger value="categories">{t("supply.material.tabCategories")}</TabsTrigger>
          <TabsTrigger value="import">{t("supply.material.tabImport")}</TabsTrigger>
          <TabsTrigger value="coding">{t("supply.material.tabCodingRules")}</TabsTrigger>
        </TabsList>

        {/* 物料列表标签页 */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.material.tabMaterialList")}</CardTitle>
              <CardDescription>{t("supply.material.materialListDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 搜索和筛选 */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("supply.material.searchMaterial")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory || "__all__"} onValueChange={(v) => setSelectedCategory(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("supply.material.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("supply.material.allCategories")}</SelectItem>
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
                      <TableHead>{t("supply.material.colMaterialCode")}</TableHead>
                      <TableHead>{t("supply.material.colMaterialName")}</TableHead>
                      <TableHead>{t("supply.material.colCategory")}</TableHead>
                      <TableHead>{t("supply.material.colSpec")}</TableHead>
                      <TableHead>{t("supply.material.colStock")}</TableHead>
                      <TableHead>{t("supply.material.colUnitPrice")}</TableHead>
                      <TableHead>{t("supply.material.colStatus")}</TableHead>
                      <TableHead>{t("supply.material.colOperation")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t("supply.common.loading")}
                        </TableCell>
                      </TableRow>
                    ) : (() => {
                      const allItems: any[] = materialsData?.items ?? [];
                      if (allItems.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              {t("supply.material.noMaterialData")}
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
                              {material.status === 'active' ? t("supply.material.statusActive") : t("supply.material.statusInactive")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toast({ title: t("supply.material.editMaterial"), description: tpl("supply.material.editingMaterial", { name: material.materialName }) })}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMaterial(material)}
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
              <CardTitle>{t("supply.material.categoryManagement")}</CardTitle>
              <CardDescription>{t("supply.material.categoryManagementDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => toast({ title: t("supply.material.comingSoon"), description: t("supply.material.addCategoryComingSoon") })}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("supply.material.addCategory")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 导入物料标签页 */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.material.tabImport")}</CardTitle>
              <CardDescription>{t("supply.material.importDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">{t("supply.material.dropFilesHere")}</p>
                  <p className="text-xs text-muted-foreground">{t("supply.material.supportedFormats")}</p>
                </div>
                <Button className="w-full" onClick={() => toast({ title: t("supply.material.comingSoon"), description: t("supply.material.importComingSoon") })}>{t("supply.material.importMaterials")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 编码规则标签页 */}
        <TabsContent value="coding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.material.codingRules")}</CardTitle>
              <CardDescription>{t("supply.material.codingRulesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-2">{t("supply.material.codingFormat")}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{t("supply.material.codingPattern")}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t("supply.material.codingExample")}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">{t("supply.material.majorCategories")}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• UC - {t("supply.material.catUltrasonic")}</div>
                    <div>• SP - {t("supply.material.catSpray")}</div>
                    <div>• VP - {t("supply.material.catVacuum")}</div>
                    <div>• DG - {t("supply.material.catDegrease")}</div>
                    <div>• PMP - {t("supply.material.catPump")}</div>
                    <div>• VLV - {t("supply.material.catValve")}</div>
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
            <DialogTitle>{t("supply.material.addMaterial")}</DialogTitle>
            <DialogDescription>{t("supply.material.addMaterialDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="materialName">{t("supply.material.colMaterialName")} *</Label>
              <Input
                id="materialName"
                value={formMaterialName}
                onChange={(e) => setFormMaterialName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoryCode">{t("supply.material.colCategory")} *</Label>
              <Input
                id="categoryCode"
                placeholder="PMP"
                value={formCategoryCode}
                onChange={(e) => setFormCategoryCode(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="materialType">{t("supply.material.colSpec")}</Label>
              <Select value={formMaterialType} onValueChange={setFormMaterialType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="component">Component</SelectItem>
                  <SelectItem value="part">Part</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                  <SelectItem value="chemical">Chemical</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="specificationCode">{t("supply.material.colSpec")}</Label>
              <Input
                id="specificationCode"
                placeholder="DN50"
                value={formSpecificationCode}
                onChange={(e) => setFormSpecificationCode(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="standardCost">{t("supply.material.standardCost")}</Label>
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
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>{t("supply.common.cancel")}</Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? t("supply.common.loading") : t("supply.material.confirmAdd")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
