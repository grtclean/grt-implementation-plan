/**
 * H5客户签字确认页面
 *
 * 功能：
 * 1. 验证签字链接Token
 * 2. 显示服务工单信息
 * 3. 手写签名
 * 4. 服务评分和反馈
 */

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle, Star, Eraser, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CustomerSignature() {
  const { t } = useLanguage();
  const params = useParams<{ token: string }>();
  const token = params.token || '';

  const [signerName, setSignerName] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // 验证Token并获取工单信息
  const { data: tokenData, isLoading, error } = (trpc.afterSales.signature as any).validateToken.useQuery(
    { token },
    { enabled: !!token }
  );

  // 提交签字
  const submitMutation = (trpc.afterSales.signature as any).submit.useMutation({
    onSuccess: () => {
      setSubmitSuccess(true);
    },
    onError: (error: any) => {
      alert(error.message || t("crm.signature.submitFailed"));
    }
  });

  // 初始化Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置Canvas尺寸
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // 设置绘制样式
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 填充白色背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [tokenData]);

  // 绘制事件处理
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!signerName.trim()) {
      alert(t("crm.signature.enterSignerName"));
      return;
    }

    if (!hasSignature) {
      alert(t("crm.signature.pleaseSign"));
      return;
    }

    if (rating === 0) {
      alert(t("crm.signature.selectRating"));
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSubmitting(true);

    try {
      const signatureData = canvas.toDataURL('image/png');

      await submitMutation.mutateAsync({
        token,
        signerName: signerName.trim(),
        signatureData,
        rating,
        feedback: feedback.trim() || undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">{t("crm.signature.verifyingLink")}</p>
        </div>
      </div>
    );
  }

  // 验证失败
  if (error || !tokenData?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("crm.signature.linkInvalid")}</h2>
            <p className="text-muted-foreground">
              {tokenData?.error || t("crm.signature.linkExpiredMessage")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 提交成功
  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("crm.signature.submitSuccessTitle")}</h2>
            <p className="text-muted-foreground">
              {t("crm.signature.submitSuccessMessage")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serviceLog = tokenData.serviceLog;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* 服务信息卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("crm.signature.serviceConfirmation")}</CardTitle>
            <CardDescription>{t("crm.signature.ticketNumber")}: {serviceLog.ticketId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t("crm.signature.client")}:</span>
                <p className="font-medium">{serviceLog.clientName || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("crm.signature.equipment")}:</span>
                <p className="font-medium">{serviceLog.equipmentInfo || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("crm.signature.serviceType")}:</span>
                <p className="font-medium">{serviceLog.serviceType || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("crm.signature.serviceDate")}:</span>
                <p className="font-medium">
                  {serviceLog.serviceDate ? new Date(serviceLog.serviceDate).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("crm.signature.engineer")}:</span>
                <p className="font-medium">{serviceLog.engineerName || '-'}</p>
              </div>
            </div>

            {serviceLog.issueDescription && (
              <div>
                <span className="text-muted-foreground text-sm">{t("crm.signature.issueDescription")}:</span>
                <p className="text-sm mt-1">{serviceLog.issueDescription}</p>
              </div>
            )}

            {serviceLog.resolution && (
              <div>
                <span className="text-muted-foreground text-sm">{t("crm.signature.resolution")}:</span>
                <p className="text-sm mt-1">{serviceLog.resolution}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 签字表单 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("crm.signature.customerConfirmation")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 签字人姓名 */}
            <div className="space-y-2">
              <Label htmlFor="signerName">{t("crm.signature.signerName")} *</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder={t("crm.signature.enterYourName")}
              />
            </div>

            {/* 服务评分 */}
            <div className="space-y-2">
              <Label>{t("crm.signature.serviceRating")} *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {rating === 0 && t("crm.signature.ratingPrompt")}
                {rating === 1 && t("crm.signature.rating1")}
                {rating === 2 && t("crm.signature.rating2")}
                {rating === 3 && t("crm.signature.rating3")}
                {rating === 4 && t("crm.signature.rating4")}
                {rating === 5 && t("crm.signature.rating5")}
              </p>
            </div>

            {/* 手写签名 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("crm.signature.handwrittenSignature")} *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                >
                  <Eraser className="w-4 h-4 mr-1" />
                  {t("crm.signature.clear")}
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-32 touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("crm.signature.signatureHint")}
              </p>
            </div>

            {/* 反馈意见 */}
            <div className="space-y-2">
              <Label htmlFor="feedback">{t("crm.signature.feedbackOptional")}</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={t("crm.signature.feedbackPlaceholder")}
                rows={3}
              />
            </div>

            {/* 提交按钮 */}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("crm.signature.submitting")}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t("crm.signature.confirmSubmit")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 底部说明 */}
        <p className="text-xs text-center text-muted-foreground">
          {t("crm.signature.footer")}
        </p>
      </div>
    </div>
  );
}
