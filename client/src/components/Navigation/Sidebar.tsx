/**
 * 侧边栏菜单组件
 * 显示左侧菜单导航
 */

import { useState } from 'react';
import { Link } from 'wouter';
import { useUserMenuTree, useLogMenuAccess } from '@/_core/hooks/useMenu';
import { MenuItemWithChildren } from '../../../../drizzle/menu-schema';
import { ChevronDown, ChevronRight, Search, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import './Sidebar.css';

/**
 * 侧边栏菜单组件
 */
export function Sidebar() {
  const { menuTree, isLoading } = useUserMenuTree();
  const { logAccess } = useLogMenuAccess();
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleMenuExpand = (menuId: number) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const handleMenuClick = (menuItem: MenuItemWithChildren) => {
    logAccess(menuItem.id);
  };

  const filteredMenuTree = filterMenuTree(menuTree as MenuItemWithChildren[], searchQuery);

  return (
    <div className="sidebar h-screen bg-background border-r border-border flex flex-col">
      {/* 搜索框 */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索菜单..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 菜单列表 */}
      <nav className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : filteredMenuTree.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {searchQuery ? '未找到菜单' : '无可用菜单'}
          </div>
        ) : (
          <MenuTree
            items={filteredMenuTree}
            expandedMenus={expandedMenus}
            onToggleExpand={toggleMenuExpand}
            onMenuClick={handleMenuClick}
          />
        )}
      </nav>

      {/* 底部设置 */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" size="sm" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          菜单设置
        </Button>
      </div>
    </div>
  );
}

/**
 * 菜单树组件
 */
function MenuTree({
  items,
  expandedMenus,
  onToggleExpand,
  onMenuClick,
  level = 0,
}: {
  items: MenuItemWithChildren[];
  expandedMenus: Set<number>;
  onToggleExpand: (menuId: number) => void;
  onMenuClick: (menu: MenuItemWithChildren) => void;
  level?: number;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <MenuItem
          key={item.id}
          item={item}
          isExpanded={expandedMenus.has(item.id)}
          onToggleExpand={onToggleExpand}
          onMenuClick={onMenuClick}
          level={level}
        />
      ))}
    </ul>
  );
}

/**
 * 菜单项组件
 */
function MenuItem({
  item,
  isExpanded,
  onToggleExpand,
  onMenuClick,
  level,
}: {
  item: MenuItemWithChildren;
  isExpanded: boolean;
  onToggleExpand: (menuId: number) => void;
  onMenuClick: (menu: MenuItemWithChildren) => void;
  level: number;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isClickable = item.path && !hasChildren;

  const handleClick = () => {
    if (hasChildren) {
      onToggleExpand(item.id);
    } else {
      onMenuClick(item);
    }
  };

  const menuItemContent = (
    <div className="flex items-center gap-2">
      {item.icon && (
        <span className="w-5 h-5 flex-shrink-0">
          {/* 这里应该使用动态图标加载 */}
          <span className="text-base">{item.icon}</span>
        </span>
      )}
      <span className="flex-1 truncate text-sm">{item.name}</span>
      {item.badge && (
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-semibold',
            item.badgeColor === 'red'
              ? 'bg-red-100 text-red-800'
              : item.badgeColor === 'green'
              ? 'bg-green-100 text-green-800'
              : item.badgeColor === 'blue'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          )}
        >
          {item.badge}
        </span>
      )}
      {hasChildren && (
        <span className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
      )}
    </div>
  );

  return (
    <li>
      {isClickable && item.path ? (
        <Link href={item.path}>
          <button
            className={cn(
              'w-full text-left px-3 py-2 rounded-md transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
            style={{ paddingLeft: `${12 + level * 12}px` }}
          >
            {menuItemContent}
          </button>
        </Link>
      ) : (
        <button
          onClick={handleClick}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary'
          )}
          style={{ paddingLeft: `${12 + level * 12}px` }}
        >
          {menuItemContent}
        </button>
      )}

      {/* 子菜单 */}
      {hasChildren && isExpanded && (
        <MenuTree
          items={item.children!}
          expandedMenus={new Set()}
          onToggleExpand={onToggleExpand}
          onMenuClick={onMenuClick}
          level={level + 1}
        />
      )}
    </li>
  );
}

/**
 * 过滤菜单树
 */
function filterMenuTree(
  items: MenuItemWithChildren[],
  query: string
): MenuItemWithChildren[] {
  if (!query) {
    return items;
  }

  const lowerQuery = query.toLowerCase();

  return items
    .map((item) => {
      const matchesQuery =
        item.name.toLowerCase().includes(lowerQuery) ||
        item.code.toLowerCase().includes(lowerQuery);

      const filteredChildren =
        item.children && item.children.length > 0
          ? filterMenuTree(item.children, query)
          : [];

      if (matchesQuery || filteredChildren.length > 0) {
        return {
          ...item,
          children:
            filteredChildren.length > 0
              ? filteredChildren
              : item.children,
        };
      }

      return null;
    })
    .filter((item) => item !== null) as MenuItemWithChildren[];
}
