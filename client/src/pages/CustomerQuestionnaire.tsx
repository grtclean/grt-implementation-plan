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

  // 材料类型选项
  const MATERIAL_TYPES = [
    { id: "STEEL", label: t("crm.quest.materialSteel") },
    { id: "ALUMINUM", label: t("crm.quest.materialAluminum") },
    { id: "NON_FERROUS", label: t("crm.quest.materialNonFerrous") },
    { id: "CASTING", label: t("crm.quest.materialCasting") },
    { id: "PLASTIC", label: t("crm.quest.materialPlastic") },
    { id: "OTHER", label: t("crm.quest.materialOther") },
  ];

  // 污染类型选项
  const CONTAMINATION_TYPES = [
    { id: "COOLANT", label: t("crm.quest.contCoolant") },
    { id: "CHIPS", label: t("crm.quest.contChips") },
    { id: "BURRS", label: t("crm.quest.contBurrs") },
    { id: "OIL", label: t("crm.quest.contOil") },
    { id: "GREASE", label: t("crm.quest.contGrease") },
    { id: "DUST", label: t("crm.quest.contDust") },
    { id: "OTHER", label: t("crm.quest.contOther") },
  ];

  // 质量控制方法
  const QC_METHODS = [
    { id: "SPRAY_TEST", label: t("crm.quest.qcSprayTest") },
    { id: "INK_TEST", label: t("crm.quest.qcInkTest") },
    { id: "ULTRASONIC_TEST", label: t("crm.quest.qcUltrasonicTest") },
    { id: "VISUAL", label: t("crm.quest.qcVisual") },
    { id: "OTHER", label: t("crm.quest.qcOther") },
  ];

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
    toast.success(t("crm.quest.draftSaved"));
  };

  const handleSubmit = () => {
    toast.success(t("crm.quest.submitted"));
  };

  const handleAIRecommend = () => {
    toast.info(t("crm.quest.aiAnalyzing"));
    setTimeout(() => {
      toast.success(t("crm.quest.aiRecommendReady"));
    }, 2000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">{t("crm.quest.contactPerson")} *</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                  placeholder={t("crm.quest.contactPersonPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">{t("crm.quest.companyName")} *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  placeholder={t("crm.quest.companyPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("crm.quest.email")} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="example@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("crm.quest.phone")}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+86 xxx xxxx xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quoteType">{t("crm.quest.quoteType")} *</Label>
                <Select value={formData.quoteType} onValueChange={(v) => handleInputChange("quoteType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("crm.quest.selectQuoteType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW_PROJECT">{t("crm.quest.quoteNewProject")}</SelectItem>
                    <SelectItem value="REPLACEMENT">{t("crm.quest.quoteReplacement")}</SelectItem>
                    <SelectItem value="UPGRADE">{t("crm.quest.quoteUpgrade")}</SelectItem>
                    <SelectItem value="CONSULTATION">{t("crm.quest.quoteConsultation")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">{t("crm.quest.projectName")}</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange("projectName", e.target.value)}
                  placeholder={t("crm.quest.projectNamePlaceholder")}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="partName">{t("crm.quest.partName")} *</Label>
              <Input
                id="partName"
                value={formData.partName}
                onChange={(e) => handleInputChange("partName", e.target.value)}
                placeholder={t("crm.quest.partNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partDescription">{t("crm.quest.partDescription")}</Label>
              <Textarea
                id="partDescription"
                value={formData.partDescription}
                onChange={(e) => handleInputChange("partDescription", e.target.value)}
                placeholder={t("crm.quest.partDescPlaceholder")}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("crm.quest.materialType")} *</Label>
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
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.materialTypes.includes("OTHER") && (
                <Input
                  className="mt-2"
                  value={formData.materialOther}
                  onChange={(e) => handleInputChange("materialOther", e.target.value)}
                  placeholder={t("crm.quest.specifyOtherMaterial")}
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
                <Label>{t("crm.quest.weightRange")} (kg)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={formData.partWeightMin} onChange={(e) => handleInputChange("partWeightMin", e.target.value)} placeholder={t("crm.quest.min")} />
                  <span>-</span>
                  <Input type="number" value={formData.partWeightMax} onChange={(e) => handleInputChange("partWeightMax", e.target.value)} placeholder={t("crm.quest.max")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.lengthRange")} (mm)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={formData.partLengthMin} onChange={(e) => handleInputChange("partLengthMin", e.target.value)} placeholder={t("crm.quest.min")} />
                  <span>-</span>
                  <Input type="number" value={formData.partLengthMax} onChange={(e) => handleInputChange("partLengthMax", e.target.value)} placeholder={t("crm.quest.max")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.widthRange")} (mm)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={formData.partWidthMin} onChange={(e) => handleInputChange("partWidthMin", e.target.value)} placeholder={t("crm.quest.min")} />
                  <span>-</span>
                  <Input type="number" value={formData.partWidthMax} onChange={(e) => handleInputChange("partWidthMax", e.target.value)} placeholder={t("crm.quest.max")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.heightRange")} (mm)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={formData.partHeightMin} onChange={(e) => handleInputChange("partHeightMin", e.target.value)} placeholder={t("crm.quest.min")} />
                  <span>-</span>
                  <Input type="number" value={formData.partHeightMax} onChange={(e) => handleInputChange("partHeightMax", e.target.value)} placeholder={t("crm.quest.max")} />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t("crm.quest.cleaningMedium")} *</Label>
              <Select value={formData.cleaningProductType} onValueChange={(v) => handleInputChange("cleaningProductType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("crm.quest.selectCleaningMedium")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WATER_BASED">{t("crm.quest.mediumWaterBased")}</SelectItem>
                  <SelectItem value="ACIDIC">{t("crm.quest.mediumAcidic")}</SelectItem>
                  <SelectItem value="MODIFIED_ALCOHOL">{t("crm.quest.mediumModifiedAlcohol")}</SelectItem>
                  <SelectItem value="HYDROCARBON">{t("crm.quest.mediumHydrocarbon")}</SelectItem>
                  <SelectItem value="OTHER">{t("crm.quest.mediumOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("crm.quest.contaminationType")} *</Label>
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
                      {type.label}
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
                <Label>{t("crm.quest.tempBefore")} (°C)</Label>
                <Input type="number" value={formData.partTempBefore} onChange={(e) => handleInputChange("partTempBefore", e.target.value)} placeholder={t("crm.quest.tempExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.tempAfter")} (°C)</Label>
                <Input type="number" value={formData.partTempAfter} onChange={(e) => handleInputChange("partTempAfter", e.target.value)} placeholder={t("crm.quest.tempAfterExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.dryingLevel")}</Label>
                <Select value={formData.dryingLevel} onValueChange={(v) => handleInputChange("dryingLevel", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("crm.quest.selectDryingLevel")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEVEL_0">{t("crm.quest.dryLevel0")}</SelectItem>
                    <SelectItem value="LEVEL_1">{t("crm.quest.dryLevel1")}</SelectItem>
                    <SelectItem value="LEVEL_2">{t("crm.quest.dryLevel2")}</SelectItem>
                    <SelectItem value="LEVEL_3">{t("crm.quest.dryLevel3")}</SelectItem>
                    <SelectItem value="LEVEL_4">{t("crm.quest.dryLevel4")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.cleanlinessStandard")}</Label>
                <Input value={formData.cleanlinessStandard} onChange={(e) => handleInputChange("cleanlinessStandard", e.target.value)} placeholder={t("crm.quest.cleanlinessPlaceholder")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("crm.quest.qcMethods")}</Label>
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
                      {method.label}
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
                <Label>{t("crm.quest.dailyOutput")}</Label>
                <Input type="number" value={formData.dailyPartQuantity} onChange={(e) => handleInputChange("dailyPartQuantity", e.target.value)} placeholder={t("crm.quest.dailyOutputExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.cycleTime")}</Label>
                <Input type="number" value={formData.cycleTimeSeconds} onChange={(e) => handleInputChange("cycleTimeSeconds", e.target.value)} placeholder={t("crm.quest.cycleTimeExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.annualVolume")}</Label>
                <Input type="number" value={formData.annualVolume} onChange={(e) => handleInputChange("annualVolume", e.target.value)} placeholder={t("crm.quest.annualVolumeExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.oeeTarget")} (%)</Label>
                <Input type="number" value={formData.oeeTarget} onChange={(e) => handleInputChange("oeeTarget", e.target.value)} placeholder={t("crm.quest.oeeExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.shiftPattern")}</Label>
                <Select value={formData.shiftPattern} onValueChange={(v) => handleInputChange("shiftPattern", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("crm.quest.selectShiftPattern")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_SHIFT">{t("crm.quest.shiftOne")}</SelectItem>
                    <SelectItem value="TWO_SHIFT">{t("crm.quest.shiftTwo")}</SelectItem>
                    <SelectItem value="THREE_SHIFT">{t("crm.quest.shiftThree")}</SelectItem>
                    <SelectItem value="CONTINUOUS">{t("crm.quest.shiftContinuous")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.loadingMethod")}</Label>
                <Select value={formData.loadingMethod} onValueChange={(v) => handleInputChange("loadingMethod", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("crm.quest.selectLoadingMethod")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">{t("crm.quest.loadManual")}</SelectItem>
                    <SelectItem value="AUTO_CHAIN">{t("crm.quest.loadAutoChain")}</SelectItem>
                    <SelectItem value="ROBOT">{t("crm.quest.loadRobot")}</SelectItem>
                    <SelectItem value="GANTRY">{t("crm.quest.loadGantry")}</SelectItem>
                    <SelectItem value="CONVEYOR">{t("crm.quest.loadConveyor")}</SelectItem>
                    <SelectItem value="OTHER">{t("crm.quest.loadOther")}</SelectItem>
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
                <Label>{t("crm.quest.spaceLength")} (mm)</Label>
                <Input type="number" value={formData.availableSpaceLength} onChange={(e) => handleInputChange("availableSpaceLength", e.target.value)} placeholder={t("crm.quest.spaceLengthExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.spaceWidth")} (mm)</Label>
                <Input type="number" value={formData.availableSpaceWidth} onChange={(e) => handleInputChange("availableSpaceWidth", e.target.value)} placeholder={t("crm.quest.spaceWidthExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.spaceHeight")} (mm)</Label>
                <Input type="number" value={formData.availableSpaceHeight} onChange={(e) => handleInputChange("availableSpaceHeight", e.target.value)} placeholder={t("crm.quest.spaceHeightExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.noiseLimit")} (dB)</Label>
                <Input type="number" value={formData.noiseLimit} onChange={(e) => handleInputChange("noiseLimit", e.target.value)} placeholder={t("crm.quest.noiseExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.quest.budgetRange")}</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={formData.investmentBudgetMin} onChange={(e) => handleInputChange("investmentBudgetMin", e.target.value)} placeholder={t("crm.quest.min")} />
                  <span>-</span>
                  <Input type="number" value={formData.investmentBudgetMax} onChange={(e) => handleInputChange("investmentBudgetMax", e.target.value)} placeholder={t("crm.quest.max")} />
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
                <Label>{t("crm.quest.expectedDelivery")}</Label>
                <Input value={formData.projectTimeline} onChange={(e) => handleInputChange("projectTimeline", e.target.value)} placeholder={t("crm.quest.expectedDeliveryExample")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("crm.quest.otherRequirements")}</Label>
              <Textarea value={formData.additionalRequirements} onChange={(e) => handleInputChange("additionalRequirements", e.target.value)} placeholder={t("crm.quest.otherReqPlaceholder")} rows={4} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    { icon: Building2, title: t("crm.quest.stepBasicInfo") },
    { icon: Package, title: t("crm.quest.stepPartInfo") },
    { icon: Settings2, title: t("crm.quest.stepSpecs") },
    { icon: Beaker, title: t("crm.quest.stepCleaningReq") },
    { icon: FileText, title: t("crm.quest.stepQualityReq") },
    { icon: Truck, title: t("crm.quest.stepCapacityReq") },
    { icon: DollarSign, title: t("crm.quest.stepSiteBudget") },
  ];

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={FileText}
          title={t("crm.quest.title")}
          description={t("crm.quest.description")}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="w-4 h-4 mr-2" />
                {t("crm.quest.saveDraft")}
              </Button>
              <Button variant="default" onClick={handleAIRecommend}>
                <Sparkles className="w-4 h-4 mr-2" />
                {t("crm.quest.aiRecommend")}
              </Button>
            </div>
          }
        />

        {/* 进度条 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("crm.quest.progress")}</span>
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
                        {step.title}
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
              {stepTitles[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {t("crm.quest.requiredFields")}
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
            {t("crm.quest.prevStep")}
          </Button>
          {currentStep < totalSteps ? (
            <Button
              onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
            >
              {t("crm.quest.nextStep")}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <Send className="w-4 h-4 mr-2" />
              {t("crm.quest.submitQuestionnaire")}
            </Button>
          )}
        </div>
      </div>
  );
}
