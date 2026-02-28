import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  Database,
  GraduationCap,
  Loader2,
  MapPin,
  Plus,
  Target,
  Users,
  Video
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";

export default function AgendaManagement() {
  const { t } = useLanguage();
  const [showCreateMeetingDialog, setShowCreateMeetingDialog] = useState(false);
  const [showCreateTrainingDialog, setShowCreateTrainingDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  // Fetch meeting types
  const { data: meetingTypes, isLoading: typesLoading } = trpc.agenda.getMeetingTypes.useQuery();
  
  // Fetch meetings
  const { data: meetings, isLoading: meetingsLoading } = (trpc.agenda.getMeetings as any).useQuery(
    selectedLevel !== "all" ? { level: selectedLevel as any } : undefined
  );
  
  // Fetch trainings
  const { data: trainings } = trpc.agenda.getTrainings.useQuery();
  
  // Fetch annual plans
  const { data: annualPlans } = trpc.agenda.getAnnualPlans.useQuery();

  // Mutations
  const utils = trpc.useUtils();

  const initMeetingTypesMutation = trpc.agenda.initMeetingTypes.useMutation({
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(result.message);
        utils.agenda.getMeetingTypes.invalidate();
      } else {
        toast.error(result?.message || "初始化失败");
      }
    },
    onError: (error) => {
      toast.error("初始化失败: " + error.message);
    },
  });

  const createMeetingMutation = trpc.agenda.createMeeting.useMutation({
    onSuccess: () => {
      toast.success("会议已创建");
      setShowCreateMeetingDialog(false);
      utils.agenda.getMeetings.invalidate();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const createTrainingMutation = trpc.agenda.createTraining.useMutation({
    onSuccess: () => {
      toast.success("培训已创建");
      setShowCreateTrainingDialog(false);
      utils.agenda.getTrainings.invalidate();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  // Level badge colors
  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      company: "bg-red-500/10 text-red-500 border-red-500/20",
      department: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      project: "bg-green-500/10 text-green-500 border-green-500/20",
      team: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      personal: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    const labels: Record<string, string> = {
      company: "公司级",
      department: "部门级",
      project: "项目级",
      team: "班组级",
      personal: "个人级",
    };
    return (
      <Badge variant="outline" className={colors[level] || ""}>
        {labels[level] || level}
      </Badge>
    );
  };

  // Frequency labels
  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: "每日",
      weekly: "每周",
      biweekly: "双周",
      monthly: "每月",
      quarterly: "季度",
      yearly: "年度",
      adhoc: "临时",
    };
    return labels[frequency] || frequency;
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle create meeting
  const handleCreateMeeting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMeetingMutation.mutate({
      typeId: parseInt(formData.get("typeId") as string),
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      level: formData.get("level") as any || "department",
      startTime: new Date(formData.get("startTime") as string).toISOString(),
      endTime: new Date(formData.get("endTime") as string).toISOString(),
      location: formData.get("location") as string || undefined,
      onlineLink: formData.get("onlineLink") as string || undefined,
      agenda: formData.get("agenda") as string || undefined,
    });
  };

  // Handle create training
  const handleCreateTraining = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createTrainingMutation.mutate({
      name: formData.get("name") as string,
      type: formData.get("type") as any || "internal",
      category: formData.get("category") as any || "technical",
      description: formData.get("description") as string || undefined,
      trainerId: formData.get("trainerId") ? parseInt(formData.get("trainerId") as string) : undefined,
      externalTrainer: formData.get("externalTrainer") as string || undefined,
      plannedStartDate: formData.get("plannedStartDate") ? new Date(formData.get("plannedStartDate") as string) : undefined,
      plannedEndDate: formData.get("plannedEndDate") ? new Date(formData.get("plannedEndDate") as string) : undefined,
      durationHours: formData.get("durationHours") ? parseInt(formData.get("durationHours") as string) : undefined,
      location: formData.get("location") as string || undefined,
      maxParticipants: formData.get("maxParticipants") ? parseInt(formData.get("maxParticipants") as string) : undefined,
    });
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={CalendarDays}
          title={t("agenda.title") || "议程管理"}
          description={t("agenda.desc") || "企业会议、培训和年度计划管理"}
          actions={
            (!meetingTypes || meetingTypes.length === 0) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => initMeetingTypesMutation.mutate()}
                disabled={initMeetingTypesMutation.isPending}
              >
                {initMeetingTypesMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-1" />
                )}
                初始化会议类型
              </Button>
            ) : undefined
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Calendar} label="本周会议" value={meetings?.length || 0} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard icon={GraduationCap} label="培训计划" value={(trainings as any)?.length || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Target} label="年度计划" value={annualPlans?.length || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={CalendarDays} label="会议类型" value={meetingTypes?.length || 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="meetings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="meetings">会议日程</TabsTrigger>
            <TabsTrigger value="trainings">培训计划</TabsTrigger>
            <TabsTrigger value="annual">年度计划</TabsTrigger>
            <TabsTrigger value="types">会议类型</TabsTrigger>
          </TabsList>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选层级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部层级</SelectItem>
                    <SelectItem value="company">公司级</SelectItem>
                    <SelectItem value="department">部门级</SelectItem>
                    <SelectItem value="project">项目级</SelectItem>
                    <SelectItem value="team">班组级</SelectItem>
                    <SelectItem value="personal">个人级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog open={showCreateMeetingDialog} onOpenChange={setShowCreateMeetingDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-1" />
                    新建会议
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新建会议</DialogTitle>
                    <DialogDescription>创建新的会议日程</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateMeeting} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="typeId">会议类型</Label>
                        <Select name="typeId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="选择会议类型" />
                          </SelectTrigger>
                          <SelectContent>
                            {meetingTypes?.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="level">会议层级</Label>
                        <Select name="level" defaultValue="department">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="company">公司级</SelectItem>
                            <SelectItem value="department">部门级</SelectItem>
                            <SelectItem value="project">项目级</SelectItem>
                            <SelectItem value="team">班组级</SelectItem>
                            <SelectItem value="personal">个人级</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">会议标题</Label>
                      <Input id="title" name="title" required placeholder="输入会议标题" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startTime">开始时间</Label>
                        <Input id="startTime" name="startTime" type="datetime-local" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">结束时间</Label>
                        <Input id="endTime" name="endTime" type="datetime-local" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location">会议地点</Label>
                        <Input id="location" name="location" placeholder="会议室/地点" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="onlineLink">线上链接</Label>
                        <Input id="onlineLink" name="onlineLink" placeholder="视频会议链接" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">会议描述</Label>
                      <Textarea id="description" name="description" placeholder="会议描述和目的" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agenda">议程内容</Label>
                      <Textarea id="agenda" name="agenda" placeholder="会议议程" rows={4} />
                    </div>
                    
                    {/* 会议提醒配置 */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <Label className="font-semibold">会议提醒设置</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reminderTime">提醒时间</Label>
                          <Select name="reminderTime" defaultValue="30">
                            <SelectTrigger>
                              <SelectValue placeholder="选择提醒时间" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">会前5分钟</SelectItem>
                              <SelectItem value="15">会前15分钟</SelectItem>
                              <SelectItem value="30">会前30分钟</SelectItem>
                              <SelectItem value="60">会前1小时</SelectItem>
                              <SelectItem value="120">会前2小时</SelectItem>
                              <SelectItem value="1440">会前1天</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>通知方式</Label>
                          <div className="flex flex-col gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <Checkbox id="notifyEmail" name="notifyEmail" defaultChecked />
                              <Label htmlFor="notifyEmail" className="text-sm font-normal cursor-pointer">邮件通知</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox id="notifySystem" name="notifySystem" defaultChecked />
                              <Label htmlFor="notifySystem" className="text-sm font-normal cursor-pointer">系统通知</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateMeetingDialog(false)}>
                        取消
                      </Button>
                      <Button type="submit" disabled={createMeetingMutation.isPending}>
                        {createMeetingMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                        创建会议
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {meetingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : meetings && meetings.length > 0 ? (
              <div className="grid gap-4">
                {meetings.map((meeting) => (
                  <Card key={meeting.id} className="bg-card/50 border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getLevelBadge(meeting.level)}
                            <Badge variant="outline" className={
                              meeting.status === "completed" ? "bg-green-500/10 text-green-500" :
                              meeting.status === "cancelled" ? "bg-red-500/10 text-red-500" :
                              meeting.status === "in_progress" ? "bg-yellow-500/10 text-yellow-500" :
                              "bg-blue-500/10 text-blue-500"
                            }>
                              {meeting.status === "scheduled" ? "已安排" :
                               meeting.status === "in_progress" ? "进行中" :
                               meeting.status === "completed" ? "已完成" : "已取消"}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">{meeting.title}</h3>
                          {meeting.description && (
                            <p className="text-sm text-muted-foreground">{meeting.description}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className="w-4 h-4" />
                            {formatDate(meeting.startTime)}
                          </div>
                          {meeting.location && (
                            <div className="flex items-center gap-1 justify-end">
                              <MapPin className="w-4 h-4" />
                              {meeting.location}
                            </div>
                          )}
                          {meeting.onlineLink && (
                            <div className="flex items-center gap-1 justify-end">
                              <Video className="w-4 h-4" />
                              线上会议
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无会议</h3>
                  <p className="text-muted-foreground mb-4">点击"新建会议"创建第一个会议日程</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Trainings Tab */}
          <TabsContent value="trainings" className="space-y-4">
            <div className="flex items-center justify-end">
              <Dialog open={showCreateTrainingDialog} onOpenChange={setShowCreateTrainingDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-1" />
                    新建培训
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新建培训计划</DialogTitle>
                    <DialogDescription>创建新的培训计划</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTraining} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">培训名称</Label>
                      <Input id="name" name="name" required placeholder="输入培训名称" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">培训类型</Label>
                        <Select name="type" defaultValue="internal">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">内训</SelectItem>
                            <SelectItem value="external">外训</SelectItem>
                            <SelectItem value="online">线上</SelectItem>
                            <SelectItem value="certification">认证</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">培训分类</Label>
                        <Select name="category" defaultValue="technical">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical">技术</SelectItem>
                            <SelectItem value="management">管理</SelectItem>
                            <SelectItem value="safety">安全</SelectItem>
                            <SelectItem value="quality">质量</SelectItem>
                            <SelectItem value="compliance">合规</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="plannedStartDate">计划开始日期</Label>
                        <Input id="plannedStartDate" name="plannedStartDate" type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="plannedEndDate">计划结束日期</Label>
                        <Input id="plannedEndDate" name="plannedEndDate" type="date" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="durationHours">培训时长（小时）</Label>
                        <Input id="durationHours" name="durationHours" type="number" placeholder="8" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxParticipants">最大参与人数</Label>
                        <Input id="maxParticipants" name="maxParticipants" type="number" placeholder="20" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="externalTrainer">培训师</Label>
                      <Input id="externalTrainer" name="externalTrainer" placeholder="培训师姓名" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">培训地点</Label>
                      <Input id="location" name="location" placeholder="培训地点" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">培训描述</Label>
                      <Textarea id="description" name="description" placeholder="培训内容和目标" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateTrainingDialog(false)}>
                        取消
                      </Button>
                      <Button type="submit" disabled={createTrainingMutation.isPending}>
                        {createTrainingMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                        创建培训
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {trainings && (trainings as any).length > 0 ? (
              <div className="grid gap-4">
                {(trainings as any).map((training: any) => (
                  <Card key={training.id} className="bg-card/50 border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={
                              training.type === "internal" ? "bg-blue-500/10 text-blue-500" :
                              training.type === "external" ? "bg-green-500/10 text-green-500" :
                              training.type === "online" ? "bg-purple-500/10 text-purple-500" :
                              "bg-yellow-500/10 text-yellow-500"
                            }>
                              {training.type === "internal" ? "内训" :
                               training.type === "external" ? "外训" :
                               training.type === "online" ? "线上" : "认证"}
                            </Badge>
                            <Badge variant="outline">
                              {training.category === "technical" ? "技术" :
                               training.category === "management" ? "管理" :
                               training.category === "safety" ? "安全" :
                               training.category === "quality" ? "质量" : "合规"}
                            </Badge>
                            <Badge variant="outline" className={
                              training.status === "completed" ? "bg-green-500/10 text-green-500" :
                              training.status === "cancelled" ? "bg-red-500/10 text-red-500" :
                              training.status === "in_progress" ? "bg-yellow-500/10 text-yellow-500" :
                              "bg-blue-500/10 text-blue-500"
                            }>
                              {training.status === "draft" ? "草稿" :
                               training.status === "planned" ? "已计划" :
                               training.status === "in_progress" ? "进行中" :
                               training.status === "completed" ? "已完成" : "已取消"}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">{training.name}</h3>
                          {training.description && (
                            <p className="text-sm text-muted-foreground">{training.description}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground space-y-1">
                          {training.plannedStartDate && (
                            <div className="flex items-center gap-1 justify-end">
                              <Calendar className="w-4 h-4" />
                              {new Date(training.plannedStartDate).toLocaleDateString("zh-CN")}
                            </div>
                          )}
                          {training.durationHours && (
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="w-4 h-4" />
                              {training.durationHours}小时
                            </div>
                          )}
                          {training.location && (
                            <div className="flex items-center gap-1 justify-end">
                              <MapPin className="w-4 h-4" />
                              {training.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-12 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无培训计划</h3>
                  <p className="text-muted-foreground mb-4">点击"新建培训"创建第一个培训计划</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Annual Plans Tab */}
          <TabsContent value="annual" className="space-y-4">
            {annualPlans && annualPlans.length > 0 ? (
              <div className="grid gap-4">
                {annualPlans.map((plan) => (
                  <Card key={plan.id} className="bg-card/50 border-border hover:border-primary/30 transition-colors">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            plan.type === "company" ? "bg-red-500/10 text-red-500" :
                            plan.type === "department" ? "bg-blue-500/10 text-blue-500" :
                            "bg-green-500/10 text-green-500"
                          }>
                            {plan.type === "company" ? "公司级" :
                             plan.type === "department" ? "部门级" : "项目级"}
                          </Badge>
                          <Badge variant="outline">
                            {plan.year}年度
                          </Badge>
                        </div>
                        <Badge variant="outline" className={
                          plan.status === "approved" ? "bg-green-500/10 text-green-500" :
                          plan.status === "completed" ? "bg-blue-500/10 text-blue-500" :
                          plan.status === "in_progress" ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-gray-500/10 text-gray-500"
                        }>
                          {plan.status === "draft" ? "草稿" :
                           plan.status === "submitted" ? "已提交" :
                           plan.status === "approved" ? "已批准" :
                           plan.status === "in_progress" ? "执行中" : "已完成"}
                        </Badge>
                      </div>
                      <CardTitle>{plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {plan.revenueTarget && (
                          <div>
                            <p className="text-muted-foreground">产值目标</p>
                            <p className="font-semibold">¥{(Number(plan.revenueTarget) / 100).toLocaleString()}</p>
                          </div>
                        )}
                        {plan.profitTarget && (
                          <div>
                            <p className="text-muted-foreground">利润目标</p>
                            <p className="font-semibold">¥{(Number(plan.profitTarget) / 100).toLocaleString()}</p>
                          </div>
                        )}
                        {plan.customerTarget && (
                          <div>
                            <p className="text-muted-foreground">客户目标</p>
                            <p className="font-semibold">{plan.customerTarget}家</p>
                          </div>
                        )}
                        {plan.hiringBudget && (
                          <div>
                            <p className="text-muted-foreground">招聘预算</p>
                            <p className="font-semibold">{plan.hiringBudget}人</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-12 text-center">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无年度计划</h3>
                  <p className="text-muted-foreground mb-4">年度计划需要管理员在后台创建</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Meeting Types Tab */}
          <TabsContent value="types" className="space-y-4">
            {typesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : meetingTypes && meetingTypes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meetingTypes.map((type) => (
                  <Card key={type.id} className="bg-card/50 border-border hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        {getLevelBadge(type.level)}
                        <Badge variant="outline">
                          {getFrequencyLabel(type.frequency)}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{type.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">{type.code}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {type.description && (
                        <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {type.defaultDuration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {type.defaultDuration}分钟
                          </span>
                        )}
                        {type.defaultStartTime && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {type.defaultStartTime}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-12 text-center">
                  <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无会议类型</h3>
                  <p className="text-muted-foreground mb-4">点击"初始化会议类型"创建默认会议类型</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}
