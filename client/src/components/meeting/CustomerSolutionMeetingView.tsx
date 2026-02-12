/**
 * 客户方案沟通确认会议详情视图
 * Customer Solution Meeting Detail View
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Upload, 
  FileText, 
  Image as ImageIcon,
  Brain,
  Sparkles,
  Mic,
  FileSearch,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Download,
  Eye,
  GitCompare,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Folder,
  File,
  Layers
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface CustomerSolutionMeetingViewProps {
  meetingId: string;
  onClose?: () => void;
}

export default function CustomerSolutionMeetingView({
  meetingId,
  onClose
}: CustomerSolutionMeetingViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMatchingCases, setIsMatchingCases] = useState(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  // 获取会议详情
  const { data: meeting, isLoading } = trpc.customerSolutionMeeting.get.useQuery(
    { meetingId },
    { enabled: !!meetingId }
  );

  // 获取上传的文件
  const { data: uploads } = trpc.customerSolutionMeeting.getUploads.useQuery(
    { meetingId },
    { enabled: !!meetingId }
  );

  // 获取方案版本
  const { data: versions } = trpc.customerSolutionMeeting.getVersions.useQuery(
    { meetingId },
    { enabled: !!meetingId }
  );

  // AI案例匹配
  const matchCasesMutation = trpc.customerSolutionMeeting.matchCases.useMutation({
    onSuccess: () => {
      setIsMatchingCases(false);
    },
    onError: () => {
      setIsMatchingCases(false);
    }
  });

  // 生成方案建议
  const generateSuggestionMutation = trpc.customerSolutionMeeting.generateSuggestion.useMutation({
    onSuccess: () => {
      setIsGeneratingSuggestion(false);
    },
    onError: () => {
      setIsGeneratingSuggestion(false);
    }
  });

  const handleMatchCases = async () => {
    if (!meeting) return;
    setIsMatchingCases(true);
    await matchCasesMutation.mutateAsync({
      meetingId,
      productType: meeting.productType,
      partMaterial: meeting.partMaterial,
      cleanlinessLevel: meeting.cleanlinessLevel,
      cleanlinessStandard: meeting.cleanlinessStandard,
      cycleTime: meeting.cycleTime
    });
  };

  const handleGenerateSuggestion = async () => {
    if (!meeting) return;
    setIsGeneratingSuggestion(true);
    await generateSuggestionMutation.mutateAsync({
      meetingId,
      customerRequirements: meeting.customerRequirements || '',
      productType: meeting.productType,
      partMaterial: meeting.partMaterial,
      cleanlinessLevel: meeting.cleanlinessLevel,
      cleanlinessStandard: meeting.cleanlinessStandard,
      cycleTime: meeting.cycleTime,
      loadingForm: meeting.loadingForm
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>未找到会议信息</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 会议头部信息 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {meeting.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <Badge variant={meeting.meetingType === 'external' ? 'default' : 'secondary'}>
                  {meeting.meetingType === 'external' ? '对外会议' : '对内会议'}
                </Badge>
                <Badge variant="outline">
                  {meeting.meetingMode === 'online' ? '线上' : meeting.meetingMode === 'offline' ? '线下' : '混合'}
                </Badge>
                <span className="text-muted-foreground">
                  {meeting.customerName && `客户: ${meeting.customerName}`}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {meeting.aiCaseMatchingEnabled && (
                <Badge variant="secondary" className="text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  案例匹配
                </Badge>
              )}
              {meeting.aiSolutionSuggestionEnabled && (
                <Badge variant="secondary" className="text-xs">
                  <FileSearch className="h-3 w-3 mr-1" />
                  方案建议
                </Badge>
              )}
              {meeting.aiVoiceRecognitionEnabled && (
                <Badge variant="secondary" className="text-xs">
                  <Mic className="h-3 w-3 mr-1" />
                  语音识别
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 主要内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="files">资料上传</TabsTrigger>
          <TabsTrigger value="cases">案例匹配</TabsTrigger>
          <TabsTrigger value="suggestion">方案建议</TabsTrigger>
          <TabsTrigger value="docs">技术资料</TabsTrigger>
          <TabsTrigger value="versions">版本管理</TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[600px] mt-4">
          {/* 概览 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">客户需求</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">产品类型</p>
                      <p className="font-medium">{meeting.productType || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">零件名称</p>
                      <p className="font-medium">{meeting.partName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">材料类型</p>
                      <p className="font-medium">{meeting.partMaterial || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">生产节拍</p>
                      <p className="font-medium">{meeting.cycleTime ? `${meeting.cycleTime}秒/件` : '-'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">清洁度要求</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{meeting.cleanlinessLevel || '未指定'}</Badge>
                      {meeting.cleanlinessStandard && (
                        <Badge variant="secondary">{meeting.cleanlinessStandard}</Badge>
                      )}
                    </div>
                  </div>
                  {meeting.customerRequirements && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-sm mb-2">需求描述</p>
                        <p className="text-sm">{meeting.customerRequirements}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">AI分析状态</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">案例匹配</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleMatchCases}
                        disabled={isMatchingCases || !meeting.aiCaseMatchingEnabled}
                      >
                        {isMatchingCases ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSearch className="h-4 w-4 text-green-500" />
                        <span className="text-sm">方案生成</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleGenerateSuggestion}
                        disabled={isGeneratingSuggestion || !meeting.aiSolutionSuggestionEnabled}
                      >
                        {isGeneratingSuggestion ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">语音转写</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={!meeting.aiVoiceRecognitionEnabled}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 快速操作 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">快速操作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">上传图纸</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-xs">上传照片</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Mic className="h-5 w-5" />
                    <span className="text-xs">上传录音</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">生成纪要</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 资料上传 */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">上传客户资料</CardTitle>
                <CardDescription>
                  上传客户图纸、清洁度要求文档、零件照片等资料，AI将自动分析并匹配相似案例
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    拖拽文件到此处，或点击上传
                  </p>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    选择文件
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    支持格式：PDF、DWG、DXF、JPG、PNG、MP3、WAV
                  </p>
                </div>
              </CardContent>
            </Card>

            {uploads && uploads.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">已上传文件 ({uploads.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {uploads.map((file: any) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <File className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">{file.fileType}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Brain className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 案例匹配 */}
          <TabsContent value="cases" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-blue-500" />
                      AI案例匹配
                    </CardTitle>
                    <CardDescription>
                      基于客户需求，从案例库中智能匹配相似/相近历史案例
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleMatchCases}
                    disabled={isMatchingCases}
                  >
                    {isMatchingCases ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        匹配中...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        开始匹配
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {matchCasesMutation.data ? (
                  <div className="space-y-4">
                    {matchCasesMutation.data.matchedCases.map((caseItem: any, index: number) => (
                      <div key={caseItem.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{caseItem.caseName}</p>
                            <p className="text-sm text-muted-foreground">{caseItem.caseNumber}</p>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={caseItem.similarityScore >= 80 ? 'default' : 'secondary'}
                            >
                              相似度: {caseItem.similarityScore}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={caseItem.similarityScore} className="h-2 mb-3" />
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">产品类型</p>
                            <p>{caseItem.productType}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">材料</p>
                            <p>{caseItem.partMaterial}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">清洁度</p>
                            <p>{caseItem.cleanlinessLevel}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">节拍</p>
                            <p>{caseItem.cycleTime}秒</p>
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>点击"开始匹配"按钮，AI将自动分析并匹配相似案例</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 方案建议 */}
          <TabsContent value="suggestion" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-500" />
                      智能方案建议
                    </CardTitle>
                    <CardDescription>
                      基于案例库和技术资料，AI自动生成设备配置和工艺流程建议
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleGenerateSuggestion}
                    disabled={isGeneratingSuggestion}
                  >
                    {isGeneratingSuggestion ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        生成方案
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {generateSuggestionMutation.data ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="font-medium text-green-800 dark:text-green-200">
                          {generateSuggestionMutation.data.title}
                        </p>
                        <Badge variant="secondary">
                          置信度: {generateSuggestionMutation.data.confidence}%
                        </Badge>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {generateSuggestionMutation.data.summary}
                      </p>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">设备配置建议</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                          {JSON.stringify(generateSuggestionMutation.data.equipmentConfig, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">工艺流程建议</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {generateSuggestionMutation.data.processFlow?.map((step: any, index: number) => (
                            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{step.name}</p>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>点击"生成方案"按钮，AI将基于需求和案例生成方案建议</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 技术资料 */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  M0-M12 项目阶段资料
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'].map(phase => (
                    <Button key={phase} variant="outline" size="sm" className="justify-start">
                      <Folder className="h-4 w-4 mr-2" />
                      {phase}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  T1-T15 工序资料
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 15 }, (_, i) => `T${i + 1}`).map(step => (
                    <Button key={step} variant="outline" size="sm" className="justify-start">
                      <Layers className="h-4 w-4 mr-2" />
                      {step}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  AI智能检索
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input placeholder="输入关键词搜索技术资料..." className="flex-1" />
                  <Button>
                    <FileSearch className="h-4 w-4 mr-2" />
                    搜索
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 版本管理 */}
          <TabsContent value="versions" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">方案版本历史</CardTitle>
                    <CardDescription>
                      管理和比较不同版本的方案，支持版本回溯和审批
                    </CardDescription>
                  </div>
                  <Button size="sm">
                    <GitCompare className="h-4 w-4 mr-2" />
                    版本对比
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {versions && versions.length > 0 ? (
                  <div className="space-y-3">
                    {versions.map((version: any) => (
                      <div key={version.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">V{version.versionNumber}</p>
                              <Badge variant={
                                version.versionStatus === 'approved' ? 'default' :
                                version.versionStatus === 'rejected' ? 'destructive' :
                                'secondary'
                              }>
                                {version.versionStatus === 'approved' ? '已批准' :
                                 version.versionStatus === 'rejected' ? '已拒绝' :
                                 version.versionStatus === 'pending' ? '待审批' : '草稿'}
                              </Badge>
                              {version.aiGenerated && (
                                <Badge variant="outline">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI生成
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {version.solutionTitle}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {version.aiConfidence && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>AI置信度:</span>
                            <Progress value={version.aiConfidence} className="w-24 h-2" />
                            <span>{version.aiConfidence}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无方案版本记录</p>
                    <p className="text-sm mt-2">生成方案建议后将自动创建版本</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
