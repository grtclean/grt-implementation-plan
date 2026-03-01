/**
 * 采购管理页面
 */

import { useState } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, Search, Eye, Edit2, ShoppingCart } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { ListPageSkeleton } from "@/components/PageSkeleton";

export default function ProcurementManagement() {
  const { t, tpl } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  // 获取采购订单
  const { data: ordersData, isLoading: ordersLoading } = trpc.procurement.getPurchaseOrders.useQuery({
    status: selectedStatus || undefined,
    page: 1,
    pageSize: 20,
  }, { retry: false, throwOnError: false });

  // 获取采购申请
  const { data: requestsData } = trpc.procurement.getPurchaseRequests.useQuery({
    page: 1,
    pageSize: 20,
  }, { retry: false, throwOnError: false });

  // 获取供应商
  const { data: suppliersData } = trpc.procurement.getSuppliers.useQuery({
    page: 1,
    pageSize: 20,
  }, { retry: false, throwOnError: false });

  // 获取采购统计
  const { data: statsData } = trpc.procurement.getProcurementStats.useQuery(undefined, { retry: false, throwOnError: false });

  if (ordersLoading) return <ListPageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={ShoppingCart}
        title={t("supply.procurement.title")}
        description={t("supply.procurement.pageDesc")}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t("supply.procurement.export")}
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t("supply.procurement.newPurchase")}
            </Button>
          </>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("supply.procurement.totalOrderAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{(statsData?.totalPOAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{tpl("supply.procurement.orderCount", { count: statsData?.totalPOCount || 0 })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("supply.procurement.avgOrderAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{(statsData?.averagePOAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("supply.procurement.monthlyAvg")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("supply.procurement.onTimeDelivery")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.onTimeDeliveryRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">{t("supply.procurement.supplierPerformance")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("supply.procurement.qualityPassRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.qualityPassRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">{t("supply.procurement.incomingInspection")}</p>
          </CardContent>
        </Card>
      </div>

      {/* 选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">{t("supply.procurement.orders")}</TabsTrigger>
          <TabsTrigger value="requests">{t("supply.procurement.requests")}</TabsTrigger>
          <TabsTrigger value="suppliers">{t("supply.procurement.supplierManagement")}</TabsTrigger>
          <TabsTrigger value="receipts">{t("supply.procurement.receiptRecords")}</TabsTrigger>
        </TabsList>

        {/* 采购订单标签页 */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.procurement.orderList")}</CardTitle>
              <CardDescription>{t("supply.procurement.orderListDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 搜索和筛选 */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("supply.procurement.searchOrderOrSupplier")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStatus || "__all__"} onValueChange={(v) => setSelectedStatus(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("supply.procurement.selectOrderStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("supply.procurement.allStatuses")}</SelectItem>
                    <SelectItem value="draft">{t("supply.procurement.statusDraft")}</SelectItem>
                    <SelectItem value="sent">{t("supply.procurement.statusSent")}</SelectItem>
                    <SelectItem value="confirmed">{t("supply.procurement.statusConfirmed")}</SelectItem>
                    <SelectItem value="received">{t("supply.procurement.statusReceived")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 订单表格 */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("supply.procurement.orderNo")}</TableHead>
                      <TableHead>{t("supply.procurement.supplier")}</TableHead>
                      <TableHead>{t("supply.procurement.material")}</TableHead>
                      <TableHead>{t("supply.procurement.quantity")}</TableHead>
                      <TableHead>{t("supply.procurement.amount")}</TableHead>
                      <TableHead>{t("supply.procurement.deliveryDate")}</TableHead>
                      <TableHead>{t("supply.procurement.status")}</TableHead>
                      <TableHead>{t("supply.procurement.operation")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t("supply.common.loading")}
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
                          <TableCell>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '-'}</TableCell>
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
                          {t("supply.procurement.noOrders")}
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
              <CardTitle>{t("supply.procurement.requestList")}</CardTitle>
              <CardDescription>{t("supply.procurement.requestListDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {t("supply.procurement.requestListPlaceholder")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 供应商管理标签页 */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.procurement.supplierManagement")}</CardTitle>
              <CardDescription>{t("supply.procurement.supplierManagementDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="mb-4">
                <Plus className="w-4 h-4 mr-2" />
                {t("supply.procurement.addSupplier")}
              </Button>
              <div className="text-center py-8 text-muted-foreground">
                {t("supply.procurement.supplierListPlaceholder")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 收货记录标签页 */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.procurement.receiptRecords")}</CardTitle>
              <CardDescription>{t("supply.procurement.receiptRecordsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {t("supply.procurement.receiptRecordsPlaceholder")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
