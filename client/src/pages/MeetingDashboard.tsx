/**
 * Meeting Dashboard
 * 会议列表和管理界面
 */

import React, { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
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

  const utils = trpc.useUtils();

  // 获取会议列表
  const { data: meetings = [], isLoading: meetingsLoading } =
    trpc.meeting.meetings.list.useQuery({
      channelId: selectedChannel || "00000000-0000-0000-0000-000000000000",
      limit: 50,
    });

  // 获取频道列表
  const { data: channels = [] } = trpc.meeting.channels.list.useQuery();

  // 创建会议
  const createMeetingMutation = trpc.meeting.meetings.create.useMutation({
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
      utils.meeting.meetings.list.invalidate();
    },
  });

  // 删除会议
  const deleteMeetingMutation = (trpc.meeting.meetings as any).delete?.useMutation?.({
    onSuccess: () => {
      utils.meeting.meetings.list.invalidate();
    },
  }) ?? { mutateAsync: async () => {}, isPending: false };

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
      alert(t("mi.dashboard.fillRequired"));
      return;
    }

    await createMeetingMutation.mutateAsync({
      title: newMeeting.title,
      channelId: newMeeting.channelId,
      meetingDate: newMeeting.startTime,
      phase: newMeeting.projectPhase,
      objective: newMeeting.description || undefined,
    });
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (window.confirm(t("mi.dashboard.confirmDelete"))) {
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
    const keyMap: Record<string, string> = {
      scheduled: "mi.dashboard.statusScheduled",
      in_progress: "mi.dashboard.statusInProgress",
      completed: "mi.dashboard.statusCompleted",
      cancelled: "mi.dashboard.statusCancelled",
    };
    return keyMap[status] ? t(keyMap[status]) : status;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Calendar}
        title={t("mi.dashboard.title")}
        description={t("mi.dashboard.desc")}
        actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t("mi.dashboard.createMeeting")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("mi.dashboard.createNew")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("mi.dashboard.meetingTitleRequired")}
                </label>
                <Input
                  placeholder={t("mi.dashboard.enterTitle")}
                  value={newMeeting.title}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("mi.dashboard.description")}
                </label>
                <Input
                  placeholder={t("mi.dashboard.enterDescription")}
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
                  {t("mi.dashboard.channelRequired")}
                </label>
                <Select
                  value={newMeeting.channelId}
                  onValueChange={(value) =>
                    setNewMeeting({ ...newMeeting, channelId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("mi.dashboard.selectChannel")} />
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
                  {t("mi.dashboard.startTimeRequired")}
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
                  {t("mi.dashboard.meetingType")}
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
                    <SelectItem value="standup">{t("mi.dashboard.typeStandup")}</SelectItem>
                    <SelectItem value="review">{t("mi.dashboard.typeReview")}</SelectItem>
                    <SelectItem value="planning">{t("mi.dashboard.typePlanning")}</SelectItem>
                    <SelectItem value="retrospective">{t("mi.dashboard.typeRetrospective")}</SelectItem>
                    <SelectItem value="other">{t("mi.dashboard.typeOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("mi.dashboard.projectPhase")}
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
                    {t("mi.dashboard.creating")}
                  </>
                ) : (
                  t("mi.dashboard.createMeeting")
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
              <label className="block text-sm font-medium mb-1">{t("mi.dashboard.search")}</label>
              <Input
                placeholder={t("mi.dashboard.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("mi.dashboard.channel")}</label>
              <Select value={selectedChannel || "__all__"} onValueChange={(v) => setSelectedChannel(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("mi.dashboard.allChannels")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("mi.dashboard.allChannels")}</SelectItem>
                  {channels.map((channel: any) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("mi.dashboard.status")}</label>
              <Select value={selectedStatus || "__all__"} onValueChange={(v) => setSelectedStatus(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("mi.dashboard.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("mi.dashboard.allStatuses")}</SelectItem>
                  <SelectItem value="scheduled">{t("mi.dashboard.statusScheduled")}</SelectItem>
                  <SelectItem value="in_progress">{t("mi.dashboard.statusInProgress")}</SelectItem>
                  <SelectItem value="completed">{t("mi.dashboard.statusCompleted")}</SelectItem>
                  <SelectItem value="cancelled">{t("mi.dashboard.statusCancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("mi.dashboard.type")}</label>
              <Select value={selectedType || "__all__"} onValueChange={(v) => setSelectedType(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("mi.dashboard.allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("mi.dashboard.allTypes")}</SelectItem>
                  <SelectItem value="standup">{t("mi.dashboard.typeStandup")}</SelectItem>
                  <SelectItem value="review">{t("mi.dashboard.typeReview")}</SelectItem>
                  <SelectItem value="planning">{t("mi.dashboard.typePlanning")}</SelectItem>
                  <SelectItem value="retrospective">{t("mi.dashboard.typeRetrospective")}</SelectItem>
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
            <p className="text-gray-500">{t("mi.dashboard.noMeetings")}</p>
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

                      <div>{t("mi.dashboard.typeLabel")}: {meeting.meetingType}</div>

                      {meeting.revenueTarget && (
                        <div>{t("mi.dashboard.revenueTarget")}: ¥{meeting.revenueTarget}M</div>
                      )}

                      {meeting.profitMargin && (
                        <div>{t("mi.dashboard.profitMargin")}: {meeting.profitMargin}%</div>
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
                      {t("mi.dashboard.view")}
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
                      {t("mi.dashboard.edit")}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      disabled={deleteMeetingMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t("mi.dashboard.delete")}
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
