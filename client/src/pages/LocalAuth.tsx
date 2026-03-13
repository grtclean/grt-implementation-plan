/**
 * 本地用户认证页面
 * v2.5.22 - 用户名密码登录/注册
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Shield, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Lock,
  Mail,
  User
} from 'lucide-react';

interface LoginFormData {
  username: string;
  password: string;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

export default function LocalAuth() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 登录表单
  const [loginForm, setLoginForm] = useState<LoginFormData>({
    username: '',
    password: '',
  });

  // 注册表单
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // 密码验证状态
  const validatePassword = (password: string): PasswordValidation => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  });

  const passwordValidation = validatePassword(registerForm.password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = registerForm.password === registerForm.confirmPassword && registerForm.confirmPassword.length > 0;

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 这里应该调用实际的登录API
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(loginForm),
      // });
      
      setMessage({ type: 'success', text: t('auth.loginSuccessRedirect') });
      
      // 模拟跳转
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: t('auth.loginFailedMsg') });
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setMessage({ type: 'error', text: t('auth.pwdNotSecure') });
      return;
    }
    
    if (!passwordsMatch) {
      setMessage({ type: 'error', text: t('auth.pwdNotMatch') });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 这里应该调用实际的注册API
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     username: registerForm.username,
      //     email: registerForm.email,
      //     password: registerForm.password,
      //   }),
      // });
      
      setMessage({ type: 'success', text: t('auth.registerSuccessLogin') });
      setActiveTab('login');
      setLoginForm({ username: registerForm.username, password: '' });
    } catch (error) {
      setMessage({ type: 'error', text: t('auth.registerFailedMsg') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("auth.localTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("auth.localVersion")}</p>
        </div>

        {/* 消息提示 */}
        {message && (
          <Alert className={`mb-4 ${message.type === 'success' ? 'border-green-500' : 'border-destructive'}`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-destructive'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* 登录/注册卡片 */}
        <Card className="border-border/50 shadow-lg">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {t("auth.login")}
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {t("auth.register")}
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {/* 登录表单 */}
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">{t("auth.usernameOrEmail")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-username"
                        type="text"
                        placeholder={t("auth.usernameOrEmailPlaceholder")}
                        className="pl-10"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t("auth.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t("auth.passwordPlaceholder")}
                        className="pl-10 pr-10"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("auth.loggingIn")}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        {t("auth.loginBtn")}
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <p>{t("auth.defaultAdmin")}</p>
                </div>
              </TabsContent>

              {/* 注册表单 */}
              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">{t("auth.username")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-username"
                        type="text"
                        placeholder={t("auth.registerUsernamePlaceholder")}
                        className="pl-10"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                        required
                        minLength={3}
                        maxLength={20}
                        pattern="^[a-zA-Z0-9_]+$"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder={t("auth.registerEmailPlaceholder")}
                        className="pl-10"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t("auth.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t("auth.passwordSetPlaceholder")}
                        className="pl-10 pr-10"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* 密码强度指示器 */}
                    {registerForm.password && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex items-center gap-1 text-xs">
                          {passwordValidation.minLength ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className={passwordValidation.minLength ? 'text-green-600' : 'text-muted-foreground'}>
                            {t("auth.pwdMinLength")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {passwordValidation.hasUppercase ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className={passwordValidation.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}>
                            {t("auth.pwdUppercase")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {passwordValidation.hasLowercase ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className={passwordValidation.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}>
                            {t("auth.pwdLowercase")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {passwordValidation.hasNumber ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className={passwordValidation.hasNumber ? 'text-green-600' : 'text-muted-foreground'}>
                            {t("auth.pwdNumber")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">{t("auth.confirmPasswordField")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t("auth.confirmPasswordPlaceholder2")}
                        className="pl-10 pr-10"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {registerForm.confirmPassword && (
                      <div className="flex items-center gap-1 text-xs mt-1">
                        {passwordsMatch ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="text-green-600">{t("auth.pwdMatch")}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-destructive" />
                            <span className="text-destructive">{t("auth.pwdMismatch")}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !isPasswordValid || !passwordsMatch}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("auth.registering")}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t("auth.registerBtn")}
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* 底部信息 */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>{t("auth.localFooter")}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">Windows 11</Badge>
            <Badge variant="outline" className="text-xs">MySQL 8.0</Badge>
            <Badge variant="outline" className="text-xs">Node.js 22</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
