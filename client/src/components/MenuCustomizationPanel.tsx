/**
 * 菜单自定义面板
 * 让用户收藏/隐藏/管理菜单项
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { menuConfig, type MenuGroup } from "@/config/menuConfig";
import { useMenuFavorites } from "@/hooks/useMenuFavorites";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { cn } from "@/lib/utils";
import { Settings2, Star, Eye, EyeOff, RotateCcw, StarOff } from "lucide-react";

interface MenuCustomizationPanelProps {
  className?: string;
}

export function MenuCustomizationPanel({ className }: MenuCustomizationPanelProps) {
  const [open, setOpen] = useState(false);
  const { toggleFavorite, isFavorite, hideItem, showItem, isHidden, resetAll, favoritesCount, hiddenCount } = useMenuFavorites();
  const { currentUserRole, permissions } = useUserProfile();
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;

  // 过滤出当前角色可见的菜单
  const visibleGroups = menuConfig.filter(group => {
    if (group.allowedRoles?.length && !group.allowedRoles.includes(currentUserRole)) return false;
    if (group.minLevel != null && currentLevel < group.minLevel) return false;
    if (group.permissionKey && permissions) {
      const key = group.permissionKey as keyof typeof permissions;
      if (key in permissions && !permissions[key]) return false;
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-xs text-muted-foreground hover:text-foreground", className)}>
          <Settings2 className="h-3.5 w-3.5 mr-1" />
          自定义
          {(favoritesCount > 0 || hiddenCount > 0) && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{favoritesCount + hiddenCount}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            菜单自定义
          </DialogTitle>
          <DialogDescription>
            收藏常用菜单项（显示在顶部快捷区），隐藏不常用菜单项
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-500" />{favoritesCount}项收藏</span>
            <span className="flex items-center gap-1"><EyeOff className="h-3.5 w-3.5" />{hiddenCount}项隐藏</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetAll}>
            <RotateCcw className="h-3 w-3 mr-1" />重置
          </Button>
        </div>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-4">
            {visibleGroups.map(group => {
              const GroupIcon = group.icon;
              const visibleItems = group.items.filter(item => {
                if (item.allowedRoles?.length && !item.allowedRoles.includes(currentUserRole)) return false;
                if (item.minLevel != null && currentLevel < item.minLevel) return false;
                return true;
              });
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.name}>
                  <div className="flex items-center gap-2 py-1.5 text-sm font-medium">
                    <GroupIcon className="h-4 w-4 text-primary" />
                    {group.name}
                    <Badge variant="outline" className="text-[10px]">{visibleItems.length}项</Badge>
                  </div>
                  <div className="space-y-1 ml-6">
                    {visibleItems.map(item => {
                      const ItemIcon = item.icon;
                      const fav = isFavorite(item.path);
                      const hidden = isHidden(item.path);

                      return (
                        <div key={item.path} className={cn("flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/50", hidden && "opacity-50")}>
                          <ItemIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="flex-1 text-sm">{item.name}</span>
                          {item.isNew && <Badge className="h-4 px-1 text-[9px] bg-emerald-100 text-emerald-700">NEW</Badge>}
                          <button
                            onClick={() => toggleFavorite(item.path)}
                            className={cn("p-1 rounded hover:bg-accent", fav ? "text-yellow-500" : "text-muted-foreground/40")}
                            title={fav ? "取消收藏" : "添加收藏"}
                          >
                            <Star className={cn("h-3.5 w-3.5", fav && "fill-yellow-500")} />
                          </button>
                          <button
                            onClick={() => hidden ? showItem(item.path) : hideItem(item.path)}
                            className={cn("p-1 rounded hover:bg-accent", hidden ? "text-muted-foreground" : "text-muted-foreground/40")}
                            title={hidden ? "显示" : "隐藏"}
                          >
                            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default MenuCustomizationPanel;
