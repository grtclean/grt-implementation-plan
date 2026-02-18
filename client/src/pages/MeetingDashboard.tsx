/**
 * Meeting Dashboard
 * 会议列表和管理界面
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  channelId: string;
  startTime: string;
  endTime?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  meetingType: string;
  projectPhase?: string;
  revenueTarget?: number;
  profitMargin?: number;
}

export default function MeetingDashboard() {
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    description: "",
    channelId: "",
    startTime: "",
    meetingType: "standup",
    projectPhase: "M0",
  });

  // 获取会议列表
  const { data: meetings = [], isLoading: meetingsLoading } =
    (trpc.meeting as any).list.useQuery({
      channelId: selectedChannel || undefined,
      status: selectedStatus || undefined,
      meetingType: selectedType || undefined,
    });

  // 获取频道列表
  const { data: channels = [] } = (trpc as any).channels.list.useQuery();

  // 创建会议
  const createMeetingMutation = (trpc.meeting as any).create.useMutation({
    onSuccess: () => {
      setIsCreateOpen(false);
      setNewMeeting({
        title: "",
        description: "",
        channelId: "",
        startTime: "",
        meetingType: "standup",
        projectPhase: "M0",
      });
    },
  });

  // 删除会议
  const deleteMeetingMutation = (trpc.meeting as any).delete.useMutation();

  // 过滤会议
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting: Meeting) => {
      if (searchTerm) {
        return meeting.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [meetings, searchTerm]);

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.channelId || !newMeeting.startTime) {
      alert("请填写必填字段");
      return;
    }

    await createMeetingMutation.mutateAsync({
      title: newMeeting.title,
      description: newMeeting.description,
      channelId: newMeeting.channelId,
      startTime: new Date(newMeeting.startTime),
      meetingType: newMeeting.meetingType as any,
      projectPhase: newMeeting.projectPhase,
    });
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (window.confirm("确定要删除这个会议吗？")) {
      await deleteMeetingMutation.mutateAsync({ id: meetingId });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "已计划",
      in_progress: "进行中",
      completed: "已完成",
      cancelled: "已取消",
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Calendar}
        title="会议管理"
        description="会议列表和管理界面"
        actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              创建会议
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>创建新会议</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  会议标题 *
                </label>
                <Input
                  placeholder="输入会议标题"
                  value={newMeeting.title}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  描述
                </label>
                <Input
                  placeholder="输入会议描述"
                  value={newMeeting.description}
                  onChange={(e) =>
                    setNewMeeting({
                      ...newMeeting,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  频道 *
                </label>
                <Select
                  value={newMeeting.channelId}
                  onValueChange={(value) =>
                    setNewMeeting({ ...newMeeting, channelId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择频道" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel: any) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  开始时间 *
                </label>
                <Input
                  type="datetime-local"
                  value={newMeeting.startTime}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, startTime: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  会议类型
                </label>
                <Select
                  value={newMeeting.meetingType}
                  onValueChange={(value) =>
                    setNewMeeting({ ...newMeeting, meetingType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standup">站会</SelectItem>
                    <SelectItem value="review">评审</SelectItem>
                    <SelectItem value="planning">计划</SelectItem>
                    <SelectItem value="retrospective">回顾</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  项目阶段
                </label>
                <Select
                  value={newMeeting.projectPhase}
                  onValueChange={(value) =>
                    setNewMeeting({ ...newMeeting, projectPhase: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => `M${i}`).map(
                      (phase) => (
                        <SelectItem key={phase} value={phase}>
                          {phase}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateMeeting}
                disabled={createMeetingMutation.isPending}
                className="w-full"
              >
                {createMeetingMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建会议"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      {/* 过滤器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">搜索</label>
              <Input
                placeholder="搜索会议标题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">频道</label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="所有频道" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">所有频道</SelectItem>
                  {channels.map((channel: any) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">状态</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="所有状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">所有状态</SelectItem>
                  <SelectItem value="scheduled">已计划</SelectItem>
                  <SelectItem value="in_progress">进行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">类型</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="所有类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">所有类型</SelectItem>
                  <SelectItem value="standup">站会</SelectItem>
                  <SelectItem value="review">评审</SelectItem>
                  <SelectItem value="planning">计划</SelectItem>
                  <SelectItem value="retrospective">回顾</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 会议列表 */}
      {meetingsLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">暂无会议</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMeetings.map((meeting: Meeting) => (
            <Card key={meeting.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{meeting.title}</h3>
                      <Badge className={getStatusBadgeColor(meeting.status)}>
                        {getStatusLabel(meeting.status)}
                      </Badge>
                      {meeting.projectPhase && (
                        <Badge variant="outline">{meeting.projectPhase}</Badge>
                      )}
                    </div>

                    {meeting.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {meeting.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(
                          new Date(meeting.startTime),
                          "PPP HH:mm",
                          { locale: zhCN }
                        )}
                      </div>

                      <div>类型: {meeting.meetingType}</div>

                      {meeting.revenueTarget && (
                        <div>收入目标: ¥{meeting.revenueTarget}M</div>
                      )}

                      {meeting.profitMargin && (
                        <div>利润率: {meeting.profitMargin}%</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        // 导航到会议详情
                        window.location.href = `/meeting-intelligence`;
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      查看
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        // 导航到编辑页面
                        window.location.href = `/meeting-intelligence`;
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                      编辑
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      disabled={deleteMeetingMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
