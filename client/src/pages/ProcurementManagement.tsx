/**
 * 采购管理页面
 */

import { useState } from 'react';
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, Search, Eye, Edit2, ShoppingCart } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function ProcurementManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  // 获取采购订单
  const { data: ordersData, isLoading: ordersLoading } = trpc.procurement.getPurchaseOrders.useQuery({
    status: selectedStatus || undefined,
    page: 1,
    pageSize: 20,
  });

  // 获取采购申请
  const { data: requestsData } = trpc.procurement.getPurchaseRequests.useQuery({
    page: 1,
    pageSize: 20,
  });

  // 获取供应商
  const { data: suppliersData } = trpc.procurement.getSuppliers.useQuery({
    page: 1,
    pageSize: 20,
  });

  // 获取采购统计
  const { data: statsData } = trpc.procurement.getProcurementStats.useQuery();

  return (
    <Layout>
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={ShoppingCart}
        title="采购管理"
        description="管理采购申请、订单和供应商"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              新建采购
            </Button>
          </>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">采购订单总额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{(statsData?.totalPOAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{statsData?.totalPOCount || 0} 个订单</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均订单金额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{(statsData?.averagePOAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">本月平均</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">准时交付率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.onTimeDeliveryRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">供应商表现</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">质量合格率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.qualityPassRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">收货检验</p>
          </CardContent>
        </Card>
      </div>

      {/* 选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">采购订单</TabsTrigger>
          <TabsTrigger value="requests">采购申请</TabsTrigger>
          <TabsTrigger value="suppliers">供应商管理</TabsTrigger>
          <TabsTrigger value="receipts">收货记录</TabsTrigger>
        </TabsList>

        {/* 采购订单标签页 */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>采购订单列表</CardTitle>
              <CardDescription>查看和管理所有采购订单</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 搜索和筛选 */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索订单号或供应商..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="选择订单状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部状态</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="sent">已发送</SelectItem>
                    <SelectItem value="confirmed">已确认</SelectItem>
                    <SelectItem value="received">已收货</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 订单表格 */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>供应商</TableHead>
                      <TableHead>物料</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>交付日期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : ordersData?.items && ordersData.items.length > 0 ? (
                      ordersData.items.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.poNumber}</TableCell>
                          <TableCell>{order.supplierName}</TableCell>
                          <TableCell>{order.materialName}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>¥{order.totalAmount?.toLocaleString()}</TableCell>
                          <TableCell>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              order.status === 'confirmed' 
                                ? 'bg-green-100 text-green-800' 
                                : order.status === 'sent'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          暂无采购订单
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 采购申请标签页 */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>采购申请列表</CardTitle>
              <CardDescription>查看待审批的采购申请</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                采购申请列表将在此显示
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 供应商管理标签页 */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>供应商管理</CardTitle>
              <CardDescription>管理供应商信息和评级</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="mb-4">
                <Plus className="w-4 h-4 mr-2" />
                新增供应商
              </Button>
              <div className="text-center py-8 text-muted-foreground">
                供应商列表将在此显示
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 收货记录标签页 */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>收货记录</CardTitle>
              <CardDescription>查看物料收货和质量检验记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                收货记录将在此显示
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
