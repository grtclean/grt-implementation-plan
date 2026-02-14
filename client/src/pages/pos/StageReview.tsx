import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useRoute, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, Clock, User,
  Wrench, Zap, Shield, HeadphonesIcon, ShoppingCart, FileCheck,
  Loader2, ArrowRight, Package, AlertCircle, CheckCheck
} from "lucide-react";
import { toast } from "sonner";
import {
  M3_DIMENSIONS as SHARED_M3_DIMS,
  M4_CARRIAGES as SHARED_M4_CARS,
} from "../../../../shared/stage-definitions";

// Map shared definitions to local format with Lucide icon components
const iconMap: Record<string, any> = {
  FileCheck, User, AlertTriangle, Wrench, Zap, Shield, HeadphonesIcon, ShoppingCart,
};

const M3_DIMENSIONS = SHARED_M3_DIMS.map(d => ({
  id: d.id,
  name: d.name,
  icon: iconMap[d.icon] || FileCheck,
  desc: d.description,
}));

const M4_CARRIAGES = SHARED_M4_CARS.map(c => ({
  id: c.id,
  name: c.name,
  icon: iconMap[c.icon] || Wrench,
  color: c.color,
  checkItems: c.checkItems,
}));

interface M3ReviewItem {
  dimensionId: string;
  conclusion: 'PASS' | 'CONDITIONAL' | 'FAIL';
  owner: string;
  risks?: string;
  notes?: string;
}

interface M4CarriageItem {
  carriageId: string;
  conclusion: 'PASS' | 'CONDITIONAL' | 'FAIL';
  owner: string;
  checkResults?: Record<string, boolean>;
  risks?: string;
  notes?: string;
  dueDate?: string;
}

export default function StageReview() {
  const [, params] = useRoute('/pos/projects/:id/stage/:stage');
  const [, setLocation] = useLocation();
  const projectId = (params as any)?.id ? parseInt((params as any).id) : 0;
  const stage = ((params as any)?.stage as string)?.toUpperCase() || 'M3';
  
  const isM3 = stage === 'M3';
  const isM4 = stage === 'M4';
  
  const dimensions = isM3 ? M3_DIMENSIONS : M4_CARRIAGES;
  
  const [m3Reviews, setM3Reviews] = useState<M3ReviewItem[]>([]);
  const [m4Carriages, setM4Carriages] = useState<M4CarriageItem[]>([]);
  const [activeTab, setActiveTab] = useState(dimensions[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC mutations
  const submitM3 = trpc.pos.review.submitM3Review.useMutation();
  const submitM4 = trpc.pos.review.submitM4Review.useMutation();
  const getReviewStatus = trpc.pos.review.getReviewStatus.useQuery(
    { projectId, stage } as any,
    { enabled: projectId > 0 }
  );

  // 初始化评审数据
  useEffect(() => {
    if (isM3) {
      setM3Reviews(M3_DIMENSIONS.map(d => ({
        dimensionId: d.id,
        conclusion: 'PASS' as const,
        owner: '',
        risks: '',
        notes: '',
      })));
    } else {
      setM4Carriages(M4_CARRIAGES.map(c => ({
        carriageId: c.id,
        conclusion: 'PASS' as const,
        owner: '',
        checkResults: c.checkItems.reduce((acc, item) => ({ ...acc, [item]: false }), {}),
        risks: '',
        notes: '',
        dueDate: '',
      })));
    }
  }, [isM3]);

  // M3评审更新
  const handleM3Update = (dimensionId: string, field: keyof M3ReviewItem, value: string) => {
    setM3Reviews(prev => prev.map(r => 
      r.dimensionId === dimensionId ? { ...r, [field]: value } : r
    ));
  };

  // M4车厢更新
  const handleM4Update = (carriageId: string, field: keyof M4CarriageItem, value: any) => {
    setM4Carriages(prev => prev.map(c => 
      c.carriageId === carriageId ? { ...c, [field]: value } : c
    ));
  };

  // M4检查项更新
  const handleCheckItemToggle = (carriageId: string, item: string, checked: boolean) => {
    setM4Carriages(prev => prev.map(c => {
      if (c.carriageId === carriageId) {
        return {
          ...c,
          checkResults: { ...c.checkResults, [item]: checked }
        };
      }
      return c;
    }));
  };

  // 计算完成进度
  const calculateProgress = () => {
    if (isM3) {
      const completed = m3Reviews.filter(r => r.owner && r.conclusion).length;
      return (completed / M3_DIMENSIONS.length) * 100;
    } else {
      const completed = m4Carriages.filter(c => c.owner && c.conclusion).length;
      return (completed / M4_CARRIAGES.length) * 100;
    }
  };

  // 提交M3评审
  const handleSubmitM3 = async () => {
    const incompleteItems = m3Reviews.filter(r => !r.owner);
    if (incompleteItems.length > 0) {
      toast.error('请为所有评审维度指定责任人');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitM3.mutateAsync({
        projectId,
        reviews: m3Reviews,
      });

      if (result.success) {
        toast.success(`M3评审已提交，共${result.reviewCount}项`);
        if (result.allPassed && result.nextStage) {
          toast.info(`所有评审通过，项目可进入${result.nextStage}阶段`);
        } else if (!result.allPassed) {
          toast.warning('部分评审未通过，请处理后重新提交');
        }
      }
    } catch (error) {
      toast.error('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提交M4评审
  const handleSubmitM4 = async () => {
    const incompleteCarriages = m4Carriages.filter(c => !c.owner);
    if (incompleteCarriages.length > 0) {
      toast.error('请为所有评审车厢指定责任人');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitM4.mutateAsync({
        projectId,
        carriages: m4Carriages as any,
      });

      if (result.success) {
        toast.success(`M4评审已提交，共${result.carriageCount}节车厢`);
        
        if (result.allPassed && result.nextStage) {
          toast.info(`所有评审通过，项目可进入${result.nextStage}阶段`);
        }
        
        if (result.poSuggestion) {
          toast.success(
            <div className="flex flex-col gap-1">
              <span className="font-medium">PO建议已自动生成</span>
              <span className="text-sm">状态: {result.poSuggestion.status}</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => setLocation('/pos/procurement')}
              >
                查看采购建议
              </Button>
            </div>
          );
        }
      }
    } catch (error) {
      toast.error('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = () => {
    if (isM3) {
      handleSubmitM3();
    } else {
      handleSubmitM4();
    }
  };

  const conclusionColors: Record<string, string> = {
    PASS: 'bg-green-500',
    CONDITIONAL: 'bg-yellow-500',
    FAIL: 'bg-red-500',
    PENDING: 'bg-gray-400',
  };

  const conclusionLabels: Record<string, string> = {
    PASS: '通过',
    CONDITIONAL: '有条件通过',
    FAIL: '不通过',
    PENDING: '待评审',
  };

  // 获取当前车厢/维度的评审数据
  const getCurrentReview = (id: string) => {
    if (isM3) {
      return m3Reviews.find(r => r.dimensionId === id);
    } else {
      return m4Carriages.find(c => c.carriageId === id);
    }
  };

  return (
    <Layout>
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/pos/dashboard" className="hover:text-foreground transition-colors">POS总览</Link>
        <ArrowRight className="w-3 h-3" />
        <Link href="/pos/projects" className="hover:text-foreground transition-colors">项目列表</Link>
        <ArrowRight className="w-3 h-3" />
        <Link href={`/pos/projects/${projectId}`} className="hover:text-foreground transition-colors">项目详情</Link>
        <ArrowRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{stage} 评审</span>
      </nav>

      {/* 返回按钮 */}
      <div className="flex items-center gap-4">
        <Link href={`/pos/projects/${projectId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />返回项目</Button>
        </Link>
      </div>

      <PageHeader
        icon={CheckCircle2}
        title={`${stage} - ${isM3 ? '立项评审' : '方案冻结 P1'}`}
        description={isM3 ? '项目立项与资源分配评审' : '设计评审与方案确认（五节车厢）'}
        actions={
          <>
            <div className="flex items-center gap-2">
              <div className="text-right mr-4">
                <p className="text-sm text-muted-foreground">完成进度</p>
                <p className="font-medium">{Math.round(calculateProgress())}%</p>
              </div>
              <Progress value={calculateProgress()} className="w-32" />
            </div>
            <Button onClick={handleSubmitReview} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              提交评审
            </Button>
          </>
        }
      />

      {/* 评审状态概览 */}
      {getReviewStatus.data && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant={getReviewStatus.data.status === 'Completed' ? 'default' : 'secondary'}>
                  {getReviewStatus.data.status === 'Completed' ? '已完成' : '进行中'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  已完成 {getReviewStatus.data.completedCount} / {getReviewStatus.data.totalCount} 项
                </span>
              </div>
              {(getReviewStatus.data as any).lastReviewDate && (
                <span className="text-sm text-muted-foreground">
                  上次评审: {new Date((getReviewStatus.data as any).lastReviewDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 列车式评审UI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isM4 && <span className="text-2xl">🚂</span>}
            {isM3 ? '立项评审维度' : '评审车厢'}
          </CardTitle>
          <CardDescription>
            {isM3 ? '完成以下5个维度的评审，输出项目章程与基线计划' : '完成5节评审车厢的评审，通过后自动触发PO建议'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* M4列车轨道可视化 */}
          {isM4 && (
            <div className="mb-8">
              <div className="flex items-center justify-between relative px-8">
                {/* 轨道 */}
                <div className="absolute top-1/2 left-8 right-8 h-3 bg-gradient-to-r from-muted via-muted to-muted rounded-full -translate-y-1/2">
                  <div className="absolute inset-0 flex items-center justify-between px-2">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                    ))}
                  </div>
                </div>
                
                {/* 车厢 */}
                {M4_CARRIAGES.map((carriage, index) => {
                  const carriageData = m4Carriages.find(c => c.carriageId === carriage.id);
                  const status = carriageData?.conclusion || 'PENDING';
                  const isActive = activeTab === carriage.id;
                  const checkCount = carriageData?.checkResults 
                    ? Object.values(carriageData.checkResults).filter(Boolean).length 
                    : 0;
                  const totalChecks = carriage.checkItems.length;
                  
                  return (
                    <div 
                      key={carriage.id}
                      className={`relative z-10 flex flex-col items-center cursor-pointer transition-all duration-300 ${
                        isActive ? 'scale-110 -translate-y-2' : 'hover:scale-105'
                      }`}
                      onClick={() => setActiveTab(carriage.id)}
                    >
                      {/* 连接器 */}
                      {index > 0 && (
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-2 bg-muted-foreground/30 rounded" />
                      )}
                      
                      {/* 车厢主体 */}
                      <div className={`
                        w-20 h-14 rounded-lg flex flex-col items-center justify-center
                        ${carriage.color} text-white shadow-lg
                        ${isActive ? 'ring-4 ring-primary/50 shadow-xl' : ''}
                        transition-all duration-300
                      `}>
                        <carriage.icon className="w-6 h-6" />
                        <span className="text-[10px] mt-0.5">{checkCount}/{totalChecks}</span>
                      </div>
                      
                      {/* 车轮 */}
                      <div className="flex gap-6 -mt-1">
                        <div className="w-3 h-3 bg-muted-foreground rounded-full" />
                        <div className="w-3 h-3 bg-muted-foreground rounded-full" />
                      </div>
                      
                      {/* 状态标签 */}
                      <Badge className={`mt-2 ${conclusionColors[status]} text-white`}>
                        {conclusionLabels[status]}
                      </Badge>
                      <span className="text-xs mt-1 font-medium text-center">{carriage.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 评审内容 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${dimensions.length}, 1fr)` }}>
              {dimensions.map((dim) => {
                const review = getCurrentReview(dim.id);
                const hasOwner = isM3 
                  ? (review as M3ReviewItem)?.owner 
                  : (review as M4CarriageItem)?.owner;
                return (
                  <TabsTrigger key={dim.id} value={dim.id} className="flex items-center gap-1 relative">
                    <dim.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{dim.name}</span>
                    {hasOwner && (
                      <CheckCheck className="w-3 h-3 text-green-500 absolute -top-1 -right-1" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {dimensions.map((dim) => {
              const review = getCurrentReview(dim.id);
              const carriageConfig = M4_CARRIAGES.find(c => c.id === dim.id);
              
              return (
                <TabsContent key={dim.id} value={dim.id} className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <dim.icon className="w-5 h-5" />
                        {dim.name}
                      </CardTitle>
                      <CardDescription>{dim.desc}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* M4检查项清单 */}
                      {isM4 && carriageConfig && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <Label className="text-base font-medium mb-3 block">检查项清单</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {carriageConfig.checkItems.map((item) => {
                              const carriageData = m4Carriages.find(c => c.carriageId === dim.id);
                              const isChecked = carriageData?.checkResults?.[item] || false;
                              return (
                                <div key={item} className="flex items-center gap-2">
                                  <Checkbox 
                                    id={`${dim.id}-${item}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => 
                                      handleCheckItemToggle(dim.id, item, checked as boolean)
                                    }
                                  />
                                  <label 
                                    htmlFor={`${dim.id}-${item}`}
                                    className={`text-sm cursor-pointer ${isChecked ? 'line-through text-muted-foreground' : ''}`}
                                  >
                                    {item}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 评审结论和责任人 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>评审结论 <span className="text-red-500">*</span></Label>
                          <Select 
                            value={isM3 
                              ? (review as M3ReviewItem)?.conclusion || 'PASS'
                              : (review as M4CarriageItem)?.conclusion || 'PASS'
                            }
                            onValueChange={(v) => isM3 
                              ? handleM3Update(dim.id, 'conclusion', v)
                              : handleM4Update(dim.id, 'conclusion', v)
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PASS">
                                <span className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  通过
                                </span>
                              </SelectItem>
                              <SelectItem value="CONDITIONAL">
                                <span className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                                  有条件通过
                                </span>
                              </SelectItem>
                              <SelectItem value="FAIL">
                                <span className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                  不通过
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>责任人 <span className="text-red-500">*</span></Label>
                          <Input
                            className="mt-1"
                            placeholder="输入责任人姓名"
                            value={isM3 
                              ? (review as M3ReviewItem)?.owner || ''
                              : (review as M4CarriageItem)?.owner || ''
                            }
                            onChange={(e) => isM3 
                              ? handleM3Update(dim.id, 'owner', e.target.value)
                              : handleM4Update(dim.id, 'owner', e.target.value)
                            }
                          />
                        </div>
                        {isM4 && (
                          <div>
                            <Label>计划完成时间</Label>
                            <Input 
                              type="date"
                              className="mt-1"
                              value={(review as M4CarriageItem)?.dueDate || ''}
                              onChange={(e) => handleM4Update(dim.id, 'dueDate', e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      {/* 风险与问题 */}
                      <div>
                        <Label>风险与问题</Label>
                        <Textarea 
                          className="mt-1"
                          placeholder="记录评审中发现的风险和问题..."
                          rows={3}
                          value={isM3 
                            ? (review as M3ReviewItem)?.risks || ''
                            : (review as M4CarriageItem)?.risks || ''
                          }
                          onChange={(e) => isM3 
                            ? handleM3Update(dim.id, 'risks', e.target.value)
                            : handleM4Update(dim.id, 'risks', e.target.value)
                          }
                        />
                      </div>

                      {/* 备注 */}
                      <div>
                        <Label>评审备注</Label>
                        <Textarea 
                          className="mt-1"
                          placeholder="其他备注信息..."
                          rows={2}
                          value={isM3 
                            ? (review as M3ReviewItem)?.notes || ''
                            : (review as M4CarriageItem)?.notes || ''
                          }
                          onChange={(e) => isM3 
                            ? handleM3Update(dim.id, 'notes', e.target.value)
                            : handleM4Update(dim.id, 'notes', e.target.value)
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* M3输出物说明 */}
      {isM3 && (
        <Card className="border-blue-500/50">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-500" />
              M3评审输出物
            </CardTitle>
            <CardDescription>评审通过后将生成以下文档</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileCheck className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">项目章程</p>
                  <p className="text-sm text-muted-foreground">Project Charter</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">基线计划</p>
                  <p className="text-sm text-muted-foreground">Baseline Plan</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* M4完成后触发PO建议 */}
      {isM4 && (
        <Card className="border-orange-500/50">
          <CardHeader className="bg-orange-50 dark:bg-orange-900/20">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              采购建议触发
            </CardTitle>
            <CardDescription>M4评审完成后将自动生成PO建议草案（长周期件优先）</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="font-medium">长周期件采购建议</p>
                    <p className="text-sm text-muted-foreground">基于BOM自动识别长周期物料，优先采购</p>
                  </div>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  待触发
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowRight className="w-4 h-4" />
                <span>评审通过后，系统将自动生成PO建议草案，进入工程师确认流程</span>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation('/pos/procurement')}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                查看采购建议列表
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </Layout>
  );
}
