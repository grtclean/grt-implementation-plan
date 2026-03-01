import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, Image, Mic, Upload, Send, Check, X, Edit2, 
  Loader2, Sparkles, RefreshCw, ChevronRight, Clock, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProcessNotebookProps {
  processType: string;
  processId: string;
  processStep?: string;
  title?: string;
  className?: string;
}

interface NotebookEntry {
  id: bigint;
  entryType: 'text' | 'file' | 'image' | 'voice';
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  voiceTranscript: string | null;
  ocrResult: string | null;
  createdAt: Date | null;
  isAiProcessed: boolean | null;
}

interface AiSuggestion {
  id: bigint;
  suggestionType: 'field_update' | 'process_link' | 'content_match';
  targetField: string | null;
  currentValue: string | null;
  suggestedValue: string | null;
  confidenceScore: string | null;
  reasoning: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
}

export function ProcessNotebook({ 
  processType, 
  processId, 
  processStep,
  title,
  className 
}: ProcessNotebookProps) {
  const [newContent, setNewContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 获取或创建笔记本
  const { data: notebooks, refetch: refetchNotebooks } = trpc.processNotebook.getByProcess.useQuery({
    processType,
    processId,
  });

  const createNotebook = trpc.processNotebook.create.useMutation({
    onSuccess: () => {
      refetchNotebooks();
      toast.success("笔记本已创建");
    },
  });

  const notebook = notebooks?.[0];

  // 获取笔记本条目
  const { data: notebookData, refetch: refetchEntries } = trpc.processNotebook.getNotebookWithEntries.useQuery(
    { notebookId: Number(notebook?.id) },
    { enabled: !!notebook }
  );

  // 获取AI建议
  const { data: suggestions, refetch: refetchSuggestions } = (trpc.aiNotebook.getSuggestions as any).useQuery(
    { notebookId: Number(notebook?.id) },
    { enabled: !!notebook }
  );

  // 添加笔记条目
  const addEntry = (trpc.processNotebook as any).addEntry.useMutation({
    onSuccess: () => {
      refetchEntries();
      setNewContent("");
      toast.success("笔记已添加");
    },
  });

  // 上传文件
  const uploadFile = trpc.processNotebook.uploadFile.useMutation({
    onSuccess: () => {
      refetchEntries();
      toast.success("文件已上传");
    },
  });

  // 分析笔记条目
  const analyzeEntry = trpc.aiNotebook.analyzeEntry.useMutation({
    onSuccess: (data) => {
      refetchSuggestions();
      if ((data as any).suggestions.length > 0) {
        toast.success(`AI已生成 ${(data as any).suggestions.length} 条建议`);
      } else {
        toast.info("未识别到可关联的内容");
      }
    },
    onError: () => {
      toast.error("AI分析失败");
    },
  });

  // 接受建议
  const acceptSuggestion = trpc.aiNotebook.acceptSuggestion.useMutation({
    onSuccess: () => {
      refetchSuggestions();
      toast.success("建议已应用");
    },
  });

  // 拒绝建议
  const rejectSuggestion = trpc.aiNotebook.rejectSuggestion.useMutation({
    onSuccess: () => {
      refetchSuggestions();
      toast.info("建议已忽略");
    },
  });

  // 创建笔记本（如果不存在）
  const handleCreateNotebook = () => {
    createNotebook.mutate({
      processType,
      processId,
      processStep,
      title: title || `${processType}-${processId}笔记`,
    });
  };

  // 添加文本笔记
  const handleAddTextEntry = () => {
    if (!notebook || !newContent.trim()) return;
    addEntry.mutate({
      notebookId: Number(notebook.id),
      entryType: 'text',
      content: newContent,
    });
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = event.target.files?.[0];
    if (!file || !notebook) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadFile.mutate({
        notebookId: Number(notebook.id),
        fileName: file.name,
        fileType: file.type,
        fileData: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  // 分析条目
  const handleAnalyzeEntry = (entryId: number) => {
    setSelectedEntryId(entryId);
    analyzeEntry.mutate({
      entryId,
      processType,
      processId,
    });
  };

  // 渲染笔记条目
  const renderEntry = (entry: NotebookEntry) => {
    const entryId = Number(entry.id);
    return (
      <div 
        key={entryId} 
        className={cn(
          "p-3 rounded-lg border transition-colors",
          selectedEntryId === entryId ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {entry.entryType === 'text' && (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(entry.content || '') }} />
            )}
            {entry.entryType === 'file' && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <a href={entry.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                  {entry.fileName}
                </a>
              </div>
            )}
            {entry.entryType === 'image' && (
              <div className="space-y-2">
                <img src={entry.fileUrl || ''} alt={entry.fileName || ''} className="max-w-full h-auto rounded-md" />
                {entry.ocrResult && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <span className="font-medium">OCR识别：</span>{entry.ocrResult}
                  </div>
                )}
              </div>
            )}
            {entry.entryType === 'voice' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <audio controls src={entry.fileUrl || ''} className="h-8" />
                </div>
                {entry.voiceTranscript && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <span className="font-medium">语音转写：</span>{entry.voiceTranscript}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {entry.isAiProcessed ? (
              <Badge variant="outline" className="text-xs">
                <Check className="w-3 h-3 mr-1" />已分析
              </Badge>
            ) : (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleAnalyzeEntry(entryId)}
                disabled={analyzeEntry.isPending && selectedEntryId === entryId}
              >
                {analyzeEntry.isPending && selectedEntryId === entryId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {entry.createdAt ? new Date(entry.createdAt).toLocaleString('zh-CN') : '未知时间'}
        </div>
      </div>
    );
  };

  // 渲染AI建议
  const renderSuggestion = (suggestion: AiSuggestion) => {
    const suggestionId = Number(suggestion.id);
    const isPending = suggestion.status === 'pending';
    const confidence = parseFloat(suggestion.confidenceScore || '0');

    return (
      <div 
        key={suggestionId}
        className={cn(
          "p-3 rounded-lg border",
          isPending ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={isPending ? "default" : "secondary"} className="text-xs">
              {suggestion.suggestionType === 'field_update' && '字段更新'}
              {suggestion.suggestionType === 'process_link' && '流程关联'}
              {suggestion.suggestionType === 'content_match' && '内容匹配'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              置信度: {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          {!isPending && (
            <Badge variant={suggestion.status === 'accepted' ? "default" : "destructive"} className="text-xs">
              {suggestion.status === 'accepted' && '已接受'}
              {suggestion.status === 'rejected' && '已忽略'}
              {suggestion.status === 'modified' && '已修改'}
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">目标字段：</span>
            <span className="font-medium">{suggestion.targetField}</span>
          </div>
          {suggestion.currentValue && (
            <div>
              <span className="text-muted-foreground">当前值：</span>
              <span className="line-through text-muted-foreground">{suggestion.currentValue}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">建议值：</span>
            <span className="font-medium text-primary">{suggestion.suggestedValue}</span>
          </div>
          {suggestion.reasoning && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {suggestion.reasoning}
            </div>
          )}
        </div>

        {isPending && (
          <div className="flex items-center gap-2 mt-3">
            <Button 
              size="sm" 
              onClick={() => acceptSuggestion.mutate({ suggestionId })}
              disabled={acceptSuggestion.isPending}
            >
              <Check className="w-4 h-4 mr-1" />
              确认更新
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => rejectSuggestion.mutate({ suggestionId })}
              disabled={rejectSuggestion.isPending}
            >
              <X className="w-4 h-4 mr-1" />
              忽略
            </Button>
            <Button size="sm" variant="ghost">
              <Edit2 className="w-4 h-4 mr-1" />
              编辑
            </Button>
          </div>
        )}
      </div>
    );
  };

  // 如果没有笔记本，显示创建按钮
  if (!notebook) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">该流程暂无笔记</p>
          <Button onClick={handleCreateNotebook} disabled={createNotebook.isPending}>
            {createNotebook.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            创建笔记本
          </Button>
        </CardContent>
      </Card>
    );
  }

  const entries = notebookData?.entries || [];
  const pendingSuggestions = suggestions?.filter(s => s.status === 'pending') || [];
  const processedSuggestions = suggestions?.filter(s => s.status !== 'pending') || [];

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4", className)}>
      {/* 左侧：员工Notebook */}
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            笔记记录
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {/* 笔记输入区 */}
          <div className="space-y-3 mb-4">
            <Textarea
              placeholder="输入笔记内容..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={handleAddTextEntry}
                disabled={!newContent.trim() || addEntry.isPending}
              >
                {addEntry.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1" />
                )}
                添加笔记
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => handleFileUpload(e, 'file')}
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadFile.isPending}
              >
                <Upload className="w-4 h-4 mr-1" />
                文件
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'image')}
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadFile.isPending}
              >
                <Image className="w-4 h-4 mr-1" />
                图片
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsRecording(!isRecording)}
                className={cn(isRecording && "bg-red-500 text-white hover:bg-red-600")}
              >
                <Mic className="w-4 h-4 mr-1" />
                {isRecording ? "停止" : "录音"}
              </Button>
            </div>
          </div>

          {/* 笔记列表 */}
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {entries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无笔记，开始记录吧
                </div>
              ) : (
                entries.map(entry => renderEntry(entry as NotebookEntry))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 右侧：AI识别建议 */}
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI识别建议
            </CardTitle>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => refetchSuggestions()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-4">
              {/* 待处理建议 */}
              {pendingSuggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ChevronRight className="w-4 h-4" />
                    待处理建议 ({pendingSuggestions.length})
                  </div>
                  {pendingSuggestions.map(s => renderSuggestion(s as AiSuggestion))}
                </div>
              )}

              {/* 已处理建议 */}
              {processedSuggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                    历史建议 ({processedSuggestions.length})
                  </div>
                  {processedSuggestions.map(s => renderSuggestion(s as AiSuggestion))}
                </div>
              )}

              {/* 无建议时的提示 */}
              {suggestions?.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无AI建议</p>
                  <p className="text-xs mt-2">添加笔记后点击分析按钮生成建议</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProcessNotebook;
