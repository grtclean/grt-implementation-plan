import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  processMeeting,
  generateMarkdownMinutes,
  generateMeetingJSON,
  type MeetingData,
  type ProcessedMeeting,
} from '../services/meeting-processor.service';

/**
 * 会议处理器路由
 * 提供会议分析、纪要生成、数据导出等功能
 */
export const meetingProcessorRouter = router({
  /**
   * 处理会议数据并生成结构化分析
   */
  processMeeting: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, '会议标题不能为空'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误'),
        participants: z.array(z.string()).min(1, '至少需要一个参会人员'),
        duration: z.number().min(0, '会议时长不能为负数'),
        notes: z.string().min(1, '会议笔记不能为空'),
        agendas: z.array(
          z.object({
            title: z.string(),
            duration: z.number(),
            status: z.enum(['completed', 'pending', 'in-progress']),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const meetingData: MeetingData = {
          title: input.title,
          date: input.date,
          participants: input.participants,
          duration: input.duration,
          notes: input.notes,
          agendas: input.agendas,
        };

        const processed = await processMeeting(meetingData);
        return {
          success: true,
          data: processed,
        };
      } catch (error) {
        console.error('Failed to process meeting:', error);
        throw new Error('会议处理失败，请重试');
      }
    }),

  /**
   * 生成Markdown格式的会议纪要
   */
  generateMarkdownMinutes: protectedProcedure
    .input(
      z.object({
        meeting: z.object({
          title: z.string(),
          date: z.string(),
          participants: z.array(z.string()),
          duration: z.string(),
          summary: z.string(),
          keyPoints: z.array(z.string()),
          actionItems: z.array(
            z.object({
              title: z.string(),
              owner: z.string().optional(),
              dueDate: z.string().optional(),
              priority: z.enum(['high', 'medium', 'low']),
              description: z.string().optional(),
            })
          ),
          decisions: z.array(z.string()),
          nextSteps: z.array(z.string()),
          aiInsights: z.array(
            z.object({
              type: z.enum(['summary', 'keypoint', 'action', 'decision']),
              content: z.string(),
              confidence: z.number(),
            })
          ),
        }),
      })
    )
    .query(({ input }) => {
      try {
        const markdown = generateMarkdownMinutes(input.meeting);
        return {
          success: true,
          data: markdown,
        };
      } catch (error) {
        console.error('Failed to generate markdown minutes:', error);
        throw new Error('生成Markdown纪要失败');
      }
    }),

  /**
   * 生成JSON格式的会议数据
   */
  generateMeetingJSON: protectedProcedure
    .input(
      z.object({
        meeting: z.object({
          title: z.string(),
          date: z.string(),
          participants: z.array(z.string()),
          duration: z.string(),
          summary: z.string(),
          keyPoints: z.array(z.string()),
          actionItems: z.array(
            z.object({
              title: z.string(),
              owner: z.string().optional(),
              dueDate: z.string().optional(),
              priority: z.enum(['high', 'medium', 'low']),
              description: z.string().optional(),
            })
          ),
          decisions: z.array(z.string()),
          nextSteps: z.array(z.string()),
          aiInsights: z.array(
            z.object({
              type: z.enum(['summary', 'keypoint', 'action', 'decision']),
              content: z.string(),
              confidence: z.number(),
            })
          ),
        }),
      })
    )
    .query(({ input }) => {
      try {
        const json = generateMeetingJSON(input.meeting);
        return {
          success: true,
          data: json,
        };
      } catch (error) {
        console.error('Failed to generate meeting JSON:', error);
        throw new Error('生成JSON数据失败');
      }
    }),

  /**
   * 导出会议纪要为文件
   */
  exportMeetingMinutes: protectedProcedure
    .input(
      z.object({
        meeting: z.object({
          title: z.string(),
          date: z.string(),
          participants: z.array(z.string()),
          duration: z.string(),
          summary: z.string(),
          keyPoints: z.array(z.string()),
          actionItems: z.array(
            z.object({
              title: z.string(),
              owner: z.string().optional(),
              dueDate: z.string().optional(),
              priority: z.enum(['high', 'medium', 'low']),
              description: z.string().optional(),
            })
          ),
          decisions: z.array(z.string()),
          nextSteps: z.array(z.string()),
          aiInsights: z.array(
            z.object({
              type: z.enum(['summary', 'keypoint', 'action', 'decision']),
              content: z.string(),
              confidence: z.number(),
            })
          ),
        }),
        format: z.enum(['markdown', 'json']).default('markdown'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        let content: string;
        let filename: string;
        let mimeType: string;

        if (input.format === 'markdown') {
          content = generateMarkdownMinutes(input.meeting);
          filename = `${input.meeting.title}-${input.meeting.date}.md`;
          mimeType = 'text/markdown';
        } else {
          content = generateMeetingJSON(input.meeting);
          filename = `${input.meeting.title}-${input.meeting.date}.json`;
          mimeType = 'application/json';
        }

        // 这里可以集成S3存储或其他文件服务
        // 返回下载URL或文件内容
        return {
          success: true,
          data: {
            filename,
            content,
            mimeType,
          },
        };
      } catch (error) {
        console.error('Failed to export meeting minutes:', error);
        throw new Error('导出会议纪要失败');
      }
    }),

  /**
   * 批量处理多个会议
   */
  processMeetingsBatch: protectedProcedure
    .input(
      z.object({
        meetings: z.array(
          z.object({
            title: z.string(),
            date: z.string(),
            participants: z.array(z.string()),
            duration: z.number(),
            notes: z.string(),
            agendas: z.array(
              z.object({
                title: z.string(),
                duration: z.number(),
                status: z.enum(['completed', 'pending', 'in-progress']),
              })
            ),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const results = await Promise.all(
          input.meetings.map(async (meeting) => {
            const meetingData: MeetingData = {
              title: meeting.title,
              date: meeting.date,
              participants: meeting.participants,
              duration: meeting.duration,
              notes: meeting.notes,
              agendas: meeting.agendas,
            };

            try {
              const processed = await processMeeting(meetingData);
              return {
                success: true,
                title: meeting.title,
                data: processed,
              };
            } catch (error) {
              return {
                success: false,
                title: meeting.title,
                error: error instanceof Error ? error.message : '处理失败',
              };
            }
          })
        );

        return {
          success: true,
          results,
          successCount: results.filter((r) => r.success).length,
          failureCount: results.filter((r) => !r.success).length,
        };
      } catch (error) {
        console.error('Failed to process meetings batch:', error);
        throw new Error('批量处理会议失败');
      }
    }),
});
