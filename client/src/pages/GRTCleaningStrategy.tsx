import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { 
  Droplets, 
  Settings2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Zap,
  Target,
  ArrowLeft,
  ClipboardCheck,
  Wrench,
  TestTube,
  Box,
  History
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// 零件特征类型
type PartFeatureType = 
  | 'blind_hole' 
  | 'ribbing' 
  | 'sealing_face' 
  | 'deep_cavity'
  | 'thread' 
  | 'groove' 
  | 'flat_surface' 
  | 'complex_geometry';

// 特征名称映射
const featureNames: Record<PartFeatureType, { zh: string; en: string }> = {
  blind_hole: { zh: "盲孔", en: "Blind Hole" },
  ribbing: { zh: "加强筋", en: "Ribbing" },
  sealing_face: { zh: "密封面", en: "Sealing Face" },
  deep_cavity: { zh: "深腔", en: "Deep Cavity" },
  thread: { zh: "螺纹", en: "Thread" },
  groove: { zh: "沟槽", en: "Groove" },
  flat_surface: { zh: "平面", en: "Flat Surface" },
  complex_geometry: { zh: "复杂几何", en: "Complex Geometry" },
};

export default function GRTCleaningStrategy() {
  const { t, language } = useLanguage();
  const [selectedFeatures, setSelectedFeatures] = useState<PartFeatureType[]>([]);
  const [activeTab, setActiveTab] = useState("strategies");
  const [cycleTimeTarget, setCycleTimeTarget] = useState(60);

  // 获取所有清洗策略
  const { data: allStrategies, isLoading: loadingStrategies } = 
    trpc.capabilityOs.getAllCleaningStrategies.useQuery();

  // 获取所有工程师检查点
  const { data: allCheckpoints, isLoading: loadingCheckpoints } = 
    trpc.capabilityOs.getAllEngineerCheckpoints.useQuery();

  // 分析零件特征
  const { data: analysisResult, isLoading: loadingAnalysis, refetch: analyzeFeatures } = 
    (trpc.capabilityOs.analyzePartFeatures as any).useQuery(
      { features: selectedFeatures },
      { enabled: selectedFeatures.length > 0 }
    );

  // 生成技术方案
  const { data: technicalProposal, isLoading: loadingProposal, refetch: generateProposal } = 
    (trpc.capabilityOs.generateTechnicalProposal as any).useQuery(
      { partFeatures: selectedFeatures, cycleTimeTarget },
      { enabled: false }
    );

  // 获取I/O列表
  const { data: ioList, isLoading: loadingIO } = 
    (trpc.capabilityOs.generateIOList as any).useQuery();

  const handleFeatureToggle = (feature: PartFeatureType) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleGenerateProposal = () => {
    if (selectedFeatures.length === 0) {
      toast.error("请先选择零件特征");
      return;
    }
    generateProposal();
    toast.success("技术方案生成中...");
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 返回按钮 */}
        <div className="flex items-center gap-4">
          <Link href="/capability-os">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <PageHeader
          icon={Droplets}
          title="GRT清洗策略动作库"
          description="托盘精确定位通过式清洗机 - 清洗策略与工程师确认检查点"
          actions={
            <>
              <Link href="/toothpaste-test">
                <Button variant="outline" size="sm" className="gap-2">
                  <TestTube className="w-4 h-4" />
                  牙膏试验录入
                </Button>
              </Link>
              <Link href="/cleaning-trajectory-3d">
                <Button variant="outline" size="sm" className="gap-2">
                  <Box className="w-4 h-4" />
                  3D轨迹可视化
                </Button>
              </Link>
              <Link href="/toothpaste-test-history">
                <Button variant="outline" size="sm" className="gap-2">
                  <History className="w-4 h-4" />
                  试验历史记录
                </Button>
              </Link>
            </>
          }
        />

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="strategies" className="gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">清洗策略</span>
            </TabsTrigger>
            <TabsTrigger value="checkpoints" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              <span className="hidden sm:inline">工程师检查点</span>
            </TabsTrigger>
            <TabsTrigger value="analyzer" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">特征分析</span>
            </TabsTrigger>
            <TabsTrigger value="io-list" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">I/O列表</span>
            </TabsTrigger>
          </TabsList>

          {/* 清洗策略Tab */}
          <TabsContent value="strategies" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingStrategies ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  加载清洗策略中...
                </div>
              ) : allStrategies?.map((strategy: any) => (
                <Card key={strategy.featureType} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {featureNames[strategy.featureType as PartFeatureType]?.[language === 'zh' ? 'zh' : 'en'] || strategy.featureType}
                      </CardTitle>
                      <Badge variant={strategy.priority === 'high' ? 'destructive' : strategy.priority === 'medium' ? 'default' : 'secondary'}>
                        {strategy.priority === 'high' ? '高优先级' : strategy.priority === 'medium' ? '中优先级' : '标准'}
                      </Badge>
                    </div>
                    <CardDescription>{strategy.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">清洗动作</p>
                      <div className="flex flex-wrap gap-1">
                        {strategy.cleaningActions?.map((action: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">推荐参数</p>
                      <div className="text-xs text-muted-foreground">
                        压力: {strategy.parameters?.pressure || 'N/A'} bar | 
                        温度: {strategy.parameters?.temperature || 'N/A'}°C | 
                        时间: {strategy.parameters?.duration || 'N/A'}s
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 工程师检查点Tab */}
          <TabsContent value="checkpoints" className="space-y-4">
            {loadingCheckpoints ? (
              <div className="text-center py-8 text-muted-foreground">
                加载工程师检查点中...
              </div>
            ) : (
              <div className="space-y-6">
                {/* 按阶段分组显示检查点 */}
                {(() => {
                  const checkpointsByPhase: Record<string, any[]> = {};
                  (allCheckpoints || []).forEach((checkpoint: any) => {
                    const phase = checkpoint.phaseCode || 'Unknown';
                    if (!checkpointsByPhase[phase]) {
                      checkpointsByPhase[phase] = [];
                    }
                    checkpointsByPhase[phase].push(checkpoint);
                  });
                  return Object.entries(checkpointsByPhase).map(([phase, checkpoints]) => (
                    <Card key={phase}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ClipboardCheck className="w-5 h-5 text-primary" />
                          {phase} 阶段检查点
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {checkpoints.map((checkpoint: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{checkpoint.question}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  确认人: {checkpoint.confirmBy} | 
                                  必须: {checkpoint.requiredConfirmation ? '是' : '否'}
                                </p>
                              </div>
                              <Badge variant={checkpoint.requiredConfirmation ? 'destructive' : 'secondary'}>
                                {checkpoint.requiredConfirmation ? '必须确认' : '可选'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ));
                })()}
              </div>
            )}
          </TabsContent>

          {/* 特征分析Tab */}
          <TabsContent value="analyzer" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 特征选择 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" />
                    选择零件特征
                  </CardTitle>
                  <CardDescription>
                    选择零件具有的特征，系统将推荐最佳清洗策略组合
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(featureNames).map(([key, names]) => (
                      <div 
                        key={key}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFeatures.includes(key as PartFeatureType)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleFeatureToggle(key as PartFeatureType)}
                      >
                        <Checkbox 
                          checked={selectedFeatures.includes(key as PartFeatureType)}
                          onCheckedChange={() => handleFeatureToggle(key as PartFeatureType)}
                        />
                        <span className="text-sm font-medium">
                          {language === 'zh' ? names.zh : names.en}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium">目标节拍时间 (秒)</label>
                    <input
                      type="number"
                      value={cycleTimeTarget}
                      onChange={(e) => setCycleTimeTarget(Number(e.target.value))}
                      className="w-full mt-2 px-3 py-2 rounded-md border border-border bg-background"
                      min={10}
                      max={300}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleGenerateProposal}
                    disabled={selectedFeatures.length === 0 || loadingProposal}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    生成技术方案
                  </Button>
                </CardContent>
              </Card>

              {/* 分析结果 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    分析结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAnalysis ? (
                    <div className="text-center py-8 text-muted-foreground">
                      分析中...
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">推荐清洗策略</p>
                        <div className="space-y-2">
                          {analysisResult.recommendedStrategies?.map((strategy: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-sm">{strategy.name}</span>
                              <Badge variant="outline" className="ml-auto">{strategy.priority}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {analysisResult.warnings?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">注意事项</p>
                          <div className="space-y-2">
                            {analysisResult.warnings.map((warning: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 text-yellow-700">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{warning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">预估参数</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">压力</p>
                            <p className="font-bold">{analysisResult.estimatedParameters?.pressure || 'N/A'} bar</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">温度</p>
                            <p className="font-bold">{analysisResult.estimatedParameters?.temperature || 'N/A'}°C</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">时间</p>
                            <p className="font-bold">{analysisResult.estimatedParameters?.duration || 'N/A'}s</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      请选择零件特征以获取分析结果
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 技术方案摘要 */}
            {technicalProposal && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    技术方案摘要
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">
                      {technicalProposal.summary}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* I/O列表Tab */}
          <TabsContent value="io-list" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  西门子PLC I/O列表
                </CardTitle>
                <CardDescription>
                  S7-1500 PLC控制系统标准I/O配置
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingIO ? (
                  <div className="text-center py-8 text-muted-foreground">
                    加载I/O列表中...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 数字输入 */}
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Badge>DI</Badge> 数字输入
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ioList?.digitalInputs?.map((io: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                            <code className="text-xs bg-background px-1 rounded">{io.address}</code>
                            <span>{io.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 数字输出 */}
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Badge variant="secondary">DO</Badge> 数字输出
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ioList?.digitalOutputs?.map((io: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                            <code className="text-xs bg-background px-1 rounded">{io.address}</code>
                            <span>{io.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 模拟输入 */}
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Badge variant="outline">AI</Badge> 模拟输入
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ioList?.analogInputs?.map((io: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                            <code className="text-xs bg-background px-1 rounded">{io.address}</code>
                            <span>{io.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 模拟输出 */}
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Badge variant="outline">AO</Badge> 模拟输出
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ioList?.analogOutputs?.map((io: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                            <code className="text-xs bg-background px-1 rounded">{io.address}</code>
                            <span>{io.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
