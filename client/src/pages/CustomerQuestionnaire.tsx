/**
 * 客户需求问卷页面
 * 基于 GRTclean_Parts_Cleaning_Questionaire_EN_V1.docx 设计
 */

import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  FileText, 
  Building2, 
  Package, 
  Beaker, 
  Settings2, 
  Truck, 
  DollarSign,
  Sparkles,
  Save,
  Send,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

// 材料类型选项
const MATERIAL_TYPES = [
  { id: "STEEL", label: "钢材 (Steel)", labelEn: "Steel" },
  { id: "ALUMINUM", label: "铝材 (Aluminum)", labelEn: "Aluminum" },
  { id: "NON_FERROUS", label: "有色金属 (Non-ferrous)", labelEn: "Non-ferrous Metals" },
  { id: "CASTING", label: "铸件 (Casting)", labelEn: "Casting" },
  { id: "PLASTIC", label: "塑料 (Plastic)", labelEn: "Plastic" },
  { id: "OTHER", label: "其他 (Other)", labelEn: "Other" },
];

// 污染类型选项
const CONTAMINATION_TYPES = [
  { id: "COOLANT", label: "冷却液 (Coolant)", labelEn: "Coolant" },
  { id: "CHIPS", label: "切屑 (Chips)", labelEn: "Chips" },
  { id: "BURRS", label: "毛刺 (Burrs)", labelEn: "Burrs" },
  { id: "OIL", label: "油污 (Oil)", labelEn: "Oil" },
  { id: "GREASE", label: "油脂 (Grease)", labelEn: "Grease" },
  { id: "DUST", label: "灰尘 (Dust)", labelEn: "Dust" },
  { id: "OTHER", label: "其他 (Other)", labelEn: "Other" },
];

// 质量控制方法
const QC_METHODS = [
  { id: "SPRAY_TEST", label: "喷淋测试 (Spray Test)", labelEn: "Spray Test" },
  { id: "INK_TEST", label: "油墨测试 (Ink Test)", labelEn: "Ink Test" },
  { id: "ULTRASONIC_TEST", label: "超声波测试 (Ultrasonic)", labelEn: "Ultrasonic Test" },
  { id: "VISUAL", label: "目视检查 (Visual)", labelEn: "Visual Inspection" },
  { id: "OTHER", label: "其他 (Other)", labelEn: "Other" },
];

export default function CustomerQuestionnaire() {
  const { t, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // 基本信息
    contactPerson: "",
    company: "",
    email: "",
    phone: "",
    quoteType: "",
    projectName: "",
    // 零件信息
    partName: "",
    partDescription: "",
    materialTypes: [] as string[],
    materialOther: "",
    // 规格
    partWeightMin: "",
    partWeightMax: "",
    partLengthMin: "",
    partLengthMax: "",
    partWidthMin: "",
    partWidthMax: "",
    partHeightMin: "",
    partHeightMax: "",
    // 清洗要求
    cleaningProductType: "",
    cleaningProductOther: "",
    contaminationTypes: [] as string[],
    contaminationOther: "",
    // 质量要求
    partTempBefore: "",
    partTempAfter: "",
    qualityControlMethods: [] as string[],
    dryingLevel: "",
    cleanlinessStandard: "",
    // 产能要求
    dailyPartQuantity: "",
    cycleTimeSeconds: "",
    annualVolume: "",
    oeeTarget: "",
    shiftPattern: "",
    // 上下料
    loadingMethod: "",
    loadingMethodOther: "",
    // 场地
    availableSpaceLength: "",
    availableSpaceWidth: "",
    availableSpaceHeight: "",
    noiseLimit: "",
    // 预算
    investmentBudgetMin: "",
    investmentBudgetMax: "",
    budgetCurrency: "CNY",
    projectTimeline: "",
    expectedDeliveryDate: "",
    // 其他
    additionalRequirements: "",
  });

  const totalSteps = 7;
  const progress = (currentStep / totalSteps) * 100;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(v => v !== value)
    }));
  };

  const handleSaveDraft = () => {
    toast.success("问卷草稿已保存");
  };

  const handleSubmit = () => {
    toast.success("问卷已提交，我们将尽快与您联系");
  };

  const handleAIRecommend = () => {
    toast.info("AI正在分析您的需求，生成方案推荐...");
    setTimeout(() => {
      toast.success("AI方案推荐已生成，请查看推荐结果");
    }, 2000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">联系人 *</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                  placeholder="请输入联系人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">公司名称 *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  placeholder="请输入公司名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">电子邮箱 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="example@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">联系电话</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+86 xxx xxxx xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quoteType">询价类型 *</Label>
                <Select value={formData.quoteType} onValueChange={(v) => handleInputChange("quoteType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择询价类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW_PROJECT">新项目</SelectItem>
                    <SelectItem value="REPLACEMENT">设备更换</SelectItem>
                    <SelectItem value="UPGRADE">设备升级</SelectItem>
                    <SelectItem value="CONSULTATION">技术咨询</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">项目名称</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange("projectName", e.target.value)}
                  placeholder="请输入项目名称"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="partName">零件名称 *</Label>
              <Input
                id="partName"
                value={formData.partName}
                onChange={(e) => handleInputChange("partName", e.target.value)}
                placeholder="请输入零件名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partDescription">零件描述</Label>
              <Textarea
                id="partDescription"
                value={formData.partDescription}
                onChange={(e) => handleInputChange("partDescription", e.target.value)}
                placeholder="请描述零件的特征、用途等信息"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>材料类型 *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MATERIAL_TYPES.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`material-${type.id}`}
                      checked={formData.materialTypes.includes(type.id)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange("materialTypes", type.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`material-${type.id}`} className="text-sm">
                      {language === "zh" ? type.label : type.labelEn}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.materialTypes.includes("OTHER") && (
                <Input
                  className="mt-2"
                  value={formData.materialOther}
                  onChange={(e) => handleInputChange("materialOther", e.target.value)}
                  placeholder="请说明其他材料类型"
                />
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>重量范围 (kg)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.partWeightMin}
                    onChange={(e) => handleInputChange("partWeightMin", e.target.value)}
                    placeholder="最小"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    value={formData.partWeightMax}
                    onChange={(e) => handleInputChange("partWeightMax", e.target.value)}
                    placeholder="最大"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>长度范围 (mm)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.partLengthMin}
                    onChange={(e) => handleInputChange("partLengthMin", e.target.value)}
                    placeholder="最小"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    value={formData.partLengthMax}
                    onChange={(e) => handleInputChange("partLengthMax", e.target.value)}
                    placeholder="最大"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>宽度范围 (mm)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.partWidthMin}
                    onChange={(e) => handleInputChange("partWidthMin", e.target.value)}
                    placeholder="最小"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    value={formData.partWidthMax}
                    onChange={(e) => handleInputChange("partWidthMax", e.target.value)}
                    placeholder="最大"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>高度范围 (mm)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.partHeightMin}
                    onChange={(e) => handleInputChange("partHeightMin", e.target.value)}
                    placeholder="最小"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    value={formData.partHeightMax}
                    onChange={(e) => handleInputChange("partHeightMax", e.target.value)}
                    placeholder="最大"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>清洗介质类型 *</Label>
              <Select value={formData.cleaningProductType} onValueChange={(v) => handleInputChange("cleaningProductType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择清洗介质" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WATER_BASED">水基清洗剂</SelectItem>
                  <SelectItem value="ACIDIC">酸性清洗剂</SelectItem>
                  <SelectItem value="MODIFIED_ALCOHOL">改性醇</SelectItem>
                  <SelectItem value="HYDROCARBON">碳氢化合物</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>污染类型 *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CONTAMINATION_TYPES.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`contamination-${type.id}`}
                      checked={formData.contaminationTypes.includes(type.id)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange("contaminationTypes", type.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`contamination-${type.id}`} className="text-sm">
                      {language === "zh" ? type.label : type.labelEn}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>清洗前温度 (°C)</Label>
                <Input
                  type="number"
                  value={formData.partTempBefore}
                  onChange={(e) => handleInputChange("partTempBefore", e.target.value)}
                  placeholder="例如: 25"
                />
              </div>
              <div className="space-y-2">
                <Label>清洗后温度 (°C)</Label>
                <Input
                  type="number"
                  value={formData.partTempAfter}
                  onChange={(e) => handleInputChange("partTempAfter", e.target.value)}
                  placeholder="例如: 40"
                />
              </div>
              <div className="space-y-2">
                <Label>干燥等级</Label>
                <Select value={formData.dryingLevel} onValueChange={(v) => handleInputChange("dryingLevel", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择干燥等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEVEL_0">Level 0 - 无要求</SelectItem>
                    <SelectItem value="LEVEL_1">Level 1 - 表面干燥</SelectItem>
                    <SelectItem value="LEVEL_2">Level 2 - 完全干燥</SelectItem>
                    <SelectItem value="LEVEL_3">Level 3 - 深度干燥</SelectItem>
                    <SelectItem value="LEVEL_4">Level 4 - 真空干燥</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>清洁度标准</Label>
                <Input
                  value={formData.cleanlinessStandard}
                  onChange={(e) => handleInputChange("cleanlinessStandard", e.target.value)}
                  placeholder="例如: VDA 19.1, ISO 16232"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>质量控制方法</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {QC_METHODS.map((method) => (
                  <div key={method.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`qc-${method.id}`}
                      checked={formData.qualityControlMethods.includes(method.id)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange("qualityControlMethods", method.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`qc-${method.id}`} className="text-sm">
                      {language === "zh" ? method.label : method.labelEn}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>日产量 (件/天)</Label>
                <Input
                  type="number"
                  value={formData.dailyPartQuantity}
                  onChange={(e) => handleInputChange("dailyPartQuantity", e.target.value)}
                  placeholder="例如: 1000"
                />
              </div>
              <div className="space-y-2">
                <Label>节拍时间 (秒/件)</Label>
                <Input
                  type="number"
                  value={formData.cycleTimeSeconds}
                  onChange={(e) => handleInputChange("cycleTimeSeconds", e.target.value)}
                  placeholder="例如: 60"
                />
              </div>
              <div className="space-y-2">
                <Label>年产量</Label>
                <Input
                  type="number"
                  value={formData.annualVolume}
                  onChange={(e) => handleInputChange("annualVolume", e.target.value)}
                  placeholder="例如: 250000"
                />
              </div>
              <div className="space-y-2">
                <Label>OEE目标 (%)</Label>
                <Input
                  type="number"
                  value={formData.oeeTarget}
                  onChange={(e) => handleInputChange("oeeTarget", e.target.value)}
                  placeholder="例如: 85"
                />
              </div>
              <div className="space-y-2">
                <Label>班次模式</Label>
                <Select value={formData.shiftPattern} onValueChange={(v) => handleInputChange("shiftPattern", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择班次模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_SHIFT">单班制</SelectItem>
                    <SelectItem value="TWO_SHIFT">两班制</SelectItem>
                    <SelectItem value="THREE_SHIFT">三班制</SelectItem>
                    <SelectItem value="CONTINUOUS">连续生产</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>上下料方式</Label>
                <Select value={formData.loadingMethod} onValueChange={(v) => handleInputChange("loadingMethod", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择上下料方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">人工上下料</SelectItem>
                    <SelectItem value="AUTO_CHAIN">自动链条</SelectItem>
                    <SelectItem value="ROBOT">机器人</SelectItem>
                    <SelectItem value="GANTRY">龙门架</SelectItem>
                    <SelectItem value="CONVEYOR">输送带</SelectItem>
                    <SelectItem value="OTHER">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>可用空间 - 长度 (mm)</Label>
                <Input
                  type="number"
                  value={formData.availableSpaceLength}
                  onChange={(e) => handleInputChange("availableSpaceLength", e.target.value)}
                  placeholder="例如: 10000"
                />
              </div>
              <div className="space-y-2">
                <Label>可用空间 - 宽度 (mm)</Label>
                <Input
                  type="number"
                  value={formData.availableSpaceWidth}
                  onChange={(e) => handleInputChange("availableSpaceWidth", e.target.value)}
                  placeholder="例如: 5000"
                />
              </div>
              <div className="space-y-2">
                <Label>可用空间 - 高度 (mm)</Label>
                <Input
                  type="number"
                  value={formData.availableSpaceHeight}
                  onChange={(e) => handleInputChange("availableSpaceHeight", e.target.value)}
                  placeholder="例如: 4000"
                />
              </div>
              <div className="space-y-2">
                <Label>噪音限制 (dB)</Label>
                <Input
                  type="number"
                  value={formData.noiseLimit}
                  onChange={(e) => handleInputChange("noiseLimit", e.target.value)}
                  placeholder="例如: 80"
                />
              </div>
              <div className="space-y-2">
                <Label>预算范围</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.investmentBudgetMin}
                    onChange={(e) => handleInputChange("investmentBudgetMin", e.target.value)}
                    placeholder="最小"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    value={formData.investmentBudgetMax}
                    onChange={(e) => handleInputChange("investmentBudgetMax", e.target.value)}
                    placeholder="最大"
                  />
                  <Select value={formData.budgetCurrency} onValueChange={(v) => handleInputChange("budgetCurrency", v)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>期望交付时间</Label>
                <Input
                  value={formData.projectTimeline}
                  onChange={(e) => handleInputChange("projectTimeline", e.target.value)}
                  placeholder="例如: 2024年Q2"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>其他要求</Label>
              <Textarea
                value={formData.additionalRequirements}
                onChange={(e) => handleInputChange("additionalRequirements", e.target.value)}
                placeholder="请填写其他特殊要求或说明..."
                rows={4}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    { icon: Building2, title: "基本信息", titleEn: "Basic Info" },
    { icon: Package, title: "零件信息", titleEn: "Part Info" },
    { icon: Settings2, title: "零件规格", titleEn: "Specifications" },
    { icon: Beaker, title: "清洗要求", titleEn: "Cleaning Requirements" },
    { icon: FileText, title: "质量要求", titleEn: "Quality Requirements" },
    { icon: Truck, title: "产能要求", titleEn: "Capacity Requirements" },
    { icon: DollarSign, title: "场地与预算", titleEn: "Site & Budget" },
  ];

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={FileText}
          title="客户需求问卷"
          description="零件清洗设备需求调查表 - 基于GRTclean标准问卷"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="w-4 h-4 mr-2" />
                保存草稿
              </Button>
              <Button variant="default" onClick={handleAIRecommend}>
                <Sparkles className="w-4 h-4 mr-2" />
                AI方案推荐
              </Button>
            </div>
          }
        />

        {/* 进度条 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">问卷进度</span>
                <span className="font-medium">{currentStep} / {totalSteps}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between">
                {stepTitles.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index + 1 === currentStep;
                  const isCompleted = index + 1 < currentStep;
                  return (
                    <div
                      key={index}
                      className={`flex flex-col items-center cursor-pointer transition-colors ${
                        isActive ? "text-primary" : isCompleted ? "text-green-500" : "text-muted-foreground"
                      }`}
                      onClick={() => setCurrentStep(index + 1)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isActive ? "border-primary bg-primary/10" : 
                        isCompleted ? "border-green-500 bg-green-500/10" : "border-muted"
                      }`}>
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs mt-1 hidden md:block">
                        {language === "zh" ? step.title : step.titleEn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 表单内容 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const StepIcon = stepTitles[currentStep - 1].icon;
                return <StepIcon className="w-5 h-5" />;
              })()}
              {language === "zh" 
                ? stepTitles[currentStep - 1].title 
                : stepTitles[currentStep - 1].titleEn}
            </CardTitle>
            <CardDescription>
              请填写以下信息，带 * 的为必填项
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* 导航按钮 */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            上一步
          </Button>
          {currentStep < totalSteps ? (
            <Button
              onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
            >
              下一步
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <Send className="w-4 h-4 mr-2" />
              提交问卷
            </Button>
          )}
        </div>
      </div>
  );
}
