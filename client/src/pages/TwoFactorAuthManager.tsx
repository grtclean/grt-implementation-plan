/**
 * 双因素认证(2FA)管理页面
 * v2.5.23 - TOTP验证码支持，增强安全性
 */

import { useState } from 'react';
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Smartphone,
  Key,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 模拟数据
interface TwoFactorStatus {
  enabled: boolean;
  enforced: boolean;
  remainingBackupCodes: number;
  lastVerifiedAt: number | null;
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export default function TwoFactorAuthManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('status');
  
  // 状态
  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: false,
    enforced: false,
    remainingBackupCodes: 0,
    lastVerifiedAt: null,
  });
  
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // 对话框状态
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [regenerateCode, setRegenerateCode] = useState('');

  // 初始化2FA设置
  const handleSetup = () => {
    // 模拟API调用
    const mockSetupData: SetupData = {
      secret: 'JBSWY3DPEHPK3PXP',
      qrCodeUrl: 'otpauth://totp/GRT-System:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GRT-System',
      backupCodes: [
        'A1B2C3D4',
        'E5F6G7H8',
        'I9J0K1L2',
        'M3N4O5P6',
        'Q7R8S9T0',
        'U1V2W3X4',
        'Y5Z6A7B8',
        'C9D0E1F2',
        'G3H4I5J6',
        'K7L8M9N0',
      ],
    };
    setSetupData(mockSetupData);
    setShowSetupDialog(true);
  };

  // 确认启用2FA
  const handleEnableTwoFactor = () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast({
        title: '验证失败',
        description: '请输入6位验证码',
        variant: 'destructive',
      });
      return;
    }

    // 模拟验证成功
    setStatus({
      ...status,
      enabled: true,
      remainingBackupCodes: 10,
      lastVerifiedAt: Date.now(),
    });
    setShowSetupDialog(false);
    setVerifyCode('');
    
    toast({
      title: '2FA已启用',
      description: '双因素认证已成功启用，请妥善保管备用恢复码',
    });
  };

  // 禁用2FA
  const handleDisableTwoFactor = () => {
    if (!disableCode) {
      toast({
        title: '验证失败',
        description: '请输入验证码或备用码',
        variant: 'destructive',
      });
      return;
    }

    setStatus({
      ...status,
      enabled: false,
      remainingBackupCodes: 0,
      lastVerifiedAt: null,
    });
    setShowDisableDialog(false);
    setDisableCode('');
    
    toast({
      title: '2FA已禁用',
      description: '双因素认证已成功禁用',
    });
  };

  // 重新生成备用码
  const handleRegenerateBackupCodes = () => {
    if (!regenerateCode || regenerateCode.length !== 6) {
      toast({
        title: '验证失败',
        description: '请输入6位验证码',
        variant: 'destructive',
      });
      return;
    }

    // 模拟生成新备用码
    const newBackupCodes = [
      'X1Y2Z3A4',
      'B5C6D7E8',
      'F9G0H1I2',
      'J3K4L5M6',
      'N7O8P9Q0',
      'R1S2T3U4',
      'V5W6X7Y8',
      'Z9A0B1C2',
      'D3E4F5G6',
      'H7I8J9K0',
    ];
    
    if (setupData) {
      setSetupData({
        ...setupData,
        backupCodes: newBackupCodes,
      });
    }
    
    setStatus({
      ...status,
      remainingBackupCodes: 10,
    });
    
    setShowRegenerateDialog(false);
    setRegenerateCode('');
    setShowBackupCodes(true);
    
    toast({
      title: '备用码已重新生成',
      description: '请妥善保管新的备用恢复码',
    });
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    
    toast({
      title: '已复制',
      description: `${type}已复制到剪贴板`,
    });
  };

  // 格式化时间
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '从未';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="双因素认证(2FA)"
        description="使用TOTP验证码增强账户安全性"
        actions={
          <Badge variant={status.enabled ? 'default' : 'secondary'}>
            {status.enabled ? '已启用' : '未启用'}
          </Badge>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status">安全状态</TabsTrigger>
          <TabsTrigger value="backup">备用恢复码</TabsTrigger>
          <TabsTrigger value="settings">高级设置</TabsTrigger>
        </TabsList>

        {/* 安全状态 */}
        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2FA状态卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  验证器应用
                </CardTitle>
                <CardDescription>
                  使用Google Authenticator、Microsoft Authenticator等应用
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">状态</span>
                  <Badge variant={status.enabled ? 'default' : 'outline'}>
                    {status.enabled ? (
                      <><Lock className="w-3 h-3 mr-1" /> 已保护</>
                    ) : (
                      <><Unlock className="w-3 h-3 mr-1" /> 未保护</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">最后验证</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(status.lastVerifiedAt)}
                  </span>
                </div>
                <div className="pt-2">
                  {status.enabled ? (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowDisableDialog(true)}
                    >
                      禁用2FA
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={handleSetup}>
                      <QrCode className="w-4 h-4 mr-2" />
                      设置2FA
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 备用码状态卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  备用恢复码
                </CardTitle>
                <CardDescription>
                  当无法使用验证器时的备用登录方式
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">剩余备用码</span>
                  <Badge variant={status.remainingBackupCodes > 3 ? 'default' : 'destructive'}>
                    {status.remainingBackupCodes} / 10
                  </Badge>
                </div>
                {status.remainingBackupCodes <= 3 && status.enabled && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    备用码即将用尽，建议重新生成
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!status.enabled}
                    onClick={() => setShowRegenerateDialog(true)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新生成备用码
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 安全提示 */}
          <Card>
            <CardHeader>
              <CardTitle>安全提示</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-green-500" />
                  启用2FA后，每次登录都需要输入验证码
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-green-500" />
                  备用恢复码应妥善保管，每个码只能使用一次
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-green-500" />
                  更换手机前请先禁用2FA或导出验证器配置
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500" />
                  丢失验证器和备用码将无法登录，请联系管理员
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 备用恢复码 */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>备用恢复码</CardTitle>
              <CardDescription>
                当无法使用验证器应用时，可以使用备用恢复码登录。每个码只能使用一次。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!status.enabled ? (
                <div className="text-center py-8 text-muted-foreground">
                  请先启用2FA以获取备用恢复码
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label>显示备用码</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBackupCodes(!showBackupCodes)}
                    >
                      {showBackupCodes ? (
                        <><EyeOff className="w-4 h-4 mr-2" /> 隐藏</>
                      ) : (
                        <><Eye className="w-4 h-4 mr-2" /> 显示</>
                      )}
                    </Button>
                  </div>
                  
                  {showBackupCodes && setupData && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {setupData.backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded font-mono text-sm"
                        >
                          <span>{code}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(code, '备用码')}
                          >
                            {copiedCode === code ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (setupData) {
                          copyToClipboard(setupData.backupCodes.join('\n'), '所有备用码');
                        }
                      }}
                      disabled={!showBackupCodes}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      复制全部
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowRegenerateDialog(true)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      重新生成
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 高级设置 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>高级设置</CardTitle>
              <CardDescription>
                配置2FA的高级选项
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>强制启用2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    要求所有管理员必须启用双因素认证
                  </p>
                </div>
                <Switch
                  checked={status.enforced}
                  onCheckedChange={(checked) => {
                    setStatus({ ...status, enforced: checked });
                    toast({
                      title: checked ? '已启用强制2FA' : '已禁用强制2FA',
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 设置2FA对话框 */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>设置双因素认证</DialogTitle>
            <DialogDescription>
              使用验证器应用扫描二维码，然后输入验证码确认
            </DialogDescription>
          </DialogHeader>
          
          {setupData && (
            <div className="space-y-4">
              {/* 二维码占位 */}
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-muted rounded flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-muted-foreground" />
                </div>
              </div>
              
              {/* 密钥 */}
              <div className="space-y-2">
                <Label>手动输入密钥</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={setupData.secret}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(setupData.secret, '密钥')}
                  >
                    {copiedCode === setupData.secret ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* 验证码输入 */}
              <div className="space-y-2">
                <Label>输入验证码</Label>
                <Input
                  placeholder="输入6位验证码"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEnableTwoFactor}>
              确认启用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 禁用2FA对话框 */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>禁用双因素认证</DialogTitle>
            <DialogDescription>
              禁用后账户安全性将降低，请输入验证码或备用码确认
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>验证码或备用码</Label>
              <Input
                placeholder="输入验证码或备用码"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDisableTwoFactor}>
              确认禁用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新生成备用码对话框 */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重新生成备用恢复码</DialogTitle>
            <DialogDescription>
              重新生成后，旧的备用码将失效。请输入验证码确认。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>验证码</Label>
              <Input
                placeholder="输入6位验证码"
                value={regenerateCode}
                onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleRegenerateBackupCodes}>
              确认重新生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
}
