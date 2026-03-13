import { useEffect, useState } from "react";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Edit2, Trash2, Eye, EyeOff, Menu } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MenuManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<"all" | "primary" | "secondary">("all");

  // 获取菜单数据
  const { data: menuData, isLoading, refetch } = (trpc.menu as any).getMenuTree.useQuery({});

  // 菜单操作mutations
  const createMenuMutation = trpc.menu.createMenuItem.useMutation({
    onSuccess: () => {
      toast({ title: t("admin.menuMgmt.createSuccess") });
      refetch();
    },
    onError: (error) => {
      toast({ title: t("admin.menuMgmt.error"), description: error.message, variant: "destructive" });
    },
  });

  const updateMenuMutation = trpc.menu.updateMenuItem.useMutation({
    onSuccess: () => {
      toast({ title: t("admin.menuMgmt.updateSuccess") });
      refetch();
    },
    onError: (error) => {
      toast({ title: t("admin.menuMgmt.error"), description: error.message, variant: "destructive" });
    },
  });

  const deleteMenuMutation = trpc.menu.deleteMenuItem.useMutation({
    onSuccess: () => {
      toast({ title: t("admin.menuMgmt.deleteSuccess") });
      refetch();
    },
    onError: (error) => {
      toast({ title: t("admin.menuMgmt.error"), description: error.message, variant: "destructive" });
    },
  });

  const toggleVisibilityMutation = (trpc.menu as any).toggleMenuItemVisibility.useMutation({
    onSuccess: () => {
      toast({ title: t("admin.menuMgmt.visibilityUpdated") });
      refetch();
    },
    onError: (error) => {
      toast({ title: t("admin.menuMgmt.error"), description: error.message, variant: "destructive" });
    },
  });

  // 筛选菜单项
  const filteredMenus = menuData?.filter((menu) => {
    const matchesSearch = menu.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel =
      selectedLevel === "all" ||
      (selectedLevel === "primary" && !menu.parentId) ||
      (selectedLevel === "secondary" && menu.parentId);
    return matchesSearch && matchesLevel;
  }) || [];

  const primaryMenus = filteredMenus.filter((m) => !m.parentId);
  const secondaryMenus = filteredMenus.filter((m) => m.parentId);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">{t("admin.menuMgmt.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Menu}
        title={t("admin.menuMgmt.title")}
        description={t("admin.menuMgmt.description")}
      />

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.menuMgmt.searchAndFilter")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">{t("admin.menuMgmt.searchMenu")}</label>
              <Input
                placeholder={t("admin.menuMgmt.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.menuMgmt.menuLevel")}</label>
              <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as any)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.menuMgmt.all")}</SelectItem>
                  <SelectItem value="primary">{t("admin.menuMgmt.primaryMenu")}</SelectItem>
                  <SelectItem value="secondary">{t("admin.menuMgmt.secondaryMenu")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {t("admin.menuMgmt.addMenuItem")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 菜单统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{menuData?.length || 0}</div>
              <p className="text-sm text-muted-foreground mt-2">{t("admin.menuMgmt.totalMenuItems")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{primaryMenus.length}</div>
              <p className="text-sm text-muted-foreground mt-2">{t("admin.menuMgmt.primaryMenu")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{secondaryMenus.length}</div>
              <p className="text-sm text-muted-foreground mt-2">{t("admin.menuMgmt.secondaryMenu")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 菜单列表 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t("admin.menuMgmt.allMenus")}</TabsTrigger>
          <TabsTrigger value="primary">{t("admin.menuMgmt.primaryMenu")}</TabsTrigger>
          <TabsTrigger value="secondary">{t("admin.menuMgmt.secondaryMenu")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.menuMgmt.allMenuItems")}</CardTitle>
              <CardDescription>{t("admin.menuMgmt.allMenuItemsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredMenus.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {t("admin.menuMgmt.noMatchingMenuItems")}
                  </div>
                ) : (
                  filteredMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{menu.label}</h3>
                          <Badge variant={menu.isActive ? "default" : "secondary"}>
                            {menu.isActive ? t("admin.menuMgmt.enabled") : t("admin.menuMgmt.disabled")}
                          </Badge>
                          {menu.parentId && (
                            <Badge variant="outline">{t("admin.menuMgmt.level2")}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("admin.menuMgmt.route")}: {menu.route || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            toggleVisibilityMutation.mutate({
                              menuItemId: menu.id,
                              isActive: !menu.isActive,
                            })
                          }
                        >
                          {menu.isActive ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            deleteMenuMutation.mutate({ menuItemId: menu.id })
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="primary">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.menuMgmt.primaryMenu")}</CardTitle>
              <CardDescription>{t("admin.menuMgmt.primaryMenuDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {primaryMenus.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {t("admin.menuMgmt.noPrimaryMenuItems")}
                  </div>
                ) : (
                  primaryMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{menu.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("admin.menuMgmt.route")}: {menu.route || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secondary">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.menuMgmt.secondaryMenu")}</CardTitle>
              <CardDescription>{t("admin.menuMgmt.secondaryMenuDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {secondaryMenus.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {t("admin.menuMgmt.noSecondaryMenuItems")}
                  </div>
                ) : (
                  secondaryMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{menu.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("admin.menuMgmt.route")}: {menu.route || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
