import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Users,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { toast } from "sonner";

export default function TrainingManagement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showCreateTrainingDialog, setShowCreateTrainingDialog] = useState(false);
  const [showCreateAssessmentDialog, setShowCreateAssessmentDialog] = useState(false);
  const [showIssueCertificateDialog, setShowIssueCertificateDialog] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("trainings");
  const [isSeedingData, setIsSeedingData] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);

  // Fetch trainings
  const { data: trainingsData, isLoading: trainingsLoading, refetch: refetchTrainings } = trpc.agenda.getTrainings.useQuery();
  const trainings = trainingsData?.trainings || [];
  
  // Type definitions
  type Assessment = {
    id: number;
    trainingId: number;
    assessmentType: string;
    name: string;
    description?: string | null;
    totalScore?: number | null;
    passingScore?: number | null;
    questions?: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  
  type Certificate = {
    id: number;
    certificateNo: string;
    name: string;
    issueDate: Date;
    expiryDate?: Date | null;
    status: string;
  };
  
  // Fetch assessments
  const { data: assessments } = trpc.trainingAssessment.getByTraining.useQuery(
    { trainingId: selectedTrainingId! },
    { enabled: !!selectedTrainingId }
  );
  
  // Fetch certificates
  const { data: certificates } = trpc.trainingCertificate.getByParticipant.useQuery(
    { participantId: 0 }, // Will show all certificates for now
    { enabled: false } // Disabled until we have a participant selected
  );

  // Mutations
  const utils = trpc.useUtils();
  
  const createTrainingMutation = trpc.agenda.createTraining.useMutation({
    onSuccess: () => {
      toast.success("培训计划已创建");
      setShowCreateTrainingDialog(false);
      utils.agenda.getTrainings.invalidate();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const createAssessmentMutation = trpc.trainingAssessment.create.useMutation({
    onSuccess: () => {
      toast.success("培训评估已创建");
      setShowCreateAssessmentDialog(false);
      utils.trainingAssessment.getByTraining.invalidate();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const issueCertificateMutation = trpc.trainingCertificate.issue.useMutation({
    onSuccess: () => {
      toast.success("证书已颁发");
      setShowIssueCertificateDialog(false);
      utils.trainingCertificate.getByParticipant.invalidate();
    },
    onError: (error) => {
      toast.error("颁发失败: " + error.message);
    },
  });

  // 种子数据 mutations
  const seedTrainingDataMutation = trpc.agenda.seedTrainingData.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        refetchTrainings();
      } else {
        toast.error(result.message);
      }
      setIsSeedingData(false);
    },
    onError: (error) => {
      toast.error("生成测试数据失败: " + error.message);
      setIsSeedingData(false);
    },
  });

  const clearTrainingDataMutation = trpc.agenda.clearTrainingData.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        refetchTrainings();
      } else {
        toast.error(result.message);
      }
      setIsClearingData(false);
    },
    onError: (error) => {
      toast.error("清除数据失败: " + error.message);
      setIsClearingData(false);
    },
  });

  // Calculate statistics
  const totalTrainings = trainings?.length || 0;
  const completedTrainings = trainings?.filter(t => t.status === "completed").length || 0;
  const totalCertificates = certificates?.length || 0;
  const passRate = assessments && assessments.length > 0 
    ? (assessments.filter((a: Assessment) => a.status === "active").length / assessments.length * 100).toFixed(1)
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400">已安排</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">进行中</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-500/20 text-green-400">已完成</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-500/20 text-red-400">已取消</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAssessmentTypeBadge = (type: string) => {
    switch (type) {
      case "exam":
        return <Badge variant="outline" className="bg-purple-500/20 text-purple-400">考试</Badge>;
      case "quiz":
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400">测验</Badge>;
      case "practical":
        return <Badge variant="outline" className="bg-orange-500/20 text-orange-400">实操</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={GraduationCap}
          title={t("training.title") || "培训管理"}
          description={t("training.desc") || "培训计划、效果评估与证书管理"}
          actions={
            <div className="flex items-center gap-2">
              {/* 管理员测试数据按钮 */}
              {user?.role === 'admin' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSeedingData(true);
                      seedTrainingDataMutation.mutate();
                    }}
                    disabled={isSeedingData}
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    {isSeedingData ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-1" />
                    )}
                    生成测试数据
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('确定要清除所有培训数据吗？此操作不可撤销。')) {
                        setIsClearingData(true);
                        clearTrainingDataMutation.mutate();
                      }
                    }}
                    disabled={isClearingData}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {isClearingData ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    清除数据
                  </Button>
                </>
              )}
              <Dialog open={showCreateTrainingDialog} onOpenChange={setShowCreateTrainingDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-1" />
                    新建培训
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>新建培训计划</DialogTitle>
                    <DialogDescription>创建新的培训课程安排</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      createTrainingMutation.mutate({
                        name: formData.get("title") as string,
                        description: formData.get("description") as string || undefined,
                        externalTrainer: formData.get("trainer") as string || undefined,
                        trainingOrg: formData.get("location") as string || undefined,
                        plannedStartDate: new Date(formData.get("startTime") as string),
                        plannedEndDate: new Date(formData.get("endTime") as string),
                        maxParticipants: parseInt(formData.get("maxParticipants") as string) || undefined,
                      });
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="title">培训主题 *</Label>
                      <Input id="title" name="title" placeholder="如：新员工入职培训" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">培训描述</Label>
                      <Textarea id="description" name="description" placeholder="培训内容和目标" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="trainer">培训讲师</Label>
                        <Input id="trainer" name="trainer" placeholder="讲师姓名" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">培训地点</Label>
                        <Input id="location" name="location" placeholder="会议室/线上" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startTime">开始时间 *</Label>
                        <Input id="startTime" name="startTime" type="datetime-local" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">结束时间 *</Label>
                        <Input id="endTime" name="endTime" type="datetime-local" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxParticipants">最大参与人数</Label>
                      <Input id="maxParticipants" name="maxParticipants" type="number" placeholder="不限" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateTrainingDialog(false)}>
                        取消
                      </Button>
                      <Button type="submit" disabled={createTrainingMutation.isPending}>
                        {createTrainingMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                        创建
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">培训计划</p>
                  <p className="text-2xl font-bold font-heading mt-1">{totalTrainings}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/20">
                  <BookOpen className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成培训</p>
                  <p className="text-2xl font-bold font-heading mt-1">{completedTrainings}</p>
                </div>
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">颁发证书</p>
                  <p className="text-2xl font-bold font-heading mt-1">{totalCertificates}</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-500/20">
                  <Award className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">评估通过率</p>
                  <p className="text-2xl font-bold font-heading mt-1">{passRate}%</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/20">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="trainings">培训计划</TabsTrigger>
            <TabsTrigger value="participants">参与者管理</TabsTrigger>
            <TabsTrigger value="assessments">效果评估</TabsTrigger>
            <TabsTrigger value="certificates">证书管理</TabsTrigger>
          </TabsList>

          {/* Trainings Tab */}
          <TabsContent value="trainings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  培训计划列表
                </CardTitle>
                <CardDescription>
                  共 {totalTrainings} 个培训计划
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trainingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : trainings && trainings.length > 0 ? (
                  <div className="space-y-3">
                    {trainings.map((training) => (
                      <div
                        key={training.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedTrainingId(training.id);
                          setActiveTab("participants");
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{training.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              {training.externalTrainer && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {training.externalTrainer}
                                </span>
                              )}
                              {training.plannedStartDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(training.plannedStartDate).toLocaleDateString("zh-CN")}
                                </span>
                              )}
                              {training.trainingOrg && (
                                <span>• {training.trainingOrg}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {training.maxParticipants && (
                            <span className="text-sm text-muted-foreground">
                              限 {training.maxParticipants} 人
                            </span>
                          )}
                          {getStatusBadge(training.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无培训计划</p>
                    <p className="text-sm mt-1">点击"新建培训"创建第一个培训计划</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  培训参与者管理
                </CardTitle>
                <CardDescription>
                  {selectedTrainingId 
                    ? `当前培训: ${trainings?.find(t => t.id === selectedTrainingId)?.name || `ID ${selectedTrainingId}`}` 
                    : "请先在培训计划中选择一个培训"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedTrainingId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>请先选择一个培训计划</p>
                    <p className="text-sm mt-1">在"培训计划"标签页中点击一个培训来管理其参与者</p>
                  </div>
                ) : (
                  <ParticipantsTable trainingId={selectedTrainingId} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    培训效果评估
                  </CardTitle>
                  <CardDescription>
                    培训测评记录和成绩统计
                  </CardDescription>
                </div>
                <Dialog open={showCreateAssessmentDialog} onOpenChange={setShowCreateAssessmentDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!selectedTrainingId}>
                      <Plus className="w-4 h-4 mr-1" />
                      创建评估
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>创建培训评估</DialogTitle>
                      <DialogDescription>为参训人员创建评估记录</DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        createAssessmentMutation.mutate({
                          trainingId: selectedTrainingId!,
                          assessmentType: formData.get("assessmentType") as "quiz" | "survey" | "practical",
                          name: formData.get("name") as string,
                          totalScore: parseFloat(formData.get("maxScore") as string),
                          passingScore: parseFloat(formData.get("passingScore") as string),
                          description: formData.get("feedback") as string || undefined,
                        });
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">评估名称 *</Label>
                          <Input id="name" name="name" placeholder="如：安全生产培训考核" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="assessmentType">评估类型 *</Label>
                          <Select name="assessmentType" defaultValue="quiz">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exam">考试</SelectItem>
                              <SelectItem value="quiz">测验</SelectItem>
                              <SelectItem value="practical">实操</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="score">得分 *</Label>
                          <Input id="score" name="score" type="number" step="0.1" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxScore">满分 *</Label>
                          <Input id="maxScore" name="maxScore" type="number" step="0.1" defaultValue="100" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="passingScore">及格分 *</Label>
                          <Input id="passingScore" name="passingScore" type="number" step="0.1" defaultValue="60" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feedback">评估反馈</Label>
                        <Textarea id="feedback" name="feedback" placeholder="评估意见和建议" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateAssessmentDialog(false)}>
                          取消
                        </Button>
                        <Button type="submit" disabled={createAssessmentMutation.isPending}>
                          {createAssessmentMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                          创建
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!selectedTrainingId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>请先在"培训计划"标签页选择一个培训</p>
                  </div>
                ) : assessments && assessments.length > 0 ? (
                  <div className="space-y-3">
                    {assessments.map((assessment: Assessment) => (
                      <div
                        key={assessment.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${assessment.status === "active" ? "bg-green-500/20" : "bg-gray-500/20"}`}>
                            {assessment.status === "active" ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{assessment.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              {getAssessmentTypeBadge(assessment.assessmentType)}
                              <span>
                                {new Date(assessment.createdAt).toLocaleDateString("zh-CN")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            总分: {assessment.totalScore || 100}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            及格线: {assessment.passingScore || 60}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>该培训暂无评估记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    证书管理
                  </CardTitle>
                  <CardDescription>
                    共颁发 {totalCertificates} 个证书
                  </CardDescription>
                </div>
                <Dialog open={showIssueCertificateDialog} onOpenChange={setShowIssueCertificateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      颁发证书
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>颁发培训证书</DialogTitle>
                      <DialogDescription>为通过培训的人员颁发证书</DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        issueCertificateMutation.mutate({
                          trainingId: selectedTrainingId || 0,
                          participantId: parseInt(formData.get("assessmentId") as string),
                          certificateNo: formData.get("certificateNo") as string,
                          name: formData.get("certificateName") as string,
                          expiryDate: formData.get("validUntil") ? new Date(formData.get("validUntil") as string) : undefined,
                        });
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="assessmentId">评估记录ID *</Label>
                        <Input id="assessmentId" name="assessmentId" type="number" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="certificateNo">证书编号 *</Label>
                          <Input id="certificateNo" name="certificateNo" placeholder="如：CERT-2026-001" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="certificateName">证书名称 *</Label>
                          <Input id="certificateName" name="certificateName" placeholder="如：安全生产培训证书" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validUntil">有效期至</Label>
                        <Input id="validUntil" name="validUntil" type="date" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowIssueCertificateDialog(false)}>
                          取消
                        </Button>
                        <Button type="submit" disabled={issueCertificateMutation.isPending}>
                          {issueCertificateMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                          颁发
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {certificates && certificates.length > 0 ? (
                  <div className="space-y-3">
                    {certificates.map((cert: Certificate) => (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-yellow-500/20">
                            <Award className="w-5 h-5 text-yellow-500" />
                          </div>
                          <div>
                            <p className="font-medium">{cert.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span>编号: {cert.certificateNo}</span>
                              <span>• 颁发: {new Date(cert.issueDate).toLocaleDateString("zh-CN")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {cert.expiryDate && (
                            <span className="text-sm text-muted-foreground">
                              有效期至: {new Date(cert.expiryDate).toLocaleDateString("zh-CN")}
                            </span>
                          )}
                          <Badge variant="outline" className={
                            cert.status === "valid" ? "bg-green-500/20 text-green-400" :
                            cert.status === "expired" ? "bg-red-500/20 text-red-400" :
                            "bg-gray-500/20 text-gray-400"
                          }>
                            {cert.status === "valid" ? "有效" :
                             cert.status === "expired" ? "已过期" : "已撤销"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无证书记录</p>
                    <p className="text-sm mt-1">完成培训评估后可颁发证书</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}

// Participants Table Component
function ParticipantsTable({ trainingId }: { trainingId: number }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBatchAddDialog, setShowBatchAddDialog] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [batchUserIds, setBatchUserIds] = useState("");
  
  const { data: participants, isLoading } = trpc.agenda.getParticipants.useQuery({ trainingId });
  const utils = trpc.useUtils();
  
  const addParticipantMutation = trpc.agenda.addParticipant.useMutation({
    onSuccess: () => {
      toast.success("参与者添加成功");
      utils.agenda.getParticipants.invalidate({ trainingId });
      setShowAddDialog(false);
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });
  
  const batchAddParticipantsMutation = trpc.agenda.batchAddParticipants.useMutation({
    onSuccess: (result) => {
      const successCount = (result as any).successCount ?? 0;
      const failedCount = (result as any).failedCount ?? 0;
      if (successCount > 0) {
        toast.success(`成功添加 ${successCount} 个参与者`);
      }
      if (failedCount > 0) {
        toast.warning(`${failedCount} 个用户添加失败`);
      }
      utils.agenda.getParticipants.invalidate({ trainingId });
      setShowBatchAddDialog(false);
      setBatchUserIds("");
    },
    onError: (error) => {
      toast.error(`批量添加失败: ${error.message}`);
    },
  });
  
  const updateParticipantMutation = trpc.agenda.updateParticipant.useMutation({
    onSuccess: () => {
      toast.success("参与者信息已更新");
      utils.agenda.getParticipants.invalidate({ trainingId });
      setEditingParticipant(null);
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case "attended":
        return <Badge className="bg-green-500/20 text-green-400">已出席</Badge>;
      case "absent":
        return <Badge className="bg-red-500/20 text-red-400">缺席</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/20 text-yellow-400">部分出席</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const getRegistrationBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400">已确认</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400">已取消</Badge>;
      default:
        return <Badge variant="outline">已报名</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          添加参与者
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowBatchAddDialog(true)}>
          <Users className="w-4 h-4 mr-1" />
          批量添加
        </Button>
      </div>

      {/* Add Participant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加培训参与者</DialogTitle>
            <DialogDescription>输入用户ID添加参与者</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addParticipantMutation.mutate({
                trainingId,
                userId: parseInt(formData.get("userId") as string),
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="userId">用户ID *</Label>
              <Input id="userId" name="userId" type="number" required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button type="submit" disabled={addParticipantMutation.isPending}>
                {addParticipantMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                添加
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch Add Participants Dialog with User Selector */}
      <Dialog open={showBatchAddDialog} onOpenChange={setShowBatchAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>批量添加培训参与者</DialogTitle>
            <DialogDescription>从用户列表选择或直接输入用户ID</DialogDescription>
          </DialogHeader>
          <BatchAddParticipantsFormInline
            trainingId={trainingId}
            batchAddMutation={batchAddParticipantsMutation}
            onClose={() => {
              setShowBatchAddDialog(false);
              setBatchUserIds("");
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Participant Dialog */}
      <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑参与者信息</DialogTitle>
            <DialogDescription>更新出席状态和成绩</DialogDescription>
          </DialogHeader>
          {editingParticipant && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateParticipantMutation.mutate({
                  id: editingParticipant.id,
                  registrationStatus: formData.get("registrationStatus") as any,
                  attendanceStatus: formData.get("attendanceStatus") as any,
                  score: formData.get("score") ? parseInt(formData.get("score") as string) : undefined,
                  passed: formData.get("passed") === "true",
                  feedbackRating: formData.get("feedbackRating") ? parseInt(formData.get("feedbackRating") as string) : undefined,
                  feedback: formData.get("feedback") as string || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationStatus">报名状态</Label>
                  <Select name="registrationStatus" defaultValue={editingParticipant.registrationStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered">已报名</SelectItem>
                      <SelectItem value="confirmed">已确认</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendanceStatus">出席状态</Label>
                  <Select name="attendanceStatus" defaultValue={editingParticipant.attendanceStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">未知</SelectItem>
                      <SelectItem value="attended">已出席</SelectItem>
                      <SelectItem value="absent">缺席</SelectItem>
                      <SelectItem value="partial">部分出席</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="score">成绩</Label>
                  <Input id="score" name="score" type="number" min="0" max="100" defaultValue={editingParticipant.score || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passed">是否通过</Label>
                  <Select name="passed" defaultValue={editingParticipant.passed?.toString() || "false"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">通过</SelectItem>
                      <SelectItem value="false">未通过</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedbackRating">反馈评分 (1-5)</Label>
                <Input id="feedbackRating" name="feedbackRating" type="number" min="1" max="5" defaultValue={editingParticipant.feedbackRating || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">反馈意见</Label>
                <Textarea id="feedback" name="feedback" defaultValue={editingParticipant.feedback || ""} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingParticipant(null)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateParticipantMutation.isPending}>
                  {updateParticipantMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  保存
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Participants Table */}
      {participants && participants.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">用户ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">报名状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium">出席状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium">成绩</th>
                <th className="px-4 py-3 text-left text-sm font-medium">是否通过</th>
                <th className="px-4 py-3 text-left text-sm font-medium">反馈评分</th>
                <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm">{p.userId}</td>
                  <td className="px-4 py-3">{getRegistrationBadge(p.registrationStatus)}</td>
                  <td className="px-4 py-3">{getAttendanceBadge(p.attendanceStatus)}</td>
                  <td className="px-4 py-3 text-sm">{p.score ?? "-"}</td>
                  <td className="px-4 py-3">
                    {p.passed === true ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : p.passed === false ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {p.feedbackRating ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        {p.feedbackRating}
                      </div>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditingParticipant(p)}>
                      编辑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无参与者</p>
          <p className="text-sm mt-1">点击"添加参与者"添加培训人员</p>
        </div>
      )}
    </div>
  );
}


// Batch Add Participants Form with User Selector
function BatchAddParticipantsFormInline({ 
  trainingId, 
  batchAddMutation,
  onClose 
}: { 
  trainingId: number; 
  batchAddMutation: any;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"select" | "manual">("select");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [manualUserIds, setManualUserIds] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch all users for selection
  const { data: allUsers, isLoading: usersLoading } = trpc.users.getAll.useQuery();
  
  // Search users
  const { data: searchResults } = trpc.users.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 1 }
  );
  
  const displayUsers = searchQuery ? searchResults : allUsers;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let userIds: number[] = [];
    
    if (mode === "select") {
      userIds = selectedUserIds;
    } else {
      userIds = manualUserIds
        .split(/[,\n]/)
        .map(id => id.trim())
        .filter(id => id !== "")
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
    }
    
    if (userIds.length === 0) {
      toast.error("请选择或输入至少一个用户");
      return;
    }
    
    batchAddMutation.mutate({
      trainingId,
      userIds,
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };
  
  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const selectAll = () => {
    if (displayUsers) {
      setSelectedUserIds(displayUsers.map(u => u.id));
    }
  };
  
  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          type="button"
          variant={mode === "select" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("select")}
        >
          <Users className="w-4 h-4 mr-2" />
          从列表选择
        </Button>
        <Button
          type="button"
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
        >
          <FileText className="w-4 h-4 mr-2" />
          手动输入ID
        </Button>
      </div>
      
      {mode === "select" ? (
        <div className="space-y-3">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              placeholder="搜索用户名或邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              全选
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
              清空
            </Button>
          </div>
          
          {/* User List */}
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayUsers && displayUsers.length > 0 ? (
              <div className="divide-y">
                {displayUsers.map(user => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50 ${
                      selectedUserIds.includes(user.id) ? "bg-primary/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name || `用户 ${user.id}`}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email || "无邮箱"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">ID: {user.id}</Badge>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "未找到匹配的用户" : "暂无用户数据"}
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            已选择: {selectedUserIds.length} 个用户
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="manualUserIds">用户ID列表 *</Label>
          <Textarea
            id="manualUserIds"
            value={manualUserIds}
            onChange={(e) => setManualUserIds(e.target.value)}
            placeholder="输入用户ID，每行一个或用逗号分隔&#10;例如:&#10;1&#10;2&#10;3&#10;或: 1, 2, 3"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            已输入: {manualUserIds.split(/[,\n]/).filter(id => id.trim() !== "").length} 个ID
          </p>
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={batchAddMutation.isPending}>
          {batchAddMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          批量添加 ({mode === "select" ? selectedUserIds.length : manualUserIds.split(/[,\n]/).filter(id => id.trim() !== "").length})
        </Button>
      </div>
    </form>
  );
}
