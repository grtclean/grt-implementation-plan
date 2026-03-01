/**
 * Meeting Transcription Component
 * 会议语音转录组件 - 支持录音上传、实时录制、转录结果展示
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload,
  Mic,
  MicOff,
  Play,
  Pause,
  Download,
  FileText,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  FileAudio,
  Trash2,
} from "lucide-react";

interface TranscriptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence: number;
}

interface KeyDecision {
  id: string;
  type: "decision" | "action" | "question" | "agreement";
  content: string;
  speaker?: string;
  timestamp: number;
  priority: "high" | "medium" | "low";
  assignee?: string;
  dueDate?: string;
}

interface TranscriptionResult {
  id: string;
  meetingId?: string;
  audioUrl: string;
  duration: number;
  language: string;
  segments: TranscriptionSegment[];
  keyDecisions: KeyDecision[];
  summary?: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
  error?: string;
}

interface MeetingTranscriptionProps {
  meetingId?: string;
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
}

export function MeetingTranscription({ meetingId, onTranscriptionComplete }: MeetingTranscriptionProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "record" | "results">("upload");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"markdown" | "html">("markdown");
  const [exportOptions, setExportOptions] = useState({
    includeTimestamps: true,
    includeSpeakers: true,
    includeDecisions: true,
    includeSummary: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const transcribeIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const transcriptionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ["audio/mp3", "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/m4a"];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|ogg|m4a)$/i)) {
        toast.error("不支持的文件格式");
        return;
      }
      if (file.size > 16 * 1024 * 1024) {
        toast.error("文件过大");
        return;
      }
      setSelectedFile(file);
      toast.success("文件已选择");
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ["audio/mp3", "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/m4a"];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|ogg|m4a)$/i)) {
        toast.error("不支持的文件格式");
        return;
      }
      if (file.size > 16 * 1024 * 1024) {
        toast.error("文件过大");
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `recording_${Date.now()}.webm`, { type: "audio/webm" });
        setSelectedFile(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success("录音已开始");
    } catch {
      toast.error("无法访问麦克风");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      toast.success("录音已停止");
    }
  };

  const startTranscription = async () => {
    if (!selectedFile) {
      toast.error("请先选择或录制音频文件");
      return;
    }

    setIsTranscribing(true);
    setTranscriptionProgress(0);

    uploadIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    transcriptionTimeoutRef.current = setTimeout(() => {
      transcribeIntervalRef.current = setInterval(() => {
        setTranscriptionProgress((prev) => {
          if (prev >= 100) {
            if (transcribeIntervalRef.current) clearInterval(transcribeIntervalRef.current);
            const mockResult: TranscriptionResult = {
              id: `trans_${Date.now()}`,
              meetingId,
              audioUrl: URL.createObjectURL(selectedFile),
              duration: 180000,
              language: "zh-CN",
              segments: [
                { id: "seg_1", startTime: 0, endTime: 15000, text: "好的，我们今天的会议主要讨论项目进度和下一步计划。", speaker: "主持人", confidence: 0.95 },
                { id: "seg_2", startTime: 15000, endTime: 35000, text: "目前开发进度已完成80%，预计下周可以进入测试阶段。", speaker: "开发负责人", confidence: 0.92 },
                { id: "seg_3", startTime: 35000, endTime: 55000, text: "测试团队已经准备好了测试用例，可以随时开始测试。", speaker: "测试负责人", confidence: 0.94 },
                { id: "seg_4", startTime: 55000, endTime: 80000, text: "那我们就确定下周一开始进入测试阶段，请各位做好准备。", speaker: "主持人", confidence: 0.96 },
              ],
              keyDecisions: [
                { id: "dec_1", type: "decision", content: "下周一开始进入测试阶段", speaker: "主持人", timestamp: 55000, priority: "high" },
                { id: "dec_2", type: "action", content: "开发团队完成剩余20%开发工作", speaker: "开发负责人", timestamp: 15000, priority: "high", assignee: "开发团队", dueDate: "2024-01-15" },
                { id: "dec_3", type: "action", content: "测试团队准备测试环境", speaker: "测试负责人", timestamp: 35000, priority: "medium", assignee: "测试团队", dueDate: "2024-01-14" },
              ],
              summary: "本次会议讨论了项目进度，开发已完成80%，决定下周一进入测试阶段。",
              status: "completed",
              createdAt: Date.now(),
              completedAt: Date.now(),
            };
            setTranscriptionResult(mockResult);
            setIsTranscribing(false);
            setActiveTab("results");
            onTranscriptionComplete?.(mockResult);
            toast.success("转录完成");
            return 100;
          }
          return prev + 5;
        });
      }, 300);
    }, 2500);
  };

  const handleExport = () => {
    if (!transcriptionResult) return;
    let content = "";
    const fileName = `meeting_transcription_${transcriptionResult.id}`;
    if (exportFormat === "markdown") {
      content = `# 会议转录记录\n\n**会议ID**: ${transcriptionResult.meetingId || "N/A"}\n**转录时间**: ${new Date(transcriptionResult.createdAt).toLocaleString()}\n\n## 转录内容\n\n`;
      transcriptionResult.segments.forEach((seg) => {
        content += `[${formatTimestamp(seg.startTime)}] **${seg.speaker || "未知"}**: ${seg.text}\n\n`;
      });
    } else {
      content = `<!DOCTYPE html><html><head><title>会议转录</title></head><body><h1>会议转录记录</h1></body></html>`;
    }
    const blob = new Blob([content], { type: exportFormat === "markdown" ? "text/markdown" : "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.${exportFormat === "markdown" ? "md" : "html"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
    toast.success("导出成功");
  };

  // Cleanup all intervals/timeouts on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
      if (transcribeIntervalRef.current) clearInterval(transcribeIntervalRef.current);
      if (transcriptionTimeoutRef.current) clearTimeout(transcriptionTimeoutRef.current);
    };
  }, []);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getDecisionTypeLabel = (type: KeyDecision["type"]) => {
    const labels = {
      decision: { text: "决策", variant: "default" as const },
      action: { text: "行动项", variant: "secondary" as const },
      question: { text: "问题", variant: "outline" as const },
      agreement: { text: "共识", variant: "default" as const },
    };
    return labels[type];
  };

  const getPriorityColor = (priority: KeyDecision["priority"]) => {
    const colors = { high: "text-red-500", medium: "text-orange-500", low: "text-green-500" };
    return colors[priority];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-5 w-5 text-primary" />
          会议语音转录
        </CardTitle>
        <CardDescription>上传录音文件或实时录制，AI自动转录并提取关键决策</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              上传录音
            </TabsTrigger>
            <TabsTrigger value="record" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              实时录制
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2" disabled={!transcriptionResult}>
              <FileText className="h-4 w-4" />
              转录结果
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">拖拽文件到此处或点击上传</p>
              <p className="text-sm text-muted-foreground mt-2">支持 MP3、WAV、WebM、OGG、M4A 格式，最大 16MB</p>
            </div>
            {selectedFile && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileAudio className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearSelectedFile}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {isTranscribing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>上传进度</span><span>{uploadProgress}%</span></div>
                <Progress value={uploadProgress} />
                <div className="flex justify-between text-sm"><span>转录进度</span><span>{transcriptionProgress}%</span></div>
                <Progress value={transcriptionProgress} />
              </div>
            )}
            <Button className="w-full" onClick={startTranscription} disabled={!selectedFile || isTranscribing}>
              {isTranscribing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />转录中...</> : <><Play className="h-4 w-4 mr-2" />开始转录</>}
            </Button>
          </TabsContent>

          <TabsContent value="record" className="space-y-4">
            <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-colors ${isRecording ? "bg-red-100 animate-pulse" : "bg-muted"}`}>
                {isRecording ? <MicOff className="h-12 w-12 text-red-500" /> : <Mic className="h-12 w-12 text-muted-foreground" />}
              </div>
              <p className="text-3xl font-mono mb-4">{formatTime(recordingTime)}</p>
              <div className="flex gap-4">
                {!isRecording ? (
                  <Button onClick={startRecording} size="lg"><Mic className="h-4 w-4 mr-2" />开始录音</Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" size="lg"><Pause className="h-4 w-4 mr-2" />停止录音</Button>
                )}
              </div>
            </div>
            {selectedFile && !isRecording && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-8 w-8 text-primary" />
                    <div><p className="font-medium">录音完成</p><p className="text-sm text-muted-foreground">时长: {formatTime(recordingTime)}</p></div>
                  </div>
                </div>
                <Button className="w-full" onClick={startTranscription} disabled={isTranscribing}>
                  {isTranscribing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />转录中...</> : <><Play className="h-4 w-4 mr-2" />开始转录</>}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {transcriptionResult && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />转录完成</Badge>
                    <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{formatTimestamp(transcriptionResult.duration)}</Badge>
                  </div>
                  <Button variant="outline" onClick={() => setShowExportDialog(true)}><Download className="h-4 w-4 mr-2" />导出</Button>
                </div>
                {transcriptionResult.summary && (
                  <Card><CardHeader className="pb-2"><CardTitle className="text-base">会议摘要</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{transcriptionResult.summary}</p></CardContent></Card>
                )}
                {transcriptionResult.keyDecisions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">关键决策和行动项</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {transcriptionResult.keyDecisions.map((decision) => {
                          const typeLabel = getDecisionTypeLabel(decision.type);
                          return (
                            <div key={decision.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <Badge variant={typeLabel.variant}>{typeLabel.text}</Badge>
                              <div className="flex-1">
                                <p className="text-sm">{decision.content}</p>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                  {decision.speaker && <span className="flex items-center gap-1"><User className="h-3 w-3" />{decision.speaker}</span>}
                                  {decision.assignee && <span>负责人: {decision.assignee}</span>}
                                  {decision.dueDate && <span>截止: {decision.dueDate}</span>}
                                  <span className={getPriorityColor(decision.priority)}>{decision.priority === "high" ? "高优先级" : decision.priority === "medium" ? "中优先级" : "低优先级"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">转录内容</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {transcriptionResult.segments.map((segment) => (
                          <div key={segment.id} className="flex gap-3">
                            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">[{formatTimestamp(segment.startTime)}]</span>
                            <div>{segment.speaker && <span className="font-medium text-primary">{segment.speaker}: </span>}<span className="text-sm">{segment.text}</span></div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>导出转录结果</DialogTitle><DialogDescription>选择导出格式和包含的内容</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>导出格式</Label>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown (.md)</SelectItem>
                    <SelectItem value="html">HTML (.html)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>包含内容</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="timestamps" checked={exportOptions.includeTimestamps} onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, includeTimestamps: checked as boolean }))} />
                    <label htmlFor="timestamps" className="text-sm">包含时间戳</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="speakers" checked={exportOptions.includeSpeakers} onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, includeSpeakers: checked as boolean }))} />
                    <label htmlFor="speakers" className="text-sm">包含讲话人</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="decisions" checked={exportOptions.includeDecisions} onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, includeDecisions: checked as boolean }))} />
                    <label htmlFor="decisions" className="text-sm">包含关键决策</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="summary" checked={exportOptions.includeSummary} onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, includeSummary: checked as boolean }))} />
                    <label htmlFor="summary" className="text-sm">包含会议摘要</label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>取消</Button>
              <Button onClick={handleExport}><Download className="h-4 w-4 mr-2" />导出</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default MeetingTranscription;
