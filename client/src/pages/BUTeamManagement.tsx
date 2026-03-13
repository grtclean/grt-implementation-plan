/**
 * BU事业部人员管理页面
 * 展示各事业部的团队结构和人员名单
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedBU, setSelectedBU] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [isAddMappingOpen, setIsAddMappingOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({
    buCode: '',
    extDeptNo: '',
    extDeptName: '',
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
          title: t("hr.buTeam.autoMatchSuccess"),
          description: t("hr.buTeam.autoMatchDesc").replace("{matched}", String(data.matched)).replace("{created}", String(data.created)),
        });
        refetchMappings();
        refetchStats();
        refetchMembers();
      } else {
        toast({
          title: t("hr.buTeam.matchFailed"),
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  // 创建映射
  const createMappingMutation = trpc.buMapping.createMapping.useMutation({
    onSuccess: () => {
      toast({ title: t("hr.buTeam.mappingCreated") });
      setIsAddMappingOpen(false);
      setNewMapping({ buCode: '', extDeptNo: '', extDeptName: '', roleType: '' });
      refetchMappings();
      refetchStats();
      refetchMembers();
    },
    onError: (error) => {
      toast({ title: t("hr.buTeam.createFailed"), description: error.message, variant: "destructive" });
    },
  });

  // 删除映射
  const deleteMappingMutation = trpc.buMapping.deleteMapping.useMutation({
    onSuccess: () => {
      toast({ title: t("hr.buTeam.mappingDeleted") });
      refetchMappings();
      refetchStats();
      refetchMembers();
    },
  });

  // 设置负责人
  const setLeaderMutation = trpc.buMapping.setLeader.useMutation({
    onSuccess: () => {
      toast({ title: t("hr.buTeam.leaderSetSuccess") });
      setIsAddLeaderOpen(false);
      setNewLeader({ buCode: '', roleType: '', leaderName: '', leaderEmail: '', leaderPhone: '' });
      refetchLeaders();
    },
    onError: (error) => {
      toast({ title: t("hr.buTeam.setFailed"), description: error.message, variant: "destructive" });
    },
  });

  // 删除负责人
  const deleteLeaderMutation = trpc.buMapping.deleteLeader.useMutation({
    onSuccess: () => {
      toast({ title: t("hr.buTeam.leaderDeleted") });
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
    if (!newMapping.buCode || !newMapping.extDeptNo) {
      toast({ title: t("hr.buTeam.fillRequired"), variant: "destructive" });
      return;
    }
    createMappingMutation.mutate({
      buCode: newMapping.buCode as any,
      extDeptNo: parseInt(newMapping.extDeptNo),
      extDeptName: newMapping.extDeptName || undefined,
      roleType: newMapping.roleType as any || undefined,
    });
  };

  // 处理添加负责人
  const handleAddLeader = () => {
    if (!newLeader.buCode || !newLeader.roleType || !newLeader.leaderName) {
      toast({ title: t("hr.buTeam.fillRequired"), variant: "destructive" });
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
      <div className="space-y-6">
        <PageHeader
          icon={Building2}
          title={t("hr.buTeam.title")}
          description={t("hr.buTeam.desc")}
          actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                refetchStats();
                refetchMappings();
                refetchMembers();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("hr.buTeam.refreshData")}
            </Button>
            <Button
              variant="outline"
              onClick={() => autoMatchMutation.mutate()}
              disabled={autoMatchMutation.isPending}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {autoMatchMutation.isPending ? t("hr.buTeam.matching") : t("hr.buTeam.autoMatchDept")}
            </Button>
            <Dialog open={isAddMappingOpen} onOpenChange={setIsAddMappingOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("hr.buTeam.addMapping")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("hr.buTeam.addMappingTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("hr.buTeam.addMappingDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t("hr.buTeam.buLabel")} *</Label>
                    <Select
                      value={newMapping.buCode}
                      onValueChange={(v) => setNewMapping({ ...newMapping, buCode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("hr.buTeam.selectBU")} />
                      </SelectTrigger>
                      <SelectContent>
                        {busData?.bus.map((bu) => (
                          <SelectItem key={bu.code} value={bu.code}>{bu.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("hr.buTeam.extDeptNo")} *</Label>
                    <Input
                      type="number"
                      placeholder={t("hr.buTeam.enterDeptNo")}
                      value={newMapping.extDeptNo}
                      onChange={(e) => setNewMapping({ ...newMapping, extDeptNo: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("hr.buTeam.deptName")}</Label>
                    <Input
                      placeholder={t("hr.buTeam.enterDeptName")}
                      value={newMapping.extDeptName}
                      onChange={(e) => setNewMapping({ ...newMapping, extDeptName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("hr.buTeam.roleType")}</Label>
                    <Select
                      value={newMapping.roleType}
                      onValueChange={(v) => setNewMapping({ ...newMapping, roleType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("hr.buTeam.selectRoleType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales">{t("hr.buTeam.roleSales")}</SelectItem>
                        <SelectItem value="Mech">{t("hr.buTeam.roleMech")}</SelectItem>
                        <SelectItem value="Elec">{t("hr.buTeam.roleElec")}</SelectItem>
                        <SelectItem value="Procurement">{t("hr.buTeam.roleProcurement")}</SelectItem>
                        <SelectItem value="Assembly">{t("hr.buTeam.roleAssembly")}</SelectItem>
                        <SelectItem value="Debug">{t("hr.buTeam.roleDebug")}</SelectItem>
                        <SelectItem value="Delivery">{t("hr.buTeam.roleDelivery")}</SelectItem>
                        <SelectItem value="CS">{t("hr.buTeam.roleCS")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddMappingOpen(false)}>{t("hr.buTeam.cancel")}</Button>
                  <Button onClick={handleAddMapping} disabled={createMappingMutation.isPending}>
                    {createMappingMutation.isPending ? t("hr.buTeam.creating") : t("hr.buTeam.createMapping")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
          }
        />

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
                      <span className="text-muted-foreground">{t("hr.buTeam.deptCount")}</span>
                      <span className="font-medium">{stat.deptCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("hr.buTeam.roleCount")}</span>
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
              {t("hr.buTeam.tabMembers")}
            </TabsTrigger>
            <TabsTrigger value="mappings">
              <Settings className="h-4 w-4 mr-2" />
              {t("hr.buTeam.tabMappings")}
            </TabsTrigger>
            <TabsTrigger value="leaders">
              <Crown className="h-4 w-4 mr-2" />
              {t("hr.buTeam.tabLeaders")}
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
                              {bu.totalMembers} {t("hr.buTeam.person")}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {bu.roles.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                              {t("hr.buTeam.noMemberData")}
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
                                          {role.memberCount} {t("hr.buTeam.person")}
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
                                          <p className="text-muted-foreground text-sm">{t("hr.buTeam.noMembers")}</p>
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
                                                  {member.status === 1 ? t("hr.buTeam.statusActive") : t("hr.buTeam.statusLeft")}
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
                <CardTitle>{t("hr.buTeam.mappingConfigTitle")}</CardTitle>
                <CardDescription>
                  {t("hr.buTeam.mappingConfigDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mappingsLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("hr.buTeam.colBU")}</TableHead>
                        <TableHead>{t("hr.buTeam.colDeptNo")}</TableHead>
                        <TableHead>{t("hr.buTeam.colDeptName")}</TableHead>
                        <TableHead>{t("hr.buTeam.colRoleType")}</TableHead>
                        <TableHead>{t("hr.buTeam.colStatus")}</TableHead>
                        <TableHead className="text-right">{t("hr.buTeam.colAction")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappingsData?.mappings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            {t("hr.buTeam.noMappings")}
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
                              <TableCell>{mapping.extDeptNo}</TableCell>
                              <TableCell>{mapping.extDeptName || '-'}</TableCell>
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
                                  {mapping.isActive ? t("hr.buTeam.statusEnabled") : t("hr.buTeam.statusDisabled")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(t("hr.buTeam.confirmDeleteMapping"))) {
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
                    <CardTitle>{t("hr.buTeam.leaderConfigTitle")}</CardTitle>
                    <CardDescription>
                      {t("hr.buTeam.leaderConfigDesc")}
                    </CardDescription>
                  </div>
                  <Dialog open={isAddLeaderOpen} onOpenChange={setIsAddLeaderOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("hr.buTeam.addLeader")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("hr.buTeam.addLeaderTitle")}</DialogTitle>
                        <DialogDescription>
                          {t("hr.buTeam.addLeaderDesc")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>{t("hr.buTeam.buLabel")} *</Label>
                          <Select
                            value={newLeader.buCode}
                            onValueChange={(v) => setNewLeader({ ...newLeader, buCode: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("hr.buTeam.selectBU")} />
                            </SelectTrigger>
                            <SelectContent>
                              {busData?.bus.map((bu) => (
                                <SelectItem key={bu.code} value={bu.code}>{bu.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("hr.buTeam.roleType")} *</Label>
                          <Select
                            value={newLeader.roleType}
                            onValueChange={(v) => setNewLeader({ ...newLeader, roleType: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("hr.buTeam.selectRoleType")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sales">{t("hr.buTeam.roleSales")}</SelectItem>
                              <SelectItem value="Mech">{t("hr.buTeam.roleMech")}</SelectItem>
                              <SelectItem value="Elec">{t("hr.buTeam.roleElec")}</SelectItem>
                              <SelectItem value="Procurement">{t("hr.buTeam.roleProcurement")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("hr.buTeam.leaderName")} *</Label>
                          <Input
                            placeholder={t("hr.buTeam.enterLeaderName")}
                            value={newLeader.leaderName}
                            onChange={(e) => setNewLeader({ ...newLeader, leaderName: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("hr.buTeam.email")}</Label>
                          <Input
                            type="email"
                            placeholder={t("hr.buTeam.enterEmail")}
                            value={newLeader.leaderEmail}
                            onChange={(e) => setNewLeader({ ...newLeader, leaderEmail: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("hr.buTeam.phone")}</Label>
                          <Input
                            placeholder={t("hr.buTeam.enterPhone")}
                            value={newLeader.leaderPhone}
                            onChange={(e) => setNewLeader({ ...newLeader, leaderPhone: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddLeaderOpen(false)}>{t("hr.buTeam.cancel")}</Button>
                        <Button onClick={handleAddLeader} disabled={setLeaderMutation.isPending}>
                          {setLeaderMutation.isPending ? t("hr.buTeam.setting") : t("hr.buTeam.confirmSetting")}
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
                                const roleNameKey = {
                                  'Sales': 'hr.buTeam.salesLeader',
                                  'Mech': 'hr.buTeam.mechLeader',
                                  'Elec': 'hr.buTeam.elecLeader',
                                  'Procurement': 'hr.buTeam.procurementLeader',
                                }[roleType] as string;
                                const roleName = t(roleNameKey);
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
                                            if (confirm(t("hr.buTeam.confirmDeleteLeader"))) {
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
                                      <p className="text-sm text-muted-foreground">{t("hr.buTeam.notSet")}</p>
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
  );
}
