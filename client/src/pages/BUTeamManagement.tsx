/**
 * BU事业部人员管理页面
 * 展示各事业部的团队结构和人员名单
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  UserPlus, 
  Settings, 
  RefreshCw, 
  Link2, 
  Trash2,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Wrench,
  Zap,
  ShoppingCart,
  Package,
  Bug,
  Truck,
  HeadphonesIcon,
  AlertCircle,
  Crown,
  Edit,
  Plus
} from "lucide-react";

// BU颜色配置
const BU_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'BU1': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  'BU2': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  'BU3': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  'BU4': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  'BU5': { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
};

// 角色图标配置
const ROLE_ICONS: Record<string, React.ReactNode> = {
  'Sales': <Briefcase className="h-4 w-4" />,
  'Mech': <Wrench className="h-4 w-4" />,
  'Elec': <Zap className="h-4 w-4" />,
  'Procurement': <ShoppingCart className="h-4 w-4" />,
  'Assembly': <Package className="h-4 w-4" />,
  'Debug': <Bug className="h-4 w-4" />,
  'Delivery': <Truck className="h-4 w-4" />,
  'CS': <HeadphonesIcon className="h-4 w-4" />,
  'Other': <Users className="h-4 w-4" />,
};

export default function BUTeamManagement() {
  const { toast } = useToast();
  const [selectedBU, setSelectedBU] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [isAddMappingOpen, setIsAddMappingOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({
    buCode: '',
    jdyDeptNo: '',
    jdyDeptName: '',
    roleType: '',
  });
  const [isAddLeaderOpen, setIsAddLeaderOpen] = useState(false);
  const [newLeader, setNewLeader] = useState({
    buCode: '',
    roleType: '',
    leaderName: '',
    leaderEmail: '',
    leaderPhone: '',
  });

  // 获取所有BU信息
  const { data: busData, isLoading: busLoading } = trpc.buMapping.getAllBUs.useQuery();
  
  // 获取BU统计信息
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = trpc.buMapping.getBUStats.useQuery();
  
  // 获取所有映射
  const { data: mappingsData, isLoading: mappingsLoading, refetch: refetchMappings } = trpc.buMapping.getAllMappings.useQuery();
  
  // 获取BU人员名单
  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = trpc.buMapping.getBUMembers.useQuery(
    { buCode: selectedBU as any },
    { enabled: true }
  );

  // 获取所有BU负责人
  const { data: leadersData, isLoading: leadersLoading, refetch: refetchLeaders } = trpc.buMapping.getAllLeaders.useQuery();

  // 自动匹配部门
  const autoMatchMutation = trpc.buMapping.autoMatchDepartments.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "自动匹配完成",
          description: `共匹配 ${data.matched} 个部门，创建 ${data.created} 个新映射`,
        });
        refetchMappings();
        refetchStats();
        refetchMembers();
      } else {
        toast({
          title: "匹配失败",
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  // 创建映射
  const createMappingMutation = trpc.buMapping.createMapping.useMutation({
    onSuccess: () => {
      toast({ title: "映射创建成功" });
      setIsAddMappingOpen(false);
      setNewMapping({ buCode: '', jdyDeptNo: '', jdyDeptName: '', roleType: '' });
      refetchMappings();
      refetchStats();
      refetchMembers();
    },
    onError: (error) => {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    },
  });

  // 删除映射
  const deleteMappingMutation = trpc.buMapping.deleteMapping.useMutation({
    onSuccess: () => {
      toast({ title: "映射已删除" });
      refetchMappings();
      refetchStats();
      refetchMembers();
    },
  });

  // 设置负责人
  const setLeaderMutation = trpc.buMapping.setLeader.useMutation({
    onSuccess: () => {
      toast({ title: "负责人设置成功" });
      setIsAddLeaderOpen(false);
      setNewLeader({ buCode: '', roleType: '', leaderName: '', leaderEmail: '', leaderPhone: '' });
      refetchLeaders();
    },
    onError: (error) => {
      toast({ title: "设置失败", description: error.message, variant: "destructive" });
    },
  });

  // 删除负责人
  const deleteLeaderMutation = trpc.buMapping.deleteLeader.useMutation({
    onSuccess: () => {
      toast({ title: "负责人已删除" });
      refetchLeaders();
    },
  });

  // 切换角色展开状态
  const toggleRole = (roleKey: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleKey)) {
      newExpanded.delete(roleKey);
    } else {
      newExpanded.add(roleKey);
    }
    setExpandedRoles(newExpanded);
  };

  // 处理添加映射
  const handleAddMapping = () => {
    if (!newMapping.buCode || !newMapping.jdyDeptNo) {
      toast({ title: "请填写必填字段", variant: "destructive" });
      return;
    }
    createMappingMutation.mutate({
      buCode: newMapping.buCode as any,
      jdyDeptNo: parseInt(newMapping.jdyDeptNo),
      jdyDeptName: newMapping.jdyDeptName || undefined,
      roleType: newMapping.roleType as any || undefined,
    });
  };

  // 处理添加负责人
  const handleAddLeader = () => {
    if (!newLeader.buCode || !newLeader.roleType || !newLeader.leaderName) {
      toast({ title: "请填写必填字段", variant: "destructive" });
      return;
    }
    setLeaderMutation.mutate({
      buCode: newLeader.buCode as any,
      roleType: newLeader.roleType as any,
      leaderName: newLeader.leaderName,
      leaderEmail: newLeader.leaderEmail || undefined,
      leaderPhone: newLeader.leaderPhone || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BU事业部人员管理</h1>
            <p className="text-muted-foreground">管理各事业部的团队结构和人员配置</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                refetchStats();
                refetchMappings();
                refetchMembers();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新数据
            </Button>
            <Button 
              variant="outline"
              onClick={() => autoMatchMutation.mutate()}
              disabled={autoMatchMutation.isPending}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {autoMatchMutation.isPending ? "匹配中..." : "自动匹配部门"}
            </Button>
            <Dialog open={isAddMappingOpen} onOpenChange={setIsAddMappingOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  添加映射
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加BU部门映射</DialogTitle>
                  <DialogDescription>
                    将简道云部门映射到对应的事业部和角色
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>事业部 *</Label>
                    <Select 
                      value={newMapping.buCode} 
                      onValueChange={(v) => setNewMapping({ ...newMapping, buCode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择事业部" />
                      </SelectTrigger>
                      <SelectContent>
                        {busData?.bus.map((bu) => (
                          <SelectItem key={bu.code} value={bu.code}>{bu.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>简道云部门编号 *</Label>
                    <Input 
                      type="number"
                      placeholder="输入部门编号"
                      value={newMapping.jdyDeptNo}
                      onChange={(e) => setNewMapping({ ...newMapping, jdyDeptNo: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>部门名称</Label>
                    <Input 
                      placeholder="输入部门名称（可选）"
                      value={newMapping.jdyDeptName}
                      onChange={(e) => setNewMapping({ ...newMapping, jdyDeptName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>角色类型</Label>
                    <Select 
                      value={newMapping.roleType} 
                      onValueChange={(v) => setNewMapping({ ...newMapping, roleType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择角色类型（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales">销售与项目工程师</SelectItem>
                        <SelectItem value="Mech">机械设计与项目工程师</SelectItem>
                        <SelectItem value="Elec">电气设计与项目工程师</SelectItem>
                        <SelectItem value="Procurement">采购与项目工程师</SelectItem>
                        <SelectItem value="Assembly">装配工程师</SelectItem>
                        <SelectItem value="Debug">调试工程师</SelectItem>
                        <SelectItem value="Delivery">交付工程师</SelectItem>
                        <SelectItem value="CS">客户服务工程师</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddMappingOpen(false)}>取消</Button>
                  <Button onClick={handleAddMapping} disabled={createMappingMutation.isPending}>
                    {createMappingMutation.isPending ? "创建中..." : "创建映射"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* BU统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))
          ) : (
            statsData?.stats.map((stat) => {
              const colors = BU_COLORS[stat.buCode] || BU_COLORS['BU1'];
              const isSelected = selectedBU === stat.buCode;
              return (
                <Card 
                  key={stat.buCode}
                  className={`cursor-pointer transition-all ${colors.bg} ${colors.border} border-2 ${isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                  onClick={() => setSelectedBU(isSelected ? null : stat.buCode)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={colors.text}>{stat.buCode}</Badge>
                      <Building2 className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <CardTitle className="text-lg">{stat.buName.replace(`${stat.buCode} - `, '')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">部门数</span>
                      <span className="font-medium">{stat.deptCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">角色数</span>
                      <span className="font-medium">{stat.roleCount}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* 主内容区 */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              人员名单
            </TabsTrigger>
            <TabsTrigger value="mappings">
              <Settings className="h-4 w-4 mr-2" />
              映射配置
            </TabsTrigger>
            <TabsTrigger value="leaders">
              <Crown className="h-4 w-4 mr-2" />
              负责人设置
            </TabsTrigger>
          </TabsList>

          {/* 人员名单Tab */}
          <TabsContent value="members" className="space-y-4">
            {membersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : membersData?.error ? (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span>{membersData.error}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {membersData?.buMembers
                  .filter(bu => !selectedBU || bu.buCode === selectedBU)
                  .map((bu) => {
                    const colors = BU_COLORS[bu.buCode] || BU_COLORS['BU1'];
                    return (
                      <Card key={bu.buCode} className={`${colors.border} border-l-4`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={`${colors.bg} ${colors.text}`}>{bu.buCode}</Badge>
                              <CardTitle>{bu.buName}</CardTitle>
                            </div>
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 mr-1" />
                              {bu.totalMembers} 人
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {bu.roles.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                              暂无人员数据，请先配置部门映射
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {bu.roles.map((role) => {
                                const roleKey = `${bu.buCode}-${role.roleType}`;
                                const isExpanded = expandedRoles.has(roleKey);
                                return (
                                  <div key={roleKey} className="border rounded-lg">
                                    <button
                                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                                      onClick={() => toggleRole(roleKey)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {ROLE_ICONS[role.roleType] || <Users className="h-4 w-4" />}
                                        <span className="font-medium">{role.roleName}</span>
                                        <Badge variant="outline" className="ml-2">
                                          {role.memberCount} 人
                                        </Badge>
                                      </div>
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>
                                    {isExpanded && (
                                      <div className="border-t p-3">
                                        {role.members.length === 0 ? (
                                          <p className="text-muted-foreground text-sm">暂无成员</p>
                                        ) : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {role.members.map((member) => (
                                              <div 
                                                key={member.username}
                                                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                                              >
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                  <span className="text-sm font-medium">
                                                    {member.name.slice(0, 2)}
                                                  </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium truncate">{member.name}</p>
                                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    {member.email && (
                                                      <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {member.email}
                                                      </span>
                                                    )}
                                                    {member.phone && (
                                                      <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {member.phone}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <Badge 
                                                  variant={member.status === 1 ? "default" : "secondary"}
                                                  className="text-xs"
                                                >
                                                  {member.status === 1 ? "在职" : "离职"}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* 映射配置Tab */}
          <TabsContent value="mappings">
            <Card>
              <CardHeader>
                <CardTitle>部门映射配置</CardTitle>
                <CardDescription>
                  管理简道云部门与BU事业部的对应关系
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mappingsLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>事业部</TableHead>
                        <TableHead>部门编号</TableHead>
                        <TableHead>部门名称</TableHead>
                        <TableHead>角色类型</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappingsData?.mappings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            暂无映射配置，请点击"自动匹配部门"或"添加映射"
                          </TableCell>
                        </TableRow>
                      ) : (
                        mappingsData?.mappings.map((mapping) => {
                          const colors = BU_COLORS[mapping.buCode] || BU_COLORS['BU1'];
                          return (
                            <TableRow key={mapping.id}>
                              <TableCell>
                                <Badge className={`${colors.bg} ${colors.text}`}>
                                  {mapping.buCode}
                                </Badge>
                              </TableCell>
                              <TableCell>{mapping.jdyDeptNo}</TableCell>
                              <TableCell>{mapping.jdyDeptName || '-'}</TableCell>
                              <TableCell>
                                {mapping.roleType ? (
                                  <div className="flex items-center gap-1">
                                    {ROLE_ICONS[mapping.roleType]}
                                    <span>{mapping.roleType}</span>
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={mapping.isActive ? "default" : "secondary"}>
                                  {mapping.isActive ? "启用" : "禁用"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('确定要删除此映射吗？')) {
                                      deleteMappingMutation.mutate({ id: mapping.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 负责人设置Tab */}
          <TabsContent value="leaders">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>事业部负责人配置</CardTitle>
                    <CardDescription>
                      为每个事业部配置销售、机械、电气、采购负责人
                    </CardDescription>
                  </div>
                  <Dialog open={isAddLeaderOpen} onOpenChange={setIsAddLeaderOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        添加负责人
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加BU负责人</DialogTitle>
                        <DialogDescription>
                          为事业部指定各角色的负责人
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>事业部 *</Label>
                          <Select 
                            value={newLeader.buCode} 
                            onValueChange={(v) => setNewLeader({ ...newLeader, buCode: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择事业部" />
                            </SelectTrigger>
                            <SelectContent>
                              {busData?.bus.map((bu) => (
                                <SelectItem key={bu.code} value={bu.code}>{bu.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>角色类型 *</Label>
                          <Select 
                            value={newLeader.roleType} 
                            onValueChange={(v) => setNewLeader({ ...newLeader, roleType: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择角色类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sales">销售与项目工程师</SelectItem>
                              <SelectItem value="Mech">机械设计与项目工程师</SelectItem>
                              <SelectItem value="Elec">电气设计与项目工程师</SelectItem>
                              <SelectItem value="Procurement">采购与项目工程师</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>负责人姓名 *</Label>
                          <Input 
                            placeholder="输入负责人姓名"
                            value={newLeader.leaderName}
                            onChange={(e) => setNewLeader({ ...newLeader, leaderName: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>邮箱</Label>
                          <Input 
                            type="email"
                            placeholder="输入邮箱（可选）"
                            value={newLeader.leaderEmail}
                            onChange={(e) => setNewLeader({ ...newLeader, leaderEmail: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>电话</Label>
                          <Input 
                            placeholder="输入电话（可选）"
                            value={newLeader.leaderPhone}
                            onChange={(e) => setNewLeader({ ...newLeader, leaderPhone: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddLeaderOpen(false)}>取消</Button>
                        <Button onClick={handleAddLeader} disabled={setLeaderMutation.isPending}>
                          {setLeaderMutation.isPending ? "设置中..." : "确认设置"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {leadersLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="space-y-6">
                    {busData?.bus.map((bu) => {
                      const colors = BU_COLORS[bu.code] || BU_COLORS['BU1'];
                      const buLeaders = leadersData?.leaders.filter(l => l.buCode === bu.code) || [];
                      return (
                        <Card key={bu.code} className={`${colors.border} border-l-4`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                              <Badge className={`${colors.bg} ${colors.text}`}>{bu.code}</Badge>
                              <CardTitle className="text-lg">{bu.name.replace(`${bu.code} - `, '')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {['Sales', 'Mech', 'Elec', 'Procurement'].map((roleType) => {
                                const leader = buLeaders.find(l => l.roleType === roleType);
                                const roleName = {
                                  'Sales': '销售负责人',
                                  'Mech': '机械负责人',
                                  'Elec': '电气负责人',
                                  'Procurement': '采购负责人',
                                }[roleType];
                                return (
                                  <div key={roleType} className="p-3 rounded-lg border bg-muted/30">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        {ROLE_ICONS[roleType]}
                                        <span className="text-sm font-medium">{roleName}</span>
                                      </div>
                                      {leader && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => {
                                            if (confirm('确定要删除此负责人吗？')) {
                                              deleteLeaderMutation.mutate({ id: leader.id });
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                    {leader ? (
                                      <div className="space-y-1">
                                        <p className="font-medium">{leader.leaderName}</p>
                                        {leader.leaderEmail && (
                                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            {leader.leaderEmail}
                                          </p>
                                        )}
                                        {leader.leaderPhone && (
                                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {leader.leaderPhone}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">未设置</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
