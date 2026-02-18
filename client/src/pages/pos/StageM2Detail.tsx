import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { 
  ArrowLeft, Sparkles, FileSearch, Copy, GitBranch, 
  CheckCircle2, AlertCircle, Loader2, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

export default function StageM2Detail() {
  const [, params] = useRoute('/pos/projects/:id/stage/m2');
  const projectId = (params as { id: string } | null)?.id ? parseInt((params as { id: string }).id) : 0;
  
  const [selectedBaseline, setSelectedBaseline] = useState<string | null>(null);
  const [differentialInputs, setDifferentialInputs] = useState({
    specialTech: '',
    packaging: '',
    automation: '',
    environmental: '',
    acceptance: '',
  });
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [similarProjects, setSimilarProjects] = useState<{ projectCode: string; projectName: string }[]>([]);

  const generateSummaryMutation = trpc.pos.ai.generateM2Summary.useMutation({
    onSuccess: (data) => {
      // AI返回的可能是对象或字符串，统一处理
      const summary = (data as { summary: string | object }).summary;
      if (typeof summary === 'object') {
        setAiSummary(JSON.stringify(summary, null, 2));
      } else {
        setAiSummary(summary);
      }
      toast.success('M2摘要生成成功');
    },
    onError: () => toast.error('生成失败，请重试'),
  });

  const findSimilarMutation = trpc.pos.ai.findSimilarProjects.useQuery(
    { projectId },
    { enabled: false }
  );

  const generateV0Mutation = trpc.pos.version.generateAIV0.useMutation({
    onSuccess: () => toast.success('AIV0版本生成成功'),
    onError: () => toast.error('生成失败'),
  });

  const generateV1Mutation = trpc.pos.version.generateV1.useMutation({
    onSuccess: () => toast.success('V1版本生成成功'),
    onError: () => toast.error('生成失败'),
  });

  const handleGenerateSummary = () => {
    generateSummaryMutation.mutate({ projectId, stageId: 2 });
  };

  const handleFindSimilar = async () => {
    const result = await findSimilarMutation.refetch();
    if (result.data) {
      // 确保数据是数组格式
      const projects = Array.isArray(result.data) ? result.data : [];
      setSimilarProjects(projects);
      toast.success(`找到 ${projects.length} 个相似项目`);
    }
  };

  const handleGenerateV0 = () => {
    if (!selectedBaseline) {
      toast.error('请先选择基线项目');
      return;
    }
    generateV0Mutation.mutate({ projectId, baseProjectCode: selectedBaseline });
  };

  const handleGenerateV1 = () => {
    generateV1Mutation.mutate({
      projectId,
      baseVersionId: 1,
      deltaInput: {
        specialTech: differentialInputs.specialTech,
        automation: differentialInputs.automation,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <div className="flex items-center gap-4">
        <Link href={`/pos/projects/${projectId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />返回项目</Button>
        </Link>
      </div>

      <PageHeader
        icon={Sparkles}
        title="M2 - 方案设计"
        description="技术方案与报价准备"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：阶段内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 列车式UI - 四段 */}
          <Card>
            <CardHeader>
              <CardTitle>输入物</CardTitle>
              <CardDescription>M2阶段所需的输入文档和信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>客户需求规格书</span>
                  <Badge variant="outline">待上传</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>技术参数表</span>
                  <Badge variant="outline">待上传</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>现场勘察报告</span>
                  <Badge variant="outline">待上传</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>输出物</CardTitle>
              <CardDescription>M2阶段需要产出的文档</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>技术方案书</span>
                  <Badge>待完成</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>报价单</span>
                  <Badge>待完成</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>项目计划草案</span>
                  <Badge>待完成</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>任务清单</CardTitle>
              <CardDescription>M2阶段的任务列表</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                暂无任务，点击右侧AI功能生成任务建议
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：AI功能区 */}
        <div className="space-y-6">
          <Card className="border-primary/50">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI 智能助手
              </CardTitle>
              <CardDescription>M2阶段AI辅助功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* 1. AI生成M2摘要 */}
              <div>
                <Button 
                  className="w-full" 
                  onClick={handleGenerateSummary}
                  disabled={generateSummaryMutation.isPending}
                >
                  {generateSummaryMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileSearch className="w-4 h-4 mr-2" />
                  )}
                  AI生成M2摘要
                </Button>
                {aiSummary && (
                  <div className="mt-3 p-3 bg-muted rounded-lg text-sm max-h-60 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs">{typeof aiSummary === 'object' ? JSON.stringify(aiSummary, null, 2) : aiSummary}</pre>
                  </div>
                )}
              </div>

              <Separator />

              {/* 2. AI推荐相似项目 */}
              <div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleFindSimilar}
                  disabled={findSimilarMutation.isFetching}
                >
                  {findSimilarMutation.isFetching ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  AI推荐相似项目
                </Button>
                {similarProjects.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {similarProjects.map((p: any) => (
                      <div 
                        key={p.projectCode}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          selectedBaseline === p.projectCode 
                            ? 'border-primary bg-primary/10' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedBaseline(p.projectCode)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{p.projectCode}</span>
                          {selectedBaseline === p.projectCode && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.projectName}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* 示例项目（当API未返回数据时显示） */}
                {similarProjects.length === 0 && (
                  <div className="mt-3 space-y-2">
                    {['GRT-347', 'GRT-369', 'GRT-388'].map((code) => (
                      <div 
                        key={code}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          selectedBaseline === code 
                            ? 'border-primary bg-primary/10' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedBaseline(code)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{code}</span>
                          {selectedBaseline === code && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">示例基线项目</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* 3. 一键生成AIV0 */}
              <div>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={handleGenerateV0}
                  disabled={!selectedBaseline || generateV0Mutation.isPending}
                >
                  {generateV0Mutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <GitBranch className="w-4 h-4 mr-2" />
                  )}
                  一键生成 AIV0
                </Button>
                {selectedBaseline && (
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    基于 {selectedBaseline} 复制M3-M12
                  </p>
                )}
              </div>

              <Separator />

              {/* 4. 差异增强输入 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">差异增强输入</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">特殊技术</Label>
                    <Textarea 
                      placeholder="如：UWB定位、CCD视觉检测..."
                      value={differentialInputs.specialTech}
                      onChange={(e) => setDifferentialInputs(prev => ({ ...prev, specialTech: e.target.value }))}
                      className="h-16"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">自动化程度</Label>
                    <Textarea 
                      placeholder="如：全自动上下料、AGV对接..."
                      value={differentialInputs.automation}
                      onChange={(e) => setDifferentialInputs(prev => ({ ...prev, automation: e.target.value }))}
                      className="h-16"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">环保要求</Label>
                    <Textarea 
                      placeholder="如：VOC排放、废水处理..."
                      value={differentialInputs.environmental}
                      onChange={(e) => setDifferentialInputs(prev => ({ ...prev, environmental: e.target.value }))}
                      className="h-16"
                    />
                  </div>
                </div>
              </div>

              {/* 5. 生成V1 */}
              <Button 
                className="w-full"
                onClick={handleGenerateV1}
                disabled={generateV1Mutation.isPending}
              >
                {generateV1Mutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                生成 V1 版本
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3 h-3" />
                <span>V1版本为草稿状态，需工程师确认后激活</span>
              </div>

              <Link href={`/pos/projects/${projectId}/versions`}>
                <Button variant="link" className="w-full">
                  查看版本历史 <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
