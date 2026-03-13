// server/services/microsoft-graph/teams.service.ts
// Teams 消息服务 - 连接 Microsoft Teams

import { graphConfig, graphRequest, isGraphConfigured } from "./config";
import type { TeamsMessage } from "@shared/types/grt-system";

// Graph API Teams 聊天类型
interface GraphChat {
  id: string;
  topic: string;
  chatType: string;
  lastUpdatedDateTime: string;
}

interface GraphMessage {
  id: string;
  createdDateTime: string;
  body: {
    content: string;
    contentType: string;
  };
  from?: {
    user?: {
      displayName: string;
      id: string;
    };
  };
  importance: string;
  mentions?: Array<{
    mentioned: {
      user: {
        displayName: string;
        id: string;
      };
    };
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    contentType: string;
    contentUrl: string;
  }>;
}

interface GraphChatsResponse {
  value: GraphChat[];
}

interface GraphMessagesResponse {
  value: GraphMessage[];
}

// 获取最近的 Teams 消息
export async function getRecentMessages(userId?: string, limit: number = 10): Promise<TeamsMessage[]> {
  if (!isGraphConfigured()) {
    return getMockMessages();
  }

  // 获取聊天列表
  const chatsResponse = await graphRequest<GraphChatsResponse>(
    `${graphConfig.endpoints.teams}?$top=5&$orderby=lastUpdatedDateTime desc`
  );

  if (!chatsResponse) {
    return getMockMessages();
  }

  const messages: TeamsMessage[] = [];

  // 从每个聊天获取最新消息
  for (const chat of chatsResponse.value) {
    const messagesEndpoint = graphConfig.endpoints.teamsMessages.replace("{chatId}", chat.id);
    const messagesResponse = await graphRequest<GraphMessagesResponse>(
      `${messagesEndpoint}?$top=3&$orderby=createdDateTime desc`
    );

    if (messagesResponse) {
      messages.push(...messagesResponse.value.map(msg => transformGraphMessage(msg, chat)));
    }
  }

  // 按时间排序并限制数量
  return messages
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// 获取未读消息数量
export async function getUnreadCount(userId?: string): Promise<{ total: number; mentions: number }> {
  if (!isGraphConfigured()) {
    return { total: 2, mentions: 1 };
  }

  // Graph API 需要额外的权限来获取未读计数
  // 这里返回模拟数据
  return { total: 2, mentions: 1 };
}

// 发送 Teams 消息
export async function sendMessage(chatId: string, content: string): Promise<TeamsMessage | null> {
  if (!isGraphConfigured()) {
    return null;
  }

  const messagesEndpoint = graphConfig.endpoints.teamsMessages.replace("{chatId}", chatId);
  
  const response = await graphRequest<GraphMessage>(messagesEndpoint, {
    method: "POST",
    body: JSON.stringify({
      body: {
        content: content,
        contentType: "text",
      },
    }),
  });

  if (!response) {
    return null;
  }

  return transformGraphMessage(response, { id: chatId, topic: "", chatType: "oneOnOne", lastUpdatedDateTime: "" });
}

// 转换 Graph API 消息为应用消息格式
function transformGraphMessage(graphMessage: GraphMessage, chat: GraphChat): TeamsMessage {
  const isMention = graphMessage.mentions && graphMessage.mentions.length > 0;
  
  return {
    id: graphMessage.id,
    chatId: chat.id,
    chatName: chat.topic || "直接消息",
    chatType: chat.chatType as 'oneOnOne' | 'group' | 'meeting',
    content: stripHtmlTags(graphMessage.body.content),
    timestamp: graphMessage.createdDateTime,
    sender: graphMessage.from?.user ? {
      name: graphMessage.from.user.displayName,
      id: graphMessage.from.user.id,
    } : undefined,
    importance: graphMessage.importance as 'normal' | 'high' | 'urgent',
    isMention,
    isRead: false, // Graph API 需要额外权限
    attachments: graphMessage.attachments?.map(a => ({
      id: a.id,
      name: a.name,
      contentType: a.contentType,
      url: a.contentUrl,
    })),
  };
}

// 移除 HTML 标签
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// 模拟数据（当 Graph API 未配置时使用）
function getMockMessages(): TeamsMessage[] {
  const now = new Date();
  
  return [
    {
      id: "mock-msg-1",
      chatId: "chat-1",
      chatName: "项目团队",
      chatType: "group",
      content: "请大家在下午3点前提交本周的工作进度报告",
      timestamp: new Date(now.getTime() - 30 * 60000).toISOString(),
      sender: {
        name: "杨勇",
        id: "user-1",
      },
      importance: "high",
      isMention: true,
      isRead: false,
    },
    {
      id: "mock-msg-2",
      chatId: "chat-2",
      chatName: "李四",
      chatType: "oneOnOne",
      content: "设计稿已经更新，请查收",
      timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
      sender: {
        name: "李四",
        id: "user-2",
      },
      importance: "normal",
      isMention: false,
      isRead: false,
      attachments: [
        {
          id: "att-1",
          name: "设计稿v2.pdf",
          contentType: "application/pdf",
          url: "#",
        },
      ],
    },
    {
      id: "mock-msg-3",
      chatId: "chat-1",
      chatName: "项目团队",
      chatType: "group",
      content: "明天的会议改到上午10点",
      timestamp: new Date(now.getTime() - 2 * 60 * 60000).toISOString(),
      sender: {
        name: "张三",
        id: "user-3",
      },
      importance: "normal",
      isMention: false,
      isRead: true,
    },
  ];
}

export const teamsService = {
  getRecentMessages,
  getUnreadCount,
  sendMessage,
};
