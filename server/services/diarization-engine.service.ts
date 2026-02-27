/**
 * Mock Speaker Diarization Engine
 *
 * Simulates voice-print analysis for a meeting:
 *   - Detects 4 speakers (2 matched, 2 unknown)
 *   - Persists results to `meeting_speakers` table (delete-then-insert)
 *
 * In production this would call a real ASR/diarization API (e.g. Azure Speech,
 * Google Cloud Speech-to-Text, or an on-prem Whisper + pyannote pipeline).
 */
import { requireDb } from "../db";
import { meetingSpeakers } from "../../drizzle/smart-meetings-schema";
import { eq } from "drizzle-orm";

export interface DiarizationSpeaker {
  speakerLabel: string;
  matchedProfileId: number | null;
  matchedProfileType: string | null;
  matchedProfileName: string | null;
  voiceSnippetUrl: string | null;
  matchConfidence: string | null;
  firstSpokenAt: Date;
  speakingDurationSec: number;
}

export interface DiarizationResult {
  meetingId: number;
  speakers: DiarizationSpeaker[];
  totalSpeakers: number;
  matchedCount: number;
  unknownCount: number;
}

/**
 * Analyze meeting audio and return diarization results.
 * Currently returns mock data — 4 speakers (2 known, 2 unknown).
 */
export async function analyzeMeetingAudio(
  meetingId: number
): Promise<DiarizationResult> {
  const baseTime = new Date();
  baseTime.setHours(14, 0, 0, 0);

  const mockSpeakers: DiarizationSpeaker[] = [
    {
      speakerLabel: "Speaker 1",
      matchedProfileId: 1,
      matchedProfileType: "EMPLOYEE",
      matchedProfileName: "CEO (张总)",
      voiceSnippetUrl: null,
      matchConfidence: "0.96",
      firstSpokenAt: new Date(baseTime.getTime()),
      speakingDurationSec: 1800, // 30 min
    },
    {
      speakerLabel: "Speaker 2",
      matchedProfileId: 201,
      matchedProfileType: "CUSTOMER",
      matchedProfileName: "张总 (华为)",
      voiceSnippetUrl: null,
      matchConfidence: "0.89",
      firstSpokenAt: new Date(baseTime.getTime() + 2 * 60_000),
      speakingDurationSec: 600, // 10 min
    },
    {
      speakerLabel: "Speaker 12",
      matchedProfileId: null,
      matchedProfileType: null,
      matchedProfileName: null,
      voiceSnippetUrl: `/api/voice-snippets/meeting-${meetingId}-speaker-12.wav`,
      matchConfidence: null,
      firstSpokenAt: new Date(baseTime.getTime() + 5 * 60_000),
      speakingDurationSec: 240, // 4 min
    },
    {
      speakerLabel: "Speaker 13",
      matchedProfileId: null,
      matchedProfileType: null,
      matchedProfileName: null,
      voiceSnippetUrl: `/api/voice-snippets/meeting-${meetingId}-speaker-13.wav`,
      matchConfidence: null,
      firstSpokenAt: new Date(baseTime.getTime() + 8 * 60_000),
      speakingDurationSec: 180, // 3 min
    },
  ];

  // Persist: delete previous results for this meeting, then insert fresh
  const db = await requireDb();
  await db
    .delete(meetingSpeakers)
    .where(eq(meetingSpeakers.meetingId, meetingId));

  const now = new Date();
  for (const s of mockSpeakers) {
    await db.insert(meetingSpeakers).values({
      meetingId,
      speakerLabel: s.speakerLabel,
      matchedProfileId: s.matchedProfileId,
      matchedProfileType: s.matchedProfileType,
      matchedProfileName: s.matchedProfileName,
      voiceSnippetUrl: s.voiceSnippetUrl,
      matchConfidence: s.matchConfidence,
      firstSpokenAt: s.firstSpokenAt,
      speakingDurationSec: s.speakingDurationSec,
      createdAt: now,
      updatedAt: now,
    });
  }

  const matched = mockSpeakers.filter((s) => s.matchedProfileId !== null);
  return {
    meetingId,
    speakers: mockSpeakers,
    totalSpeakers: mockSpeakers.length,
    matchedCount: matched.length,
    unknownCount: mockSpeakers.length - matched.length,
  };
}
