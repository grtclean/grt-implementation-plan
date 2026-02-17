/**
 * 来访申请表单页面
 * 用户可以在此创建和提交来访申请
 */

import { useState } from 'react';
import Layout from "@/components/Layout";
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react';

/**
 * 来访申请表单页面
 */
export default function VisitorRequestForm() {
  const { user } = useAuth();
  const [step, setStep] = useState<'basic' | 'visitors' | 'review'>('basic');
  const [formData, setFormData] = useState({
    applicantName: user?.name || '',
    applicantId: user?.id || '',
    applicantEmail: user?.email || '',
    applicantPhone: '',
    applicantCompany: '',
    applicantPosition: '',
    visitPurpose: '',
    visitDate: '',
    visitEndDate: '',
    numberOfVisitors: 1,
    factoryId: 1,
    factoryName: '',
    country: 'CN',
    region: '',
    department: '',
    area: '',
    needsFactoryAccess: false,
    needsProductionFloor: false,
    needsLabAccess: false,
    contactPersonId: '',
    contactPersonName: '',
    contactPersonEmail: '',
    contactPersonPhone: '',
  });

  const [visitors, setVisitors] = useState<any[]>([]);
  const [newVisitor, setNewVisitor] = useState({
    visitorName: '',
    visitorId: '',
    visitorEmail: '',
    visitorPhone: '',
    visitorCompany: '',
    visitorPosition: '',
    idType: 'passport',
    idNumber: '',
    nationality: '',
  });

  const createRequestMutation = trpc.visitor.createRequest.useMutation();
  const submitRequestMutation = trpc.visitor.submitRequest.useMutation();
  const addVisitorMutation = trpc.visitor.addVisitorDetail.useMutation();

  const handleBasicFormChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleAddVisitor = () => {
    if (!newVisitor.visitorName || !newVisitor.visitorId) {
      alert('请填写来访者姓名和ID');
      return;
    }

    setVisitors([...visitors, newVisitor]);
    setNewVisitor({
      visitorName: '',
      visitorId: '',
      visitorEmail: '',
      visitorPhone: '',
      visitorCompany: '',
      visitorPosition: '',
      idType: 'passport',
      idNumber: '',
      nationality: '',
    });
  };

  const handleRemoveVisitor = (index: number) => {
    setVisitors(visitors.filter((_, i) => i !== index));
  };

  const handleCreateAndSubmit = async () => {
    try {
      // 创建申请
      const { requestId } = await createRequestMutation.mutateAsync({
        ...formData,
        visitDate: new Date(formData.visitDate),
        visitEndDate: formData.visitEndDate ? new Date(formData.visitEndDate) : undefined,
        numberOfVisitors: visitors.length || 1,
      });

      // 添加来访者
      for (const visitor of visitors) {
        await addVisitorMutation.mutateAsync({
          requestId,
          ...visitor,
        });
      }

      // 提交申请
      await submitRequestMutation.mutateAsync({ requestId });

      // 显示成功消息
      alert('来访申请已成功提交！');
      // 重置表单
      setStep('basic');
      setFormData({
        applicantName: user?.name || '',
        applicantId: user?.id || '',
        applicantEmail: user?.email || '',
        applicantPhone: '',
        applicantCompany: '',
        applicantPosition: '',
        visitPurpose: '',
        visitDate: '',
        visitEndDate: '',
        numberOfVisitors: 1,
        factoryId: 1,
        factoryName: '',
        country: 'CN',
        region: '',
        department: '',
        area: '',
        needsFactoryAccess: false,
        needsProductionFloor: false,
        needsLabAccess: false,
        contactPersonId: '',
        contactPersonName: '',
        contactPersonEmail: '',
        contactPersonPhone: '',
      });
      setVisitors([]);
    } catch (error: any) {
      alert(`错误: ${error.message}`);
    }
  };

  return (
    <Layout>
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div>
          <h1 className="text-4xl font-bold text-foreground">来访申请</h1>
          <p className="text-muted-foreground mt-2">
            填写以下信息提交您的来访申请
          </p>
        </div>

        {/* 步骤指示器 */}
        <div className="flex gap-4">
          <StepIndicator
            number={1}
            label="基本信息"
            active={step === 'basic'}
            onClick={() => setStep('basic')}
          />
          <StepIndicator
            number={2}
            label="来访者"
            active={step === 'visitors'}
            onClick={() => setStep('visitors')}
          />
          <StepIndicator
            number={3}
            label="审核"
            active={step === 'review'}
            onClick={() => setStep('review')}
          />
        </div>

        {/* 第一步：基本信息 */}
        {step === 'basic' && (
          <BasicInfoForm
            formData={formData}
            onChange={handleBasicFormChange}
            onNext={() => setStep('visitors')}
          />
        )}

        {/* 第二步：来访者 */}
        {step === 'visitors' && (
          <VisitorsForm
            visitors={visitors}
            newVisitor={newVisitor}
            onNewVisitorChange={(e) => {
              const { name, value } = e.target;
              setNewVisitor({ ...newVisitor, [name]: value });
            }}
            onAddVisitor={handleAddVisitor}
            onRemoveVisitor={handleRemoveVisitor}
            onNext={() => setStep('review')}
            onPrev={() => setStep('basic')}
          />
        )}

        {/* 第三步：审核 */}
        {step === 'review' && (
          <ReviewForm
            formData={formData}
            visitors={visitors}
            onSubmit={handleCreateAndSubmit}
            onPrev={() => setStep('visitors')}
            isLoading={
              createRequestMutation.isPending ||
              submitRequestMutation.isPending ||
              addVisitorMutation.isPending
            }
          />
        )}
      </div>
    </div>
    </Layout>
  );
}

/**
 * 步骤指示器组件
 */
function StepIndicator({
  number,
  label,
  active,
  onClick,
}: {
  number: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent'
      }`}
    >
      <span className="w-8 h-8 rounded-full flex items-center justify-center font-semibold">
        {number}
      </span>
      <span>{label}</span>
    </button>
  );
}

/**
 * 基本信息表单
 */
function BasicInfoForm({
  formData,
  onChange,
  onNext,
}: {
  formData: any;
  onChange: (e: any) => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>基本信息</CardTitle>
        <CardDescription>填写您的基本信息和来访目的</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 申请者信息 */}
        <div className="space-y-4">
          <h3 className="font-semibold">申请者信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>姓名</Label>
              <Input
                name="applicantName"
                value={formData.applicantName}
                onChange={onChange}
                disabled
              />
            </div>
            <div>
              <Label>邮箱</Label>
              <Input
                name="applicantEmail"
                type="email"
                value={formData.applicantEmail}
                onChange={onChange}
                disabled
              />
            </div>
            <div>
              <Label>电话</Label>
              <Input
                name="applicantPhone"
                value={formData.applicantPhone}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <Label>公司</Label>
              <Input
                name="applicantCompany"
                value={formData.applicantCompany}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        {/* 来访信息 */}
        <div className="space-y-4">
          <h3 className="font-semibold">来访信息</h3>
          <div>
            <Label>来访目的</Label>
            <Textarea
              name="visitPurpose"
              value={formData.visitPurpose}
              onChange={onChange}
              required
              placeholder="请详细描述您的来访目的"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>来访日期</Label>
              <Input
                name="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <Label>离访日期（可选）</Label>
              <Input
                name="visitEndDate"
                type="date"
                value={formData.visitEndDate}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        {/* 工厂信息 */}
        <div className="space-y-4">
          <h3 className="font-semibold">工厂信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>国家</Label>
              <Select value={formData.country} onValueChange={(v) => onChange({ target: { name: "country", value: v, type: "select" } })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择国家" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CN">中国</SelectItem>
                  <SelectItem value="US">美国</SelectItem>
                  <SelectItem value="DE">德国</SelectItem>
                  <SelectItem value="GB">英国</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>工厂名称</Label>
              <Input
                name="factoryName"
                value={formData.factoryName}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <Label>部门</Label>
              <Input
                name="department"
                value={formData.department}
                onChange={onChange}
              />
            </div>
            <div>
              <Label>区域/车间</Label>
              <Input
                name="area"
                value={formData.area}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        {/* 访问权限 */}
        <div className="space-y-4">
          <h3 className="font-semibold">访问权限</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="needsFactoryAccess"
                checked={formData.needsFactoryAccess}
                onChange={onChange}
              />
              <span>需要进入工厂</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="needsProductionFloor"
                checked={formData.needsProductionFloor}
                onChange={onChange}
              />
              <span>需要进入生产车间</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="needsLabAccess"
                checked={formData.needsLabAccess}
                onChange={onChange}
              />
              <span>需要进入实验室</span>
            </label>
          </div>
        </div>

        {/* 联系人信息 */}
        <div className="space-y-4">
          <h3 className="font-semibold">联系人信息（工厂内部）</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>联系人姓名</Label>
              <Input
                name="contactPersonName"
                value={formData.contactPersonName}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <Label>联系人邮箱</Label>
              <Input
                name="contactPersonEmail"
                type="email"
                value={formData.contactPersonEmail}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <Label>联系人电话</Label>
              <Input
                name="contactPersonPhone"
                value={formData.contactPersonPhone}
                onChange={onChange}
                required
              />
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline">取消</Button>
          <Button onClick={onNext}>下一步</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 来访者表单
 */
function VisitorsForm({
  visitors,
  newVisitor,
  onNewVisitorChange,
  onAddVisitor,
  onRemoveVisitor,
  onNext,
  onPrev,
}: {
  visitors: any[];
  newVisitor: any;
  onNewVisitorChange: (e: any) => void;
  onAddVisitor: () => void;
  onRemoveVisitor: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>来访者信息</CardTitle>
        <CardDescription>添加所有来访者的信息</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 已添加的来访者列表 */}
        {visitors.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">已添加的来访者</h3>
            {visitors.map((visitor, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-semibold">{visitor.visitorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {visitor.visitorCompany} - {visitor.visitorPosition}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveVisitor(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 添加新来访者 */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold">添加来访者</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>姓名</Label>
              <Input
                name="visitorName"
                value={newVisitor.visitorName}
                onChange={onNewVisitorChange}
                required
              />
            </div>
            <div>
              <Label>ID/护照号</Label>
              <Input
                name="visitorId"
                value={newVisitor.visitorId}
                onChange={onNewVisitorChange}
                required
              />
            </div>
            <div>
              <Label>邮箱</Label>
              <Input
                name="visitorEmail"
                type="email"
                value={newVisitor.visitorEmail}
                onChange={onNewVisitorChange}
              />
            </div>
            <div>
              <Label>电话</Label>
              <Input
                name="visitorPhone"
                value={newVisitor.visitorPhone}
                onChange={onNewVisitorChange}
              />
            </div>
            <div>
              <Label>公司</Label>
              <Input
                name="visitorCompany"
                value={newVisitor.visitorCompany}
                onChange={onNewVisitorChange}
              />
            </div>
            <div>
              <Label>职位</Label>
              <Input
                name="visitorPosition"
                value={newVisitor.visitorPosition}
                onChange={onNewVisitorChange}
              />
            </div>
          </div>
          <Button onClick={onAddVisitor} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            添加来访者
          </Button>
        </div>

        {/* 按钮 */}
        <div className="flex justify-between gap-4 pt-4">
          <Button variant="outline" onClick={onPrev}>
            上一步
          </Button>
          <Button onClick={onNext} disabled={visitors.length === 0}>
            下一步
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 审核表单
 */
function ReviewForm({
  formData,
  visitors,
  onSubmit,
  onPrev,
  isLoading,
}: {
  formData: any;
  visitors: any[];
  onSubmit: () => void;
  onPrev: () => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>审核申请</CardTitle>
        <CardDescription>请确认您的申请信息</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 基本信息摘要 */}
        <div className="space-y-2">
          <h3 className="font-semibold">基本信息</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">申请者：</span>
              <span className="font-semibold">{formData.applicantName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">来访目的：</span>
              <span className="font-semibold">{formData.visitPurpose}</span>
            </div>
            <div>
              <span className="text-muted-foreground">来访日期：</span>
              <span className="font-semibold">{formData.visitDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground">工厂：</span>
              <span className="font-semibold">{formData.factoryName}</span>
            </div>
          </div>
        </div>

        {/* 来访者摘要 */}
        <div className="space-y-2">
          <h3 className="font-semibold">来访者 ({visitors.length}人)</h3>
          {visitors.map((visitor, index) => (
            <div key={index} className="text-sm p-2 bg-muted rounded">
              {visitor.visitorName} - {visitor.visitorCompany}
            </div>
          ))}
        </div>

        {/* 提示 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            提交申请后，您的申请将被转发给相关审批人员。请确保所有信息准确无误。
          </AlertDescription>
        </Alert>

        {/* 按钮 */}
        <div className="flex justify-between gap-4 pt-4">
          <Button variant="outline" onClick={onPrev} disabled={isLoading}>
            上一步
          </Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading ? '提交中...' : '提交申请'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
