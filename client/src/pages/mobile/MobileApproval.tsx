import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  Check, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  FileText, 
  Loader2, 
  MapPin, 
  Plane, 
  Receipt, 
  User, 
  X 
} from "lucide-react";
import { useState } from "react";

interface ApprovalItem {
  id: string;
  type: "trip" | "expense";
  title: string;
  applicant: string;
  department: string;
  submitTime: string;
  amount?: number;
  destination?: string;
  startDate?: string;
  endDate?: string;
  status: "pending" | "approved" | "rejected";
  urgency: "normal" | "urgent";
}

export default function MobileApproval() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  // 模拟待审批数据
  const pendingItems: ApprovalItem[] = [
    {
      id: "1",
      type: "trip",
      title: "上海客户拜访出差申请",
      applicant: "胡杨",
      department: "AI数智部",
      submitTime: "2026-01-25 09:30",
      destination: "上海",
      startDate: "2026-01-28",
      endDate: "2026-01-30",
      status: "pending",
      urgency: "urgent"
    },
    {
      id: "2",
      type: "expense",
      title: "深圳展会差旅费报销",
      applicant: "刘健康",
      department: "事业一部",
      submitTime: "2026-01-24 14:20",
      amount: 8500,
      status: "pending",
      urgency: "normal"
    },
    {
      id: "3",
      type: "trip",
      title: "北京技术培训出差申请",
      applicant: "杨勇",
      department: "事业三部",
      submitTime: "2026-01-24 10:15",
      destination: "北京",
      startDate: "2026-02-01",
      endDate: "2026-02-03",
      status: "pending",
      urgency: "normal"
    }
  ];

  const processedItems: ApprovalItem[] = [
    {
      id: "4",
      type: "expense",
      title: "广州设备安装差旅费报销",
      applicant: "焦斌",
      department: "事业一部",
      submitTime: "2026-01-20 16:45",
      amount: 5200,
      status: "approved",
      urgency: "normal"
    },
    {
      id: "5",
      type: "trip",
      title: "成都客户回访出差申请",
      applicant: "韩保程",
      department: "事业一部",
      submitTime: "2026-01-18 11:30",
      destination: "成都",
      startDate: "2026-01-22",
      endDate: "2026-01-24",
      status: "rejected",
      urgency: "normal"
    }
  ];

  const handleApprove = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setApprovalDialogOpen(false);
    setSelectedItem(null);
    setComment("");
  };

  const handleReject = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setRejectDialogOpen(false);
    setSelectedItem(null);
    setComment("");
  };

  const renderApprovalItem = (item: ApprovalItem) => (
    <Card 
      key={item.id} 
      className="mb-3 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => setSelectedItem(item)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${item.type === "trip" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"}`}>
              {item.type === "trip" ? <Plane className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{item.title}</h3>
                {item.urgency === "urgent" && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded">紧急</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>{item.applicant}</span>
                <span>·</span>
                <span>{item.department}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{item.submitTime}</span>
              </div>
              {item.type === "trip" && item.destination && (
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{item.destination}</span>
                  <span>·</span>
                  <span>{item.startDate} 至 {item.endDate}</span>
                </div>
              )}
              {item.type === "expense" && item.amount && (
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <DollarSign className="w-3 h-3 text-green-500" />
                  <span className="font-medium text-green-500">¥{item.amount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
        
        {/* 已处理状态标签 */}
        {item.status !== "pending" && (
          <div className={`mt-3 pt-3 border-t flex items-center gap-2 ${item.status === "approved" ? "text-green-500" : "text-red-500"}`}>
            {item.status === "approved" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span className="text-sm">{item.status === "approved" ? "已通过" : "已拒绝"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 详情页面
  if (selectedItem) {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold">审批详情</h1>
        </div>

        <div className="p-4 space-y-4">
          {/* 基本信息 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{selectedItem.title}</CardTitle>
                {selectedItem.urgency === "urgent" && (
                  <span className="px-2 py-1 text-xs bg-red-500 text-white rounded">紧急</span>
                )}
              </div>
              <CardDescription>
                {selectedItem.type === "trip" ? "出差申请" : "费用报销"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">申请人</span>
                <span>{selectedItem.applicant}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">部门</span>
                <span>{selectedItem.department}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">提交时间</span>
                <span>{selectedItem.submitTime}</span>
              </div>
              {selectedItem.type === "trip" && (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">目的地</span>
                    <span>{selectedItem.destination}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">出差日期</span>
                    <span>{selectedItem.startDate} 至 {selectedItem.endDate}</span>
                  </div>
                </>
              )}
              {selectedItem.type === "expense" && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">报销金额</span>
                  <span className="font-bold text-green-500">¥{selectedItem.amount?.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 附件信息 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                附件材料
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">出差申请表.pdf</span>
                  </div>
                  <Button variant="ghost" size="sm">查看</Button>
                </div>
                {selectedItem.type === "expense" && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">发票_001.jpg</span>
                      </div>
                      <Button variant="ghost" size="sm">查看</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">发票_002.jpg</span>
                      </div>
                      <Button variant="ghost" size="sm">查看</Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 审批历史 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">审批流程</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">提交申请</p>
                    <p className="text-xs text-muted-foreground">{selectedItem.applicant} · {selectedItem.submitTime}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">待审批</p>
                    <p className="text-xs text-muted-foreground">当前节点 · {user?.name || "您"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">财务审批</p>
                    <p className="text-xs text-muted-foreground">待处理</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部操作按钮 */}
        {selectedItem.status === "pending" && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 h-12 text-red-500 border-red-500 hover:bg-red-500/10"
              onClick={() => setRejectDialogOpen(true)}
            >
              <X className="w-5 h-5 mr-2" />
              拒绝
            </Button>
            <Button 
              className="flex-1 h-12"
              onClick={() => setApprovalDialogOpen(true)}
            >
              <Check className="w-5 h-5 mr-2" />
              通过
            </Button>
          </div>
        )}

        {/* 通过确认对话框 */}
        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认通过</DialogTitle>
              <DialogDescription>
                您确定要通过此{selectedItem.type === "trip" ? "出差申请" : "报销申请"}吗？
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>审批意见（可选）</Label>
              <Textarea
                className="mt-2"
                placeholder="请输入审批意见..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>取消</Button>
              <Button onClick={handleApprove} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                确认通过
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 拒绝确认对话框 */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认拒绝</DialogTitle>
              <DialogDescription>
                请填写拒绝原因
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>拒绝原因 <span className="text-red-500">*</span></Label>
              <Textarea
                className="mt-2"
                placeholder="请输入拒绝原因..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>取消</Button>
              <Button 
                variant="destructive" 
                onClick={handleReject} 
                disabled={loading || !comment.trim()}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                确认拒绝
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 列表页面
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部 */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">审批中心</h1>
            <p className="text-xs text-muted-foreground">{user?.name || "审批人"}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              待审批
              {pendingItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {pendingItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="processed" className="flex-1">已处理</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="pending" className="mt-0">
            {pendingItems.length > 0 ? (
              pendingItems.map(renderApprovalItem)
            ) : (
              <div className="text-center py-12">
                <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">暂无待审批事项</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="processed" className="mt-0">
            {processedItems.length > 0 ? (
              processedItems.map(renderApprovalItem)
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无已处理记录</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
