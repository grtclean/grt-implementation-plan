/**
 * 客户方案沟通确认会议创建对话框
 * Customer Solution Meeting Creation Dialog
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Users, 
  FileText, 
  Settings2, 
  Sparkles,
  Upload,
  Mic,
  Brain,
  FileSearch,
  Clock,
  Target
} from 'lucide-react';

interface CustomerSolutionMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerSolutionMeetingData) => void;
}

export interface CustomerSolutionMeetingData {
  title: string;
  meetingType: 'internal' | 'external';
  meetingMode: 'online' | 'offline' | 'hybrid';
  customerId?: string;
  customerName?: string;
  customerContact?: string;
  customerRequirements?: string;
  cleanlinessLevel?: string;
  cleanlinessStandard?: string;
  cleanlinessDetails?: {
    particleSize?: string;
    particleCount?: string;
    residualOil?: string;
  };
  productType?: string;
  partName?: string;
  partMaterial?: string;
  partDimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  cycleTime?: number;
  loadingForm?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  internalParticipants?: Array<{ id: string; name: string; role: string }>;
  externalParticipants?: Array<{ name: string; company: string; role: string; email?: string }>;
  aiCaseMatchingEnabled: boolean;
  aiSolutionSuggestionEnabled: boolean;
  aiVoiceRecognitionEnabled: boolean;
  relatedProjectId?: string;
  relatedOpportunityId?: string;
}

// 清洁度标准选项
const cleanlinessLevels = [
  { value: 'VDA 19.1', label: 'VDA 19.1 (汽车行业标准)' },
  { value: 'VDA 19.2', label: 'VDA 19.2 (技术清洁度)' },
  { value: 'ISO 16232', label: 'ISO 16232 (国际标准)' },
  { value: 'ISO 4406', label: 'ISO 4406 (液压系统)' },
  { value: 'NAS 1638', label: 'NAS 1638 (航空航天)' },
  { value: 'SAE AS4059', label: 'SAE AS4059 (航空航天)' },
  { value: 'Custom', label: '客户自定义标准' }
];

// 产品类型选项
const productTypes = [
  { value: '汽车零部件', label: '汽车零部件' },
  { value: '发动机部件', label: '发动机部件' },
  { value: '变速箱部件', label: '变速箱部件' },
  { value: '制动系统', label: '制动系统' },
  { value: '转向系统', label: '转向系统' },
  { value: '燃油系统', label: '燃油系统' },
  { value: '液压元件', label: '液压元件' },
  { value: '精密零件', label: '精密零件' },
  { value: '电子元器件', label: '电子元器件' },
  { value: '医疗器械', label: '医疗器械' },
  { value: '航空航天', label: '航空航天' },
  { value: '其他', label: '其他' }
];

// 材料类型选项
const materialTypes = [
  { value: '铝合金', label: '铝合金' },
  { value: '钢', label: '钢' },
  { value: '不锈钢', label: '不锈钢' },
  { value: '铸铁', label: '铸铁' },
  { value: '铜合金', label: '铜合金' },
  { value: '钛合金', label: '钛合金' },
  { value: '塑料', label: '塑料' },
  { value: '复合材料', label: '复合材料' },
  { value: '陶瓷', label: '陶瓷' },
  { value: '其他', label: '其他' }
];

// 上下料方式选项
const loadingForms = [
  { value: '手动上下料', label: '手动上下料' },
  { value: '机器人上下料', label: '机器人上下料' },
  { value: '输送线自动上下料', label: '输送线自动上下料' },
  { value: 'AGV自动上下料', label: 'AGV自动上下料' },
  { value: '桁架机械手', label: '桁架机械手' },
  { value: '其他', label: '其他' }
];

export default function CustomerSolutionMeetingDialog({
  open,
  onOpenChange,
  onSubmit
}: CustomerSolutionMeetingDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<CustomerSolutionMeetingData>({
    title: '',
    meetingType: 'external',
    meetingMode: 'online',
    aiCaseMatchingEnabled: true,
    aiSolutionSuggestionEnabled: true,
    aiVoiceRecognitionEnabled: true,
    cleanlinessDetails: {},
    partDimensions: {},
    internalParticipants: [],
    externalParticipants: []
  });

  const handleSubmit = () => {
    if (!formData.title) {
      return;
    }
    onSubmit(formData);
    onOpenChange(false);
    // 重置表单
    setFormData({
      title: '',
      meetingType: 'external',
      meetingMode: 'online',
      aiCaseMatchingEnabled: true,
      aiSolutionSuggestionEnabled: true,
      aiVoiceRecognitionEnabled: true,
      cleanlinessDetails: {},
      partDimensions: {},
      internalParticipants: [],
      externalParticipants: []
    });
    setActiveTab('basic');
  };

  const updateFormData = (updates: Partial<CustomerSolutionMeetingData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            创建客户方案沟通确认会议
          </DialogTitle>
          <DialogDescription>
            配置会议信息、客户需求和AI辅助功能，系统将自动匹配相似案例并生成方案建议
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              基本信息
            </TabsTrigger>
            <TabsTrigger value="customer" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              客户需求
            </TabsTrigger>
            <TabsTrigger value="product" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              产品规格
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              参会人员
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI功能
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            {/* 基本信息 */}
            <TabsContent value="basic" className="space-y-4 px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">会议标题 *</Label>
                  <Input
                    id="title"
                    placeholder="例如：XX公司发动机缸体清洗方案沟通"
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>会议类型</Label>
                  <Select
                    value={formData.meetingType}
                    onValueChange={(value: 'internal' | 'external') => updateFormData({ meetingType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">对外会议（与客户）</SelectItem>
                      <SelectItem value="internal">对内会议（内部讨论）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>会议形式</Label>
                  <Select
                    value={formData.meetingMode}
                    onValueChange={(value: 'online' | 'offline' | 'hybrid') => updateFormData({ meetingMode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">线上会议</SelectItem>
                      <SelectItem value="offline">线下会议</SelectItem>
                      <SelectItem value="hybrid">混合会议</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledStart">计划开始时间</Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    value={formData.scheduledStart || ''}
                    onChange={(e) => updateFormData({ scheduledStart: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledEnd">计划结束时间</Label>
                  <Input
                    id="scheduledEnd"
                    type="datetime-local"
                    value={formData.scheduledEnd || ''}
                    onChange={(e) => updateFormData({ scheduledEnd: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relatedProjectId">关联项目编号</Label>
                  <Input
                    id="relatedProjectId"
                    placeholder="可选，关联已有项目"
                    value={formData.relatedProjectId || ''}
                    onChange={(e) => updateFormData({ relatedProjectId: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* 客户需求 */}
            <TabsContent value="customer" className="space-y-4 px-1">
              {formData.meetingType === 'external' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">客户信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">客户名称</Label>
                        <Input
                          id="customerName"
                          placeholder="例如：某某汽车零部件有限公司"
                          value={formData.customerName || ''}
                          onChange={(e) => updateFormData({ customerName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerContact">客户联系人</Label>
                        <Input
                          id="customerContact"
                          placeholder="例如：张经理"
                          value={formData.customerContact || ''}
                          onChange={(e) => updateFormData({ customerContact: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">清洁度要求</CardTitle>
                  <CardDescription>选择或输入客户的清洁度标准要求</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>清洁度标准</Label>
                      <Select
                        value={formData.cleanlinessLevel || ''}
                        onValueChange={(value) => updateFormData({ cleanlinessLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择清洁度标准" />
                        </SelectTrigger>
                        <SelectContent>
                          {cleanlinessLevels.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cleanlinessStandard">具体等级</Label>
                      <Input
                        id="cleanlinessStandard"
                        placeholder="例如：Class A、Level 3"
                        value={formData.cleanlinessStandard || ''}
                        onChange={(e) => updateFormData({ cleanlinessStandard: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="particleSize">颗粒尺寸要求</Label>
                      <Input
                        id="particleSize"
                        placeholder="例如：≤500μm"
                        value={formData.cleanlinessDetails?.particleSize || ''}
                        onChange={(e) => updateFormData({
                          cleanlinessDetails: {
                            ...formData.cleanlinessDetails,
                            particleSize: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="particleCount">颗粒数量要求</Label>
                      <Input
                        id="particleCount"
                        placeholder="例如：≤100个/cm²"
                        value={formData.cleanlinessDetails?.particleCount || ''}
                        onChange={(e) => updateFormData({
                          cleanlinessDetails: {
                            ...formData.cleanlinessDetails,
                            particleCount: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="residualOil">残留油脂要求</Label>
                      <Input
                        id="residualOil"
                        placeholder="例如：≤0.5mg/cm²"
                        value={formData.cleanlinessDetails?.residualOil || ''}
                        onChange={(e) => updateFormData({
                          cleanlinessDetails: {
                            ...formData.cleanlinessDetails,
                            residualOil: e.target.value
                          }
                        })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="customerRequirements">客户需求描述</Label>
                <Textarea
                  id="customerRequirements"
                  placeholder="详细描述客户的清洗需求、特殊要求、关注点等..."
                  className="min-h-[120px]"
                  value={formData.customerRequirements || ''}
                  onChange={(e) => updateFormData({ customerRequirements: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* 产品规格 */}
            <TabsContent value="product" className="space-y-4 px-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">产品信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>产品类型</Label>
                      <Select
                        value={formData.productType || ''}
                        onValueChange={(value) => updateFormData({ productType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择产品类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partName">零件名称</Label>
                      <Input
                        id="partName"
                        placeholder="例如：发动机缸体"
                        value={formData.partName || ''}
                        onChange={(e) => updateFormData({ partName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>材料类型</Label>
                      <Select
                        value={formData.partMaterial || ''}
                        onValueChange={(value) => updateFormData({ partMaterial: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择材料类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {materialTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>上下料方式</Label>
                      <Select
                        value={formData.loadingForm || ''}
                        onValueChange={(value) => updateFormData({ loadingForm: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择上下料方式" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingForms.map(form => (
                            <SelectItem key={form.value} value={form.value}>
                              {form.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">尺寸与节拍</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">长度 (mm)</Label>
                      <Input
                        id="length"
                        type="number"
                        placeholder="长度"
                        value={formData.partDimensions?.length || ''}
                        onChange={(e) => updateFormData({
                          partDimensions: {
                            ...formData.partDimensions,
                            length: parseFloat(e.target.value) || undefined
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width">宽度 (mm)</Label>
                      <Input
                        id="width"
                        type="number"
                        placeholder="宽度"
                        value={formData.partDimensions?.width || ''}
                        onChange={(e) => updateFormData({
                          partDimensions: {
                            ...formData.partDimensions,
                            width: parseFloat(e.target.value) || undefined
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">高度 (mm)</Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="高度"
                        value={formData.partDimensions?.height || ''}
                        onChange={(e) => updateFormData({
                          partDimensions: {
                            ...formData.partDimensions,
                            height: parseFloat(e.target.value) || undefined
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">重量 (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="重量"
                        value={formData.partDimensions?.weight || ''}
                        onChange={(e) => updateFormData({
                          partDimensions: {
                            ...formData.partDimensions,
                            weight: parseFloat(e.target.value) || undefined
                          }
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cycleTime">生产节拍 (秒/件)</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cycleTime"
                        type="number"
                        placeholder="例如：60"
                        className="max-w-[200px]"
                        value={formData.cycleTime || ''}
                        onChange={(e) => updateFormData({ cycleTime: parseInt(e.target.value) || undefined })}
                      />
                      <span className="text-sm text-muted-foreground">秒/件</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 参会人员 */}
            <TabsContent value="participants" className="space-y-4 px-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">内部参会人员</CardTitle>
                  <CardDescription>添加GRT内部参会人员</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>点击添加内部参会人员</p>
                    <p className="text-xs mt-1">（功能开发中）</p>
                  </div>
                </CardContent>
              </Card>

              {formData.meetingType === 'external' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">外部参会人员</CardTitle>
                    <CardDescription>添加客户方参会人员</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>点击添加客户方参会人员</p>
                      <p className="text-xs mt-1">（功能开发中）</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* AI功能 */}
            <TabsContent value="ai" className="space-y-4 px-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI智能辅助功能
                  </CardTitle>
                  <CardDescription>
                    启用AI功能后，系统将自动分析客户需求、匹配相似案例、生成方案建议
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">AI案例匹配</p>
                        <p className="text-sm text-muted-foreground">
                          自动分析客户需求，匹配相似/相近历史案例
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.aiCaseMatchingEnabled}
                      onCheckedChange={(checked) => updateFormData({ aiCaseMatchingEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <FileSearch className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">智能方案建议</p>
                        <p className="text-sm text-muted-foreground">
                          基于案例库和技术资料，自动生成方案建议
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.aiSolutionSuggestionEnabled}
                      onCheckedChange={(checked) => updateFormData({ aiSolutionSuggestionEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Mic className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">AI语音识别</p>
                        <p className="text-sm text-muted-foreground">
                          实时语音转文字，自动记录会议内容
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.aiVoiceRecognitionEnabled}
                      onCheckedChange={(checked) => updateFormData({ aiVoiceRecognitionEnabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">AI功能说明</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">案例匹配</Badge>
                      <p className="text-muted-foreground">
                        系统将根据产品类型、材料、清洁度要求等维度，从案例库中智能匹配相似案例，
                        并计算相似度评分，帮助快速参考历史经验。
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">方案建议</Badge>
                      <p className="text-muted-foreground">
                        基于匹配的案例和技术资料库，AI将自动生成设备配置、工艺流程、
                        M0-M12阶段资料和T1-T15工序建议。
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">语音识别</Badge>
                      <p className="text-muted-foreground">
                        会议过程中可上传录音，系统将自动转写为文字，
                        并智能提取关键信息生成会议纪要。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {formData.aiCaseMatchingEnabled && (
              <Badge variant="secondary" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                案例匹配
              </Badge>
            )}
            {formData.aiSolutionSuggestionEnabled && (
              <Badge variant="secondary" className="text-xs">
                <FileSearch className="h-3 w-3 mr-1" />
                方案建议
              </Badge>
            )}
            {formData.aiVoiceRecognitionEnabled && (
              <Badge variant="secondary" className="text-xs">
                <Mic className="h-3 w-3 mr-1" />
                语音识别
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title}>
              <Sparkles className="h-4 w-4 mr-2" />
              创建会议
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
