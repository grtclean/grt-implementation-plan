/**
 * Transcription Service
 * 使用Whisper API进行音频转录
 */

import { transcribeAudio } from "../_core/voiceTranscription";
import { requireDb } from '../utils/db-helpers';
import { v4 as uuidv4 } from "uuid";
import { meetings, meetingNotes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface TranscriptionResult {
  text: string;
  language: string;
  segments: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
}

/**
 * 转录会议音频
 */
export async function transcribeMeetingAudio(
  meetingId: string,
  audioUrl: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  const database = await requireDb();

  // 验证会议存在
  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .then((results) => results[0]);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  try {
    // 调用Whisper API
    const result = await transcribeAudio({
      audioUrl,
      language: options?.language,
      prompt: options?.prompt || `This is a meeting about ${meeting.title}. Meeting type: ${meeting.meetingType}`,
    });

    return result as TranscriptionResult;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}

/**
 * 转录并自动生成会议笔记
 */
export async function transcribeAndGenerateNotes(
  meetingId: string,
  audioUrl: string,
  userId: number,
  options?: TranscriptionOptions
): Promise<{ transcription: TranscriptionResult; noteId: string }> {
  // 转录音频
  const transcription = await transcribeMeetingAudio(meetingId, audioUrl, options);

  // 生成会议笔记（使用转录文本）
  const database = await requireDb();
  const noteId = uuidv4();

  // 创建Tiptap格式的笔记内容
  const noteContent = generateNoteContent(transcription.text);

  await database.insert(meetingNotes).values({
    id: noteId,
    meetingId,
    content: noteContent,
    editedBy: userId,
    version: 1,
  });

  return {
    transcription,
    noteId,
  };
}

/**
 * 从转录文本生成Tiptap格式的笔记
 */
function generateNoteContent(transcriptionText: string): string {
  // 将转录文本分段
  const paragraphs = transcriptionText.split(/\n+/).filter((p) => p.trim());

  const content = {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: paragraph,
        },
      ],
    })),
  };

  return JSON.stringify(content);
}

/**
 * 获取转录统计
 */
export async function getTranscriptionStats(meetingId: string): Promise<{
  totalDuration: number;
  wordCount: number;
  language: string;
  confidence: number;
}> {
  const database = await requireDb();

  // 获取会议笔记
  const notes = await database
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.meetingId, meetingId))
    .then((results) => results[results.length - 1]); // 获取最新版本

  if (!notes) {
    return {
      totalDuration: 0,
      wordCount: 0,
      language: "unknown",
      confidence: 0,
    };
  }

  // 解析笔记内容
  try {
    const content = JSON.parse(notes.content);
    const text = extractTextFromTiptap(content);
    const wordCount = text.split(/\s+/).length;

    return {
      totalDuration: 0, // 需要从音频元数据获取
      wordCount,
      language: "zh", // 默认中文
      confidence: 0.95,
    };
  } catch (error) {
    return {
      totalDuration: 0,
      wordCount: 0,
      language: "unknown",
      confidence: 0,
    };
  }
}

/**
 * 从Tiptap JSON中提取文本
 */
function extractTextFromTiptap(content: any): string {
  if (!content) return "";

  let text = "";

  if (content.type === "text") {
    text += content.text || "";
  } else if (content.content && Array.isArray(content.content)) {
    text += content.content.map((child: any) => extractTextFromTiptap(child)).join(" ");
  }

  return text;
}

/**
 * 获取转录的音频文件URL
 */
export async function getTranscriptionAudioUrl(
  meetingId: string
): Promise<string | null> {
  // 这个函数可以从存储服务中获取音频URL
  // 实现取决于您的存储解决方案
  return null;
}

/**
 * 删除转录数据
 */
export async function deleteTranscription(meetingId: string): Promise<void> {
  const database = await requireDb();

  // 删除相关的笔记
  // 注意：这里需要根据您的实际schema进行调整
  // await database.delete(meetingNotes).where(eq(meetingNotes.meetingId, meetingId));
}

/**
 * 支持的语言列表
 */
export const SUPPORTED_LANGUAGES = [
  { code: "zh", name: "中文" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
];

/**
 * 获取转录进度
 */
export async function getTranscriptionProgress(
  meetingId: string
): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
}> {
  // 这个函数可以从缓存或数据库中获取转录进度
  // 实现取决于您的具体需求
  return {
    status: "completed",
    progress: 100,
  };
}
