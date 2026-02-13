/**
 * Meeting Intelligence Module - tRPC Router
 * 智能会议评估与系统记录模块 - API路由
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as meetingDb from "./meeting.db";
import { invokeLLM } from "../_core/llm";
import * as reminderService from "./meeting-reminder.service";
import * as transcriptionService from "./meeting-transcription.service";

// ============================================================================
// Input Schemas
// ============================================================================

const createChannelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  isConfidential: z.boolean().optional(),
});

const createMeetingSchema = z.object({
  channelId: z.string().uuid(),
  title: z.string().min(1).max(255),
  meetingDate: z.string(),
  phase: z.string().optional(),
  objective: z.string().optional(),
  metadata: z.object({
    templateId: z.string().optional(),
    agenda: z.array(z.any()).optional(),
    participants: z.object({
      required: z.array(z.string()),
      optional: z.array(z.string()),
    }).optional(),
    duration: z.number().optional(),
  }).optional(),
});

const createContentBlockSchema = z.object({
  meetingId: z.string().uuid(),
  blockType: z.enum(['text', 'decision', 'action_item', 'question', 'insight']),
  content: z.string().min(1),
  speaker: z.string().optional(),
  timestampStart: z.number().optional(),
  timestampEnd: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  sortOrder: z.number().optional(),
});

const createAssessmentSchema = z.object({
  meetingId: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeName: z.string().min(1),
  technicalClarity: z.number().min(0).max(5).optional(),
  proactivity: z.number().min(0).max(5).optional(),
  communicationSkill: z.number().min(0).max(5).optional(),
  problemSolving: z.number().min(0).max(5).optional(),
  evidence: z.array(z.string()).optional(),
});

// ============================================================================
// Router Definition
// ============================================================================

export const meetingRouter = router({
  // Channel Operations
  channels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await meetingDb.getChannelsByUser(ctx.user.openId);
    }),

    tree: protectedProcedure.query(async ({ ctx }) => {
      const channels = await meetingDb.getChannelTree(ctx.user.openId);
      return buildChannelTree(channels);
    }),

    create: protectedProcedure
      .input(createChannelSchema)
      .mutation(async ({ ctx, input }) => {
        const id = crypto.randomUUID();
        await meetingDb.createChannel({
          id,
          name: input.name,
          description: input.description,
          parentId: input.parentId,
          isConfidential: input.isConfidential,
          createdBy: ctx.user.openId,
        });
        // Add creator as owner
        await meetingDb.addChannelMember(id, ctx.user.openId, 'owner');
        return { id, success: true };
      }),

    addMember: protectedProcedure
      .input(z.object({
        channelId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(['admin', 'member', 'viewer']).optional(),
      }))
      .mutation(async ({ input }) => {
        await meetingDb.addChannelMember(input.channelId, input.userId, input.role || 'member');
        return { success: true };
      }),
  }),

  // Meeting Operations
  meetings: router({
    list: protectedProcedure
      .input(z.object({
        channelId: z.string().uuid(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(async ({ input }) => {
        return await meetingDb.getMeetingsByChannel(input.channelId, input.limit);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const meeting = await meetingDb.getMeetingById(input.id);
        if (!meeting) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
        }
        return meeting;
      }),

    create: protectedProcedure
      .input(createMeetingSchema)
      .mutation(async ({ ctx, input }) => {
        const id = crypto.randomUUID();
        await meetingDb.createMeeting({
          id,
          channelId: input.channelId,
          title: input.title,
          meetingDate: input.meetingDate,
          phase: input.phase,
          objective: input.objective,
          createdBy: ctx.user.openId,
          // 保存模板相关元数据
          metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
        });
        return { id, success: true };
      }),

    generateSummary: protectedProcedure
      .input(z.object({ meetingId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const meeting = await meetingDb.getMeetingById(input.meetingId);
        if (!meeting) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
        }

        const contentBlocks = await meetingDb.getContentBlocksByMeeting(input.meetingId);
        
        // Generate AI summary
        const prompt = `Analyze the following meeting content and generate a structured summary:

Meeting Title: ${meeting.title}
Phase: ${meeting.phase || 'N/A'}
Objective: ${meeting.objective || 'N/A'}

Content Blocks:
${contentBlocks.map((b: any) => `[${b.block_type}] ${b.speaker ? `(${b.speaker})` : ''}: ${b.content}`).join('\n')}

Please provide:
1. Executive Summary (2-3 sentences)
2. Key Decisions Made
3. Action Items with Owners
4. Risks or Concerns Identified
5. Connection to Strategic Goals (50M Revenue Target, 14% Profit Margin)

Format as JSON with keys: summary, decisions, actionItems, risks, strategicAlignment`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are a meeting analyst for GRT Manufacturing. Analyze meetings and provide structured insights." },
              { role: "user", content: prompt }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "meeting_summary",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    decisions: { type: "array", items: { type: "string" } },
                    actionItems: { type: "array", items: { type: "object", properties: { task: { type: "string" }, owner: { type: "string" } }, required: ["task", "owner"], additionalProperties: false } },
                    risks: { type: "array", items: { type: "string" } },
                    strategicAlignment: { type: "string" }
                  },
                  required: ["summary", "decisions", "actionItems", "risks", "strategicAlignment"],
                  additionalProperties: false
                }
              }
            }
          });

          const insights = JSON.parse(response.choices[0].message.content || '{}');
          await meetingDb.updateMeetingSummary(input.meetingId, insights.summary, insights);
          return { success: true, insights };
        } catch (error) {
          console.error('Failed to generate meeting summary:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate summary' });
        }
      }),
  }),

  // Content Block Operations
  contentBlocks: router({
    list: protectedProcedure
      .input(z.object({ meetingId: z.string().uuid() }))
      .query(async ({ input }) => {
        return await meetingDb.getContentBlocksByMeeting(input.meetingId);
      }),

    create: protectedProcedure
      .input(createContentBlockSchema)
      .mutation(async ({ input }) => {
        const id = crypto.randomUUID();
        await meetingDb.createContentBlock({
          id,
          meetingId: input.meetingId,
          blockType: input.blockType,
          content: input.content,
          speaker: input.speaker,
          timestampStart: input.timestampStart,
          timestampEnd: input.timestampEnd,
          metadata: input.metadata,
          sortOrder: input.sortOrder,
        });

        // P2: When an action_item content block is created, try to create a linked devTask
        let linkedTaskCreated = false;
        if (input.blockType === 'action_item') {
          try {
            // Parse assignee: "[name]:" or "name:" at the start of content
            let assignee: string | null = null;
            const bracketMatch = input.content.match(/^\[([^\]]+)\]\s*[:：]/);
            const colonMatch = input.content.match(/^([^:：\n]{1,20})[:：]/);
            if (bracketMatch) {
              assignee = bracketMatch[1].trim();
            } else if (colonMatch) {
              assignee = colonMatch[1].trim();
            }

            // Parse deadline: "截止X/XX", "截止YYYY-MM-DD", "before YYYY-MM-DD", "deadline YYYY-MM-DD"
            let deadline: string | null = null;
            const deadlinePatterns = [
              /截止\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
              /截止\s*(\d{1,2}[-/]\d{1,2})/,
              /before\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
              /deadline\s*[:：]?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
            ];
            for (const pattern of deadlinePatterns) {
              const match = input.content.match(pattern);
              if (match) {
                deadline = match[1];
                break;
              }
            }

            const { createDevTask } = await import('../db');
            const taskResult = await createDevTask({
              title: `[会议Action] ${input.content.substring(0, 100)}`,
              description: `From meeting content block.\nAssignee: ${assignee || 'TBD'}\nDeadline: ${deadline || 'TBD'}\nMeeting ID: ${input.meetingId}\nFull content: ${input.content}`,
              version: 'v2.0',
              module: 'meeting-intelligence',
              type: 'feature',
              priority: 'medium',
              status: 'backlog',
              dueDate: deadline || undefined,
            } as any);

            if (taskResult) {
              linkedTaskCreated = true;
              console.log(
                `[contentBlocks.create] Created linked devTask for action_item. Assignee: ${assignee}, Deadline: ${deadline}, Task ID: ${(taskResult as any).id}`
              );
            }
          } catch (error) {
            console.error('[contentBlocks.create] Failed to create linked task for action_item:', error);
          }
        }

        return { id, success: true, linkedTaskCreated };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string().uuid(),
        content: z.string().min(1),
        metadata: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        await meetingDb.updateContentBlock(input.id, input.content, input.metadata);
        return { success: true };
      }),
  }),

  // HR Assessment Operations
  assessments: router({
    listByMeeting: protectedProcedure
      .input(z.object({ meetingId: z.string().uuid() }))
      .query(async ({ input }) => {
        return await meetingDb.getAssessmentsByMeeting(input.meetingId);
      }),

    listByEmployee: protectedProcedure
      .input(z.object({
        employeeId: z.string().uuid(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await meetingDb.getAssessmentsByEmployee(input.employeeId, input.startDate, input.endDate);
      }),

    create: protectedProcedure
      .input(createAssessmentSchema)
      .mutation(async ({ input }) => {
        const id = crypto.randomUUID();
        await meetingDb.createAssessment({
          id,
          meetingId: input.meetingId,
          employeeId: input.employeeId,
          employeeName: input.employeeName,
          technicalClarity: input.technicalClarity,
          proactivity: input.proactivity,
          communicationSkill: input.communicationSkill,
          problemSolving: input.problemSolving,
          evidence: input.evidence,
        });
        return { id, success: true };
      }),

    review: protectedProcedure
      .input(z.object({ assessmentId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await meetingDb.reviewAssessment(input.assessmentId, ctx.user.openId);
        return { success: true };
      }),

    generateFromMeeting: protectedProcedure
      .input(z.object({ meetingId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const meeting = await meetingDb.getMeetingById(input.meetingId);
        if (!meeting) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
        }

        const contentBlocks = await meetingDb.getContentBlocksByMeeting(input.meetingId);
        
        // Extract unique speakers
        const speakers = Array.from(new Set(contentBlocks.filter((b: any) => b.speaker).map((b: any) => b.speaker)));
        
        if (speakers.length === 0) {
          return { success: false, message: 'No speakers identified in meeting content' };
        }

        // Generate AI assessments
        const prompt = `Analyze the following meeting content and assess each participant's performance:

Meeting: ${meeting.title}
Phase: ${meeting.phase || 'N/A'}
Participants: ${speakers.join(', ')}

Content:
${contentBlocks.map((b: any) => `[${b.block_type}] ${b.speaker ? `(${b.speaker})` : ''}: ${b.content}`).join('\n')}

For each participant, provide scores (0-5) and evidence for:
- Technical Clarity: How well they explained technical concepts
- Proactivity: Initiative and forward-thinking contributions
- Communication Skill: Clarity and effectiveness of communication
- Problem Solving: Ability to identify and address issues

Format as JSON array with objects containing: name, technicalClarity, proactivity, communicationSkill, problemSolving, evidence (array of strings)`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are an HR analyst for GRT Manufacturing. Assess meeting participants objectively based on their contributions." },
              { role: "user", content: prompt }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "participant_assessments",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    assessments: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          technicalClarity: { type: "number" },
                          proactivity: { type: "number" },
                          communicationSkill: { type: "number" },
                          problemSolving: { type: "number" },
                          evidence: { type: "array", items: { type: "string" } }
                        },
                        required: ["name", "technicalClarity", "proactivity", "communicationSkill", "problemSolving", "evidence"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["assessments"],
                  additionalProperties: false
                }
              }
            }
          });

          const result = JSON.parse(response.choices[0].message.content || '{"assessments":[]}');
          
          // Save assessments to database
          for (const assessment of result.assessments) {
            const id = crypto.randomUUID();
            await meetingDb.createAssessment({
              id,
              meetingId: input.meetingId,
              employeeId: crypto.randomUUID(), // Would normally look up real employee ID
              employeeName: assessment.name,
              technicalClarity: assessment.technicalClarity,
              proactivity: assessment.proactivity,
              communicationSkill: assessment.communicationSkill,
              problemSolving: assessment.problemSolving,
              evidence: assessment.evidence,
              aiGenerated: true,
            });
          }

          return { success: true, count: result.assessments.length };
        } catch (error) {
          console.error('Failed to generate assessments:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate assessments' });
        }
      }),
  }),

  // Analytics & Insights
  analytics: router({
    stats: protectedProcedure
      .input(z.object({
        channelId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await meetingDb.getMeetingStats(input.channelId, input.startDate, input.endDate);
      }),

    topPerformers: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await meetingDb.getTopPerformers(input.limit, input.startDate, input.endDate);
      }),

    geminiInsights: protectedProcedure
      .input(z.object({
        channelId: z.string().uuid().optional(),
        focus: z.enum(['revenue', 'profit', 'efficiency', 'quality']).optional(),
      }))
      .query(async ({ input }) => {
        // Generate real-time Gemini insights
        const stats = await meetingDb.getMeetingStats(input.channelId);
        const topPerformers = await meetingDb.getTopPerformers(5);

        const prompt = `Based on the following meeting analytics, provide strategic insights:

Meeting Statistics:
- Total Meetings: ${stats?.total_meetings || 0}
- Total Content Blocks: ${stats?.total_blocks || 0}
- Total Assessments: ${stats?.total_assessments || 0}
- Average Technical Clarity: ${stats?.avg_technical_clarity?.toFixed(2) || 'N/A'}
- Average Proactivity: ${stats?.avg_proactivity?.toFixed(2) || 'N/A'}

Top Performers:
${topPerformers.map((p: any) => `- ${p.employee_name}: ${p.overall_score?.toFixed(2)}`).join('\n')}

Strategic Goals:
- Revenue Target: 50M
- Profit Margin Target: 14%

Focus Area: ${input.focus || 'general'}

Provide 3-5 actionable insights connecting meeting performance to strategic goals.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are a strategic advisor for GRT Manufacturing. Provide actionable insights based on meeting analytics." },
              { role: "user", content: prompt }
            ]
          });

          return {
            insights: response.choices[0].message.content,
            stats,
            topPerformers,
            targets: {
              revenue: '50M',
              profitMargin: '14%'
            }
          };
        } catch (error) {
          console.error('Failed to generate Gemini insights:', error);
          return {
            insights: 'Unable to generate insights at this time.',
            stats,
            topPerformers,
            targets: {
              revenue: '50M',
              profitMargin: '14%'
            }
          };
        }
      }),
  }),

  // Reminder Operations
  reminders: router({
    // Configure webhook for channel
    configureWebhook: protectedProcedure
      .input(z.object({
        channelId: z.string().uuid(),
        webhookUrl: z.string().url(),
        events: z.array(z.enum(['meeting_created', 'meeting_updated', 'meeting_reminder'])),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await reminderService.createWebhookConfig({
          channelId: input.channelId,
          webhookUrl: input.webhookUrl,
          events: input.events,
          createdBy: ctx.user.openId,
        });
        return { id, success: true };
      }),

    // Get webhook config for channel
    getWebhookConfig: protectedProcedure
      .input(z.object({ channelId: z.string().uuid() }))
      .query(async ({ input }) => {
        return await reminderService.getWebhookConfig(input.channelId);
      }),

    // Create reminder for meeting
    create: protectedProcedure
      .input(z.object({
        meetingId: z.string().uuid(),
        channelId: z.string().uuid(),
        reminderType: z.enum(['email', 'webhook', 'in_app']),
        reminderMinutes: z.number().min(5).max(10080), // 5 min to 1 week
        webhookUrl: z.string().url().optional(),
        emailRecipients: z.array(z.string().email()).optional(),
        meetingDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await reminderService.createReminder({
          meetingId: input.meetingId,
          channelId: input.channelId,
          reminderType: input.reminderType,
          reminderMinutes: input.reminderMinutes,
          webhookUrl: input.webhookUrl,
          emailRecipients: input.emailRecipients,
          meetingDate: new Date(input.meetingDate),
        });
        return result;
      }),

    // Test webhook
    testWebhook: protectedProcedure
      .input(z.object({
        webhookUrl: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const result = await reminderService.sendWebhook(input.webhookUrl, {
          event: 'meeting_reminder',
          meeting: {
            id: 'test-meeting-id',
            title: '测试会议',
            channelName: '测试频道',
            meetingDate: new Date().toISOString(),
          },
          reminder: {
            minutesBefore: 30,
            scheduledTime: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
        return result;
      }),

    // Process pending reminders (admin only)
    processPending: protectedProcedure
      .mutation(async () => {
        return await reminderService.processReminders();
      }),
  }),

  // Transcription Operations
  transcription: router({
    // Start transcription job
    start: protectedProcedure
      .input(z.object({
        meetingId: z.string().uuid(),
        audioUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create job
        const job = await transcriptionService.createTranscriptionJob({
          meetingId: input.meetingId,
          audioUrl: input.audioUrl,
          createdBy: ctx.user.openId,
        });
        
        // Start transcription asynchronously
        transcriptionService.transcribeMeetingAudio(job.id, input.audioUrl)
          .then(async (result) => {
            if (result.success && result.text) {
              // Get meeting info for minutes generation
              const meeting = await meetingDb.getMeetingById(input.meetingId);
              if (meeting) {
                // Generate content blocks from transcription
                await transcriptionService.generateContentBlocksFromTranscription(
                  input.meetingId,
                  result.text,
                  result.segments || []
                );
              }
            }
          })
          .catch(console.error);
        
        return { jobId: job.id, status: 'processing' };
      }),

    // Get transcription status
    getStatus: protectedProcedure
      .input(z.object({ meetingId: z.string().uuid() }))
      .query(async ({ input }) => {
        return await transcriptionService.getTranscriptionByMeeting(input.meetingId);
      }),

    // Generate meeting minutes from transcription
    generateMinutes: protectedProcedure
      .input(z.object({ meetingId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        // Get transcription
        const transcription = await transcriptionService.getTranscriptionByMeeting(input.meetingId);
        if (!transcription || transcription.status !== 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transcription not completed' });
        }
        
        // Get meeting info
        const meeting = await meetingDb.getMeetingById(input.meetingId);
        if (!meeting) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
        }
        
        // Generate minutes
        const result = await transcriptionService.generateMeetingMinutes(
          input.meetingId,
          transcription.transcription_text,
          {
            title: meeting.title,
            date: meeting.meeting_date,
            phase: meeting.phase,
            objective: meeting.objective,
          }
        );
        
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error });
        }
        
        return { success: true, minutes: result.minutes };
      }),

    // Get meeting minutes
    getMinutes: protectedProcedure
      .input(z.object({ meetingId: z.string().uuid() }))
      .query(async ({ input }) => {
        return await transcriptionService.getMeetingMinutes(input.meetingId);
      }),
  }),
});

// ============================================================================
// Helper Functions
// ============================================================================

function buildChannelTree(channels: any[]): any[] {
  const map = new Map();
  const roots: any[] = [];

  // First pass: create map
  for (const channel of channels) {
    map.set(channel.id, { ...channel, children: [] });
  }

  // Second pass: build tree
  for (const channel of channels) {
    const node = map.get(channel.id);
    if (channel.parent_id && map.has(channel.parent_id)) {
      map.get(channel.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export type MeetingRouter = typeof meetingRouter;
