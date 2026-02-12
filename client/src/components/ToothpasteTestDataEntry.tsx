import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, X, MapPin, CheckCircle2, XCircle, AlertTriangle, Save, Send, Image as ImageIcon, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

// 残留位置标记点类型
interface ResidueMarker {
  id: string;
  x: number; // 百分比位置
  y: number;
  severity: "light" | "medium" | "heavy";
  description: string;
  featureType: string;
}

// 牙膏试验数据类型
interface ToothpasteTestData {
  projectId: string;
  partName: string;
  partNumber: string;
  testDate: string;
  testerName: string;
  cleaningCycleTime: number;
  waterPressure: number;
  waterTemperature: number;
  detergentConcentration: number;
  testResult: "pass" | "fail" | "conditional";
  residueMarkers: ResidueMarker[];
  images: string[];
  notes: string;
  adjustmentRecommendations: string[];
}

interface ToothpasteTestDataEntryProps {
  projectId?: string;
  onSubmit?: (data: ToothpasteTestData) => void;
  onCancel?: () => void;
}

export default function ToothpasteTestDataEntry({ 
  projectId = "", 
  onSubmit, 
  onCancel 
}: ToothpasteTestDataEntryProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [testData, setTestData] = useState<ToothpasteTestData>({
    projectId,
    partName: "",
    partNumber: "",
    testDate: new Date().toISOString().split("T")[0],
    testerName: "",
    cleaningCycleTime: 60,
    waterPressure: 3,
    waterTemperature: 50,
    detergentConcentration: 2,
    testResult: "pass",
    residueMarkers: [],
    images: [],
    notes: "",
    adjustmentRecommendations: [],
  });
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(false);
  const [newMarker, setNewMarker] = useState<Partial<ResidueMarker> | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 特征类型选项
  const featureTypes = [
    { value: "blind_hole", label: "盲孔", icon: "🕳️" },
    { value: "rib", label: "加强筋", icon: "📏" },
    { value: "sealing_surface", label: "密封面", icon: "⭕" },
    { value: "deep_cavity", label: "深腔", icon: "📦" },
    { value: "thread", label: "螺纹", icon: "🔩" },
    { value: "groove", label: "沟槽", icon: "➖" },
    { value: "oil_hole", label: "油孔", icon: "💧" },
    { value: "other", label: "其他", icon: "📍" },
  ];

  // 严重程度选项
  const severityOptions = [
    { value: "light", label: "轻微", color: "bg-yellow-500" },
    { value: "medium", label: "中等", color: "bg-orange-500" },
    { value: "heavy", label: "严重", color: "bg-red-500" },
  ];

  // 处理图片上传
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setTestData((prev) => ({
          ...prev,
          images: [...prev.images, result],
        }));
        if (!selectedImage) {
          setSelectedImage(result);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [selectedImage]);

  // 打开相机
  const openCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("无法访问相机");
      setShowCamera(false);
    }
  };

  // 拍照
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg");
      setTestData((prev) => ({
        ...prev,
        images: [...prev.images, imageData],
      }));
      setSelectedImage(imageData);
    }
    
    // 关闭相机
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setShowCamera(false);
  };

  // 关闭相机
  const closeCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    }
    setShowCamera(false);
  };

  // 删除图片
  const removeImage = (index: number) => {
    setTestData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      const imageToRemove = prev.images[index];
      const newMarkers = prev.residueMarkers.filter(
        (marker) => !marker.id.startsWith(`img${index}_`)
      );
      
      if (selectedImage === imageToRemove) {
        setSelectedImage(newImages[0] || null);
      }
      
      return {
        ...prev,
        images: newImages,
        residueMarkers: newMarkers,
      };
    });
  };

  // 处理图片点击标记
  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMarking || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setNewMarker({
      x,
      y,
      severity: "medium",
      description: "",
      featureType: "other",
    });
  };

  // 保存标记
  const saveMarker = () => {
    if (!newMarker || !selectedImage) return;

    const imageIndex = testData.images.indexOf(selectedImage);
    const marker: ResidueMarker = {
      id: `img${imageIndex}_${Date.now()}`,
      x: newMarker.x!,
      y: newMarker.y!,
      severity: newMarker.severity as "light" | "medium" | "heavy",
      description: newMarker.description || "",
      featureType: newMarker.featureType || "other",
    };

    setTestData((prev) => ({
      ...prev,
      residueMarkers: [...prev.residueMarkers, marker],
    }));
    setNewMarker(null);
  };

  // 删除标记
  const removeMarker = (markerId: string) => {
    setTestData((prev) => ({
      ...prev,
      residueMarkers: prev.residueMarkers.filter((m) => m.id !== markerId),
    }));
  };

  // 获取当前图片的标记
  const getCurrentImageMarkers = () => {
    if (!selectedImage) return [];
    const imageIndex = testData.images.indexOf(selectedImage);
    return testData.residueMarkers.filter((m) => m.id.startsWith(`img${imageIndex}_`));
  };

  // 自动评估测试结果
  const evaluateTestResult = useCallback(() => {
    const markers = testData.residueMarkers;
    const heavyCount = markers.filter((m) => m.severity === "heavy").length;
    const mediumCount = markers.filter((m) => m.severity === "medium").length;
    const lightCount = markers.filter((m) => m.severity === "light").length;

    let result: "pass" | "fail" | "conditional" = "pass";
    const recommendations: string[] = [];

    if (heavyCount > 0) {
      result = "fail";
      recommendations.push("存在严重残留，需要重新调整清洗参数");
      recommendations.push("建议增加清洗时间或提高水压");
    } else if (mediumCount > 2) {
      result = "fail";
      recommendations.push("中等残留过多，建议优化喷嘴角度");
    } else if (mediumCount > 0 || lightCount > 3) {
      result = "conditional";
      recommendations.push("存在轻微残留，可考虑微调清洗参数");
    }

    // 根据特征类型添加建议
    const featureTypeCounts = markers.reduce((acc, m) => {
      acc[m.featureType] = (acc[m.featureType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (featureTypeCounts["blind_hole"] > 0) {
      recommendations.push("盲孔区域残留：建议使用脉冲喷射或增加浸泡时间");
    }
    if (featureTypeCounts["deep_cavity"] > 0) {
      recommendations.push("深腔区域残留：建议调整喷嘴角度，确保覆盖深处");
    }
    if (featureTypeCounts["thread"] > 0) {
      recommendations.push("螺纹区域残留：建议使用旋转喷射或超声波辅助");
    }

    setTestData((prev) => ({
      ...prev,
      testResult: result,
      adjustmentRecommendations: recommendations,
    }));
  }, [testData.residueMarkers]);

  // 提交数据
  const handleSubmit = () => {
    if (!testData.partName || !testData.testerName) {
      toast.error("请填写必要信息");
      return;
    }

    evaluateTestResult();
    
    if (onSubmit) {
      onSubmit(testData);
    }
    toast.success("牙膏试验数据已保存");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            牙膏试验数据录入
          </CardTitle>
          <CardDescription>
            记录清洗效果验证试验数据，支持拍照标记残留位置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="params">清洗参数</TabsTrigger>
              <TabsTrigger value="images">图片标记</TabsTrigger>
              <TabsTrigger value="result">结果评估</TabsTrigger>
            </TabsList>

            {/* 基本信息 */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partName">零件名称 *</Label>
                  <Input
                    id="partName"
                    value={testData.partName}
                    onChange={(e) => setTestData((prev) => ({ ...prev, partName: e.target.value }))}
                    placeholder="如：发动机缸体"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partNumber">零件编号</Label>
                  <Input
                    id="partNumber"
                    value={testData.partNumber}
                    onChange={(e) => setTestData((prev) => ({ ...prev, partNumber: e.target.value }))}
                    placeholder="如：ENG-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testDate">试验日期</Label>
                  <Input
                    id="testDate"
                    type="date"
                    value={testData.testDate}
                    onChange={(e) => setTestData((prev) => ({ ...prev, testDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testerName">测试人员 *</Label>
                  <Input
                    id="testerName"
                    value={testData.testerName}
                    onChange={(e) => setTestData((prev) => ({ ...prev, testerName: e.target.value }))}
                    placeholder="输入测试人员姓名"
                  />
                </div>
              </div>
            </TabsContent>

            {/* 清洗参数 */}
            <TabsContent value="params" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cycleTime">清洗周期时间 (秒)</Label>
                  <Input
                    id="cycleTime"
                    type="number"
                    value={testData.cleaningCycleTime}
                    onChange={(e) => setTestData((prev) => ({ ...prev, cleaningCycleTime: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pressure">水压 (bar)</Label>
                  <Input
                    id="pressure"
                    type="number"
                    step="0.1"
                    value={testData.waterPressure}
                    onChange={(e) => setTestData((prev) => ({ ...prev, waterPressure: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">水温 (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    value={testData.waterTemperature}
                    onChange={(e) => setTestData((prev) => ({ ...prev, waterTemperature: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concentration">清洗剂浓度 (%)</Label>
                  <Input
                    id="concentration"
                    type="number"
                    step="0.1"
                    value={testData.detergentConcentration}
                    onChange={(e) => setTestData((prev) => ({ ...prev, detergentConcentration: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea
                  id="notes"
                  value={testData.notes}
                  onChange={(e) => setTestData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="记录试验过程中的特殊情况..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* 图片标记 */}
            <TabsContent value="images" className="space-y-4 mt-4">
              {/* 图片上传区域 */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  上传图片
                </Button>
                <Button variant="outline" onClick={openCamera}>
                  <Camera className="w-4 h-4 mr-2" />
                  拍照
                </Button>
                <Button
                  variant={isMarking ? "default" : "outline"}
                  onClick={() => setIsMarking(!isMarking)}
                  disabled={!selectedImage}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {isMarking ? "停止标记" : "开始标记"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* 相机预览 */}
              {showCamera && (
                <Dialog open={showCamera} onOpenChange={setShowCamera}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>拍照</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={closeCamera}>取消</Button>
                        <Button onClick={capturePhoto}>
                          <Camera className="w-4 h-4 mr-2" />
                          拍照
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* 图片缩略图 */}
              <div className="flex flex-wrap gap-2">
                {testData.images.map((img, index) => (
                  <div
                    key={index}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer ${
                      selectedImage === img ? "border-primary" : "border-border"
                    }`}
                    onClick={() => setSelectedImage(img)}
                  >
                    <img src={img} alt={`图片 ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      className="absolute top-1 right-1 p-1 bg-destructive rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                    >
                      <X className="w-3 h-3 text-destructive-foreground" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 图片标记区域 */}
              {selectedImage && (
                <div
                  ref={imageContainerRef}
                  className="relative w-full max-h-96 overflow-hidden rounded-lg border border-border cursor-crosshair"
                  onClick={handleImageClick}
                >
                  <img src={selectedImage} alt="选中图片" className="w-full h-auto" />
                  {/* 显示标记点 */}
                  {getCurrentImageMarkers().map((marker) => (
                    <div
                      key={marker.id}
                      className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white flex items-center justify-center text-xs text-white cursor-pointer ${
                        marker.severity === "heavy" ? "bg-red-500" :
                        marker.severity === "medium" ? "bg-orange-500" : "bg-yellow-500"
                      }`}
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMarker(marker.id);
                      }}
                    >
                      {featureTypes.find(f => f.value === marker.featureType)?.icon || "📍"}
                    </div>
                  ))}
                </div>
              )}

              {/* 新标记编辑对话框 */}
              {newMarker && (
                <Dialog open={!!newMarker} onOpenChange={() => setNewMarker(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加残留标记</DialogTitle>
                      <DialogDescription>标记残留位置并描述</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>特征类型</Label>
                        <Select
                          value={newMarker.featureType}
                          onValueChange={(v) => setNewMarker((prev) => ({ ...prev!, featureType: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择特征类型" />
                          </SelectTrigger>
                          <SelectContent>
                            {featureTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.icon} {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>严重程度</Label>
                        <div className="flex gap-2">
                          {severityOptions.map((opt) => (
                            <Button
                              key={opt.value}
                              variant={newMarker.severity === opt.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setNewMarker((prev) => ({ ...prev!, severity: opt.value as any }))}
                            >
                              <div className={`w-3 h-3 rounded-full ${opt.color} mr-2`} />
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>描述</Label>
                        <Textarea
                          value={newMarker.description || ""}
                          onChange={(e) => setNewMarker((prev) => ({ ...prev!, description: e.target.value }))}
                          placeholder="描述残留情况..."
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setNewMarker(null)}>取消</Button>
                        <Button onClick={saveMarker}>保存标记</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* 标记列表 */}
              {testData.residueMarkers.length > 0 && (
                <div className="space-y-2">
                  <Label>残留标记列表 ({testData.residueMarkers.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {testData.residueMarkers.map((marker) => (
                      <div key={marker.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant={marker.severity === "heavy" ? "destructive" : marker.severity === "medium" ? "default" : "secondary"}>
                            {severityOptions.find(s => s.value === marker.severity)?.label}
                          </Badge>
                          <span className="text-sm">
                            {featureTypes.find(f => f.value === marker.featureType)?.label}
                          </span>
                          {marker.description && (
                            <span className="text-sm text-muted-foreground truncate max-w-32">
                              {marker.description}
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeMarker(marker.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 结果评估 */}
            <TabsContent value="result" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>测试结果</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={testData.testResult === "pass" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTestData((prev) => ({ ...prev, testResult: "pass" }))}
                      className={testData.testResult === "pass" ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      通过
                    </Button>
                    <Button
                      variant={testData.testResult === "conditional" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTestData((prev) => ({ ...prev, testResult: "conditional" }))}
                      className={testData.testResult === "conditional" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      有条件通过
                    </Button>
                    <Button
                      variant={testData.testResult === "fail" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTestData((prev) => ({ ...prev, testResult: "fail" }))}
                      className={testData.testResult === "fail" ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      不通过
                    </Button>
                  </div>
                </div>

                <Button variant="outline" onClick={evaluateTestResult}>
                  自动评估
                </Button>

                {testData.adjustmentRecommendations.length > 0 && (
                  <div className="space-y-2">
                    <Label>调整建议</Label>
                    <div className="space-y-2">
                      {testData.adjustmentRecommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 统计摘要 */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{testData.images.length}</div>
                        <div className="text-sm text-muted-foreground">图片数量</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{testData.residueMarkers.length}</div>
                        <div className="text-sm text-muted-foreground">残留标记</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-500">
                          {testData.residueMarkers.filter(m => m.severity === "heavy").length}
                        </div>
                        <div className="text-sm text-muted-foreground">严重残留</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-500">
                          {testData.residueMarkers.filter(m => m.severity === "medium").length}
                        </div>
                        <div className="text-sm text-muted-foreground">中等残留</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              保存试验数据
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
