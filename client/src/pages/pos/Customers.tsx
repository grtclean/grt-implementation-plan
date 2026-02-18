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

const customerTypeLabels: Record<string, string> = {
  TIER1_OEM: 'Tier1 OEM', TIER2_SUPPLIER: 'Tier2 供应商', TIER3_SUPPLIER: 'Tier3 供应商',
  AFTERMARKET: '售后市场', DISTRIBUTOR: '分销商', END_USER: '终端用户', OTHER: '其他',
};

const customerTypeColors: Record<string, string> = {
  TIER1_OEM: 'bg-red-500', TIER2_SUPPLIER: 'bg-orange-500', TIER3_SUPPLIER: 'bg-yellow-500',
  AFTERMARKET: 'bg-green-500', DISTRIBUTOR: 'bg-blue-500', END_USER: 'bg-purple-500', OTHER: 'bg-gray-500',
};

// 决策权重维度
const decisionDimensions = [
  { key: 'tech', label: '技术', color: '#3b82f6' },
  { key: 'price', label: '价格', color: '#ef4444' },
  { key: 'value', label: '价值', color: '#22c55e' },
  { key: 'relation', label: '关系', color: '#f59e0b' },
  { key: 'boss', label: '老板', color: '#8b5cf6' },
];

// 联系人角色标签
const contactRoleTags = [
  { key: 'decision_maker', label: '决策者', icon: Crown, color: 'bg-red-500' },
  { key: 'influencer', label: '影响者', icon: Star, color: 'bg-orange-500' },
  { key: 'technical', label: '技术负责人', icon: Briefcase, color: 'bg-blue-500' },
  { key: 'procurement', label: '采购负责人', icon: Shield, color: 'bg-green-500' },
  { key: 'user', label: '使用者', icon: UserCheck, color: 'bg-purple-500' },
];

// 雷达图组件
function DecisionRadarChart({ weights, size = 200 }: { weights: Record<string, number>; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 30;
  const angleStep = (2 * Math.PI) / decisionDimensions.length;
  
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
  const dataPoints = decisionDimensions.map((dim, i) => getPoint(i, weights[dim.key] || 0));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  return (
    <svg width={size} height={size} className="mx-auto">
      {/* 网格 */}
      {gridLevels.map((level) => {
        const points = decisionDimensions.map((_, i) => getPoint(i, level));
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        return <path key={level} d={path} fill="none" stroke="currentColor" strokeOpacity={0.1} />;
      })}
      
      {/* 轴线 */}
      {decisionDimensions.map((_, i) => {
        const point = getPoint(i, 100);
        return <line key={i} x1={center} y1={center} x2={point.x} y2={point.y} stroke="currentColor" strokeOpacity={0.2} />;
      })}
      
      {/* 数据区域 */}
      <path d={dataPath} fill="hsl(var(--primary))" fillOpacity={0.3} stroke="hsl(var(--primary))" strokeWidth={2} />
      
      {/* 数据点 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={decisionDimensions[i].color} />
      ))}
      
      {/* 标签 */}
      {decisionDimensions.map((dim, i) => {
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
            {dim.label}
          </text>
        );
      })}
    </svg>
  );
}

// 客户详情对话框
function CustomerDetailDialog({ customer, open, onClose }: { customer: any; open: boolean; onClose: () => void }) {
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
            {customer?.customerName || '客户详情'}
          </DialogTitle>
          <DialogDescription>
            客户编号: {customer?.customerCode} | 类型: {customerTypeLabels[customer?.customerType] || '-'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">客户画像</TabsTrigger>
            <TabsTrigger value="contacts">关键联系人</TabsTrigger>
            <TabsTrigger value="analysis">决策分析</TabsTrigger>
          </TabsList>
          
          {/* 客户画像 */}
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Radar className="w-4 h-4" />
                    决策权重雷达图
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DecisionRadarChart weights={weights} size={250} />
                  <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                    {decisionDimensions.map((dim) => (
                      <div key={dim.key} className="text-xs">
                        <div className="font-medium" style={{ color: dim.color }}>{dim.label}</div>
                        <div className="text-muted-foreground">{weights[dim.key] || 0}%</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">行业</span>
                    <span>{customer?.industry || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">应用场景</span>
                    <span>{customer?.scenes?.join(', ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">交付风险</span>
                    <Badge variant={customer?.deliveryRisk === 'HIGH' ? 'destructive' : 'outline'}>
                      {customer?.deliveryRisk || '低'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jared策略</span>
                    <span className="text-sm">{customer?.jaredStrategy || '-'}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">风险解决方案</span>
                    <p className="mt-1 text-sm">{customer?.riskSolution || '暂无'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* 关键联系人 */}
          <TabsContent value="contacts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">关键联系人列表</h3>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />添加联系人</Button>
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
                          const roleTag = contactRoleTags.find(r => r.key === tag);
                          if (!roleTag) return null;
                          const Icon = roleTag.icon;
                          return (
                            <Badge key={tag} className={`${roleTag.color} text-white flex items-center gap-1`}>
                              <Icon className="w-3 h-3" />
                              {roleTag.label}
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
                  <DialogTitle>编辑联系人标签</DialogTitle>
                  <DialogDescription>为 {editingContact?.name} 设置角色标签</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>当前标签</Label>
                    <div className="flex flex-wrap gap-2">
                      {editingContact?.tags?.map((tag: string) => {
                        const roleTag = contactRoleTags.find(r => r.key === tag);
                        if (!roleTag) return null;
                        return (
                          <Badge key={tag} className={`${roleTag.color} text-white`}>
                            {roleTag.label}
                            <button className="ml-1 hover:text-red-200">×</button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>添加标签</Label>
                    <Select value={newContactTag} onValueChange={setNewContactTag}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择角色标签" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactRoleTags.map((role) => (
                          <SelectItem key={role.key} value={role.key}>
                            <div className="flex items-center gap-2">
                              <role.icon className="w-4 h-4" />
                              {role.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>备注</Label>
                    <Textarea placeholder="添加关于此联系人的备注..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingContact(null)}>取消</Button>
                    <Button onClick={() => setEditingContact(null)}>保存</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          {/* 决策分析 */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">决策结构分析</CardTitle>
                <CardDescription>基于历史项目和沟通记录的决策权重分析</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {decisionDimensions.map((dim) => (
                    <div key={dim.key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{dim.label}导向</span>
                        <span className="font-medium">{weights[dim.key] || 0}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${weights[dim.key] || 0}%`, backgroundColor: dim.color }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dim.key === 'tech' && '客户重视技术方案的先进性和可靠性'}
                        {dim.key === 'price' && '客户对价格敏感，注重性价比'}
                        {dim.key === 'value' && '客户关注整体价值和长期收益'}
                        {dim.key === 'relation' && '客户重视合作关系和信任度'}
                        {dim.key === 'boss' && '最终决策权在高层管理者手中'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">销售策略建议</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="font-medium text-blue-700 dark:text-blue-300">技术优先策略</div>
                    <p className="text-muted-foreground mt-1">
                      该客户技术权重较高，建议在方案演示时重点突出技术创新点和行业领先性。
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="font-medium text-orange-700 dark:text-orange-300">关系维护建议</div>
                    <p className="text-muted-foreground mt-1">
                      定期拜访技术负责人李工，保持技术交流，同时注意与决策者张总的高层沟通。
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="font-medium text-green-700 dark:text-green-300">价值主张</div>
                    <p className="text-muted-foreground mt-1">
                      强调设备的长期运营成本优势和产能提升效果，用ROI数据说服客户。
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
          首页
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/pos/dashboard" className="hover:text-foreground transition-colors">POS管理</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">客户管理</span>
      </nav>

      <PageHeader
        icon={Building2}
        title="客户管理"
        description="客户画像与决策结构分析"
        actions={<Button><Plus className="w-4 h-4 mr-2" />新增客户</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="客户总数" value={data?.total || 0} iconColor="text-gray-500" iconBg="bg-gray-50" />
        <StatCard icon={Target} label="Tier1 客户" value={tier1Count} iconColor="text-red-500" iconBg="bg-red-50" />
        <StatCard icon={TrendingUp} label="活跃项目" value={data?.items?.length || 0} iconColor="text-green-500" iconBg="bg-green-50" />
        <StatCard icon={Users} label="关键联系人" value={totalContacts} iconColor="text-blue-500" iconBg="bg-blue-50" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>客户列表</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索客户..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
                  <TableHead>客户编号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>行业</TableHead>
                  <TableHead>决策权重</TableHead>
                  <TableHead>关键联系人</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((customer: any) => (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCustomer(customer)}>
                    <TableCell className="font-mono">{customer.customerCode}</TableCell>
                    <TableCell className="font-medium">{customer.customerName}</TableCell>
                    <TableCell>
                      <Badge className={customerTypeColors[customer.customerType] || 'bg-gray-500'}>
                        {customerTypeLabels[customer.customerType] || customer.customerType}
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
              <p>暂无客户数据</p>
              <Button variant="outline" className="mt-4"><Plus className="w-4 h-4 mr-2" />添加第一个客户</Button>
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
