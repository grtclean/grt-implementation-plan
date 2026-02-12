import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Building2, 
  Plus, 
  Search, 
  Users, 
  TrendingUp, 
  Star,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Database,
  Loader2
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "wouter";
import ProcessNotebook from "@/components/ProcessNotebook";
import FeatureGuide from "@/components/FeatureGuide";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CrmCustomers() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [isSeedingData, setIsSeedingData] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    shortName: "",
    type: "prospect" as "prospect" | "customer" | "partner",
    level: "B" as "A" | "B" | "C" | "D",
    industry: "",
    phone: "",
    email: "",
    address: "",
    remark: "",
  });

  const { data: customers = [], isLoading, refetch } = (trpc.crm.customers as any).list.useQuery({
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    level: levelFilter !== "all" ? levelFilter : undefined,
  });

  const createMutation = (trpc.crm.customers as any).create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      setNewCustomer({
        name: "",
        shortName: "",
        type: "prospect",
        level: "B",
        industry: "",
        phone: "",
        email: "",
        address: "",
        remark: "",
      });
    },
  });

  // Seed data mutation (admin only)
  const seedDataMutation = (trpc.crm as any).seedData.useMutation({
    onSuccess: (result) => {
      if (result.counts) {
        toast.success(`测试数据生成成功！已创建 ${result.counts.customers} 个客户、${result.counts.opportunities} 个商机、${result.counts.contacts} 个联系人`);
      } else {
        toast.info(result.message);
      }
      refetch();
      setIsSeedingData(false);
    },
    onError: (error) => {
      toast.error(`生成失败: ${error.message}`);
      setIsSeedingData(false);
    },
  });

  const handleSeedData = () => {
    setIsSeedingData(true);
    seedDataMutation.mutate();
  };

  const handleCreate = () => {
    if (!newCustomer.name) return;
    createMutation.mutate(newCustomer);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "prospect": return t("crm.prospect");
      case "customer": return t("crm.customer");
      case "partner": return t("crm.partner");
      default: return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "prospect": return "secondary";
      case "customer": return "default";
      case "partner": return "outline";
      default: return "secondary";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "A": return "text-green-500";
      case "B": return "text-blue-500";
      case "C": return "text-yellow-500";
      case "D": return "text-gray-500";
      default: return "text-gray-500";
    }
  };

  // Statistics
  const totalCustomers = customers.length;
  const prospectCount = customers.filter(c => c.type === "prospect").length;
  const customerCount = customers.filter(c => c.type === "customer").length;
  const aLevelCount = customers.filter(c => c.level === "A").length;

  return (
    <Layout>
      <FeatureGuide
        featureId="crm-customers"
        title={t("crm.guide.title")}
        description={t("crm.guide.description")}
        steps={[
          { title: t("crm.guide.step1.title"), description: t("crm.guide.step1.desc") },
          { title: t("crm.guide.step2.title"), description: t("crm.guide.step2.desc") },
          { title: t("crm.guide.step3.title"), description: t("crm.guide.step3.desc") },
          { title: t("crm.guide.step4.title"), description: t("crm.guide.step4.desc") },
          { title: t("crm.guide.step5.title"), description: t("crm.guide.step5.desc") }
        ]}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {t("crm.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("crm.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 管理员可见的生成测试数据按钮 */}
            {user?.role === "admin" && (
              <Button
                variant="outline"
                onClick={handleSeedData}
                disabled={isSeedingData}
                className="border-primary/30 hover:bg-primary/10"
              >
                {isSeedingData ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-2" />
                )}
                {t("crm.generateTestData")}
              </Button>
            )}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("crm.newCustomer")}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("crm.newCustomer")}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>{t("crm.customerName")} *</Label>
                  <Input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder={t("crm.enterCustomerName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.customerShortName")}</Label>
                  <Input
                    value={newCustomer.shortName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, shortName: e.target.value })}
                    placeholder={t("crm.enterShortName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.customerType")}</Label>
                  <Select
                    value={newCustomer.type}
                    onValueChange={(v) => setNewCustomer({ ...newCustomer, type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">{t("crm.prospect")}</SelectItem>
                      <SelectItem value="customer">{t("crm.customer")}</SelectItem>
                      <SelectItem value="partner">{t("crm.partner")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.customerLevel")}</Label>
                  <Select
                    value={newCustomer.level}
                    onValueChange={(v) => setNewCustomer({ ...newCustomer, level: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.industry")}</Label>
                  <Input
                    value={newCustomer.industry}
                    onChange={(e) => setNewCustomer({ ...newCustomer, industry: e.target.value })}
                    placeholder={t("crm.enterIndustry")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.phone")}</Label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder={t("crm.enterPhone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.email")}</Label>
                  <Input
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder={t("crm.enterEmail")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.address")}</Label>
                  <Input
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    placeholder={t("crm.enterAddress")}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t("crm.remark")}</Label>
                  <Textarea
                    value={newCustomer.remark}
                    onChange={(e) => setNewCustomer({ ...newCustomer, remark: e.target.value })}
                    placeholder={t("crm.enterRemark")}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("common.loading") : t("common.create")}
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-primary/10 text-primary">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.totalCustomers")}</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-blue-500/10 text-blue-500">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.potentialCustomers")}</p>
                <p className="text-2xl font-bold">{prospectCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-green-500/10 text-green-500">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.formalCustomers")}</p>
                <p className="text-2xl font-bold">{customerCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-yellow-500/10 text-yellow-500">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.aLevelCustomers")}</p>
                <p className="text-2xl font-bold">{aLevelCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("crm.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="客户类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("crm.allTypes")}</SelectItem>
                  <SelectItem value="prospect">{t("crm.prospect")}</SelectItem>
                  <SelectItem value="customer">{t("crm.customer")}</SelectItem>
                  <SelectItem value="partner">{t("crm.partner")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="客户等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("crm.allLevels")}</SelectItem>
                  <SelectItem value="A">A级</SelectItem>
                  <SelectItem value="B">B级</SelectItem>
                  <SelectItem value="C">C级</SelectItem>
                  <SelectItem value="D">D级</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customer Table */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("crm.customerList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("crm.noCustomers")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>客户编号</TableHead>
                    <TableHead>客户名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>等级</TableHead>
                    <TableHead>行业</TableHead>
                    <TableHead>联系方式</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono text-xs">
                        {customer.customerCode}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.shortName && (
                            <div className="text-xs text-muted-foreground">
                              {customer.shortName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(customer.type) as any}>
                          {getTypeLabel(customer.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${getLevelColor(customer.level || 'D')}`}>
                          {customer.level}级
                        </span>
                      </TableCell>
                      <TableCell>{customer.industry || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                          {customer.status === "active" ? "活跃" : customer.status === "inactive" ? "停用" : "黑名单"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Customer Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCustomer?.name} - 客户详情
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="history">沟通记录</TabsTrigger>
                <TabsTrigger value="notebook">笔记</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">客户编号</Label>
                    <p className="font-mono">{selectedCustomer?.customerCode}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">客户类型</Label>
                    <p>{selectedCustomer?.type === 'prospect' ? '潜在客户' : selectedCustomer?.type === 'customer' ? '正式客户' : '合作伙伴'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">客户等级</Label>
                    <p className="font-bold">{selectedCustomer?.level}级</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">所属行业</Label>
                    <p>{selectedCustomer?.industry || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">联系电话</Label>
                    <p>{selectedCustomer?.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">邮箱</Label>
                    <p>{selectedCustomer?.email || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">地址</Label>
                    <p>{selectedCustomer?.address || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">备注</Label>
                    <p>{selectedCustomer?.remark || '-'}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  暂无沟通记录
                </div>
              </TabsContent>
              <TabsContent value="notebook" className="mt-4">
                {selectedCustomer && (
                  <ProcessNotebook
                    {...{ entityType: "customer", entityId: selectedCustomer.id.toString(), processStep: "客户沟通" } as any}
                  />
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Quick Links */}
        <div className="flex gap-4">
          <Link href="/crm/opportunities">
            <Button variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t("crm.opportunities")}
            </Button>
          </Link>
          <Link href="/crm/contacts">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              {t("crm.contactManagement")}
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
