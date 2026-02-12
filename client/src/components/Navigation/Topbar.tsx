/**
 * 顶部导航栏组件
 * 显示顶部菜单和用户信息
 */

import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useFrequentMenus, useSearchMenus } from '@/_core/hooks/useMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Search, Bell, Settings, LogOut, User } from 'lucide-react';
import './Topbar.css';

/**
 * 顶部导航栏组件
 */
export function Topbar({
  onMenuToggle,
}: {
  onMenuToggle?: () => void;
}) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { results: searchResults } = useSearchMenus(searchQuery);
  const { menus: frequentMenus } = useFrequentMenus(5);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="topbar h-16 bg-background border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
      {/* 左侧：菜单切换和搜索 */}
      <div className="flex items-center gap-4 flex-1">
        {/* 菜单切换按钮（移动设备） */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* 搜索框 */}
        <div className="hidden md:flex flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索菜单、功能..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />

          {/* 搜索结果下拉 */}
          {searchQuery && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-md shadow-lg z-50">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                >
                  {result.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：通知、设置、用户菜单 */}
      <div className="flex items-center gap-2">
        {/* 通知按钮 */}
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>

        {/* 设置按钮 */}
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>

        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-semibold">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* 常用菜单 */}
            {frequentMenus.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs">
                  常用功能
                </DropdownMenuLabel>
                {frequentMenus.map((menu) => (
                  <DropdownMenuItem key={menu.id}>
                    {menu.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {/* 用户选项 */}
            <DropdownMenuItem>个人资料</DropdownMenuItem>
            <DropdownMenuItem>账户设置</DropdownMenuItem>
            <DropdownMenuItem>帮助与反馈</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/**
 * 面包屑导航组件
 */
export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; path?: string }>;
}) {
  return (
    <nav className="breadcrumb flex items-center gap-2 px-4 py-2 bg-muted/50 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-muted-foreground">/</span>}
          {item.path ? (
            <a href={item.path} className="text-primary hover:underline">
              {item.label}
            </a>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
