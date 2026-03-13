/**
 * Meeting Intelligence Dashboard
 * 智能会议评估与系统记录模块 - 主页面
 */

import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { ChannelSidebar } from "@/components/meeting/ChannelSidebar";
import { InsightPanel } from "@/components/meeting/InsightPanel";
import ExportHistory from "@/components/meeting/ExportHistory";
import { MeetingTranscription } from "@/components/meeting/MeetingTranscription";
import BatchExport from "@/components/meeting/BatchExport";
import { CreateMeetingDialog } from "@/components/meeting/CreateMeetingDialog";
import { MeetingAgendaManager } from "@/components/meeting/MeetingAgendaManager";
import { getMeetingTemplate } from "@/config/meeting-templates";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Plus,
  FileText,
  Users,
  Brain,
  Sparkles,
  Clock,
  Target,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Play,
  History,
  FileArchive,
  Mic,
  Layers,
  BookOpen,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface Channel {
  id: string;
  name: string;
  description?: string;
  is_confidential: boolean;
  user_role?: string;
}

const PROJECT_PHASE_KEYS = [
  { value: "M0_Opportunity", labelKey: "meeting.phase.m0" },
  { value: "M1_Proposal", labelKey: "meeting.phase.m1" },
  { value: "M2_Kickoff", labelKey: "meeting.phase.m2" },
  { value: "M3_Technical_Design", labelKey: "meeting.phase.m3" },
  { value: "M4_Procurement", labelKey: "meeting.phase.m4" },
  { value: "M5_Manufacturing", labelKey: "meeting.phase.m5" },
  { value: "M6_Assembly", labelKey: "meeting.phase.m6" },
  { value: "M7_Testing", labelKey: "meeting.phase.m7" },
  { value: "M8_Production", labelKey: "meeting.phase.m8" },
  { value: "M9_Debugging", labelKey: "meeting.phase.m9" },
  { value: "M10_PreAcceptance", labelKey: "meeting.phase.m10" },
  { value: "M11_Shipping", labelKey: "meeting.phase.m11" },
  { value: "M12_Handover", labelKey: "meeting.phase.m12" },
];

export default function MeetingIntelligence() {
  const { t } = useLanguage();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    meetingDate: format(new Date(), "yyyy-MM-dd"),
    phase: "",
    objective: "",
  });

  // Queries
  const { data: meetings, refetch: refetchMeetings } = trpc.meeting.meetings.list.useQuery(
    { channelId: selectedChannel?.id || "" },
    { enabled: !!selectedChannel }
  );

  const { data: contentBlocks, refetch: refetchBlocks } = trpc.meeting.contentBlocks.list.useQuery(
    { meetingId: selectedMeeting?.id || "" },
    { enabled: !!selectedMeeting }
  );

  const { data: assessments } = trpc.meeting.assessments.listByMeeting.useQuery(
    { meetingId: selectedMeeting?.id || "" },
    { enabled: !!selectedMeeting }
  );

  // Mutations
  const createMeeting = trpc.meeting.meetings.create.useMutation({
    onSuccess: () => {
      refetchMeetings();
      setIsCreateMeetingOpen(false);
      setNewMeeting({ title: "", meetingDate: format(new Date(), "yyyy-MM-dd"), phase: "", objective: "" });
    },
  });

  const generateSummary = trpc.meeting.meetings.generateSummary.useMutation({
    onSuccess: () => {
      refetchMeetings();
    },
  });

  const generateAssessments = trpc.meeting.assessments.generateFromMeeting.useMutation({
    onSuccess: () => {
      refetchMeetings();
    },
  });

  const handleCreateMeeting = (data: {
    title: string;
    meetingDate: string;
    phase?: string;
    objective?: string;
    templateId?: string;
    agenda?: any[];
    participants?: { required: string[]; optional: string[] };
    duration?: number;
  }) => {
    if (!selectedChannel || !data.title) return;
    createMeeting.mutate({
      channelId: selectedChannel.id,
      title: data.title,
      meetingDate: data.meetingDate,
      phase: data.phase || undefined,
      objective: data.objective || undefined,
      // 模板相关数据可以存储在metadata中
      metadata: data.templateId ? {
        templateId: data.templateId,
        agenda: data.agenda,
        participants: data.participants,
        duration: data.duration,
      } : undefined,
    });
  };

  return (
      <div className="flex h-[calc(100vh-4rem)] -m-6 lg:-m-8">
        {/* Left Sidebar - Channel Navigator */}
        <div className="w-64 flex-shrink-0 border-r border-border/50">
          <ChannelSidebar
            selectedChannelId={selectedChannel?.id}
            onSelectChannel={setSelectedChannel}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="p-4 border-b border-border/50 bg-[#0B1120]">
                <PageHeader
                  icon={Brain}
                  title={`# ${selectedChannel.name}${selectedChannel.is_confidential ? '' : ''}`}
                  description={`${meetings?.length || 0} ${t("meeting.intel.meetingRecords")}`}
                  actions={
                    <>
                      {selectedChannel.is_confidential && (
                        <Badge variant="outline" className="text-rose-400 border-rose-500/50">
                          {t("meeting.intel.confidential")}
                        </Badge>
                      )}
                      <Button className="gap-2" onClick={() => setIsCreateMeetingOpen(true)}>
                        <Plus className="w-4 h-4" />
                        {t("meeting.intel.newMeeting")}
                      </Button>
                      <CreateMeetingDialog
                        open={isCreateMeetingOpen}
                        onOpenChange={setIsCreateMeetingOpen}
                        channelName={selectedChannel.name}
                        onCreateMeeting={handleCreateMeeting}
                        isCreating={createMeeting.isPending}
                      />
                    </>
                  }
                />
              </div>

              {/* Content Area with Tabs */}
              <Tabs defaultValue="meetings" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 pt-2 border-b border-border/50 bg-[#0B1120]">
                  <TabsList className="bg-background/30">
                    <TabsTrigger value="meetings" className="gap-2">
                      <FileText className="w-4 h-4" />
                      {t("meeting.intel.meetingRecordsTab")}
                    </TabsTrigger>
                    <TabsTrigger value="transcription" className="gap-2">
                      <Mic className="w-4 h-4" />
                      {t("meeting.intel.transcription")}
                    </TabsTrigger>
                    <TabsTrigger value="export-history" className="gap-2">
                      <History className="w-4 h-4" />
                      {t("meeting.intel.exportHistory")}
                    </TabsTrigger>
                    <TabsTrigger value="batch-export" className="gap-2">
                      <FileArchive className="w-4 h-4" />
                      {t("meeting.intel.batchExport")}
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="meetings" className="flex-1 flex min-h-0 m-0">
                  {/* Meeting List */}
                  <div className="w-80 border-r border-border/50 flex flex-col">
                  <div className="p-3 border-b border-border/50">
                    <Input placeholder={t("meeting.intel.searchMeetings")} className="bg-background/30 h-8" />
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                      {meetings?.map((meeting: any) => (
                        <Card
                          key={meeting.id}
                          className={cn(
                            "cursor-pointer transition-all hover:border-primary/50",
                            selectedMeeting?.id === meeting.id && "border-primary bg-primary/5"
                          )}
                          onClick={() => setSelectedMeeting(meeting)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-sm truncate">{meeting.title}</h3>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(meeting.meeting_date), "yyyy-MM-dd")}
                                </div>
                              </div>
                              {meeting.phase && (
                                <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                  {meeting.phase.split("_")[0]}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {meeting.block_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {meeting.assessment_count || 0}
                              </span>
                              {meeting.ai_insights && (
                                <span className="flex items-center gap-1 text-primary">
                                  <Sparkles className="w-3 h-3" />
                                  AI
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {(!meetings || meetings.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t("meeting.intel.noMeetingRecords")}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Meeting Detail */}
                <div className="flex-1 flex flex-col min-w-0">
                  {selectedMeeting ? (
                    <>
                      {/* Meeting Header */}
                      <div className="p-4 border-b border-border/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-lg font-bold">{selectedMeeting.title}</h2>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(selectedMeeting.meeting_date), "PPP", { locale: zhCN })}
                              </span>
                              {selectedMeeting.phase && (
                                <Badge variant="outline">{selectedMeeting.phase.replace("_", " ")}</Badge>
                              )}
                            </div>
                            {selectedMeeting.objective && (
                              <p className="mt-2 text-sm text-muted-foreground flex items-start gap-2">
                                <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                {selectedMeeting.objective}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateSummary.mutate({ meetingId: selectedMeeting.id })}
                              disabled={generateSummary.isPending}
                            >
                              <Brain className="w-4 h-4 mr-1" />
                              {generateSummary.isPending ? t("meeting.intel.generating") : t("meeting.intel.aiSummary")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateAssessments.mutate({ meetingId: selectedMeeting.id })}
                              disabled={generateAssessments.isPending}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              {generateAssessments.isPending ? t("meeting.intel.assessing") : t("meeting.intel.aiAssessment")}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Meeting Content */}
                      <ScrollArea className="flex-1">
                        <div className="p-4 space-y-4">
                          {/* AI Summary */}
                          {selectedMeeting.ai_insights && (
                            <Card className="bg-gradient-to-br from-primary/10 to-emerald-500/10 border-primary/30">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-primary" />
                                  {t("meeting.intel.aiMeetingSummary")}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="text-sm">{selectedMeeting.summary}</p>
                                {selectedMeeting.ai_insights.decisions?.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-muted-foreground mb-1">{t("meeting.intel.keyDecisions")}</h4>
                                    <ul className="space-y-1">
                                      {selectedMeeting.ai_insights.decisions.map((d: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                          {d}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {selectedMeeting.ai_insights.actionItems?.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-muted-foreground mb-1">{t("meeting.intel.actionItems")}</h4>
                                    <ul className="space-y-1">
                                      {selectedMeeting.ai_insights.actionItems.map((item: any, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                          <Play className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                          <span>{item.task}</span>
                                          <Badge variant="secondary" className="text-[10px]">{item.owner}</Badge>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Content Blocks */}
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              {t("meeting.intel.meetingContent")} ({contentBlocks?.length || 0})
                            </h3>
                            {contentBlocks?.map((block: any) => (
                              <ContentBlockCard key={block.id} block={block} />
                            ))}
                            {(!contentBlocks || contentBlocks.length === 0) && (
                              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                                {t("meeting.intel.noContentBlocks")}
                              </div>
                            )}
                          </div>

                          {/* HR Assessments */}
                          {assessments && assessments.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {t("meeting.intel.participantAssessment")} ({assessments.length})
                              </h3>
                              <div className="grid grid-cols-2 gap-3">
                                {assessments.map((assessment: any) => (
                                  <AssessmentCard key={assessment.id} assessment={assessment} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t("meeting.intel.selectMeeting")}</p>
                      </div>
                    </div>
                  )}
                </div>
                </TabsContent>
                
                {/* 语音转录Tab */}
                <TabsContent value="transcription" className="flex-1 p-4 overflow-auto m-0">
                  <MeetingTranscription meetingId={selectedMeeting?.id} />
                </TabsContent>
                
                {/* 导出历史Tab */}
                <TabsContent value="export-history" className="flex-1 p-4 overflow-auto m-0">
                  <ExportHistory 
                    defaultFilterType="transcription" 
                    hideTypeFilter={true}
                    title={t("meeting.intel.transcriptionExportHistory")}
                  />
                </TabsContent>
                
                {/* 批量导出Tab */}
                <TabsContent value="batch-export" className="flex-1 p-4 overflow-auto m-0">
                  <BatchExport 
                    meetings={(meetings || []).map((m: any) => ({
                      id: m.id,
                      title: m.title || t("meeting.intel.untitledMeeting"),
                      date: new Date(m.meetingDate || m.createdAt),
                      duration: m.duration,
                      participants: m.participants?.split(',') || [],
                      hasTranscript: !!m.transcription,
                      hasDecisions: !!m.decisions,
                    }))}
                    onExportComplete={() => {}}
                  />
                </TabsContent>
              </Tabs>
            </>          
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">{t("meeting.intel.systemTitle")}</h2>
                <p className="text-sm max-w-md">
                  {t("meeting.intel.systemDesc")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Insight Panel */}
        <div className="w-80 flex-shrink-0 border-l border-border/50">
          <InsightPanel channelId={selectedChannel?.id} />
        </div>
      </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ContentBlockCard({ block }: { block: any }) {
  const typeStyles: Record<string, { icon: React.ReactNode; color: string }> = {
    text: { icon: <MessageSquare className="w-3 h-3" />, color: "text-muted-foreground" },
    decision: { icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400" },
    action_item: { icon: <Play className="w-3 h-3" />, color: "text-primary" },
    question: { icon: <AlertCircle className="w-3 h-3" />, color: "text-amber-400" },
    insight: { icon: <Lightbulb className="w-3 h-3" />, color: "text-blue-400" },
  };

  const style = typeStyles[block.block_type] || typeStyles.text;

  return (
    <div className="p-3 rounded-lg bg-background/30 border border-border/50">
      <div className="flex items-start gap-2">
        <span className={cn("flex-shrink-0 mt-1", style.color)}>{style.icon}</span>
        <div className="flex-1 min-w-0">
          {block.speaker && (
            <span className="text-xs font-medium text-primary">{block.speaker}</span>
          )}
          <p className="text-sm">{block.content}</p>
        </div>
        <Badge variant="outline" className="text-[10px] flex-shrink-0">
          {block.block_type.replace("_", " ")}
        </Badge>
      </div>
    </div>
  );
}

function AssessmentCard({ assessment }: { assessment: any }) {
  return (
    <Card className="bg-background/30">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">{assessment.employee_name}</span>
          {assessment.ai_generated && (
            <Badge variant="secondary" className="text-[10px]">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              AI
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <ScoreItem label={t("meeting.intel.techClarity")} value={assessment.technical_clarity} />
          <ScoreItem label={t("meeting.intel.proactivity")} value={assessment.proactivity} />
          <ScoreItem label={t("meeting.intel.communication")} value={assessment.communication_skill} />
          <ScoreItem label={t("meeting.intel.problemSolving")} value={assessment.problem_solving} />
        </div>
        {assessment.evidence && assessment.evidence.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground">
              {t("meeting.intel.evidence")}: {JSON.parse(assessment.evidence)[0]}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "font-medium",
        value && value >= 4 && "text-emerald-400",
        value && value >= 3 && value < 4 && "text-amber-400",
        value && value < 3 && "text-rose-400"
      )}>
        {value?.toFixed(1) || "N/A"}
      </span>
    </div>
  );
}
