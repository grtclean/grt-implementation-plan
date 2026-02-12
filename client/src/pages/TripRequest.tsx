/**
 * 出差申请页面
 * GRT智能系统 v4.5.0 - 出差辅助支持系统
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Plane, Train, Car, Ship, Bus, MapPin, Calendar, DollarSign, 
  Plus, Eye, Send, CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, Users, Building, Globe, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// 类型定义
type TripStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
type TripType = 'domestic' | 'international';
type TripPurpose = 'customer_visit' | 'installation' | 'maintenance' | 'training' | 'meeting' | 'exhibition' | 'other';
type TransportMode = 'flight' | 'train' | 'bus' | 'car' | 'ship' | 'other';

// 状态颜色映射
const statusColors: Record<TripStatus, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-emerald-600',
  cancelled: 'bg-gray-400',
};

// 状态文本映射
const statusText: Record<TripStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

// 出差类型文本
const tripTypeText: Record<TripType, string> = {
  domestic: '国内出差',
  international: '国际出差',
};

// 出差目的文本
const purposeText: Record<TripPurpose, string> = {
  customer_visit: '客户拜访',
  installation: '设备安装',
  maintenance: '设备维护',
  training: '培训',
  meeting: '会议',
  exhibition: '展会',
  other: '其他',
};

// 交通方式图标
const transportIcons: Record<TransportMode, React.ReactNode> = {
  flight: <Plane className="w-4 h-4" />,
  train: <Train className="w-4 h-4" />,
  bus: <Bus className="w-4 h-4" />,
  car: <Car className="w-4 h-4" />,
  ship: <Ship className="w-4 h-4" />,
  other: <MapPin className="w-4 h-4" />,
};

// 交通方式文本
const transportText: Record<TransportMode, string> = {
  flight: '飞机',
  train: '火车',
  bus: '大巴',
  car: '汽车',
  ship: '轮船',
  other: '其他',
};

export default function TripRequest() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("list");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    tripType: 'domestic' as TripType,
    purpose: 'customer_visit' as TripPurpose,
    purposeDescription: '',
    departureDate: '',
    returnDate: '',
    departureCity: '',
    destinations: [''],
    estimatedBudget: 0,
    currency: 'CNY',
    emergencyContact: '',
    emergencyPhone: '',
    specialRequirements: '',
  });

  // 行程安排
  const [itineraries, setItineraries] = useState<Array<{
    sequenceNumber: number;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    arrivalDate: string;
    transportMode: TransportMode;
    transportDetails: string;
    accommodationType: string;
    accommodationName: string;
    estimatedCost: number;
    notes: string;
  }>>([]);

  // API调用
  const { data: tripList, isLoading: listLoading, refetch: refetchList } = (trpc.tripRequest.list as any).useQuery({
    myOnly: true,
  });

  const { data: statistics } = (trpc.tripRequest as any).statistics.useQuery({
    myOnly: true,
  });

  const { data: countries } = trpc.tripRequest.countries.useQuery();
  const { data: expensePolicies } = trpc.tripRequest.expensePolicies.useQuery();

  const createMutation = trpc.tripRequest.create.useMutation({
    onSuccess: () => {
      toast.success('出差申请创建成功');
      setShowCreateDialog(false);
      resetForm();
      refetchList();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const submitMutation = trpc.tripRequest.submit.useMutation({
    onSuccess: () => {
      toast.success('出差申请已提交审批');
      refetchList();
    },
    onError: (error) => {
      toast.error(`提交失败: ${error.message}`);
    },
  });

  const cancelMutation = trpc.tripRequest.cancel.useMutation({
    onSuccess: () => {
      toast.success('出差申请已取消');
      refetchList();
    },
    onError: (error) => {
      toast.error(`取消失败: ${error.message}`);
    },
  });

  const startMutation = trpc.tripRequest.start.useMutation({
    onSuccess: () => {
      toast.success('出差已开始');
      refetchList();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const completeMutation = trpc.tripRequest.complete.useMutation({
    onSuccess: () => {
      toast.success('出差已完成');
      refetchList();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 重置表单
  const resetForm = () => {
    setFormData({
      tripType: 'domestic',
      purpose: 'customer_visit',
      purposeDescription: '',
      departureDate: '',
      returnDate: '',
      departureCity: '',
      destinations: [''],
      estimatedBudget: 0,
      currency: 'CNY',
      emergencyContact: '',
      emergencyPhone: '',
      specialRequirements: '',
    });
    setItineraries([]);
  };

  // 添加目的地
  const addDestination = () => {
    setFormData(prev => ({
      ...prev,
      destinations: [...prev.destinations, ''],
    }));
  };

  // 更新目的地
  const updateDestination = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      destinations: prev.destinations.map((d, i) => i === index ? value : d),
    }));
  };

  // 删除目的地
  const removeDestination = (index: number) => {
    if (formData.destinations.length > 1) {
      setFormData(prev => ({
        ...prev,
        destinations: prev.destinations.filter((_, i) => i !== index),
      }));
    }
  };

  // 添加行程
  const addItinerary = () => {
    setItineraries(prev => [...prev, {
      sequenceNumber: prev.length + 1,
      departureCity: '',
      arrivalCity: '',
      departureDate: '',
      arrivalDate: '',
      transportMode: 'flight',
      transportDetails: '',
      accommodationType: '',
      accommodationName: '',
      estimatedCost: 0,
      notes: '',
    }]);
  };

  // 更新行程
  const updateItinerary = (index: number, field: string, value: any) => {
    setItineraries(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // 删除行程
  const removeItinerary = (index: number) => {
    setItineraries(prev => prev.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      sequenceNumber: i + 1,
    })));
  };

  // 提交创建
  const handleCreate = () => {
    if (!formData.departureDate || !formData.returnDate || !formData.departureCity || !formData.destinations[0]) {
      toast.error('请填写必填字段');
      return;
    }

    createMutation.mutate({
      ...formData,
      destinations: formData.destinations.filter(d => d.trim() !== ''),
      itineraries: itineraries.length > 0 ? itineraries : undefined,
    });
  };

  // 查看详情
  const handleViewDetail = (trip: any) => {
    setSelectedTrip(trip);
    setShowDetailDialog(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="w-6 h-6 text-primary" />
            出差申请管理
          </h1>
          <p className="text-muted-foreground mt-1">管理您的出差申请、行程安排和审批状态</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建出差申请
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总申请数</p>
                <p className="text-2xl font-bold">{(statistics as any)?.total || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待审批</p>
                <p className="text-2xl font-bold text-yellow-500">{(statistics as any)?.byStatus?.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold text-blue-500">{(statistics as any)?.byStatus?.in_progress || 0}</p>
              </div>
              <Plane className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">预算总额</p>
                <p className="text-2xl font-bold">¥{((statistics as any)?.totalBudget || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 出差申请列表 */}
      <Card>
        <CardHeader>
          <CardTitle>我的出差申请</CardTitle>
          <CardDescription>查看和管理您的所有出差申请</CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : tripList && ((tripList as any).items || tripList as any).length > 0 ? (
            <div className="space-y-4">
              {((tripList as any).items || tripList as any[]).map((trip: any) => (
                <div 
                  key={trip.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded-full ${statusColors[trip.status as TripStatus]}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trip.requestNumber}</span>
                        <Badge variant="outline">{tripTypeText[trip.tripType as TripType]}</Badge>
                        <Badge className={statusColors[trip.status as TripStatus]}>
                          {statusText[trip.status as TripStatus]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {trip.departureCity} → {JSON.parse(trip.destinations || '[]').join(' → ')}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {trip.departureDate} ~ {trip.returnDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      ¥{Number(trip.estimatedBudget).toLocaleString()}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetail(trip)}>
                      <Eye className="w-4 h-4 mr-1" />
                      详情
                    </Button>
                    {trip.status === 'draft' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => submitMutation.mutate({ id: trip.id })}
                          disabled={submitMutation.isPending}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          提交
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => cancelMutation.mutate({ id: trip.id })}
                          disabled={cancelMutation.isPending}
                        >
                          取消
                        </Button>
                      </>
                    )}
                    {trip.status === 'approved' && (
                      <Button 
                        size="sm"
                        onClick={() => startMutation.mutate({ id: trip.id })}
                        disabled={startMutation.isPending}
                      >
                        开始出差
                      </Button>
                    )}
                    {trip.status === 'in_progress' && (
                      <Button 
                        size="sm"
                        onClick={() => completeMutation.mutate({ id: trip.id })}
                        disabled={completeMutation.isPending}
                      >
                        完成出差
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无出差申请</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                创建第一个出差申请
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建出差申请对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建出差申请</DialogTitle>
            <DialogDescription>填写出差信息和行程安排</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="itinerary">行程安排</TabsTrigger>
              <TabsTrigger value="other">其他信息</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>出差类型 *</Label>
                  <Select 
                    value={formData.tripType} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tripType: v as TripType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domestic">国内出差</SelectItem>
                      <SelectItem value="international">国际出差</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>出差目的 *</Label>
                  <Select 
                    value={formData.purpose} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, purpose: v as TripPurpose }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(purposeText).map(([key, text]) => (
                        <SelectItem key={key} value={key}>{text}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>出差说明</Label>
                <Textarea 
                  placeholder="详细描述出差目的和计划..."
                  value={formData.purposeDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, purposeDescription: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>出发日期 *</Label>
                  <Input 
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, departureDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>返回日期 *</Label>
                  <Input 
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>出发城市 *</Label>
                <Input 
                  placeholder="例如：上海"
                  value={formData.departureCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, departureCity: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>目的地 *</Label>
                {formData.destinations.map((dest, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      placeholder={`目的地 ${index + 1}`}
                      value={dest}
                      onChange={(e) => updateDestination(index, e.target.value)}
                    />
                    {formData.destinations.length > 1 && (
                      <Button variant="outline" size="icon" onClick={() => removeDestination(index)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addDestination}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加目的地
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>预估预算 *</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={formData.estimatedBudget || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedBudget: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>货币</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                      <SelectItem value="USD">美元 (USD)</SelectItem>
                      <SelectItem value="EUR">欧元 (EUR)</SelectItem>
                      <SelectItem value="JPY">日元 (JPY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="itinerary" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">添加详细的行程安排（可选）</p>
                <Button variant="outline" size="sm" onClick={addItinerary}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加行程
                </Button>
              </div>

              {itineraries.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">暂无行程安排</p>
                  <Button variant="outline" className="mt-4" onClick={addItinerary}>
                    添加第一段行程
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {itineraries.map((item, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">行程 {item.sequenceNumber}</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => removeItinerary(index)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>出发城市</Label>
                            <Input 
                              value={item.departureCity}
                              onChange={(e) => updateItinerary(index, 'departureCity', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>到达城市</Label>
                            <Input 
                              value={item.arrivalCity}
                              onChange={(e) => updateItinerary(index, 'arrivalCity', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>出发时间</Label>
                            <Input 
                              type="datetime-local"
                              value={item.departureDate}
                              onChange={(e) => updateItinerary(index, 'departureDate', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>到达时间</Label>
                            <Input 
                              type="datetime-local"
                              value={item.arrivalDate}
                              onChange={(e) => updateItinerary(index, 'arrivalDate', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>交通方式</Label>
                            <Select 
                              value={item.transportMode}
                              onValueChange={(v) => updateItinerary(index, 'transportMode', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(transportText).map(([key, text]) => (
                                  <SelectItem key={key} value={key}>
                                    <span className="flex items-center gap-2">
                                      {transportIcons[key as TransportMode]}
                                      {text}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>预估费用</Label>
                            <Input 
                              type="number"
                              value={item.estimatedCost || ''}
                              onChange={(e) => updateItinerary(index, 'estimatedCost', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>住宿信息</Label>
                          <Input 
                            placeholder="酒店名称"
                            value={item.accommodationName}
                            onChange={(e) => updateItinerary(index, 'accommodationName', e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="other" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>紧急联系人</Label>
                  <Input 
                    placeholder="姓名"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>紧急联系电话</Label>
                  <Input 
                    placeholder="电话号码"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>特殊要求</Label>
                <Textarea 
                  placeholder="如有特殊需求请在此说明..."
                  value={formData.specialRequirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialRequirements: e.target.value }))}
                />
              </div>

              {/* 费用政策提示 */}
              {expensePolicies && expensePolicies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">费用政策参考</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {expensePolicies.slice(0, 5).map((policy: any) => (
                        <div key={policy.id} className="flex justify-between">
                          <span>{policy.policyName}</span>
                          <span className="text-muted-foreground">
                            {policy.currency} {policy.dailyLimit}/天
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>出差申请详情</DialogTitle>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedTrip.requestNumber}</span>
                <Badge className={statusColors[selectedTrip.status as TripStatus]}>
                  {statusText[selectedTrip.status as TripStatus]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">出差类型</Label>
                  <p>{tripTypeText[selectedTrip.tripType as TripType]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">出差目的</Label>
                  <p>{purposeText[selectedTrip.purpose as TripPurpose]}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">出发日期</Label>
                  <p>{selectedTrip.departureDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">返回日期</Label>
                  <p>{selectedTrip.returnDate}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">行程</Label>
                <p>{selectedTrip.departureCity} → {JSON.parse(selectedTrip.destinations || '[]').join(' → ')}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">预估预算</Label>
                <p className="text-lg font-bold">
                  {selectedTrip.currency} {Number(selectedTrip.estimatedBudget).toLocaleString()}
                </p>
              </div>

              {selectedTrip.purposeDescription && (
                <div>
                  <Label className="text-muted-foreground">出差说明</Label>
                  <p>{selectedTrip.purposeDescription}</p>
                </div>
              )}

              {selectedTrip.specialRequirements && (
                <div>
                  <Label className="text-muted-foreground">特殊要求</Label>
                  <p>{selectedTrip.specialRequirements}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
