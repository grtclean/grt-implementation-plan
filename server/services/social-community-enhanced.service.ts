/**
 * 社群管理增强服务
 * 功能：消息脱敏规则配置、AI回复模板管理、消息统计分析、群成员画像
 */

import { requireDb } from "../db";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("social-community-svc");

// ==================== 内部类型（raw SQL executor） ====================

/** mysql2-style execute result: [rows, fields] */
interface RawDb {
  execute(sql: string, params?: unknown[]): Promise<[unknown[], unknown]>;
}

interface InsertResult {
  insertId: number;
}

interface CountRow {
  total: number;
}

interface HourCountRow {
  hour: number;
  count: number;
}

interface GroupCountRow {
  group_id: number;
  group_name: string | null;
  count: number;
}

interface MemberRow {
  id: number;
  wx_id: string;
  name: string | null;
  group_id: number;
  group_name: string | null;
  role: string | null;
  message_count: number;
  last_active_at: Date | null;
  [key: string]: unknown;
}

interface AvgRow {
  avg_per_day: number | null;
}

interface ContributorRow {
  name: string;
  message_count: number;
}

// ==================== 脱敏规则管理 ====================

export interface DeidentificationRule {
  id: number;
  name: string;
  pattern: string;
  patternType: 'keyword' | 'regex' | 'ai_detect';
  replacement: string;
  category: 'price' | 'formula' | 'personal' | 'business' | 'custom';
  priority: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取所有脱敏规则
 */
export async function getDeidentificationRules(options?: {
  category?: string;
  isEnabled?: boolean;
}): Promise<DeidentificationRule[]> {
  const db = await requireDb();
  let query = `SELECT * FROM deidentification_rules WHERE 1=1`;
  const params: unknown[] = [];
  
  if (options?.category) {
    query += ` AND category = ?`;
    params.push(options.category);
  }
  if (options?.isEnabled !== undefined) {
    query += ` AND is_enabled = ?`;
    params.push(options.isEnabled);
  }
  
  query += ` ORDER BY priority DESC, created_at ASC`;
  
  const [rows] = await (db as unknown as RawDb).execute(query, params);
  return rows as DeidentificationRule[];
}

/**
 * 创建脱敏规则
 */
export async function createDeidentificationRule(rule: {
  name: string;
  pattern: string;
  patternType: 'keyword' | 'regex' | 'ai_detect';
  replacement: string;
  category: 'price' | 'formula' | 'personal' | 'business' | 'custom';
  priority?: number;
}): Promise<{ id: number }> {
  const db = await requireDb();
  const { name, pattern, patternType, replacement, category, priority = 0 } = rule;
  
  const [result] = await (db as unknown as RawDb).execute(
    `INSERT INTO deidentification_rules (name, pattern, pattern_type, replacement, category, priority, is_enabled)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [name, pattern, patternType, replacement, category, priority]
  );
  
  return { id: (result as unknown as InsertResult).insertId };
}

/**
 * 更新脱敏规则
 */
export async function updateDeidentificationRule(
  id: number,
  updates: Partial<{
    name: string;
    pattern: string;
    patternType: string;
    replacement: string;
    category: string;
    priority: number;
    isEnabled: boolean;
  }>
): Promise<void> {
  const db = await requireDb();
  const setClauses: string[] = [];
  const params: unknown[] = [];
  
  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    params.push(updates.name);
  }
  if (updates.pattern !== undefined) {
    setClauses.push('pattern = ?');
    params.push(updates.pattern);
  }
  if (updates.patternType !== undefined) {
    setClauses.push('pattern_type = ?');
    params.push(updates.patternType);
  }
  if (updates.replacement !== undefined) {
    setClauses.push('replacement = ?');
    params.push(updates.replacement);
  }
  if (updates.category !== undefined) {
    setClauses.push('category = ?');
    params.push(updates.category);
  }
  if (updates.priority !== undefined) {
    setClauses.push('priority = ?');
    params.push(updates.priority);
  }
  if (updates.isEnabled !== undefined) {
    setClauses.push('is_enabled = ?');
    params.push(updates.isEnabled);
  }
  
  if (setClauses.length === 0) return;
  
  setClauses.push('updated_at = NOW()');
  params.push(id);
  
  await (db as unknown as RawDb).execute(
    `UPDATE deidentification_rules SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * 删除脱敏规则
 */
export async function deleteDeidentificationRule(id: number): Promise<void> {
  const db = await requireDb();
  await (db as unknown as RawDb).execute(`DELETE FROM deidentification_rules WHERE id = ?`, [id]);
}

/**
 * 应用脱敏规则处理文本
 */
export async function applyDeidentification(text: string): Promise<{
  deidentifiedText: string;
  matchedRules: { ruleId: number; ruleName: string; matches: string[] }[];
}> {
  const rules = await getDeidentificationRules({ isEnabled: true });
  let deidentifiedText = text;
  const matchedRules: { ruleId: number; ruleName: string; matches: string[] }[] = [];
  
  for (const rule of rules) {
    const matches: string[] = [];
    
    if (rule.patternType === 'keyword') {
      // 关键词匹配
      const keywords = rule.pattern.split(',').map(k => k.trim());
      for (const keyword of keywords) {
        if (deidentifiedText.includes(keyword)) {
          matches.push(keyword);
          deidentifiedText = deidentifiedText.replace(new RegExp(keyword, 'g'), rule.replacement);
        }
      }
    } else if (rule.patternType === 'regex') {
      // 正则匹配
      try {
        const regex = new RegExp(rule.pattern, 'g');
        const found = deidentifiedText.match(regex);
        if (found) {
          matches.push(...found);
          deidentifiedText = deidentifiedText.replace(regex, rule.replacement);
        }
      } catch (e) {
        log.error({ err: e, pattern: rule.pattern }, "Invalid regex pattern");
      }
    }
    // AI检测类型需要调用LLM，这里暂时跳过
    
    if (matches.length > 0) {
      matchedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matches,
      });
    }
  }
  
  return { deidentifiedText, matchedRules };
}

// ==================== AI回复模板管理 ====================

export interface AIReplyTemplate {
  id: number;
  name: string;
  category: 'greeting' | 'technical' | 'sales' | 'support' | 'farewell' | 'custom';
  promptTemplate: string;
  systemPrompt: string;
  variables: string[]; // JSON array of variable names
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取所有AI回复模板
 */
export async function getAIReplyTemplates(options?: {
  category?: string;
  isDefault?: boolean;
}): Promise<AIReplyTemplate[]> {
  const db = await requireDb();
  let query = `SELECT * FROM ai_reply_templates WHERE 1=1`;
  const params: unknown[] = [];
  
  if (options?.category) {
    query += ` AND category = ?`;
    params.push(options.category);
  }
  if (options?.isDefault !== undefined) {
    query += ` AND is_default = ?`;
    params.push(options.isDefault);
  }
  
  query += ` ORDER BY usage_count DESC, created_at ASC`;
  
  const [rows] = await (db as unknown as RawDb).execute(query, params);
  return rows as AIReplyTemplate[];
}

/**
 * 创建AI回复模板
 */
export async function createAIReplyTemplate(template: {
  name: string;
  category: 'greeting' | 'technical' | 'sales' | 'support' | 'farewell' | 'custom';
  promptTemplate: string;
  systemPrompt: string;
  variables?: string[];
  isDefault?: boolean;
}): Promise<{ id: number }> {
  const db = await requireDb();
  const { name, category, promptTemplate, systemPrompt, variables = [], isDefault = false } = template;
  
  const [result] = await (db as unknown as RawDb).execute(
    `INSERT INTO ai_reply_templates (name, category, prompt_template, system_prompt, variables, is_default)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, category, promptTemplate, systemPrompt, JSON.stringify(variables), isDefault]
  );
  
  return { id: (result as unknown as InsertResult).insertId };
}

/**
 * 更新AI回复模板
 */
export async function updateAIReplyTemplate(
  id: number,
  updates: Partial<{
    name: string;
    category: string;
    promptTemplate: string;
    systemPrompt: string;
    variables: string[];
    isDefault: boolean;
  }>
): Promise<void> {
  const db = await requireDb();
  const setClauses: string[] = [];
  const params: unknown[] = [];
  
  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    params.push(updates.name);
  }
  if (updates.category !== undefined) {
    setClauses.push('category = ?');
    params.push(updates.category);
  }
  if (updates.promptTemplate !== undefined) {
    setClauses.push('prompt_template = ?');
    params.push(updates.promptTemplate);
  }
  if (updates.systemPrompt !== undefined) {
    setClauses.push('system_prompt = ?');
    params.push(updates.systemPrompt);
  }
  if (updates.variables !== undefined) {
    setClauses.push('variables = ?');
    params.push(JSON.stringify(updates.variables));
  }
  if (updates.isDefault !== undefined) {
    setClauses.push('is_default = ?');
    params.push(updates.isDefault);
  }
  
  if (setClauses.length === 0) return;
  
  setClauses.push('updated_at = NOW()');
  params.push(id);
  
  await (db as unknown as RawDb).execute(
    `UPDATE ai_reply_templates SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * 删除AI回复模板
 */
export async function deleteAIReplyTemplate(id: number): Promise<void> {
  const db = await requireDb();
  await (db as unknown as RawDb).execute(`DELETE FROM ai_reply_templates WHERE id = ?`, [id]);
}

/**
 * 增加模板使用次数
 */
export async function incrementTemplateUsage(id: number): Promise<void> {
  const db = await requireDb();
  await (db as unknown as RawDb).execute(
    `UPDATE ai_reply_templates SET usage_count = usage_count + 1 WHERE id = ?`,
    [id]
  );
}

// ==================== 消息统计分析 ====================

export interface MessageStats {
  totalMessages: number;
  todayMessages: number;
  sensitiveMessages: number;
  needsReplyMessages: number;
  avgResponseTime: number; // 分钟
  messagesByHour: { hour: number; count: number }[];
  messagesByGroup: { groupId: number; groupName: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
}

/**
 * 获取消息统计
 */
export async function getMessageStats(options?: {
  startDate?: string;
  endDate?: string;
  groupId?: number;
}): Promise<MessageStats> {
  const db = await requireDb();
  const { startDate, endDate, groupId } = options || {};
  
  let dateFilter = '';
  const params: unknown[] = [];
  
  if (startDate) {
    dateFilter += ` AND received_at >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND received_at <= ?`;
    params.push(endDate);
  }
  if (groupId) {
    dateFilter += ` AND group_id = ?`;
    params.push(groupId);
  }
  
  // 总消息数
  const [totalResult] = await (db as unknown as RawDb).execute(
    `SELECT COUNT(*) as total FROM social_messages WHERE 1=1 ${dateFilter}`,
    params
  );
  const totalMessages = (totalResult as CountRow[])[0]?.total || 0;
  
  // 今日消息数
  const [todayResult] = await (db as unknown as RawDb).execute(
    `SELECT COUNT(*) as total FROM social_messages WHERE DATE(received_at) = CURRENT_DATE ${dateFilter}`,
    params
  );
  const todayMessages = (todayResult as CountRow[])[0]?.total || 0;
  
  // 敏感消息数
  const [sensitiveResult] = await (db as unknown as RawDb).execute(
    `SELECT COUNT(*) as total FROM social_messages WHERE is_sensitive = 1 ${dateFilter}`,
    params
  );
  const sensitiveMessages = (sensitiveResult as CountRow[])[0]?.total || 0;
  
  // 需要回复的消息数
  const [needsReplyResult] = await (db as unknown as RawDb).execute(
    `SELECT COUNT(*) as total FROM social_messages WHERE needs_reply = 1 ${dateFilter}`,
    params
  );
  const needsReplyMessages = (needsReplyResult as CountRow[])[0]?.total || 0;
  
  // 按小时统计
  const [hourlyResult] = await (db as unknown as RawDb).execute(
    `SELECT EXTRACT(HOUR FROM received_at) as hour, COUNT(*) as count
     FROM social_messages WHERE 1=1 ${dateFilter}
     GROUP BY EXTRACT(HOUR FROM received_at) ORDER BY hour`,
    params
  );
  const messagesByHour = (hourlyResult as HourCountRow[]).map(r => ({
    hour: r.hour,
    count: r.count,
  }));
  
  // 按群组统计
  const [groupResult] = await (db as unknown as RawDb).execute(
    `SELECT m.group_id, g.name as group_name, COUNT(*) as count
     FROM social_messages m
     LEFT JOIN social_groups g ON m.group_id = g.id
     WHERE 1=1 ${dateFilter}
     GROUP BY m.group_id, g.name
     ORDER BY count DESC`,
    params
  );
  const messagesByGroup = (groupResult as GroupCountRow[]).map(r => ({
    groupId: r.group_id,
    groupName: r.group_name || '未知群组',
    count: r.count,
  }));
  
  return {
    totalMessages,
    todayMessages,
    sensitiveMessages,
    needsReplyMessages,
    avgResponseTime: 5.2, // TODO: 实际计算
    messagesByHour,
    messagesByGroup,
    topKeywords: [], // TODO: 实现关键词提取
  };
}

// ==================== 群成员画像分析 ====================

export interface MemberProfile {
  memberId: number;
  wxId: string;
  name: string;
  groupId: number;
  groupName: string;
  role: 'member' | 'admin' | 'expert' | 'bot';
  messageCount: number;
  lastActiveAt: Date;
  activityScore: number; // 0-100
  topTopics: string[];
  sentimentScore: number; // -1 to 1
  isInfluencer: boolean;
}

/**
 * 获取群成员画像
 */
export async function getMemberProfiles(groupId: number): Promise<MemberProfile[]> {
  const db = await requireDb();
  
  const [members] = await (db as unknown as RawDb).execute(
    `SELECT sm.*, sg.name as group_name,
            (SELECT COUNT(*) FROM social_messages WHERE sender_wx_id = sm.wx_id AND group_id = sm.group_id) as message_count,
            (SELECT MAX(received_at) FROM social_messages WHERE sender_wx_id = sm.wx_id AND group_id = sm.group_id) as last_active_at
     FROM social_members sm
     LEFT JOIN social_groups sg ON sm.group_id = sg.id
     WHERE sm.group_id = ?
     ORDER BY message_count DESC`,
    [groupId]
  );
  
  return (members as MemberRow[]).map(m => ({
    memberId: m.id,
    wxId: m.wx_id,
    name: m.name || '未知用户',
    groupId: m.group_id,
    groupName: m.group_name || '未知群组',
    role: (m.role || 'member') as MemberProfile['role'],
    messageCount: m.message_count || 0,
    lastActiveAt: m.last_active_at ?? new Date(),
    activityScore: calculateActivityScore(m.message_count || 0, m.last_active_at),
    topTopics: [] as string[],
    sentimentScore: 0,
    isInfluencer: (m.message_count || 0) > 50,
  }));
}

/**
 * 计算活跃度分数
 */
function calculateActivityScore(messageCount: number, lastActiveAt: Date | null): number {
  if (!lastActiveAt) return 0;
  
  const daysSinceActive = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 100 - daysSinceActive * 5);
  const volumeScore = Math.min(100, messageCount * 2);
  
  return Math.round((recencyScore + volumeScore) / 2);
}

/**
 * 获取群组活跃度统计
 */
export async function getGroupActivityStats(groupId: number): Promise<{
  totalMembers: number;
  activeMembers: number;
  avgMessagesPerDay: number;
  peakHour: number;
  topContributors: { name: string; messageCount: number }[];
}> {
  const db = await requireDb();
  
  // 总成员数
  const [totalResult] = await (db as unknown as RawDb).execute(
    `SELECT COUNT(*) as total FROM social_members WHERE group_id = ?`,
    [groupId]
  );
  const totalMembers = (totalResult as CountRow[])[0]?.total || 0;
  
  // 活跃成员数（7天内有消息）
  const [activeResult] = await (db as unknown as RawDb).execute(
    `SELECT COUNT(DISTINCT sender_wx_id) as total
     FROM social_messages
     WHERE group_id = ? AND received_at >= NOW() - INTERVAL '7 days'`,
    [groupId]
  );
  const activeMembers = (activeResult as CountRow[])[0]?.total || 0;
  
  // 日均消息数
  const [avgResult] = await (db as unknown as RawDb).execute(
    `SELECT COUNT(*) / 30 as avg_per_day
     FROM social_messages
     WHERE group_id = ? AND received_at >= NOW() - INTERVAL '30 days'`,
    [groupId]
  );
  const avgMessagesPerDay = Math.round((avgResult as AvgRow[])[0]?.avg_per_day || 0);
  
  // 高峰时段
  const [peakResult] = await (db as unknown as RawDb).execute(
    `SELECT EXTRACT(HOUR FROM received_at) as hour, COUNT(*) as count
     FROM social_messages
     WHERE group_id = ?
     GROUP BY EXTRACT(HOUR FROM received_at)
     ORDER BY count DESC
     LIMIT 1`,
    [groupId]
  );
  const peakHour = (peakResult as HourCountRow[])[0]?.hour || 10;
  
  // 活跃贡献者
  const [contributorsResult] = await (db as unknown as RawDb).execute(
    `SELECT sender_name as name, COUNT(*) as message_count
     FROM social_messages
     WHERE group_id = ? AND sender_name IS NOT NULL
     GROUP BY sender_name
     ORDER BY message_count DESC
     LIMIT 10`,
    [groupId]
  );
  const topContributors = (contributorsResult as ContributorRow[]).map(c => ({
    name: c.name,
    messageCount: c.message_count,
  }));
  
  return {
    totalMembers,
    activeMembers,
    avgMessagesPerDay,
    peakHour,
    topContributors,
  };
}

// ==================== 初始化默认数据 ====================

/**
 * 初始化默认脱敏规则
 */
export async function initializeDefaultDeidentificationRules(): Promise<void> {
  const defaultRules = [
    { name: '价格信息', pattern: '价格,报价,单价,总价,成本', patternType: 'keyword' as const, replacement: '[价格信息]', category: 'price' as const, priority: 100 },
    { name: '配方信息', pattern: '配方,工艺,秘方,专利', patternType: 'keyword' as const, replacement: '[配方信息]', category: 'formula' as const, priority: 100 },
    { name: '手机号码', pattern: '1[3-9]\\d{9}', patternType: 'regex' as const, replacement: '[手机号]', category: 'personal' as const, priority: 90 },
    { name: '邮箱地址', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', patternType: 'regex' as const, replacement: '[邮箱]', category: 'personal' as const, priority: 90 },
    { name: '身份证号', pattern: '\\d{17}[\\dXx]', patternType: 'regex' as const, replacement: '[身份证]', category: 'personal' as const, priority: 95 },
    { name: '银行卡号', pattern: '\\d{16,19}', patternType: 'regex' as const, replacement: '[银行卡]', category: 'personal' as const, priority: 85 },
    { name: '客户名称', pattern: '客户,甲方,合作方', patternType: 'keyword' as const, replacement: '[客户]', category: 'business' as const, priority: 70 },
  ];
  
  for (const rule of defaultRules) {
    try {
      await createDeidentificationRule(rule);
    } catch (e) {
      // 忽略重复插入错误
    }
  }
}

/**
 * 初始化默认AI回复模板
 */
export async function initializeDefaultAIReplyTemplates(): Promise<void> {
  const defaultTemplates = [
    {
      name: '技术问题回复',
      category: 'technical' as const,
      promptTemplate: '请为以下技术问题生成专业回复：\n\n{{message}}\n\n要求：专业、准确、易懂',
      systemPrompt: '你是GRT智能系统的技术支持AI助手，擅长解答工业清洗设备相关的技术问题。回复要专业但易懂，控制在200字以内。',
      variables: ['message'],
      isDefault: true,
    },
    {
      name: '销售咨询回复',
      category: 'sales' as const,
      promptTemplate: '请为以下销售咨询生成回复：\n\n{{message}}\n\n要求：热情、专业、引导进一步沟通',
      systemPrompt: '你是GRT智能系统的销售AI助手，负责回复客户的产品咨询。回复要热情专业，涉及具体价格时引导联系销售人员。',
      variables: ['message'],
      isDefault: true,
    },
    {
      name: '售后支持回复',
      category: 'support' as const,
      promptTemplate: '请为以下售后问题生成回复：\n\n{{message}}\n\n要求：耐心、专业、提供解决方案',
      systemPrompt: '你是GRT智能系统的售后支持AI助手，负责处理客户的售后问题。回复要耐心专业，提供可行的解决方案或引导联系技术支持。',
      variables: ['message'],
      isDefault: true,
    },
    {
      name: '问候语',
      category: 'greeting' as const,
      promptTemplate: '请生成一个友好的问候语，欢迎用户{{user_name}}加入群组。',
      systemPrompt: '你是GRT智能系统的社群助手，负责欢迎新成员。问候语要友好、简洁。',
      variables: ['user_name'],
      isDefault: true,
    },
  ];
  
  for (const template of defaultTemplates) {
    try {
      await createAIReplyTemplate(template);
    } catch (e) {
      // 忽略重复插入错误
    }
  }
}
