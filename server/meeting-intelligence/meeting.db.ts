/**
 * Meeting Intelligence Module - Database Helpers
 * 智能会议评估与系统记录模块 - 数据库查询帮助函数
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ============================================================================
// Channel Operations
// ============================================================================

export async function getChannelsByUser(userId: string) {
  const db = await requireDb();
  // userId from auth is openId (string like "admin"), resolve numeric id from users table
  const userRow = await db.execute(sql`SELECT id FROM users WHERE "openId" = ${userId} LIMIT 1`);
  const numericId = userRow.rows[0]?.id ?? -1;
  const result = await db.execute(sql`
    SELECT mc.*, cm.role as user_role
    FROM channels mc
    LEFT JOIN channel_members cm ON mc.id = cm."channelId" AND cm."userId" = ${numericId}
    WHERE mc.visibility != 'private' OR cm."userId" IS NOT NULL
    ORDER BY mc.name ASC
  `);
  return result.rows as any[];
}

export async function getChannelTree(userId: string) {
  const db = await requireDb();
  const userRow = await db.execute(sql`SELECT id FROM users WHERE "openId" = ${userId} LIMIT 1`);
  const numericId = userRow.rows[0]?.id ?? -1;
  const result = await db.execute(sql`
    SELECT mc.*, cm.role as user_role, 0 as level
    FROM channels mc
    LEFT JOIN channel_members cm ON mc.id = cm."channelId" AND cm."userId" = ${numericId}
    WHERE mc.visibility != 'private' OR cm."userId" IS NOT NULL
    ORDER BY mc.name ASC
  `);
  return result.rows as any[];
}

export async function createChannel(data: {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  isConfidential?: boolean;
  createdBy: string;
}) {
  const db = await requireDb();
  await db.execute(sql`
    INSERT INTO channels (id, name, description, "organizationId", visibility, "createdBy")
    VALUES (${data.id}, ${data.name}, ${data.description || null}, 1, ${data.isConfidential ? 'private' : 'public'}, CAST(${data.createdBy} AS integer))
  `);
  return data.id;
}

export async function addChannelMember(channelId: string, userId: string, role: string = 'member') {
  const db = await requireDb();
  const id = crypto.randomUUID();
  await db.execute(sql`
    INSERT INTO channel_members (id, "channelId", "userId", role)
    VALUES (${id}, ${channelId}, ${userId}, ${role})
    ON CONFLICT ("channelId", "userId") DO UPDATE SET role = ${role}
  `);
  return id;
}

// ============================================================================
// Meeting Operations
// ============================================================================

export async function getMeetingsByChannel(channelId: string, limit: number = 50) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT mr.*,
           (SELECT COUNT(*) FROM meeting_content_blocks WHERE meeting_id = mr.id) as block_count,
           (SELECT COUNT(*) FROM hr_meeting_assessments WHERE meeting_id = mr.id) as assessment_count
    FROM meeting_records mr
    WHERE mr.channel_id = ${channelId}
    ORDER BY mr.meeting_date DESC, mr.created_at DESC
    LIMIT ${limit}
  `);
  return result.rows as any[];
}

export async function getMeetingById(meetingId: string) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT mr.*, mc.name as channel_name, mc.is_confidential
    FROM meeting_records mr
    LEFT JOIN channels mc ON mr.channel_id = mc.id
    WHERE mr.id = ${meetingId}
  `);
  return (result.rows as any[])[0] || null;
}

export async function createMeeting(data: {
  id: string;
  channelId: string;
  title: string;
  meetingDate: string;
  phase?: string;
  objective?: string;
  createdBy: string;
  metadata?: string;
}) {
  const db = await requireDb();
  await db.execute(sql`
    INSERT INTO meeting_records (id, channel_id, title, meeting_date, phase, objective, created_by, metadata)
    VALUES (${data.id}, ${data.channelId}, ${data.title}, ${data.meetingDate}, ${data.phase || null}, ${data.objective || null}, ${data.createdBy}, ${data.metadata || null})
  `);
  return data.id;
}

export async function updateMeetingSummary(meetingId: string, summary: string, aiInsights: object) {
  const db = await requireDb();
  await db.execute(sql`
    UPDATE meeting_records
    SET summary = ${summary}, ai_insights = ${JSON.stringify(aiInsights)}
    WHERE id = ${meetingId}
  `);
}

// ============================================================================
// Content Block Operations
// ============================================================================

export async function getContentBlocksByMeeting(meetingId: string) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId}
    ORDER BY sort_order ASC, created_at ASC
  `);
  return result.rows as any[];
}

export async function createContentBlock(data: {
  id: string;
  meetingId: string;
  blockType: string;
  content: string;
  speaker?: string;
  timestampStart?: number;
  timestampEnd?: number;
  metadata?: object;
  sortOrder?: number;
}) {
  const db = await requireDb();
  await db.execute(sql`
    INSERT INTO meeting_content_blocks (id, meeting_id, block_type, content, speaker, timestamp_start, timestamp_end, metadata, sort_order)
    VALUES (${data.id}, ${data.meetingId}, ${data.blockType}, ${data.content}, ${data.speaker || null}, ${data.timestampStart || null}, ${data.timestampEnd || null}, ${data.metadata ? JSON.stringify(data.metadata) : null}, ${data.sortOrder || 0})
  `);
  return data.id;
}

export async function updateContentBlock(blockId: string, content: string, metadata?: object) {
  const db = await requireDb();
  await db.execute(sql`
    UPDATE meeting_content_blocks
    SET content = ${content}, metadata = ${metadata ? JSON.stringify(metadata) : null}
    WHERE id = ${blockId}
  `);
}

// ============================================================================
// HR Assessment Operations
// ============================================================================

export async function getAssessmentsByMeeting(meetingId: string) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM hr_meeting_assessments
    WHERE meeting_id = ${meetingId}
    ORDER BY employee_name ASC
  `);
  return result.rows as any[];
}

export async function getAssessmentsByEmployee(employeeId: string, startDate?: string, endDate?: string) {
  const db = await requireDb();
  let query = sql`
    SELECT hma.*, mr.title as meeting_title, mr.meeting_date, mr.phase
    FROM hr_meeting_assessments hma
    LEFT JOIN meeting_records mr ON hma.meeting_id = mr.id
    WHERE hma.employee_id = ${employeeId}
  `;

  if (startDate && endDate) {
    query = sql`
      SELECT hma.*, mr.title as meeting_title, mr.meeting_date, mr.phase
      FROM hr_meeting_assessments hma
      LEFT JOIN meeting_records mr ON hma.meeting_id = mr.id
      WHERE hma.employee_id = ${employeeId}
        AND mr.meeting_date BETWEEN ${startDate} AND ${endDate}
      ORDER BY mr.meeting_date DESC
    `;
  }

  const result = await db.execute(query);
  return result.rows as any[];
}

export async function createAssessment(data: {
  id: string;
  meetingId: string;
  employeeId: string;
  employeeName: string;
  technicalClarity?: number;
  proactivity?: number;
  communicationSkill?: number;
  problemSolving?: number;
  evidence?: string[];
  aiGenerated?: boolean;
}) {
  const db = await requireDb();
  await db.execute(sql`
    INSERT INTO hr_meeting_assessments (id, meeting_id, employee_id, employee_name, technical_clarity, proactivity, communication_skill, problem_solving, evidence, ai_generated)
    VALUES (${data.id}, ${data.meetingId}, ${data.employeeId}, ${data.employeeName}, ${data.technicalClarity || null}, ${data.proactivity || null}, ${data.communicationSkill || null}, ${data.problemSolving || null}, ${data.evidence ? JSON.stringify(data.evidence) : null}, ${data.aiGenerated !== false})
  `);
  return data.id;
}

export async function reviewAssessment(assessmentId: string, reviewedBy: string) {
  const db = await requireDb();
  await db.execute(sql`
    UPDATE hr_meeting_assessments
    SET reviewed_by = ${reviewedBy}, reviewed_at = NOW()
    WHERE id = ${assessmentId}
  `);
}

// ============================================================================
// Analytics & Insights
// ============================================================================

export async function getMeetingStats(channelId?: string, startDate?: string, endDate?: string) {
  const db = await requireDb();
  let whereClause = sql`1=1`;

  if (channelId) {
    whereClause = sql`mr.channel_id = ${channelId}`;
  }

  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT mr.id) as total_meetings,
      COUNT(DISTINCT mcb.id) as total_blocks,
      COUNT(DISTINCT hma.id) as total_assessments,
      AVG(hma.technical_clarity) as avg_technical_clarity,
      AVG(hma.proactivity) as avg_proactivity,
      AVG(hma.communication_skill) as avg_communication_skill,
      AVG(hma.problem_solving) as avg_problem_solving
    FROM meeting_records mr
    LEFT JOIN meeting_content_blocks mcb ON mr.id = mcb.meeting_id
    LEFT JOIN hr_meeting_assessments hma ON mr.id = hma.meeting_id
    WHERE ${whereClause}
  `);
  return (result.rows as any[])[0] || null;
}

export async function getTopPerformers(limit: number = 10, startDate?: string, endDate?: string) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT
      employee_id,
      employee_name,
      COUNT(*) as meeting_count,
      AVG(technical_clarity) as avg_technical,
      AVG(proactivity) as avg_proactivity,
      AVG(communication_skill) as avg_communication,
      AVG(problem_solving) as avg_problem_solving,
      (AVG(technical_clarity) + AVG(proactivity) + AVG(communication_skill) + AVG(problem_solving)) / 4 as overall_score
    FROM hr_meeting_assessments
    GROUP BY employee_id, employee_name
    HAVING COUNT(*) >= 3
    ORDER BY overall_score DESC
    LIMIT ${limit}
  `);
  return result.rows as any[];
}
