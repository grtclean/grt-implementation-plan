import { invokeLLM } from '../_core/llm';

/**
 * 会议处理器服务
 * 负责自动生成会议纪要、提取行动项、生成AI洞察
 */

export interface MeetingData {
  title: string;
  date: string;
  participants: string[];
  duration: number; // 秒
  notes: string;
  agendas: Array<{
    title: string;
    duration: number;
    status: 'completed' | 'pending' | 'in-progress';
  }>;
}

export interface ProcessedMeeting {
  title: string;
  date: string;
  participants: string[];
  duration: string;
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    title: string;
    owner?: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    description?: string;
  }>;
  decisions: string[];
  nextSteps: string[];
  aiInsights: Array<{
    type: 'summary' | 'keypoint' | 'action' | 'decision';
    content: string;
    confidence: number;
  }>;
}

/**
 * 处理会议数据并生成结构化输出
 */
export async function processMeeting(meetingData: MeetingData): Promise<ProcessedMeeting> {
  // 构建提示词
  const prompt = buildMeetingPrompt(meetingData);

  // 调用Gemini生成结构化分析
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `你是一个专业的会议记录分析助手。你的任务是分析会议笔记，提取关键信息，生成结构化的会议纪要。
        
请按照以下JSON格式返回结果（必须是有效的JSON）：
{
  "summary": "会议总结（2-3句话）",
  "keyPoints": ["关键点1", "关键点2", "关键点3"],
  "actionItems": [
    {
      "title": "行动项标题",
      "owner": "负责人",
      "dueDate": "截止日期（YYYY-MM-DD格式）",
      "priority": "high|medium|low",
      "description": "详细描述"
    }
  ],
  "decisions": ["决策1", "决策2"],
  "nextSteps": ["下一步1", "下一步2"],
  "insights": [
    {
      "type": "summary|keypoint|action|decision",
      "content": "洞察内容",
      "confidence": 0.95
    }
  ]
}`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'meeting_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } },
            actionItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  owner: { type: 'string' },
                  dueDate: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                  description: { type: 'string' },
                },
                required: ['title', 'priority'],
                additionalProperties: false,
              },
            },
            decisions: { type: 'array', items: { type: 'string' } },
            nextSteps: { type: 'array', items: { type: 'string' } },
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['summary', 'keypoint', 'action', 'decision'] },
                  content: { type: 'string' },
                  confidence: { type: 'number' },
                },
                required: ['type', 'content', 'confidence'],
                additionalProperties: false,
              },
            },
          },
          required: ['summary', 'keyPoints', 'actionItems', 'decisions', 'nextSteps', 'insights'],
          additionalProperties: false,
        },
      },
    },
  });

  // 解析响应
  const content = response.choices[0].message.content;
  let analysisData;

  try {
    analysisData = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    throw new Error('Failed to parse meeting analysis response');
  }

  // 构建最终结果
  const processed: ProcessedMeeting = {
    title: meetingData.title,
    date: meetingData.date,
    participants: meetingData.participants,
    duration: formatDuration(meetingData.duration),
    summary: analysisData.summary,
    keyPoints: analysisData.keyPoints,
    actionItems: analysisData.actionItems.map((item: any) => ({
      title: item.title,
      owner: item.owner || '待分配',
      dueDate: item.dueDate || addDays(meetingData.date, 3),
      priority: item.priority || 'medium',
      description: item.description,
    })),
    decisions: analysisData.decisions,
    nextSteps: analysisData.nextSteps,
    aiInsights: analysisData.insights.map((insight: any) => ({
      type: insight.type,
      content: insight.content,
      confidence: insight.confidence,
    })),
  };

  return processed;
}

/**
 * 生成会议分析提示词
 */
function buildMeetingPrompt(meetingData: MeetingData): string {
  const agendaText = meetingData.agendas
    .map((a, i) => `${i + 1}. ${a.title} (${a.duration}分钟) - ${a.status}`)
    .join('\n');

  return `
请分析以下会议信息，并提取关键内容：

**会议基本信息**
- 标题: ${meetingData.title}
- 日期: ${meetingData.date}
- 参会人员: ${meetingData.participants.join(', ')}
- 会议时长: ${formatDuration(meetingData.duration)}

**议程**
${agendaText}

**会议笔记**
${meetingData.notes}

请根据上述信息：
1. 生成会议总结（2-3句话）
2. 提取3-5个关键点
3. 识别所有行动项（包括标题、负责人、截止日期、优先级）
4. 记录重要决策
5. 列出下一步行动
6. 提供AI洞察（包括信心度0-1）

请确保返回有效的JSON格式。
`;
}

/**
 * 格式化时间
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0 && parts.length === 0) parts.push(`${secs}秒`);

  return parts.join(' ');
}

/**
 * 添加天数
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * 生成Markdown格式的会议纪要
 */
export function generateMarkdownMinutes(meeting: ProcessedMeeting): string {
  return `# ${meeting.title}

## 会议信息
- **日期**: ${meeting.date}
- **参会人员**: ${meeting.participants.join(', ')}
- **会议时长**: ${meeting.duration}

## 会议总结
${meeting.summary}

## 关键点
${meeting.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

## 重要决策
${meeting.decisions.map((decision, i) => `${i + 1}. ${decision}`).join('\n')}

## 行动项
${meeting.actionItems
  .map(
    (item, i) => `
### ${i + 1}. ${item.title}
- **负责人**: ${item.owner}
- **截止日期**: ${item.dueDate}
- **优先级**: ${item.priority === 'high' ? '🔴 高' : item.priority === 'medium' ? '🟡 中' : '🟢 低'}
- **描述**: ${item.description || '无'}
`
  )
  .join('\n')}

## 下一步行动
${meeting.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## AI洞察
${meeting.aiInsights
  .map(
    (insight) => `
- **${insight.type === 'summary' ? '摘要' : insight.type === 'keypoint' ? '关键点' : insight.type === 'action' ? '行动' : '决策'}** (信心度: ${Math.round(insight.confidence * 100)}%)
  ${insight.content}
`
  )
  .join('\n')}

---
生成时间: ${new Date().toLocaleString('zh-CN')}
`;
}

/**
 * 生成JSON格式的会议数据
 */
export function generateMeetingJSON(meeting: ProcessedMeeting): string {
  return JSON.stringify(meeting, null, 2);
}
