/**
 * v2.5.40 Webhook测试端点
 * 模拟企业微信/钉钉群机器人接收消息
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { jsonValue } from "../shared/validators";

// 存储接收到的Webhook消息（用于测试验证）
const receivedMessages: Array<{
  id: string;
  timestamp: Date;
  webhookType: string;
  payload: any;
  headers: Record<string, string>;
}> = [];

// 最多保留100条消息
const MAX_MESSAGES = 100;

export const webhookTestRouter = router({
  // 模拟接收Webhook消息
  receiveWebhook: protectedProcedure
    .input(z.object({
      webhookType: z.enum(["wecom", "dingtalk", "feishu", "custom"]),
      payload: z.record(z.string(), jsonValue),
      headers: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const message: typeof receivedMessages[number] = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        webhookType: input.webhookType,
        payload: input.payload,
        headers: (input.headers || {}) as Record<string, string>,
      };

      receivedMessages.unshift(message);

      // 保持消息数量在限制内
      if (receivedMessages.length > MAX_MESSAGES) {
        receivedMessages.pop();
      }

      console.log(`[Webhook Test] Received ${input.webhookType} message:`, JSON.stringify(input.payload, null, 2));

      return {
        success: true,
        messageId: message.id,
        timestamp: message.timestamp,
      };
    }),

  // 获取接收到的消息列表
  getReceivedMessages: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      webhookType: z.enum(["wecom", "dingtalk", "feishu", "custom", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      let messages = receivedMessages;

      if (input.webhookType !== "all") {
        messages = messages.filter(m => m.webhookType === input.webhookType);
      }

      return {
        total: messages.length,
        messages: messages.slice(0, input.limit),
      };
    }),

  // 清空测试消息
  clearMessages: protectedProcedure
    .mutation(async () => {
      const count = receivedMessages.length;
      receivedMessages.length = 0;

      return {
        success: true,
        clearedCount: count,
      };
    }),

  // 获取测试端点URL
  getTestEndpointUrl: protectedProcedure
    .query(async () => {
      // 返回测试端点的URL信息
      return {
        wecom: "/api/trpc/webhookTest.receiveWebhook?webhookType=wecom",
        dingtalk: "/api/trpc/webhookTest.receiveWebhook?webhookType=dingtalk",
        feishu: "/api/trpc/webhookTest.receiveWebhook?webhookType=feishu",
        custom: "/api/trpc/webhookTest.receiveWebhook?webhookType=custom",
        description: "这些是测试端点URL，用于模拟接收Webhook消息。在实际部署时，请替换为真实的企业微信/钉钉群机器人URL。",
      };
    }),

  // 模拟发送Gate检查结果通知
  simulateGateCheckNotification: protectedProcedure
    .input(z.object({
      projectCode: z.string(),
      projectName: z.string(),
      gateStage: z.enum(["M7", "M8", "M9"]),
      checkResult: z.enum(["passed", "failed", "conditional"]),
      score: z.number().min(0).max(100),
      failedItems: z.array(z.string()).optional(),
      recommendations: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      // 构建通知消息
      const statusEmoji = input.checkResult === "passed" ? "✅" : 
                          input.checkResult === "conditional" ? "⚠️" : "❌";
      const statusText = input.checkResult === "passed" ? "通过" :
                         input.checkResult === "conditional" ? "有条件通过" : "未通过";

      // 企业微信格式
      const wecomMessage = {
        msgtype: "markdown",
        markdown: {
          content: `### ${statusEmoji} Gate检查结果通知\n\n` +
            `**项目**: ${input.projectName} (${input.projectCode})\n` +
            `**阶段**: ${input.gateStage}\n` +
            `**结果**: ${statusText}\n` +
            `**得分**: ${input.score}分\n\n` +
            (input.failedItems?.length ? `**未通过项**:\n${input.failedItems.map(i => `- ${i}`).join('\n')}\n\n` : '') +
            (input.recommendations?.length ? `**建议**:\n${input.recommendations.map(r => `- ${r}`).join('\n')}` : ''),
        },
      };

      // 钉钉格式
      const dingtalkMessage = {
        msgtype: "markdown",
        markdown: {
          title: `${statusEmoji} ${input.gateStage} Gate检查结果`,
          text: `### ${statusEmoji} Gate检查结果通知\n\n` +
            `**项目**: ${input.projectName} (${input.projectCode})\n\n` +
            `**阶段**: ${input.gateStage}\n\n` +
            `**结果**: ${statusText}\n\n` +
            `**得分**: ${input.score}分\n\n` +
            (input.failedItems?.length ? `**未通过项**:\n\n${input.failedItems.map(i => `- ${i}`).join('\n\n')}\n\n` : '') +
            (input.recommendations?.length ? `**建议**:\n\n${input.recommendations.map(r => `- ${r}`).join('\n\n')}` : ''),
        },
        at: {
          isAtAll: input.checkResult === "failed", // 未通过时@所有人
        },
      };

      // 存储模拟消息
      const wecomMsg = {
        id: `sim_wecom_${Date.now()}`,
        timestamp: new Date(),
        webhookType: "wecom",
        payload: wecomMessage,
        headers: {},
      };
      const dingtalkMsg = {
        id: `sim_dingtalk_${Date.now()}`,
        timestamp: new Date(),
        webhookType: "dingtalk",
        payload: dingtalkMessage,
        headers: {},
      };

      receivedMessages.unshift(wecomMsg, dingtalkMsg);

      return {
        success: true,
        simulatedMessages: {
          wecom: wecomMsg.id,
          dingtalk: dingtalkMsg.id,
        },
        preview: {
          wecom: wecomMessage,
          dingtalk: dingtalkMessage,
        },
      };
    }),

  // 模拟发送AI诊断建议通知
  simulateAIDiagnosisNotification: protectedProcedure
    .input(z.object({
      projectCode: z.string(),
      projectName: z.string(),
      issueType: z.string(),
      severity: z.enum(["Critical", "High", "Medium", "Low"]),
      diagnosis: z.string(),
      recommendations: z.array(z.string()),
      estimatedResolutionTime: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const severityEmoji = {
        Critical: "🔴",
        High: "🟠",
        Medium: "🟡",
        Low: "🟢",
      }[input.severity];

      // 企业微信格式
      const wecomMessage = {
        msgtype: "markdown",
        markdown: {
          content: `### ${severityEmoji} AI诊断建议\n\n` +
            `**项目**: ${input.projectName} (${input.projectCode})\n` +
            `**问题类型**: ${input.issueType}\n` +
            `**严重程度**: ${input.severity}\n\n` +
            `**诊断结果**:\n${input.diagnosis}\n\n` +
            `**建议措施**:\n${input.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n` +
            (input.estimatedResolutionTime ? `**预计解决时间**: ${input.estimatedResolutionTime}` : ''),
        },
      };

      // 钉钉格式
      const dingtalkMessage = {
        msgtype: "markdown",
        markdown: {
          title: `${severityEmoji} AI诊断建议 - ${input.issueType}`,
          text: `### ${severityEmoji} AI诊断建议\n\n` +
            `**项目**: ${input.projectName} (${input.projectCode})\n\n` +
            `**问题类型**: ${input.issueType}\n\n` +
            `**严重程度**: ${input.severity}\n\n` +
            `**诊断结果**:\n\n${input.diagnosis}\n\n` +
            `**建议措施**:\n\n${input.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n\n')}\n\n` +
            (input.estimatedResolutionTime ? `**预计解决时间**: ${input.estimatedResolutionTime}` : ''),
        },
        at: {
          isAtAll: input.severity === "Critical",
        },
      };

      // 存储模拟消息
      const wecomMsg = {
        id: `sim_ai_wecom_${Date.now()}`,
        timestamp: new Date(),
        webhookType: "wecom",
        payload: wecomMessage,
        headers: {},
      };
      const dingtalkMsg = {
        id: `sim_ai_dingtalk_${Date.now()}`,
        timestamp: new Date(),
        webhookType: "dingtalk",
        payload: dingtalkMessage,
        headers: {},
      };

      receivedMessages.unshift(wecomMsg, dingtalkMsg);

      return {
        success: true,
        simulatedMessages: {
          wecom: wecomMsg.id,
          dingtalk: dingtalkMsg.id,
        },
        preview: {
          wecom: wecomMessage,
          dingtalk: dingtalkMessage,
        },
      };
    }),
});
