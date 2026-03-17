import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Award, TrendingUp, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CapabilityManagementPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // 获取能力数据
  const { data: capabilities, isLoading, refetch } = (trpc.capability as any).listCapabilities.useQuery({});

  // 能力操作mutations
  const createCapabilityMutation = trpc.capability.createCapability.useMutation({
    onSuccess: () => {
      toast({ title: t("hr.capMgmt.createSuccess") });
      refetch();
    },
    onError: (error) => {
      toast({ title: t("hr.capMgmt.error"), description: error.message, variant: "destructive" });
    },
  });

  const upgradeCapabilityMutation = (trpc.capability as any).upgradeCapability.useMutation({
    onSuccess: () => {
      toast({ title: t("hr.capMgmt.upgradeSuccess") });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: t("hr.capMgmt.error"), description: error.message, variant: "destructive" });
    },
  });

  const filteredCapabilities = capabilities?.filter((capability: any) =>
    capability.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">{t("hr.capMgmt.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Award} title={t("hr.capMgmt.title")} description={t("hr.capMgmt.desc")} />

      {/* 快速统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Award} label={t("hr.capMgmt.totalCapabilities")} value={capabilities?.length || 0} iconColor="text-purple-500" iconBg="bg-purple-50" />
        <StatCard icon={TrendingUp} label={t("hr.capMgmt.pendingUpgrade")} value={capabilities?.filter((c: any) => c.status === "pending_upgrade").length || 0} iconColor="text-green-500" iconBg="bg-green-50" />
        <StatCard icon={Award} label={t("hr.capMgmt.certified")} value={capabilities?.filter((c: any) => c.status === "certified").length || 0} iconColor="text-blue-500" iconBg="bg-blue-50" />
        <StatCard icon={Users} label={t("hr.capMgmt.involvedPersonnel")} value={new Set(capabilities?.map((c: any) => c.employeeId)).size || 0} iconColor="text-orange-500" iconBg="bg-orange-50" />
      </div>

      {/* 搜索和操作 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("hr.capMgmt.capabilityList")}</CardTitle>
          <CardDescription>{t("hr.capMgmt.capabilityListDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder={t("hr.capMgmt.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("hr.capMgmt.newCapability")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 能力列表 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t("hr.capMgmt.tabAll")}</TabsTrigger>
          <TabsTrigger value="pending">{t("hr.capMgmt.tabPending")}</TabsTrigger>
          <TabsTrigger value="certified">{t("hr.capMgmt.tabCertified")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-2">
            {filteredCapabilities.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {t("hr.capMgmt.noRecords")}
                </CardContent>
              </Card>
            ) : (
              filteredCapabilities.map((capability: any) => (
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
                              ? t("hr.capMgmt.statusCertified")
                              : capability.status === "pending_upgrade"
                                ? t("hr.capMgmt.statusPending")
                                : t("hr.capMgmt.statusInProgress")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {t("hr.capMgmt.employeeId")}: {capability.employeeId}
                        </p>
                        <div className="flex gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">{t("hr.capMgmt.currentLevel")}</p>
                            <p className="text-sm font-medium">{capability.currentLevel || t("hr.capMgmt.levelBeginner")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t("hr.capMgmt.targetLevel")}</p>
                            <p className="text-sm font-medium">{capability.targetLevel || t("hr.capMgmt.levelIntermediate")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t("hr.capMgmt.evidenceCount")}</p>
                            <p className="text-sm font-medium">
                              {capability.evidenceCount || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          {t("hr.capMgmt.viewDetails")}
                        </Button>
                        {capability.status === "pending_upgrade" && (
                          <Button size="sm">{t("hr.capMgmt.upgradeAssessment")}</Button>
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
            {filteredCapabilities.filter((c: any) => c.status === "pending_upgrade").length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {t("hr.capMgmt.noPendingUpgrade")}
                </CardContent>
              </Card>
            ) : (
              filteredCapabilities
                .filter((c: any) => c.status === "pending_upgrade")
                .map((capability: any) => (
                  <Card key={capability.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{capability.name}</h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            从 {capability.currentLevel} 升级到 {capability.targetLevel}
                          </p>
                        </div>
                        <Button size="sm">{t("hr.capMgmt.startUpgradeAssessment")}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="certified">
          <div className="space-y-2">
            {filteredCapabilities.filter((c: any) => c.status === "certified").length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {t("hr.capMgmt.noCertified")}
                </CardContent>
              </Card>
            ) : (
              filteredCapabilities
                .filter((c: any) => c.status === "certified")
                .map((capability: any) => (
                  <Card key={capability.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">{capability.name}</h3>
                            <Badge>{t("hr.capMgmt.statusCertified")}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {t("hr.capMgmt.levelLabel")}: {capability.currentLevel}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          {t("hr.capMgmt.viewCertificate")}
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
  );
}
