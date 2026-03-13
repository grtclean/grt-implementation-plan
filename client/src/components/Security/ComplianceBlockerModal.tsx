/**
 * ComplianceBlockerModal — 自律承诺书强制阻断门禁
 *
 * 零信任规则:
 *   - 无法通过点击蒙版关闭
 *   - 无法通过 ESC 关闭
 *   - 必须勾选 checkbox + 点击【我承诺并签名】才能解锁
 *   - Layout 全局检查: 未签署则立刻阻断整个工作台
 */
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  FileCheck,
  AlertTriangle,
  Lock,
  Loader2,
} from "lucide-react";

interface ComplianceBlockerModalProps {
  period: string;
  onSigned: () => void;
}

/** 《GRT 信息安全与自律承诺书》全文 */
const COMMITMENT_TEXT_ZH = `
一、信息安全义务
1. 本人承诺严格遵守公司《信息安全管理制度》，不泄露任何客户数据、技术图纸、工艺参数、商业机密等敏感信息。
2. 不通过任何渠道（包括但不限于邮件、即时通讯、云盘、U盘）将公司机密文件传输至个人设备或外部人员。
3. 不在公共场所、社交媒体讨论或展示公司内部系统界面、数据报表、客户信息。

二、行为规范
4. 工作时间内不进行与工作无关的活动，包括但不限于：网络游戏、在线购物、个人项目开发（私活）、炒股交易等。
5. 不利用公司资源（服务器、算力、软件许可）从事任何个人盈利活动。
6. 发现同事存在信息安全违规行为，有义务通过举报箱匿名反馈。

三、系统使用
7. 不尝试绕过系统权限控制，不使用他人账号登录系统。
8. 敏感文件下载将被系统自动添加个人水印并记录审计日志。
9. 凌晨时段（22:00-06:00）的异常操作将被系统标记为高危行为并上报总裁办。

四、违规处罚
10. 违反上述承诺的，公司有权视情节严重程度给予警告、降薪、辞退等处分。
11. 造成公司经济损失的，公司保留追究法律责任的权利。

五、承诺声明
本人已充分阅读并理解以上全部条款，自愿承诺遵守。本承诺书签署后即刻生效，有效期至本月末。
`.trim();

const COMMITMENT_TEXT_EN = `
I. Information Security Obligations
1. I commit to strictly comply with the company's Information Security Management Policy. I will not disclose any customer data, technical drawings, process parameters, or trade secrets.
2. I will not transfer confidential company files to personal devices or external parties through any channel (including but not limited to email, IM, cloud storage, USB drives).
3. I will not discuss or display internal system interfaces, data reports, or customer information in public places or on social media.

II. Code of Conduct
4. During working hours, I will not engage in non-work activities, including but not limited to: online gaming, online shopping, personal side projects, stock trading, etc.
5. I will not use company resources (servers, computing power, software licenses) for any personal profit activities.
6. If I discover information security violations by colleagues, I have a duty to report anonymously through the whistleblower inbox.

III. System Usage
7. I will not attempt to bypass system access controls or use another person's account to log in.
8. Sensitive file downloads will be automatically watermarked and recorded in audit logs.
9. Anomalous operations during late hours (22:00-06:00) will be flagged as high-risk and reported to the Executive Office.

IV. Penalties
10. Violations of the above commitments may result in warnings, salary reduction, or termination at the company's discretion.
11. The company reserves the right to pursue legal action for any financial losses caused.

V. Declaration
I have fully read and understood all the above terms and voluntarily commit to compliance. This commitment takes effect immediately upon signing and is valid until the end of the current month.
`.trim();

export default function ComplianceBlockerModal({ period, onSigned }: ComplianceBlockerModalProps) {
  const { t, language } = useLanguage();
  const [agreed, setAgreed] = useState(false);

  const signMutation = trpc.securityCompliance.signCommitment.useMutation({
    onSuccess: () => {
      onSigned();
    },
  });

  const handleSign = useCallback(() => {
    if (!agreed) return;
    signMutation.mutate({ isAgreed: true });
  }, [agreed, signMutation]);

  const isZh = language === "zh";
  const commitmentText = isZh ? COMMITMENT_TEXT_ZH : COMMITMENT_TEXT_EN;

  return (
    /* Full-screen overlay — cannot be dismissed by click or ESC */
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") e.preventDefault();
      }}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-red-500/30 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-t-lg pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-full">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isZh
                  ? "GRT 信息安全与自律承诺书"
                  : "GRT Information Security & Self-Discipline Commitment"}
              </CardTitle>
              <p className="text-red-100 text-sm mt-1">
                {isZh
                  ? `承诺周期: ${period} | 签署后方可使用工作台`
                  : `Commitment Period: ${period} | Sign to unlock workspace`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-white/20 text-white border-white/30">
              <Lock className="h-3 w-3 mr-1" />
              {isZh ? "强制签署" : "Mandatory"}
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {isZh ? "零信任策略" : "Zero-Trust Policy"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Commitment text */}
          <div className="bg-muted/50 rounded-lg p-4 border max-h-[40vh] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap font-mono">
            {commitmentText}
          </div>

          <Separator />

          {/* Checkbox + Sign button */}
          <div className="space-y-4">
            <label
              className="flex items-start gap-3 cursor-pointer select-none group"
              htmlFor="compliance-agree"
            >
              <Checkbox
                id="compliance-agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-snug group-hover:text-foreground transition-colors">
                {isZh
                  ? "本人已阅读并承诺遵守以上全部条款（同时禁止任何游戏、私活等违规行为）"
                  : "I have read and agree to comply with all the above terms (including prohibition of gaming, side projects, and other violations)"}
              </span>
            </label>

            {signMutation.isError && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                {isZh ? "签署失败，请重试" : "Signing failed, please retry"}
              </div>
            )}

            <Button
              onClick={handleSign}
              disabled={!agreed || signMutation.isPending}
              className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isZh ? "签署中..." : "Signing..."}
                </>
              ) : (
                <>
                  <FileCheck className="h-5 w-5 mr-2" />
                  {isZh ? "我承诺并签名" : "I Commit & Sign"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
