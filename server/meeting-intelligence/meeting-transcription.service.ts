/**
 * Meeting Transcription Service
 * 会议录音转写服务 - 语音转文字和会议纪要生成
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { transcribeAudio } from "../_core/voiceTranscription";
import { invokeLLM } from "../_core/llm";

// ============================================================================
// Types
// ============================================================================

export interface TranscriptionResult {
  id: string;
  meetingId: string;
  audioUrl: string;
  text: string;
  language: string;
  segments: TranscriptionSegment[];
  duration: number;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

export interface MeetingMinutes {
  title: string;
  date: string;
  duration: string;
  attendees: string[];
  agenda: string[];
  keyPoints: string[];
  decisions: string[];
  actionItems: {
    task: string;
    owner: string;
    dueDate?: string;
    priority?: "high" | "medium" | "low";
  }[];
  risks: string[];
  nextMeeting?: string;
  summary: string;
}

// ============================================================================
// Transcription Operations
// ============================================================================

export async function createTranscriptionJob(data: {
  meetingId: string;
  audioUrl: string;
  createdBy: string;
}) {
  const db = await requireDb();
  const id = crypto.randomUUID();

  await db.execute(sql`
    INSERT INTO meeting_transcriptions (id, meeting_id, audio_url, status, created_by)
    VALUES (${id}, ${data.meetingId}, ${data.audioUrl}, 'pending', ${data.createdBy})
  `);

  return { id, status: "pending" };
}

export async function getTranscriptionByMeeting(meetingId: string) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM meeting_transcriptions
    WHERE meeting_id = ${meetingId}
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return (result.rows as any[])[0] || null;
}

export async function updateTranscriptionStatus(
  transcriptionId: string,
  status: "processing" | "completed" | "failed",
  data?: {
    text?: string;
    language?: string;
    segments?: TranscriptionSegment[];
    duration?: number;
    error?: string;
  }
) {
  const db = await requireDb();

  if (status === "completed" && data) {
    await db.execute(sql`
      UPDATE meeting_transcriptions
      SET status = 'completed',
          transcription_text = ${data.text || null},
          language = ${data.language || null},
          segments = ${data.segments ? JSON.stringify(data.segments) : null},
          duration_seconds = ${data.duration || null},
          completed_at = NOW()
      WHERE id = ${transcriptionId}
    `);
  } else if (status === "failed") {
    await db.execute(sql`
      UPDATE meeting_transcriptions
      SET status = 'failed', error = ${data?.error || 'Unknown error'}
      WHERE id = ${transcriptionId}
    `);
  } else {
    await db.execute(sql`
      UPDATE meeting_transcriptions
      SET status = ${status}
      WHERE id = ${transcriptionId}
    `);
  }
}

// ============================================================================
// Audio Transcription
// ============================================================================

export async function transcribeMeetingAudio(
  transcriptionId: string,
  audioUrl: string,
  language?: string
): Promise<{ success: boolean; text?: string; segments?: TranscriptionSegment[]; error?: string }> {
  try {
    // Update status to processing
    await updateTranscriptionStatus(transcriptionId, "processing");

    // Call Whisper API
    const result = await transcribeAudio({
      audioUrl,
      language,
      prompt: "会议录音转写，包含技术讨论、项目进度、决策事项",
    });

    // Check if result is an error
    if ('error' in result) {
      const errorMessage = result.error;
      await updateTranscriptionStatus(transcriptionId, "failed", { error: errorMessage });
      return { success: false, error: errorMessage };
    }

    // Parse segments
    const segments: TranscriptionSegment[] = result.segments?.map((seg: any) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
      confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : undefined,
    })) || [];

    // Calculate duration from last segment
    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

    // Update with results
    await updateTranscriptionStatus(transcriptionId, "completed", {
      text: result.text,
      language: result.language,
      segments,
      duration,
    });

    return { success: true, text: result.text, segments };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Transcription failed";
    await updateTranscriptionStatus(transcriptionId, "failed", { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Meeting Minutes Generation
// ============================================================================

export async function generateMeetingMinutes(
  meetingId: string,
  transcriptionText: string,
  meetingInfo: {
    title: string;
    date: string;
    phase?: string;
    objective?: string;
  }
): Promise<{ success: boolean; minutes?: MeetingMinutes; error?: string }> {
  try {
    const prompt = `Based on the following meeting transcription, generate structured meeting minutes:

Meeting Information:
- Title: ${meetingInfo.title}
- Date: ${meetingInfo.date}
- Phase: ${meetingInfo.phase || 'N/A'}
- Objective: ${meetingInfo.objective || 'N/A'}

Transcription:
${transcriptionText}

Please generate comprehensive meeting minutes including:
1. List of attendees (extract from transcription)
2. Agenda items discussed
3. Key points and discussions
4. Decisions made
5. Action items with owners and due dates
6. Risks or concerns identified
7. Next meeting date if mentioned
8. Executive summary

Format as JSON with the following structure:
{
  "title": "string",
  "date": "string",
  "duration": "string",
  "attendees": ["string"],
  "agenda": ["string"],
  "keyPoints": ["string"],
  "decisions": ["string"],
  "actionItems": [{"task": "string", "owner": "string", "dueDate": "string", "priority": "high|medium|low"}],
  "risks": ["string"],
  "nextMeeting": "string or null",
  "summary": "string"
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a professional meeting secretary for GRT Manufacturing. Generate accurate, well-structured meeting minutes from transcriptions. Focus on capturing key decisions, action items, and strategic alignment with company goals (50M revenue, 14% profit margin).",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meeting_minutes",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              date: { type: "string" },
              duration: { type: "string" },
              attendees: { type: "array", items: { type: "string" } },
              agenda: { type: "array", items: { type: "string" } },
              keyPoints: { type: "array", items: { type: "string" } },
              decisions: { type: "array", items: { type: "string" } },
              actionItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task: { type: "string" },
                    owner: { type: "string" },
                    dueDate: { type: "string" },
                    priority: { type: "string" },
                  },
                  required: ["task", "owner"],
                  additionalProperties: false,
                },
              },
              risks: { type: "array", items: { type: "string" } },
              nextMeeting: { type: "string" },
              summary: { type: "string" },
            },
            required: [
              "title",
              "date",
              "duration",
              "attendees",
              "agenda",
              "keyPoints",
              "decisions",
              "actionItems",
              "risks",
              "summary",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const minutes = JSON.parse(response.choices[0].message.content || "{}") as MeetingMinutes;

    // Save minutes to database
    await saveMeetingMinutes(meetingId, minutes);

    return { success: true, minutes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate minutes",
    };
  }
}

export async function saveMeetingMinutes(meetingId: string, minutes: MeetingMinutes) {
  const db = await requireDb();
  const id = crypto.randomUUID();

  await db.execute(sql`
    INSERT INTO meeting_minutes (id, meeting_id, minutes_data, created_at)
    VALUES (${id}, ${meetingId}, ${JSON.stringify(minutes)}, NOW())
    ON CONFLICT (meeting_id) DO UPDATE SET
      minutes_data = ${JSON.stringify(minutes)},
      updated_at = NOW()
  `);

  return id;
}

export async function getMeetingMinutes(meetingId: string) {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM meeting_minutes
    WHERE meeting_id = ${meetingId}
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const record = (result.rows as any[])[0];
  if (!record) return null;

  return {
    id: record.id,
    meetingId: record.meeting_id,
    minutes: typeof record.minutes_data === "string"
      ? JSON.parse(record.minutes_data)
      : record.minutes_data,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// ============================================================================
// Speaker Diarization (Future Enhancement)
// ============================================================================

export async function identifySpeakers(
  segments: TranscriptionSegment[],
  knownSpeakers?: string[]
): Promise<TranscriptionSegment[]> {
  // This would use speaker diarization ML models
  // For now, return segments as-is
  // Future implementation could use:
  // - pyannote.audio for speaker diarization
  // - Voice embeddings for speaker identification

  return segments;
}

// ============================================================================
// Content Block Generation from Transcription
// ============================================================================

export async function generateContentBlocksFromTranscription(
  meetingId: string,
  transcriptionText: string,
  segments: TranscriptionSegment[]
): Promise<{ success: boolean; blockCount: number; error?: string }> {
  const db = await requireDb();

  try {
    // Use AI to identify key content blocks
    const prompt = `Analyze the following meeting transcription and identify key content blocks:

Transcription:
${transcriptionText}

Identify and categorize content into the following block types:
- decision: Key decisions made during the meeting
- action_item: Tasks assigned to specific people
- question: Important questions raised
- insight: Key insights or observations

Format as JSON array:
[
  {
    "blockType": "decision|action_item|question|insight",
    "content": "The actual content",
    "speaker": "Speaker name if identifiable",
    "sortOrder": number
  }
]`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a meeting analyst. Extract key content blocks from meeting transcriptions.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "content_blocks",
          strict: true,
          schema: {
            type: "object",
            properties: {
              blocks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    blockType: { type: "string" },
                    content: { type: "string" },
                    speaker: { type: "string" },
                    sortOrder: { type: "number" },
                  },
                  required: ["blockType", "content", "sortOrder"],
                  additionalProperties: false,
                },
              },
            },
            required: ["blocks"],
            additionalProperties: false,
          },
        },
      },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"blocks":[]}');

    // Insert content blocks
    for (const block of result.blocks) {
      const id = crypto.randomUUID();
      await db.execute(sql`
        INSERT INTO meeting_content_blocks (id, meeting_id, block_type, content, speaker, sort_order, metadata)
        VALUES (${id}, ${meetingId}, ${block.blockType}, ${block.content}, ${block.speaker || null}, ${block.sortOrder}, ${JSON.stringify({ source: 'transcription' })})
      `);
    }

    return { success: true, blockCount: result.blocks.length };
  } catch (error) {
    return {
      success: false,
      blockCount: 0,
      error: error instanceof Error ? error.message : "Failed to generate content blocks",
    };
  }
}

console.log("[MeetingTranscription] Meeting transcription service loaded");
