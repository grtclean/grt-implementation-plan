/**
 * Meeting Service
 * 处理所有会议相关的业务逻辑
 */

import { requireDb } from '../utils/db-helpers';
import { v4 as uuidv4 } from "uuid";
import { 
  meetings, 
  channels, 
  channelMembers, 
  meetingNotes, 
  aiInsights, 
  auditLogs,
  meetingParticipants,
  meetingAttachments 
} from "../../drizzle/schema";
import { eq, and, or, desc, gte, lte } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("meeting-svc");

export interface CreateMeetingInput {
  title: string;
  description?: string;
  channelId: string;
  startTime: Date;
  meetingType: "standup" | "review" | "planning" | "retrospective" | "other";
  projectPhase?: string;
  revenueTarget?: number;
  profitMargin?: number;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  endTime?: Date;
}

export interface MeetingFilters {
  channelId?: string;
  status?: string;
  meetingType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * 创建会议
 */
export async function createMeeting(
  input: CreateMeetingInput,
  userId: number
): Promise<any> {
  // 验证用户是否有权访问频道
  const hasAccess = await checkChannelAccess(userId, input.channelId, "member");
  if (!hasAccess) {
    throw new Error("You don't have permission to create meetings in this channel");
  }

  const meetingId = uuidv4();
  const database = await requireDb();

  try {
    // 创建会议
    const result = await database.insert(meetings).values({
      id: meetingId,
      title: input.title,
      description: input.description,
      channelId: input.channelId,
      createdBy: userId,
      startTime: input.startTime.toISOString(),
      status: "scheduled",
      meetingType: input.meetingType,
      projectPhase: input.projectPhase,
      revenueTarget: input.revenueTarget?.toString(),
      profitMargin: input.profitMargin?.toString(),
    });

    // 记录审计日志
    await logAuditEvent(
      userId,
      "CREATE_MEETING",
      "meeting",
      meetingId,
      { title: input.title, channelId: input.channelId }
    );

    // 创建初始笔记
    const noteId = uuidv4();
    await database.insert(meetingNotes).values({
      id: noteId,
      meetingId,
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: input.title }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }],
          },
        ],
      }),
      editedBy: userId,
      version: 1,
    });

    return { id: meetingId, ...input, status: "scheduled" };
  } catch (error) {
    log.error({ err: error }, "Error creating meeting:");
    throw error;
  }
}

/**
 * 获取会议列表
 */
export async function getMeetings(
  userId: number,
  filters: MeetingFilters
): Promise<any[]> {
  const database = await requireDb();

  // 获取用户有权访问的频道
  const userChannels = await database
    .select({ channelId: channelMembers.channelId })
    .from(channelMembers)
    .where(eq(channelMembers.userId, userId))
    .limit(1000);

  const channelIds = userChannels.map((c) => c.channelId);

  if (channelIds.length === 0) {
    return [];
  }

  const result = await database
    .select()
    .from(meetings)
    .where(
      and(
        or(...channelIds.map((id) => eq(meetings.channelId, id))),
        filters.status ? eq(meetings.status, filters.status as any) : undefined,
        filters.meetingType ? eq(meetings.meetingType, filters.meetingType as any) : undefined,
        filters.startDate ? gte(meetings.startTime, filters.startDate.toISOString()) : undefined,
        filters.endDate ? lte(meetings.startTime, filters.endDate.toISOString()) : undefined
      )
    )
    .orderBy(desc(meetings.startTime))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);

  return result;
}

/**
 * 获取单个会议
 */
export async function getMeeting(meetingId: string, userId: number): Promise<any> {
  const database = await requireDb();

  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .then((results) => results[0]);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // 验证用户是否有权访问
  const hasAccess = await checkChannelAccess(userId, meeting.channelId, "viewer");
  if (!hasAccess) {
    throw new Error("You don't have permission to access this meeting");
  }

  // 获取笔记
  const notes = await database
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.meetingId, meetingId))
    .orderBy(desc(meetingNotes.updatedAt))
    .limit(1000);

  // 获取AI洞察
  const insights = await database
    .select()
    .from(aiInsights)
    .where(eq(aiInsights.meetingId, meetingId))
    .limit(1000);

  // 获取参与者
  const participants = await database
    .select()
    .from(meetingParticipants)
    .where(eq(meetingParticipants.meetingId, meetingId))
    .limit(1000);

  // 获取附件
  const attachments = await database
    .select()
    .from(meetingAttachments)
    .where(eq(meetingAttachments.meetingId, meetingId))
    .limit(1000);

  return {
    ...meeting,
    notes: notes[0],
    insights,
    participants,
    attachments,
  };
}

/**
 * 更新会议
 */
export async function updateMeeting(
  meetingId: string,
  input: UpdateMeetingInput,
  userId: number
): Promise<any> {
  const database = await requireDb();

  // 获取会议
  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .then((results) => results[0]);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // 验证权限
  const hasAccess = await checkChannelAccess(userId, meeting.channelId, "manager");
  if (!hasAccess) {
    throw new Error("You don't have permission to update this meeting");
  }

  // 更新会议
  const updateData: any = { ...input, updatedAt: new Date().toISOString() };
  if (input.endTime) updateData.endTime = input.endTime.toISOString();
  await database
    .update(meetings)
    .set(updateData)
    .where(eq(meetings.id, meetingId));

  // 记录审计日志
  await logAuditEvent(userId, "UPDATE_MEETING", "meeting", meetingId, input);

// @ts-ignore duplicate property
  return { id: meetingId, ...meeting, ...input };
}

/**
 * 删除会议（软删除）
 */
export async function deleteMeeting(meetingId: string, userId: number): Promise<void> {
  const database = await requireDb();

  // 获取会议
  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .then((results) => results[0]);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // 验证权限
  const hasAccess = await checkChannelAccess(userId, meeting.channelId, "manager");
  if (!hasAccess) {
    throw new Error("You don't have permission to delete this meeting");
  }

  // 软删除
  await database
    .update(meetings)
    .set({
      deletedAt: new Date().toISOString(),
    })
    .where(eq(meetings.id, meetingId));

  // 记录审计日志
  await logAuditEvent(userId, "DELETE_MEETING", "meeting", meetingId, {});
}

/**
 * 更新会议笔记
 */
export async function updateMeetingNotes(
  meetingId: string,
  content: string,
  userId: number
): Promise<any> {
  const database = await requireDb();

  // 验证权限
  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .then((results) => results[0]);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  const hasAccess = await checkChannelAccess(userId, meeting.channelId, "member");
  if (!hasAccess) {
    throw new Error("You don't have permission to edit this meeting");
  }

  // 获取当前笔记
  const currentNote = await database
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.meetingId, meetingId))
    .orderBy(desc(meetingNotes.version))
    .then((results) => results[0]);

  const newVersion = (currentNote?.version || 0) + 1;

  // 创建新版本
  const noteId = uuidv4();
  await database.insert(meetingNotes).values({
    id: noteId,
    meetingId,
    content,
    editedBy: userId,
    version: newVersion,
  });

  // 记录审计日志
  await logAuditEvent(userId, "UPDATE_MEETING_NOTES", "meeting_notes", noteId, {
    version: newVersion,
  });

  return { id: noteId, meetingId, content, version: newVersion };
}

/**
 * 检查频道访问权限
 */
export async function checkChannelAccess(
  userId: number,
  channelId: string,
  minRole?: "viewer" | "member" | "manager" | "owner"
): Promise<boolean> {
  const database = await requireDb();

  const member = await database
    .select()
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId)
      )
    )
    .then((results) => results[0]);

  if (!member) {
    return false;
  }

  if (minRole) {
    const roleHierarchy = { viewer: 1, member: 2, manager: 3, owner: 4 };
    return roleHierarchy[member.role] >= roleHierarchy[minRole];
  }

  return true;
}

/**
 * 记录审计日志
 */
export async function logAuditEvent(
  userId: number,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any
): Promise<void> {
  const database = await requireDb();

  const logId = uuidv4();
  await database.insert(auditLogs).values({
    id: logId,
    userId,
    action,
    resourceType,
    resourceId,
    details: JSON.stringify(details),
    timestamp: new Date().toISOString(),
  });
}

/**
 * 获取频道成员
 */
export async function getChannelMembers(channelId: string): Promise<any[]> {
  const database = await requireDb();

  return database
    .select()
    .from(channelMembers)
    .where(eq(channelMembers.channelId, channelId))
    .limit(1000);
}

/**
 * 添加频道成员
 */
export async function addChannelMember(
  channelId: string,
  userId: number,
  role: "owner" | "manager" | "member" | "viewer",
  operatorId: number
): Promise<any> {
  const database = await requireDb();

  // 验证操作者权限
  const hasAccess = await checkChannelAccess(operatorId, channelId, "manager");
  if (!hasAccess) {
    throw new Error("You don't have permission to manage channel members");
  }

  const memberId = uuidv4();
  await database.insert(channelMembers).values({
    id: memberId,
    channelId,
    userId,
    role,
  });

  // 记录审计日志
  await logAuditEvent(operatorId, "ADD_CHANNEL_MEMBER", "channel_member", memberId, {
    userId,
    role,
  });

  return { id: memberId, channelId, userId, role };
}

/**
 * 更新频道成员角色
 */
export async function updateChannelMemberRole(
  channelId: string,
  userId: number,
  role: "owner" | "manager" | "member" | "viewer",
  operatorId: number
): Promise<any> {
  const database = await requireDb();

  // 验证操作者权限
  const hasAccess = await checkChannelAccess(operatorId, channelId, "manager");
  if (!hasAccess) {
    throw new Error("You don't have permission to manage channel members");
  }

  await database
    .update(channelMembers)
    .set({ role })
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId)
      )
    );

  // 记录审计日志
  await logAuditEvent(operatorId, "UPDATE_CHANNEL_MEMBER_ROLE", "channel_member", "", {
    userId,
    role,
  });

  return { channelId, userId, role };
}
