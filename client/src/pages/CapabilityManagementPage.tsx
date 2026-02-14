import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Award, TrendingUp, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

export default function CapabilityManagementPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // 获取能力数据
  const { data: capabilities, isLoading, refetch } = (trpc.capability as any).listCapabilities.useQuery({});

  // 能力操作mutations
  const createCapabilityMutation = trpc.capability.createCapability.useMutation({
    onSuccess: () => {
      toast({ title: "能力创建成功" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const upgradeCapabilityMutation = (trpc.capability as any).upgradeCapability.useMutation({
    onSuccess: () => {
      toast({ title: "能力升级成功" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const filteredCapabilities = capabilities?.filter((capability) =>
    capability.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader icon={Award} title="能力管理" description="管理员工能力、证据、升级评估和发展路径" />

      {/* 快速统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Award} label="总能力数" value={capabilities?.length || 0} iconColor="text-purple-500" iconBg="bg-purple-50" />
        <StatCard icon={TrendingUp} label="待升级" value={capabilities?.filter((c) => c.status === "pending_upgrade").length || 0} iconColor="text-green-500" iconBg="bg-green-50" />
        <StatCard icon={Award} label="已认证" value={capabilities?.filter((c) => c.status === "certified").length || 0} iconColor="text-blue-500" iconBg="bg-blue-50" />
        <StatCard icon={Users} label="涉及人员" value={new Set(capabilities?.map((c) => c.employeeId)).size || 0} iconColor="text-orange-500" iconBg="bg-orange-50" />
      </div>

      {/* 搜索和操作 */}
      <Card>
        <CardHeader>
          <CardTitle>能力列表</CardTitle>
          <CardDescription>查看和管理所有员工能力</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="搜索能力名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建能力
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 能力列表 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">全部能力</TabsTrigger>
          <TabsTrigger value="pending">待升级</TabsTrigger>
          <TabsTrigger value="certified">已认证</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-2">
            {filteredCapabilities.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  没有找到能力记录
                </CardContent>
              </Card>
            ) : (
              filteredCapabilities.map((capability) => (
                <Card key={capability.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-lg">{capability.name}</h3>
                          <Badge
                            variant={
                              capability.status === "certified"
                                ? "default"
                                : capability.status === "pending_upgrade"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {capability.status === "certified"
                              ? "已认证"
                              : capability.status === "pending_upgrade"
                                ? "待升级"
                                : "进行中"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          员工ID: {capability.employeeId}
                        </p>
                        <div className="flex gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">当前级别</p>
                            <p className="text-sm font-medium">{capability.currentLevel || "初级"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">目标级别</p>
                            <p className="text-sm font-medium">{capability.targetLevel || "中级"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">证据数量</p>
                            <p className="text-sm font-medium">
                              {capability.evidenceCount || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          查看详情
                        </Button>
                        {capability.status === "pending_upgrade" && (
                          <Button size="sm">升级评估</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <div className="space-y-2">
            {filteredCapabilities.filter((c) => c.status === "pending_upgrade").length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  没有待升级的能力
                </CardContent>
              </Card>
            ) : (
              filteredCapabilities
                .filter((c) => c.status === "pending_upgrade")
                .map((capability) => (
                  <Card key={capability.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{capability.name}</h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            从 {capability.currentLevel} 升级到 {capability.targetLevel}
                          </p>
                        </div>
                        <Button size="sm">开始升级评估</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="certified">
          <div className="space-y-2">
            {filteredCapabilities.filter((c) => c.status === "certified").length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  没有已认证的能力
                </CardContent>
              </Card>
            ) : (
              filteredCapabilities
                .filter((c) => c.status === "certified")
                .map((capability) => (
                  <Card key={capability.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">{capability.name}</h3>
                            <Badge>已认证</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            级别: {capability.currentLevel}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          查看证书
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
