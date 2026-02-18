/**
 * AI智能诊断页面
 * 
 * 功能：
 * 1. 设备故障诊断
 * 2. 传感器数据分析
 * 3. 历史案例匹配
 * 4. AI解决方案推荐
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  FileText, 
  History, 
  Lightbulb, 
  Search, 
  Settings, 
  Thermometer,
  Zap,
  Wrench,
  Clock,
  TrendingUp
} from "lucide-react";

// 模拟设备列表
const mockDevices = [
  { id: "DEV-001", name: "超声波清洗机 #1", type: "ultrasonic_cleaner", status: "running" },
  { id: "DEV-002", name: "超声波清洗机 #2", type: "ultrasonic_cleaner", status: "warning" },
  { id: "DEV-003", name: "高压喷淋系统 #1", type: "spray_system", status: "running" },
  { id: "DEV-004", name: "干燥设备 #1", type: "dryer", status: "error" },
  { id: "DEV-005", name: "传送带系统 #1", type: "conveyor", status: "running" },
];

// 模拟传感器数据
const mockSensorData = {
  "DEV-001": {
    temperature: 45.2,
    pressure: 1.2,
    vibration: 0.8,
    power: 5.5,
    frequency: 40000,
    waterLevel: 85,
  },
  "DEV-002": {
    temperature: 62.5,
    pressure: 1.8,
    vibration: 2.3,
    power: 6.2,
    frequency: 38500,
    waterLevel: 45,
  },
  "DEV-004": {
    temperature: 95.0,
    pressure: 0.5,
    vibration: 1.5,
    power: 8.0,
    airFlow: 120,
    humidity: 15,
  },
};

// 模拟诊断结果
const mockDiagnosticResult = {
  deviceId: "DEV-002",
  timestamp: new Date().toISOString(),
  overallHealth: 65,
  issues: [
    {
      id: "ISS-001",
      severity: "high",
      component: "换能器",
      symptom: "振动异常",
      possibleCauses: ["换能器老化", "安装松动", "阻抗失配"],
      confidence: 0.85,
    },
    {
      id: "ISS-002",
      severity: "medium",
      component: "加热系统",
      symptom: "温度过高",
      possibleCauses: ["温控器故障", "散热不良", "设定错误"],
      confidence: 0.72,
    },
    {
      id: "ISS-003",
      severity: "low",
      component: "液位传感器",
      symptom: "液位偏低",
      possibleCauses: ["蒸发损耗", "泄漏", "传感器漂移"],
      confidence: 0.68,
    },
  ],
  recommendations: [
    {
      priority: 1,
      action: "检查换能器连接和阻抗",
      estimatedTime: "30分钟",
      requiredTools: ["阻抗分析仪", "扳手套件"],
      steps: [
        "关闭设备电源",
        "检查换能器接线端子",
        "测量换能器阻抗值",
        "如阻抗异常，更换换能器",
      ],
    },
    {
      priority: 2,
      action: "校准温控系统",
      estimatedTime: "20分钟",
      requiredTools: ["温度计", "螺丝刀"],
      steps: [
        "检查温度传感器位置",
        "校准温控器设定值",
        "清洁散热片",
      ],
    },
    {
      priority: 3,
      action: "补充清洗液",
      estimatedTime: "10分钟",
      requiredTools: ["清洗液", "量杯"],
      steps: [
        "检查液位传感器",
        "补充清洗液至标准液位",
        "检查是否有泄漏",
      ],
    },
  ],
  similarCases: [
    {
      caseId: "CASE-2024-0156",
      similarity: 0.92,
      resolution: "更换换能器后问题解决",
      date: "2024-11-15",
    },
    {
      caseId: "CASE-2024-0089",
      similarity: 0.78,
      resolution: "调整阻抗匹配网络",
      date: "2024-08-22",
    },
  ],
};

export default function AIDiagnostic() {
  const { user, loading } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [symptomDescription, setSymptomDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<typeof mockDiagnosticResult | null>(null);
  const [activeTab, setActiveTab] = useState("diagnosis");

  const handleStartDiagnosis = async () => {
    if (!selectedDevice) {
      toast.error("请选择要诊断的设备");
      return;
    }

    setIsAnalyzing(true);
    // 模拟AI分析过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    setDiagnosticResult(mockDiagnosticResult);
    setIsAnalyzing(false);
    toast.success("诊断完成");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "high": return "高";
      case "medium": return "中";
      case "low": return "低";
      default: return "未知";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "text-green-500";
      case "warning": return "text-yellow-500";
      case "error": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "running": return "运行中";
      case "warning": return "警告";
      case "error": return "故障";
      default: return "未知";
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Cpu}
          title="AI智能诊断"
          description="基于Gemini AI的设备故障诊断与解决方案推荐系统"
          actions={
            <Badge variant="outline" className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              Gemini AI 驱动
            </Badge>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="diagnosis" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              故障诊断
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              实时监控
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              历史案例
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              知识库
            </TabsTrigger>
          </TabsList>

          {/* 故障诊断 Tab */}
          <TabsContent value="diagnosis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 诊断输入 */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    诊断设置
                  </CardTitle>
                  <CardDescription>选择设备并描述故障症状</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>选择设备</Label>
                    <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要诊断的设备" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockDevices.map(device => (
                          <SelectItem key={device.id} value={device.id}>
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${
                                device.status === "running" ? "bg-green-500" :
                                device.status === "warning" ? "bg-yellow-500" : "bg-red-500"
                              }`} />
                              {device.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>故障描述（可选）</Label>
                    <Textarea
                      placeholder="描述观察到的故障现象，如：设备运行时有异常噪音，清洗效果下降..."
                      value={symptomDescription}
                      onChange={e => setSymptomDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleStartDiagnosis}
                    disabled={isAnalyzing || !selectedDevice}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        AI分析中...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        开始诊断
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* 传感器数据 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    传感器数据
                  </CardTitle>
                  <CardDescription>
                    {selectedDevice ? `设备 ${selectedDevice} 的实时传感器数据` : "请选择设备查看传感器数据"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDevice && mockSensorData[selectedDevice as keyof typeof mockSensorData] ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(mockSensorData[selectedDevice as keyof typeof mockSensorData]).map(([key, value]) => (
                        <div key={key} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            {key === "temperature" && <Thermometer className="h-4 w-4" />}
                            {key === "power" && <Zap className="h-4 w-4" />}
                            {key === "vibration" && <Activity className="h-4 w-4" />}
                            {key === "pressure" && <TrendingUp className="h-4 w-4" />}
                            {key === "frequency" && <Cpu className="h-4 w-4" />}
                            {key === "waterLevel" && <Activity className="h-4 w-4" />}
                            {key === "airFlow" && <Activity className="h-4 w-4" />}
                            {key === "humidity" && <Activity className="h-4 w-4" />}
                            <span className="capitalize">{key}</span>
                          </div>
                          <div className="text-2xl font-bold">
                            {value}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              {key === "temperature" && "°C"}
                              {key === "pressure" && "bar"}
                              {key === "vibration" && "mm/s"}
                              {key === "power" && "kW"}
                              {key === "frequency" && "Hz"}
                              {key === "waterLevel" && "%"}
                              {key === "airFlow" && "m³/h"}
                              {key === "humidity" && "%"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      请选择设备以查看传感器数据
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 诊断结果 */}
            {diagnosticResult && (
              <div className="space-y-6">
                <Separator />
                
                {/* 健康度概览 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      诊断结果概览
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-8">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">设备健康度</span>
                          <span className="text-2xl font-bold">{diagnosticResult.overallHealth}%</span>
                        </div>
                        <Progress value={diagnosticResult.overallHealth} className="h-3" />
                      </div>
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-500">
                            {diagnosticResult.issues.filter(i => i.severity === "high").length}
                          </div>
                          <div className="text-sm text-muted-foreground">高风险</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-500">
                            {diagnosticResult.issues.filter(i => i.severity === "medium").length}
                          </div>
                          <div className="text-sm text-muted-foreground">中风险</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-500">
                            {diagnosticResult.issues.filter(i => i.severity === "low").length}
                          </div>
                          <div className="text-sm text-muted-foreground">低风险</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 问题列表 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        检测到的问题
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {diagnosticResult.issues.map(issue => (
                        <div key={issue.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(issue.severity) as any}>
                                {getSeverityText(issue.severity)}风险
                              </Badge>
                              <span className="font-medium">{issue.component}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              置信度: {Math.round(issue.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-sm">{issue.symptom}</p>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">可能原因：</span>
                            {issue.possibleCauses.join("、")}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* 解决方案 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        AI推荐解决方案
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {diagnosticResult.recommendations.map(rec => (
                        <div key={rec.priority} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">优先级 {rec.priority}</Badge>
                              <span className="font-medium">{rec.action}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {rec.estimatedTime}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">所需工具：</span>
                            {rec.requiredTools.join("、")}
                          </div>
                          <div className="space-y-1">
                            <span className="text-sm font-medium">操作步骤：</span>
                            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                              {rec.steps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* 相似案例 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      相似历史案例
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {diagnosticResult.similarCases.map(case_ => (
                        <div key={case_.caseId} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{case_.caseId}</span>
                            <Badge variant="secondary">
                              相似度 {Math.round(case_.similarity * 100)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {case_.resolution}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {case_.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* 实时监控 Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>设备状态监控</CardTitle>
                <CardDescription>实时监控所有设备的运行状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockDevices.map(device => (
                    <div key={device.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{device.name}</span>
                        <Badge 
                          variant={device.status === "running" ? "default" : 
                                   device.status === "warning" ? "secondary" : "destructive"}
                        >
                          {getStatusText(device.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        设备ID: {device.id}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 w-full"
                        onClick={() => {
                          setSelectedDevice(device.id);
                          setActiveTab("diagnosis");
                        }}
                      >
                        <Search className="h-3 w-3 mr-1" />
                        诊断
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 历史案例 Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>历史故障案例库</CardTitle>
                <CardDescription>查看和搜索历史故障案例</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <Input placeholder="搜索案例..." className="max-w-sm" />
                  <Button variant="outline">
                    <Search className="h-4 w-4 mr-2" />
                    搜索
                  </Button>
                </div>
                <div className="text-center text-muted-foreground py-8">
                  历史案例库功能开发中...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 知识库 Tab */}
          <TabsContent value="knowledge" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>设备知识库</CardTitle>
                <CardDescription>设备维护手册和故障排除指南</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  知识库功能开发中...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
