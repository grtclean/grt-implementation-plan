/**
 * 能力管理组件
 * 展示员工能力等级、升级路径和发展规划
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, Award, FileText, Target, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const CAPABILITY_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
const CAPABILITY_DOMAINS = [
  { key: 'T', label: '技术能力', color: 'bg-blue-100 text-blue-800' },
  { key: 'S', label: '系统理解', color: 'bg-green-100 text-green-800' },
  { key: 'D', label: '交付能力', color: 'bg-purple-100 text-purple-800' },
  { key: 'C', label: '客户价值', color: 'bg-orange-100 text-orange-800' },
  { key: 'K', label: '知识沉淀', color: 'bg-pink-100 text-pink-800' },
  { key: 'L', label: '领导力', color: 'bg-red-100 text-red-800' },
];

export default function CapabilityManagement() {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);

  // Evidence dialog state
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    title: '',
    evidenceType: 'project_delivery',
    capabilityDomain: 'T',
    description: '',
  });

  // Mutations
  const submitEvidenceMutation = (trpc.capability as any).submitEvidence.useMutation({
    onSuccess: () => {
      toast({ title: '提交成功', description: '能力证据已提交，等待审核' });
      setEvidenceDialogOpen(false);
      setEvidenceForm({ title: '', evidenceType: 'project_delivery', capabilityDomain: 'T', description: '' });
    },
    onError: () => {
      toast({ title: '提交失败', description: '请稍后重试', variant: 'destructive' });
    },
  });

  const upgradeCapabilityMutation = (trpc.capability as any).upgradeCapability.useMutation({
    onSuccess: () => {
      toast({ title: '申请成功', description: '升级评估申请已提交，等待评审' });
    },
    onError: () => {
      toast({ title: '申请失败', description: '请稍后重试', variant: 'destructive' });
    },
  });

  // 获取员工能力列表
  const { data: capabilities } = (trpc.capability as any).getEmployeeCapabilities.useQuery(
    { employeeId: selectedEmployee || 0 },
    { enabled: !!selectedEmployee }
  );

  // 获取能力升级规则
  const { data: upgradeRules } = (trpc.capability as any).getUpgradeRules.useQuery();

  // 获取能力发展路径
  const { data: developmentPath } = (trpc.capability as any).getDevelopmentPath.useQuery(
    { capabilityId: selectedCapability || '' },
    { enabled: !!selectedCapability }
  );

  // 获取能力评估报告
  const { data: assessmentReport } = (trpc.capability as any).getAssessmentReport.useQuery(
    { employeeId: selectedEmployee || 0 },
    { enabled: !!selectedEmployee }
  );

  return (
    <div className="space-y-6">
      {/* 能力等级分布 */}
      <Card>
        <CardHeader>
          <CardTitle>能力等级体系</CardTitle>
          <CardDescription>L1-L5五级能力模型</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {CAPABILITY_LEVELS.map((level) => (
              <div key={level} className="text-center">
                <div className="bg-gradient-to-b from-primary to-primary/50 text-primary-foreground rounded-lg p-4 mb-2">
                  <div className="text-2xl font-bold">{level}</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {level === 'L1' && '初级'}
                  {level === 'L2' && '中级'}
                  {level === 'L3' && '高级'}
                  {level === 'L4' && '专家'}
                  {level === 'L5' && '领导'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 能力域选择 */}
      <Card>
        <CardHeader>
          <CardTitle>能力域</CardTitle>
          <CardDescription>选择要查看的能力域</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CAPABILITY_DOMAINS.map((domain) => (
              <Button
                key={domain.key}
                variant={selectedCapability === domain.key ? 'default' : 'outline'}
                onClick={() => setSelectedCapability(domain.key)}
                className="justify-start"
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${domain.color}`}></span>
                {domain.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">能力概览</TabsTrigger>
          <TabsTrigger value="evidence">证据管理</TabsTrigger>
          <TabsTrigger value="path">发展路径</TabsTrigger>
        </TabsList>

        {/* 能力概览 */}
        <TabsContent value="overview" className="space-y-4">
          {capabilities && capabilities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {capabilities.map((capability) => (
                <Card key={capability.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{capability.capabilityName}</CardTitle>
                        <CardDescription>{capability.domain}</CardDescription>
                      </div>
                      <Badge variant="default">{capability.currentLevel}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>当前进度</span>
                        <span className="text-muted-foreground">{capability.progressPercentage}%</span>
                      </div>
                      <Progress value={capability.progressPercentage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">最后更新</p>
                        <p className="font-medium">
                          {new Date(capability.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">证据数</p>
                        <p className="font-medium">{capability.evidenceCount || 0}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toast({ title: '查看证据', description: `正在查看「${capability.capabilityName}」的能力证据` })}>
                        <FileText className="w-4 h-4 mr-1" />
                        查看证据
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={upgradeCapabilityMutation.isPending}
                        onClick={() => upgradeCapabilityMutation.mutate({ id: capability.id })}
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        升级评估
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">暂无能力数据</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 证据管理 */}
        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>能力证据</CardTitle>
              <CardDescription>支撑能力等级的客观证据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 证据列表示例 */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">项目交付完成</p>
                      <p className="text-xs text-muted-foreground">GRT-2026-001 项目按时交付</p>
                    </div>
                    <Badge variant="secondary">D</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    2026-01-25 • 由 系统 记录
                  </p>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">技术方案评审通过</p>
                      <p className="text-xs text-muted-foreground">超声波清洗系统设计方案</p>
                    </div>
                    <Badge variant="secondary">T</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    2026-01-20 • 由 技术主管 确认
                  </p>
                </div>

                <Button className="w-full" onClick={() => setEvidenceDialogOpen(true)}>添加新证据</Button>
              </div>
            </CardContent>
          </Card>

          {/* 添加新证据 Dialog */}
          <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>添加能力证据</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label htmlFor="ev-title">证据标题</Label>
                  <Input
                    id="ev-title"
                    placeholder="请输入证据标题"
                    value={evidenceForm.title}
                    onChange={(e) => setEvidenceForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ev-type">证据类型</Label>
                  <Select
                    value={evidenceForm.evidenceType}
                    onValueChange={(v) => setEvidenceForm((f) => ({ ...f, evidenceType: v }))}
                  >
                    <SelectTrigger id="ev-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project_delivery">项目交付</SelectItem>
                      <SelectItem value="training_cert">培训证书</SelectItem>
                      <SelectItem value="skill_cert">技能认证</SelectItem>
                      <SelectItem value="customer_feedback">客户反馈</SelectItem>
                      <SelectItem value="peer_review">同行评审</SelectItem>
                      <SelectItem value="self_assessment">自我评估</SelectItem>
                      <SelectItem value="supervisor_eval">上级评价</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ev-domain">能力领域</Label>
                  <Select
                    value={evidenceForm.capabilityDomain}
                    onValueChange={(v) => setEvidenceForm((f) => ({ ...f, capabilityDomain: v }))}
                  >
                    <SelectTrigger id="ev-domain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="T">T — 技术能力</SelectItem>
                      <SelectItem value="S">S — 系统理解</SelectItem>
                      <SelectItem value="D">D — 交付能力</SelectItem>
                      <SelectItem value="C">C — 客户价值</SelectItem>
                      <SelectItem value="K">K — 知识沉淀</SelectItem>
                      <SelectItem value="L">L — 领导力</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ev-desc">描述</Label>
                  <Textarea
                    id="ev-desc"
                    placeholder="请描述证据详情"
                    rows={3}
                    value={evidenceForm.description}
                    onChange={(e) => setEvidenceForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)}>取消</Button>
                <Button
                  disabled={!evidenceForm.title || submitEvidenceMutation.isPending}
                  onClick={() => submitEvidenceMutation.mutate({
                    title: evidenceForm.title,
                    evidenceType: evidenceForm.evidenceType,
                    capabilityDomain: evidenceForm.capabilityDomain,
                    description: evidenceForm.description,
                    userName: '当前用户',
                  })}
                >
                  {submitEvidenceMutation.isPending ? '提交中...' : '提交证据'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* 发展路径 */}
        <TabsContent value="path" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>能力发展路径</CardTitle>
              <CardDescription>从当前等级到目标等级的路径规划</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {developmentPath ? (
                <div className="space-y-4">
                  {/* 升级路径可视化 */}
                  <div className="flex items-center justify-between">
                    {['L1', 'L2', 'L3', 'L4', 'L5'].map((level, idx) => (
                      <div key={level} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            developmentPath.currentLevel === level
                              ? 'bg-primary text-primary-foreground'
                              : developmentPath.targetLevel === level
                              ? 'bg-green-100 text-green-800 border-2 border-green-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {level}
                        </div>
                        {idx < 4 && (
                          <div className="w-12 h-1 bg-muted mt-2" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 升级条件 */}
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-medium text-sm">升级到 {developmentPath.targetLevel} 需要：</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {developmentPath.requirements?.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 预计升级时间 */}
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-primary" />
                    <span>预计升级时间：{developmentPath.estimatedMonths} 个月</span>
                  </div>

                  <Button
                    className="w-full"
                    disabled={upgradeCapabilityMutation.isPending}
                    onClick={() => upgradeCapabilityMutation.mutate({ capabilityId: selectedCapability })}
                  >
                    <Award className="w-4 h-4 mr-2" />
                    {upgradeCapabilityMutation.isPending ? '提交中...' : '申请升级评估'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">选择能力查看发展路径</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 能力评估报告 */}
      {assessmentReport && (
        <Card>
          <CardHeader>
            <CardTitle>能力评估报告</CardTitle>
            <CardDescription>
              {new Date(assessmentReport.assessmentDate).toLocaleDateString()} 生成
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">综合评分</p>
                <p className="text-2xl font-bold">{assessmentReport.overallScore}/100</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">推荐等级</p>
                <p className="text-2xl font-bold">{assessmentReport.recommendedLevel}</p>
              </div>
            </div>

            {assessmentReport.summary && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">{assessmentReport.summary}</p>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => toast({ title: '功能开发中', description: '下载完整报告功能即将上线' })}>
              <FileText className="w-4 h-4 mr-2" />
              下载完整报告
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
