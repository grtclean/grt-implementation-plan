import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Building2, Users, TrendingUp, Target, Star, UserCheck, Phone, Mail, Radar, Eye, Edit, Tag, Crown, Briefcase, Shield, Home, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const customerTypeLabelKeys: Record<string, string> = {
  TIER1_OEM: 'projects.pos.customer.typeTier1', TIER2_SUPPLIER: 'projects.pos.customer.typeTier2', TIER3_SUPPLIER: 'projects.pos.customer.typeTier3',
  AFTERMARKET: 'projects.pos.customer.typeAftermarket', DISTRIBUTOR: 'projects.pos.customer.typeDistributor', END_USER: 'projects.pos.customer.typeEndUser', OTHER: 'projects.pos.customer.typeOther',
};

const customerTypeColors: Record<string, string> = {
  TIER1_OEM: 'bg-red-500', TIER2_SUPPLIER: 'bg-orange-500', TIER3_SUPPLIER: 'bg-yellow-500',
  AFTERMARKET: 'bg-green-500', DISTRIBUTOR: 'bg-blue-500', END_USER: 'bg-purple-500', OTHER: 'bg-gray-500',
};

// 决策权重维度 (i18n key references)
const decisionDimensionKeys = [
  { key: 'tech', labelKey: 'projects.pos.customer.dimTech', color: '#3b82f6' },
  { key: 'price', labelKey: 'projects.pos.customer.dimPrice', color: '#ef4444' },
  { key: 'value', labelKey: 'projects.pos.customer.dimValue', color: '#22c55e' },
  { key: 'relation', labelKey: 'projects.pos.customer.dimRelation', color: '#f59e0b' },
  { key: 'boss', labelKey: 'projects.pos.customer.dimBoss', color: '#8b5cf6' },
];

// 联系人角色标签 (i18n key references)
const contactRoleTagKeys = [
  { key: 'decision_maker', labelKey: 'projects.pos.customer.roleDecisionMaker', icon: Crown, color: 'bg-red-500' },
  { key: 'influencer', labelKey: 'projects.pos.customer.roleInfluencer', icon: Star, color: 'bg-orange-500' },
  { key: 'technical', labelKey: 'projects.pos.customer.roleTechnical', icon: Briefcase, color: 'bg-blue-500' },
  { key: 'procurement', labelKey: 'projects.pos.customer.roleProcurement', icon: Shield, color: 'bg-green-500' },
  { key: 'user', labelKey: 'projects.pos.customer.roleUser', icon: UserCheck, color: 'bg-purple-500' },
];

// 雷达图组件
function DecisionRadarChart({ weights, size = 200 }: { weights: Record<string, number>; size?: number }) {
  const { t } = useLanguage();
  const center = size / 2;
  const radius = size / 2 - 30;
  const angleStep = (2 * Math.PI) / decisionDimensionKeys.length;
  
  // 计算多边形顶点
  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };
  
  // 生成网格线
  const gridLevels = [20, 40, 60, 80, 100];
  
  // 生成数据多边形路径
  const dataPoints = decisionDimensionKeys.map((dim, i) => getPoint(i, weights[dim.key] || 0));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  return (
    <svg width={size} height={size} className="mx-auto">
      {/* 网格 */}
      {gridLevels.map((level) => {
        const points = decisionDimensionKeys.map((_, i) => getPoint(i, level));
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        return <path key={level} d={path} fill="none" stroke="currentColor" strokeOpacity={0.1} />;
      })}
      
      {/* 轴线 */}
      {decisionDimensionKeys.map((_, i) => {
        const point = getPoint(i, 100);
        return <line key={i} x1={center} y1={center} x2={point.x} y2={point.y} stroke="currentColor" strokeOpacity={0.2} />;
      })}
      
      {/* 数据区域 */}
      <path d={dataPath} fill="hsl(var(--primary))" fillOpacity={0.3} stroke="hsl(var(--primary))" strokeWidth={2} />
      
      {/* 数据点 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={decisionDimensionKeys[i].color} />
      ))}
      
      {/* 标签 */}
      {decisionDimensionKeys.map((dim, i) => {
        const labelPoint = getPoint(i, 120);
        return (
          <text
            key={dim.key}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-current"
          >
            {t(dim.labelKey)}
          </text>
        );
      })}
    </svg>
  );
}

// 客户详情对话框
function CustomerDetailDialog({ customer, open, onClose }: { customer: any; open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('profile');
  const [editingContact, setEditingContact] = useState<any>(null);
  const [newContactTag, setNewContactTag] = useState('');
  
  // 模拟联系人数据
  const contacts = customer?.keyContacts || [
    { id: 1, name: '张总', title: '总经理', phone: '138xxxx1234', email: 'zhang@example.com', tags: ['decision_maker'] },
    { id: 2, name: '李工', title: '技术总监', phone: '139xxxx5678', email: 'li@example.com', tags: ['technical', 'influencer'] },
    { id: 3, name: '王经理', title: '采购经理', phone: '137xxxx9012', email: 'wang@example.com', tags: ['procurement'] },
  ];
  
  const weights = customer?.decisionWeights || { tech: 30, price: 25, value: 20, relation: 15, boss: 10 };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {customer?.customerName || t("projects.pos.customer.customerDetail")}
          </DialogTitle>
          <DialogDescription>
            {t("projects.pos.customer.customerCode")}: {customer?.customerCode} | {t("projects.pos.customer.type")}: {t(customerTypeLabelKeys[customer?.customerType]) || '-'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">{t("projects.pos.customer.profile")}</TabsTrigger>
            <TabsTrigger value="contacts">{t("projects.pos.customer.keyContacts")}</TabsTrigger>
            <TabsTrigger value="analysis">{t("projects.pos.customer.decisionAnalysis")}</TabsTrigger>
          </TabsList>
          
          {/* 客户画像 */}
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Radar className="w-4 h-4" />
                    {t("projects.pos.customer.decisionRadar")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DecisionRadarChart weights={weights} size={250} />
                  <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                    {decisionDimensionKeys.map((dim) => (
                      <div key={dim.key} className="text-xs">
                        <div className="font-medium" style={{ color: dim.color }}>{t(dim.labelKey)}</div>
                        <div className="text-muted-foreground">{weights[dim.key] || 0}%</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("projects.pos.customer.basicInfo")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("projects.pos.customer.industry")}</span>
                    <span>{customer?.industry || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("projects.pos.customer.scenes")}</span>
                    <span>{customer?.scenes?.join(', ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("projects.pos.customer.deliveryRisk")}</span>
                    <Badge variant={customer?.deliveryRisk === 'HIGH' ? 'destructive' : 'outline'}>
                      {customer?.deliveryRisk || t("projects.pos.customer.low")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("projects.pos.customer.jaredStrategy")}</span>
                    <span className="text-sm">{customer?.jaredStrategy || '-'}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">{t("projects.pos.customer.riskSolution")}</span>
                    <p className="mt-1 text-sm">{customer?.riskSolution || t("projects.pos.customer.none")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* 关键联系人 */}
          <TabsContent value="contacts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{t("projects.pos.customer.contactList")}</h3>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />{t("projects.pos.customer.addContact")}</Button>
            </div>
            
            <div className="space-y-3">
              {contacts.map((contact: any) => (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {contact.name}
                            <span className="text-sm text-muted-foreground">({contact.title})</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setEditingContact(contact)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* 角色标签 */}
                    <div className="mt-3 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.map((tag: string) => {
                          const roleTag = contactRoleTagKeys.find(r => r.key === tag);
                          if (!roleTag) return null;
                          const Icon = roleTag.icon;
                          return (
                            <Badge key={tag} className={`${roleTag.color} text-white flex items-center gap-1`}>
                              <Icon className="w-3 h-3" />
                              {t(roleTag.labelKey)}
                            </Badge>
                          );
                        })}
                        <Button variant="outline" size="sm" className="h-5 px-2 text-xs" onClick={() => setEditingContact(contact)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* 编辑联系人标签对话框 */}
            <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("projects.pos.customer.editContactTags")}</DialogTitle>
                  <DialogDescription>{t("projects.pos.customer.setRoleTags")} {editingContact?.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("projects.pos.customer.currentTags")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {editingContact?.tags?.map((tag: string) => {
                        const roleTag = contactRoleTagKeys.find(r => r.key === tag);
                        if (!roleTag) return null;
                        return (
                          <Badge key={tag} className={`${roleTag.color} text-white`}>
                            {t(roleTag.labelKey)}
                            <button className="ml-1 hover:text-red-200">×</button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("projects.pos.customer.addTag")}</Label>
                    <Select value={newContactTag} onValueChange={setNewContactTag}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("projects.pos.customer.selectRoleTag")} />
                      </SelectTrigger>
                      <SelectContent>
                        {contactRoleTagKeys.map((role) => (
                          <SelectItem key={role.key} value={role.key}>
                            <div className="flex items-center gap-2">
                              <role.icon className="w-4 h-4" />
                              {t(role.labelKey)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("projects.pos.customer.notes")}</Label>
                    <Textarea placeholder={t("projects.pos.customer.addNotes")} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingContact(null)}>{t("projects.pos.customer.cancel")}</Button>
                    <Button onClick={() => setEditingContact(null)}>{t("projects.pos.customer.save")}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          {/* 决策分析 */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("projects.pos.customer.decisionStructure")}</CardTitle>
                <CardDescription>{t("projects.pos.customer.decisionStructureDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {decisionDimensionKeys.map((dim) => (
                    <div key={dim.key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{t(dim.labelKey)}</span>
                        <span className="font-medium">{weights[dim.key] || 0}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${weights[dim.key] || 0}%`, backgroundColor: dim.color }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dim.key === 'tech' && t("projects.pos.customer.dimTechDesc")}
                        {dim.key === 'price' && t("projects.pos.customer.dimPriceDesc")}
                        {dim.key === 'value' && t("projects.pos.customer.dimValueDesc")}
                        {dim.key === 'relation' && t("projects.pos.customer.dimRelationDesc")}
                        {dim.key === 'boss' && t("projects.pos.customer.dimBossDesc")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("projects.pos.customer.salesStrategy")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="font-medium text-blue-700 dark:text-blue-300">{t("projects.pos.customer.strategyTechFirst")}</div>
                    <p className="text-muted-foreground mt-1">
                      {t("projects.pos.customer.strategyTechFirstDesc")}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="font-medium text-orange-700 dark:text-orange-300">{t("projects.pos.customer.strategyRelation")}</div>
                    <p className="text-muted-foreground mt-1">
                      {t("projects.pos.customer.strategyRelationDesc")}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="font-medium text-green-700 dark:text-green-300">{t("projects.pos.customer.strategyValue")}</div>
                    <p className="text-muted-foreground mt-1">
                      {t("projects.pos.customer.strategyValueDesc")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function POSCustomers() {
  const { t } = useLanguage();
  const [page] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const { data, isLoading } = trpc.pos.customer.list.useQuery({ page, pageSize: 20, search: search || undefined });

  // 计算统计数据
  const tier1Count = data?.items?.filter((c: any) => c.customerType === 'TIER1_OEM').length || 0;
  const totalContacts = data?.items?.reduce((sum: number, c: any) => sum + (c.keyContacts?.length || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />
          {t("projects.pos.customer.home")}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/pos/dashboard" className="hover:text-foreground transition-colors">{t("projects.pos.customer.posManagement")}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{t("projects.pos.customer.title")}</span>
      </nav>

      <PageHeader
        icon={Building2}
        title={t("projects.pos.customer.title")}
        description={t("projects.pos.customer.description")}
        actions={<Button><Plus className="w-4 h-4 mr-2" />{t("projects.pos.customer.addCustomer")}</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Building2} label={t("projects.pos.customer.totalCustomers")} value={data?.total || 0} iconColor="text-gray-500" iconBg="bg-gray-50" />
        <StatCard icon={Target} label={t("projects.pos.customer.tier1Customers")} value={tier1Count} iconColor="text-red-500" iconBg="bg-red-50" />
        <StatCard icon={TrendingUp} label={t("projects.pos.customer.activeProjects")} value={data?.items?.length || 0} iconColor="text-green-500" iconBg="bg-green-50" />
        <StatCard icon={Users} label={t("projects.pos.customer.keyContacts")} value={totalContacts} iconColor="text-blue-500" iconBg="bg-blue-50" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("projects.pos.customer.customerList")}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("projects.pos.customer.searchCustomer")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : data?.items && data.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("projects.pos.customer.customerCode")}</TableHead>
                  <TableHead>{t("projects.pos.customer.customerName")}</TableHead>
                  <TableHead>{t("projects.pos.customer.type")}</TableHead>
                  <TableHead>{t("projects.pos.customer.industry")}</TableHead>
                  <TableHead>{t("projects.pos.customer.decisionWeight")}</TableHead>
                  <TableHead>{t("projects.pos.customer.keyContacts")}</TableHead>
                  <TableHead>{t("projects.pos.customer.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((customer: any) => (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCustomer(customer)}>
                    <TableCell className="font-mono">{customer.customerCode}</TableCell>
                    <TableCell className="font-medium">{customer.customerName}</TableCell>
                    <TableCell>
                      <Badge className={customerTypeColors[customer.customerType] || 'bg-gray-500'}>
                        {t(customerTypeLabelKeys[customer.customerType]) || customer.customerType}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.industry || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-16">
                          <DecisionRadarChart weights={customer.decisionWeights || {}} size={64} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.keyContacts?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("projects.pos.customer.noCustomers")}</p>
              <Button variant="outline" className="mt-4"><Plus className="w-4 h-4 mr-2" />{t("projects.pos.customer.addFirstCustomer")}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 客户详情对话框 */}
      <CustomerDetailDialog
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
