/**
 * Channel Sidebar Navigator
 * 频道导航侧边栏 - 树形视图，支持权限过滤和机密频道标识
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Lock,
  Plus,
  Hash,
  Users,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  description?: string;
  is_confidential: boolean;
  user_role?: string;
  children?: Channel[];
}

interface ChannelSidebarProps {
  selectedChannelId?: string;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelSidebar({ selectedChannelId, onSelectChannel }: ChannelSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelConfidential, setNewChannelConfidential] = useState(false);

  const { data: channelTree, isLoading, refetch } = trpc.meeting.channels.tree.useQuery();
  const createChannel = trpc.meeting.channels.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateDialogOpen(false);
      setNewChannelName("");
      setNewChannelConfidential(false);
    },
  });

  const filterChannels = (channels: Channel[], query: string): Channel[] => {
    if (!query) return channels;
    
    return channels.reduce((acc: Channel[], channel) => {
      const matchesQuery = channel.name.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = channel.children ? filterChannels(channel.children, query) : [];
      
      if (matchesQuery || filteredChildren.length > 0) {
        acc.push({
          ...channel,
          children: filteredChildren.length > 0 ? filteredChildren : channel.children,
        });
      }
      return acc;
    }, []);
  };

  const filteredChannels = channelTree ? filterChannels(channelTree, searchQuery) : [];

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannel.mutate({
      name: newChannelName.trim(),
      isConfidential: newChannelConfidential,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1120] border-r border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            频道
          </h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0F172A] border-border/50">
              <DialogHeader>
                <DialogTitle>创建新频道</DialogTitle>
                <DialogDescription>
                  创建一个新的会议频道来组织您的会议记录
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">频道名称</label>
                  <Input
                    placeholder="输入频道名称..."
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confidential"
                    checked={newChannelConfidential}
                    onChange={(e) => setNewChannelConfidential(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="confidential" className="text-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    设为机密频道
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateChannel} disabled={createChannel.isPending}>
                  {createChannel.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Search */}
        <Input
          placeholder="搜索频道..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-background/30 border-border/50 h-8 text-sm"
        />
      </div>

      {/* Channel Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? "未找到匹配的频道" : "暂无频道"}
            </div>
          ) : (
            filteredChannels.map((channel) => (
              <ChannelTreeItem
                key={channel.id}
                channel={channel}
                selectedId={selectedChannelId}
                onSelect={onSelectChannel}
                level={0}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-3 border-t border-border/50 bg-background/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {channelTree?.length || 0} 个频道
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            权限已验证
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Channel Tree Item Component
// ============================================================================

interface ChannelTreeItemProps {
  channel: Channel;
  selectedId?: string;
  onSelect: (channel: Channel) => void;
  level: number;
}

function ChannelTreeItem({ channel, selectedId, onSelect, level }: ChannelTreeItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = channel.children && channel.children.length > 0;
  const isSelected = channel.id === selectedId;

  return (
    <div className="select-none">
      {hasChildren ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                "hover:bg-primary/10",
                isSelected && "bg-primary/20 text-primary"
              )}
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(channel);
              }}
            >
              <span className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </span>
              {isOpen ? (
                <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate text-sm flex-1">{channel.name}</span>
              {channel.is_confidential && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] border-rose-500/50 text-rose-400">
                  <Lock className="w-2.5 h-2.5 mr-0.5" />
                  机密
                </Badge>
              )}
              {channel.user_role && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {getRoleLabel(channel.user_role)}
                </Badge>
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {channel.children?.map((child) => (
              <ChannelTreeItem
                key={child.id}
                channel={child}
                selectedId={selectedId}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
            "hover:bg-primary/10",
            isSelected && "bg-primary/20 text-primary"
          )}
          style={{ paddingLeft: `${level * 12 + 24}px` }}
          onClick={() => onSelect(channel)}
        >
          <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate text-sm flex-1">{channel.name}</span>
          {channel.is_confidential && (
            <Badge variant="outline" className="h-4 px-1 text-[10px] border-rose-500/50 text-rose-400">
              <Lock className="w-2.5 h-2.5 mr-0.5" />
              机密
            </Badge>
          )}
          {channel.user_role && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {getRoleLabel(channel.user_role)}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function getRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    owner: "所有者",
    admin: "管理员",
    member: "成员",
    viewer: "查看者",
  };
  return roleMap[role] || role;
}

export default ChannelSidebar;
