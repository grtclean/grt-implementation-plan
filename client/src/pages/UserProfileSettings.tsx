import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  User, 
  Bell, 
  Calendar, 
  GraduationCap, 
  FolderKanban, 
  BarChart3, 
  Mail,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "@/components/grt";

export default function UserProfileSettings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile状态
  const [profile, setProfile] = useState({
    employeeId: "",
    workPlanFrequency: "weekly" as const,
    workPlanReminderEnabled: true,
    workPlanReminderTime: "09:00",
    trainingPlanEnabled: true,
    trainingReminderDaysBefore: 3,
    projectPlanEnabled: true,
    projectMilestoneReminder: true,
    performanceReportEnabled: true,
    performanceReportFrequency: "monthly" as const,
    taskReminderEnabled: true,
    taskReminderTime: "15:00",
    taskReminderEmail: true,
    taskReminderSystem: true,
    emailNotificationsEnabled: true,
    emailDigestFrequency: "daily" as const,
  });

  // 获取用户Profile
  const { data: profileData, isLoading } = trpc.userProfile.getMyProfile.useQuery();

  // 更新Profile mutation
  const updateMutation = trpc.userProfile.updateMyProfile.useMutation({
    onSuccess: () => {
      toast.success("设置已保存");
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    }
  });

  // 获取今日任务
  const { data: todayTasks } = trpc.userProfile.getTodayTasks.useQuery();

  // 获取逾期任务
  const { data: overdueTasks } = trpc.userProfile.getOverdueTasks.useQuery();

  // 加载Profile数据
  useEffect(() => {
    if (profileData) {
      setProfile({
        employeeId: profileData.employeeId || "",
        workPlanFrequency: (profileData.workPlanFrequency || "weekly") as any,
        workPlanReminderEnabled: profileData.workPlanReminderEnabled ?? true,
        workPlanReminderTime: profileData.workPlanReminderTime?.slice(0, 5) || "09:00",
        trainingPlanEnabled: profileData.trainingPlanEnabled ?? true,
        trainingReminderDaysBefore: profileData.trainingReminderDaysBefore ?? 3,
        projectPlanEnabled: profileData.projectPlanEnabled ?? true,
        projectMilestoneReminder: profileData.projectMilestoneReminder ?? true,
        performanceReportEnabled: profileData.performanceReportEnabled ?? true,
        performanceReportFrequency: (profileData.performanceReportFrequency || "monthly") as any,
        taskReminderEnabled: profileData.taskReminderEnabled ?? true,
        taskReminderTime: profileData.taskReminderTime?.slice(0, 5) || "15:00",
        taskReminderEmail: profileData.taskReminderEmail ?? true,
        taskReminderSystem: profileData.taskReminderSystem ?? true,
        emailNotificationsEnabled: profileData.emailNotificationsEnabled ?? true,
        emailDigestFrequency: (profileData.emailDigestFrequency || "daily") as any,
      });
    }
  }, [profileData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        ...profile,
        workPlanReminderTime: profile.workPlanReminderTime + ":00",
        taskReminderTime: profile.taskReminderTime + ":00",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={User}
          title="个人设置"
          description="管理您的工作计划、培训计划、项目计划和绩效报告偏好设置"
          actions={
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存设置
            </Button>
          }
        />

        {/* 任务概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Calendar} label="今日待办" value={todayTasks?.length || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertTriangle} label="逾期任务" value={overdueTasks?.length || 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={CheckCircle2} label="提醒时间" value={profile.taskReminderTime} iconColor="text-green-500" iconBg="bg-green-500/10" />
        </div>

        {/* 设置选项卡 */}
        <Tabs defaultValue="work-plan" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="work-plan" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              工作计划
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              培训计划
            </TabsTrigger>
            <TabsTrigger value="project" className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              项目计划
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              绩效报告
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              通知设置
            </TabsTrigger>
          </TabsList>

          {/* 工作计划设置 */}
          <TabsContent value="work-plan">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  工作计划设置
                </CardTitle>
                <CardDescription>
                  设置您的工作计划周期和提醒偏好，避免遗漏重要任务
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>计划周期</Label>
                    <Select 
                      value={profile.workPlanFrequency} 
                      onValueChange={(v: any) => setProfile({...profile, workPlanFrequency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">每日</SelectItem>
                        <SelectItem value="weekly">每周</SelectItem>
                        <SelectItem value="biweekly">每两周</SelectItem>
                        <SelectItem value="monthly">每月</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      选择您制定工作计划的频率
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>提醒时间</Label>
                    <Input 
                      type="time" 
                      value={profile.workPlanReminderTime}
                      onChange={(e) => setProfile({...profile, workPlanReminderTime: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">
                      系统将在此时间提醒您制定工作计划
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>启用工作计划提醒</Label>
                    <p className="text-sm text-muted-foreground">
                      开启后系统将按设定时间发送提醒
                    </p>
                  </div>
                  <Switch 
                    checked={profile.workPlanReminderEnabled}
                    onCheckedChange={(v) => setProfile({...profile, workPlanReminderEnabled: v})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 培训计划设置 */}
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  培训计划设置
                </CardTitle>
                <CardDescription>
                  管理您的培训计划提醒，确保不错过任何培训机会
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>启用培训计划提醒</Label>
                    <p className="text-sm text-muted-foreground">
                      开启后系统将提醒您即将到来的培训
                    </p>
                  </div>
                  <Switch 
                    checked={profile.trainingPlanEnabled}
                    onCheckedChange={(v) => setProfile({...profile, trainingPlanEnabled: v})}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>提前提醒天数</Label>
                  <Select 
                    value={String(profile.trainingReminderDaysBefore)} 
                    onValueChange={(v) => setProfile({...profile, trainingReminderDaysBefore: parseInt(v)})}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">提前1天</SelectItem>
                      <SelectItem value="2">提前2天</SelectItem>
                      <SelectItem value="3">提前3天</SelectItem>
                      <SelectItem value="5">提前5天</SelectItem>
                      <SelectItem value="7">提前7天</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    系统将在培训开始前指定天数发送提醒
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 项目计划设置 */}
          <TabsContent value="project">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5" />
                  项目计划设置
                </CardTitle>
                <CardDescription>
                  管理项目相关的提醒和通知设置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>启用项目计划提醒</Label>
                    <p className="text-sm text-muted-foreground">
                      开启后系统将提醒您项目相关的任务和截止日期
                    </p>
                  </div>
                  <Switch 
                    checked={profile.projectPlanEnabled}
                    onCheckedChange={(v) => setProfile({...profile, projectPlanEnabled: v})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>里程碑提醒</Label>
                    <p className="text-sm text-muted-foreground">
                      在项目里程碑即将到来时发送提醒
                    </p>
                  </div>
                  <Switch 
                    checked={profile.projectMilestoneReminder}
                    onCheckedChange={(v) => setProfile({...profile, projectMilestoneReminder: v})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 绩效报告设置 */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  绩效报告设置
                </CardTitle>
                <CardDescription>
                  管理绩效报告的提交周期和提醒设置，避免影响绩效打分
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>启用绩效报告提醒</Label>
                    <p className="text-sm text-muted-foreground">
                      开启后系统将提醒您按时提交绩效报告
                    </p>
                  </div>
                  <Switch 
                    checked={profile.performanceReportEnabled}
                    onCheckedChange={(v) => setProfile({...profile, performanceReportEnabled: v})}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>报告周期</Label>
                  <Select 
                    value={profile.performanceReportFrequency} 
                    onValueChange={(v: any) => setProfile({...profile, performanceReportFrequency: v})}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                      <SelectItem value="quarterly">每季度</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    选择您提交绩效报告的频率
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 通知设置 */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  通知设置
                </CardTitle>
                <CardDescription>
                  管理任务提醒和邮件通知的偏好设置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-semibold">每日任务提醒</span>
                    <Badge variant="secondary">推荐下午3:00</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    系统将在设定时间发送当天待完成任务的提醒邮件，帮助您及时完成工作
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>提醒时间</Label>
                      <Input 
                        type="time" 
                        value={profile.taskReminderTime}
                        onChange={(e) => setProfile({...profile, taskReminderTime: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>启用任务提醒</Label>
                      <div className="flex items-center gap-4 pt-2">
                        <Switch 
                          checked={profile.taskReminderEnabled}
                          onCheckedChange={(v) => setProfile({...profile, taskReminderEnabled: v})}
                        />
                        <span className="text-sm text-muted-foreground">
                          {profile.taskReminderEnabled ? "已启用" : "已禁用"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">提醒方式</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <Label>邮件提醒</Label>
                        <p className="text-sm text-muted-foreground">
                          通过邮件发送任务提醒
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={profile.taskReminderEmail}
                      onCheckedChange={(v) => setProfile({...profile, taskReminderEmail: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <Label>系统通知</Label>
                        <p className="text-sm text-muted-foreground">
                          通过系统内通知发送提醒
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={profile.taskReminderSystem}
                      onCheckedChange={(v) => setProfile({...profile, taskReminderSystem: v})}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">邮件摘要</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>启用邮件通知</Label>
                      <p className="text-sm text-muted-foreground">
                        接收系统邮件通知
                      </p>
                    </div>
                    <Switch 
                      checked={profile.emailNotificationsEnabled}
                      onCheckedChange={(v) => setProfile({...profile, emailNotificationsEnabled: v})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>摘要频率</Label>
                    <Select 
                      value={profile.emailDigestFrequency} 
                      onValueChange={(v: any) => setProfile({...profile, emailDigestFrequency: v})}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">实时</SelectItem>
                        <SelectItem value="daily">每日摘要</SelectItem>
                        <SelectItem value="weekly">每周摘要</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
