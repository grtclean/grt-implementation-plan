import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Search, 
  Award, 
  Calendar, 
  User, 
  Star,
  AlertTriangle,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

export default function CertificateVerify() {
  const { t } = useLanguage();
  const params = useParams<{ certificateNumber?: string }>();
  const [, setLocation] = useLocation();
  
  const [searchNumber, setSearchNumber] = useState(params.certificateNumber || "");
  const [verifyNumber, setVerifyNumber] = useState(params.certificateNumber || "");

  // 验证证书查询
  const { data: verificationResult, isLoading, refetch } = trpc.capabilityOs.verifyCertificateByQR.useQuery(
    { certificateNumber: verifyNumber },
    { enabled: !!verifyNumber }
  );

  // 如果URL中有证书编号，自动验证
  useEffect(() => {
    if (params.certificateNumber) {
      setSearchNumber(params.certificateNumber);
      setVerifyNumber(params.certificateNumber);
    }
  }, [params.certificateNumber]);

  const handleSearch = () => {
    if (searchNumber.trim()) {
      setVerifyNumber(searchNumber.trim());
      setLocation(`/certificate-verify/${searchNumber.trim()}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 获取能力域颜色
  const getDomainColor = (domainCode: string) => {
    const colors: Record<string, string> = {
      T: "bg-blue-500",
      S: "bg-purple-500",
      D: "bg-green-500",
      C: "bg-orange-500",
      K: "bg-cyan-500",
      L: "bg-pink-500",
    };
    return colors[domainCode] || "bg-gray-500";
  };

  // 获取等级颜色
  const getLevelColor = (level: number) => {
    const colors: Record<number, string> = {
      1: "text-gray-500",
      2: "text-green-500",
      3: "text-blue-500",
      4: "text-purple-500",
      5: "text-yellow-500",
    };
    return colors[level] || "text-gray-500";
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <Link href="/capability-certificates">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回证书列表
          </Button>
        </Link>

        {/* 页面标题 */}
        <PageHeader
          icon={Shield}
          title="能力证书验证"
          description="输入证书编号或扫描证书上的二维码，验证证书真伪"
        />

        {/* 搜索框 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="请输入证书编号，如：CERT-T-L3-20260126-ABC123"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "验证"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 验证结果 */}
        {verifyNumber && (
          <Card className={`border-2 ${
            isLoading 
              ? "border-muted" 
              : verificationResult?.valid 
                ? "border-green-500" 
                : "border-red-500"
          }`}>
            <CardHeader className="text-center pb-2">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
                  <CardTitle>正在验证...</CardTitle>
                </div>
              ) : verificationResult?.valid ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <CardTitle className="text-green-500">证书验证通过</CardTitle>
                  <CardDescription>{(verificationResult as any).message}</CardDescription>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    {verificationResult?.certificate?.status === "revoked" ? (
                      <AlertTriangle className="w-10 h-10 text-red-500" />
                    ) : (
                      <XCircle className="w-10 h-10 text-red-500" />
                    )}
                  </div>
                  <CardTitle className="text-red-500">证书验证失败</CardTitle>
                  <CardDescription className="text-red-400">
                    {(verificationResult as any)?.message || "无法验证此证书"}
                  </CardDescription>
                </div>
              )}
            </CardHeader>

            {verificationResult?.certificate && (
              <CardContent className="pt-4">
                <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                  {/* 证书编号 */}
                  <div className="text-center pb-4 border-b border-border">
                    <p className="text-sm text-muted-foreground">证书编号</p>
                    <p className="font-mono text-lg font-bold">
                      {verificationResult.certificate.certificateNumber}
                    </p>
                  </div>

                  {/* 证书详情 */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* 持证人 */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">持证人</p>
                        <p className="font-medium">{verificationResult.certificate.userName}</p>
                      </div>
                    </div>

                    {/* 能力域 */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${getDomainColor(verificationResult.certificate.domainCode)} flex items-center justify-center text-white font-bold`}>
                        {verificationResult.certificate.domainCode}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">能力域</p>
                        <p className="font-medium">{verificationResult.certificate.domainName}</p>
                      </div>
                    </div>

                    {/* 能力等级 */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Star className={`w-5 h-5 ${getLevelColor(verificationResult.certificate.level)}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">能力等级</p>
                        <p className={`font-medium ${getLevelColor(verificationResult.certificate.level)}`}>
                          {verificationResult.certificate.levelName}
                        </p>
                      </div>
                    </div>

                    {/* 能力积分 */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Award className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">能力积分</p>
                        <p className="font-medium">{verificationResult.certificate.totalPoints} 分</p>
                      </div>
                    </div>

                    {/* 颁发日期 */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">颁发日期</p>
                        <p className="font-medium">
                          {new Date(verificationResult.certificate.issueDate).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>

                    {/* 证书状态 */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">证书状态</p>
                        <Badge variant={
                          verificationResult.certificate.status === "active" ? "default" :
                          verificationResult.certificate.status === "revoked" ? "destructive" :
                          "secondary"
                        }>
                          {verificationResult.certificate.status === "active" ? "有效" :
                           verificationResult.certificate.status === "revoked" ? "已撤销" :
                           verificationResult.certificate.status === "expired" ? "已过期" :
                           verificationResult.certificate.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* 有效期 */}
                  {verificationResult.certificate.expiryDate && (
                    <div className="pt-4 border-t border-border text-center">
                      <p className="text-sm text-muted-foreground">
                        有效期至：{new Date(verificationResult.certificate.expiryDate).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">验证说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>1. 扫码验证：</strong>使用手机扫描证书上的二维码，将自动跳转到本页面进行验证。
            </p>
            <p>
              <strong>2. 手动验证：</strong>在上方输入框中输入证书编号，点击"验证"按钮进行验证。
            </p>
            <p>
              <strong>3. 验证结果：</strong>系统将显示证书的真伪状态、持证人信息、能力等级等详细信息。
            </p>
            <p className="text-yellow-500">
              <strong>注意：</strong>如发现伪造证书，请立即联系管理员举报。
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
