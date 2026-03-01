/**
 * Smart Meeting Router — Unit Tests
 *
 * 9 sub-routers, 33 procedures total:
 *
 *   meeting:     list, getById, create, updateStatus, updateTranscript, generateQuiz, createTeamsLink, getStats
 *   attendance:  listByMeeting, checkIn, requestLeave, markAbsent
 *   interaction: getByUser, saveNotes, submitQuiz, submitReflection
 *   penalty:     list, processAbsences, getStats
 *   chat:        getMessages, sendMessage
 *   seed:        seedDemo
 *   speaker:     analyze, listByMeeting, bindProfile, unbindProfile
 *   analytics:   meetingRoi, aggregatedRoi
 *   review:      createReviewMeeting, submitEvaluation, getEvaluations, getAnalysis, seedDemo
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

/**
 * Two-layer mock: `db` (no .then) -> `chain` (thenable).
 * This avoids the JS thenable-unwrapping issue where Promise.resolve(obj)
 * calls obj.then() if it exists, destroying the mock.
 */
function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve(mockQueryResult)),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock schema tables ──────────────────────────────────────
vi.mock("../../drizzle/smart-meetings-schema", () => ({
  sysMeetings: {
    id: "id",
    title: "title",
    type: "type",
    status: "status",
    description: "description",
    transcript: "transcript",
    organizerName: "organizerName",
    organizerId: "organizerId",
    scheduledStart: "scheduledStart",
    scheduledEnd: "scheduledEnd",
    actualStart: "actualStart",
    actualEnd: "actualEnd",
    expectedAttendees: "expectedAttendees",
    teamsUrl: "teamsUrl",
    aiQuizQuestions: "aiQuizQuestions",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  meetingAttendance: {
    id: "id",
    meetingId: "meetingId",
    userId: "userId",
    userName: "userName",
    status: "status",
    checkInTime: "checkInTime",
    leaveTime: "leaveTime",
    leaveReason: "leaveReason",
    checkInMethod: "checkInMethod",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  meetingInteractions: {
    id: "id",
    meetingId: "meetingId",
    userId: "userId",
    userName: "userName",
    personalNotes: "personalNotes",
    aiQuizScore: "aiQuizScore",
    aiQuizAnswers: "aiQuizAnswers",
    takeawayReflection: "takeawayReflection",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  hrPenalties: {
    id: "id",
    userId: "userId",
    userName: "userName",
    penaltyLevel: "penaltyLevel",
    reason: "reason",
    deductedKpiPoints: "deductedKpiPoints",
    meetingId: "meetingId",
    meetingTitle: "meetingTitle",
    makeupTaskCreated: "makeupTaskCreated",
    notificationSent: "notificationSent",
    notificationChannel: "notificationChannel",
    createdAt: "createdAt",
  },
  meetingSpeakers: {
    id: "id",
    meetingId: "meetingId",
    speakerLabel: "speakerLabel",
    matchedProfileId: "matchedProfileId",
    matchedProfileType: "matchedProfileType",
    matchedProfileName: "matchedProfileName",
    voiceSnippetUrl: "voiceSnippetUrl",
    matchConfidence: "matchConfidence",
    firstSpokenAt: "firstSpokenAt",
    speakingDurationSec: "speakingDurationSec",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  meetingReviewEvaluations: {
    id: "id",
    meetingId: "meetingId",
    speakerId: "speakerId",
    speakerName: "speakerName",
    evaluatorId: "evaluatorId",
    evaluatorName: "evaluatorName",
    dimension: "dimension",
    score: "score",
    comment: "comment",
    createdAt: "createdAt",
  },
  meetingActionItems: {
    id: "id",
    meetingId: "meetingId",
    assignedTo: "assignedTo",
    assignedToName: "assignedToName",
    taskDesc: "taskDesc",
    status: "status",
    dueDate: "dueDate",
    completedAt: "completedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  hrAiPerformance: {
    id: "id",
    userId: "userId",
    userName: "userName",
    month: "month",
    breadthScore: "breadthScore",
    depthScore: "depthScore",
    executionScore: "executionScore",
    disciplineScore: "disciplineScore",
    meetingScore: "meetingScore",
    totalScore: "totalScore",
    aiEvaluationSummary: "aiEvaluationSummary",
    meetingsAttended: "meetingsAttended",
    meetingsTotal: "meetingsTotal",
    actionItemsCompleted: "actionItemsCompleted",
    actionItemsTotal: "actionItemsTotal",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

// ── Mock service imports ────────────────────────────────────
const mockAnalyzeMeetingAudio = vi.fn().mockResolvedValue({
  meetingId: 1,
  speakers: [],
  totalSpeakers: 4,
  matchedCount: 2,
  unknownCount: 2,
});

vi.mock("../services/diarization-engine.service", () => ({
  analyzeMeetingAudio: (...args: any[]) => mockAnalyzeMeetingAudio(...args),
}));

const mockCreateTeamsMeeting = vi.fn().mockResolvedValue({
  teamsUrl: "https://teams.microsoft.com/l/meetup-join/mock",
  teamsMeetingId: "GRT-MTG-MOCK",
  outlookEventId: "AAMkMock123",
  calendarSynced: true,
  createdAt: "2026-01-01T00:00:00.000Z",
});

vi.mock("../services/microsoft-teams.service", () => ({
  createTeamsMeeting: (...args: any[]) => mockCreateTeamsMeeting(...args),
}));

const mockCalculateMeetingROI = vi.fn().mockResolvedValue({
  meetingId: 1,
  meetingTitle: "Test Meeting",
  totalSpeakers: 4,
  identifiedSpeakers: 2,
  totalSpeakingTimeSec: 3600,
  participationBalance: 70,
  speakerBreakdown: [],
  actionItemsTotal: 5,
  actionItemsCompleted: 3,
  actionItemsOverdue: 1,
  actionItemCompletionRate: 60,
  attendeeCount: 10,
  presentCount: 8,
  absentCount: 2,
  attendanceRate: 80,
  avgQuizScore: 75,
  quizParticipants: 5,
  roiScore: 72,
  roiBreakdown: {
    participationComponent: 70,
    actionComponent: 60,
    attendanceComponent: 80,
    engagementComponent: 75,
  },
});

const mockGetAggregatedROI = vi.fn().mockResolvedValue({
  totalMeetings: 3,
  avgRoiScore: 65,
  avgParticipationBalance: 60,
  avgActionCompletionRate: 55,
  avgAttendanceRate: 75,
  avgEngagementScore: 70,
  meetingRois: [
    { meetingId: 1, title: "Meeting A", roiScore: 80 },
    { meetingId: 2, title: "Meeting B", roiScore: 50 },
  ],
});

vi.mock("../services/meeting-analytics-engine.service", () => ({
  calculateMeetingROI: (...args: any[]) => mockCalculateMeetingROI(...args),
  getAggregatedROI: (...args: any[]) => mockGetAggregatedROI(...args),
}));

const mockProcessAbsences = vi.fn().mockResolvedValue([
  {
    userId: 10,
    userName: "Test User",
    penaltyLevel: "WARNING",
    reason: "First absence",
    deductedKpiPoints: 0,
    makeupTaskCreated: false,
    notifications: ["email"],
  },
]);

vi.mock("../services/hr-meeting-engine", () => ({
  processAbsences: (...args: any[]) => mockProcessAbsences(...args),
}));

// Mock task worker service (async task queue pattern)
const mockSubmitTask = vi.fn().mockResolvedValue({ taskId: 42 });
const mockGetTaskStatus = vi.fn().mockResolvedValue({ id: 42, status: "completed", resultData: {} });

vi.mock("../services/task-worker.service", () => ({
  submitTask: (...args: any[]) => mockSubmitTask(...args),
  getTaskStatus: (...args: any[]) => mockGetTaskStatus(...args),
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
  mockSubmitTask.mockReset().mockResolvedValue({ taskId: 42 });
  mockGetTaskStatus.mockReset().mockResolvedValue({ id: 42, status: "completed", resultData: {} });
});

// ═══════════════════════════════════════════════════════════
//  Tests
// ═══════════════════════════════════════════════════════════

describe("smartMeeting router", () => {
  // ───────────────────────────────────────────────────────
  //  1. meeting sub-router
  // ───────────────────────────────────────────────────────
  describe("meeting", () => {
    describe("list", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(caller.smartMeeting.meeting.list()).rejects.toThrow();
      });

      it("returns list of meetings with default limit", async () => {
        const caller = createAuthenticatedCaller();
        const meetings = [
          { id: 1, title: "Meeting 1", status: "LIVE" },
          { id: 2, title: "Meeting 2", status: "UPCOMING" },
        ];
        mockQueryResult = meetings;
        const result = await caller.smartMeeting.meeting.list();
        expect(result).toEqual(meetings);
        expect(mockDb.select).toHaveBeenCalled();
      });

      it("filters by status and type when provided", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [{ id: 1, title: "Major Live", status: "LIVE", type: "MAJOR" }];
        const result = await caller.smartMeeting.meeting.list({
          status: "LIVE",
          type: "MAJOR",
          limit: 10,
        });
        expect(result).toHaveLength(1);
      });

      it("returns empty array when no meetings", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.meeting.list();
        expect(result).toEqual([]);
      });
    });

    describe("getById", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.meeting.getById({ id: 1 })
        ).rejects.toThrow();
      });

      it("returns meeting when found", async () => {
        const caller = createAuthenticatedCaller();
        const meeting = { id: 1, title: "Test Meeting", status: "LIVE" };
        mockQueryResult = [meeting];
        const result = await caller.smartMeeting.meeting.getById({ id: 1 });
        expect(result).toEqual(meeting);
      });

      it("returns null when not found", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.meeting.getById({ id: 999 });
        expect(result).toBeNull();
      });

      it("accepts string id", async () => {
        const caller = createAuthenticatedCaller();
        const meeting = { id: 42, title: "String ID Meeting" };
        mockQueryResult = [meeting];
        const result = await caller.smartMeeting.meeting.getById({ id: "42" });
        expect(result).toEqual(meeting);
      });
    });

    describe("create", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.meeting.create({ title: "Test" })
        ).rejects.toThrow();
      });

      it("creates a meeting with required fields", async () => {
        const caller = createAuthenticatedCaller();
        const created = {
          id: 1,
          title: "New Meeting",
          type: "MINOR",
          status: "UPCOMING",
        };
        mockReturningResult = [created];
        const result = await caller.smartMeeting.meeting.create({
          title: "New Meeting",
        });
        expect(result).toEqual(created);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("creates a meeting with all optional fields", async () => {
        const caller = createAuthenticatedCaller();
        const created = {
          id: 2,
          title: "Full Meeting",
          type: "MAJOR",
          status: "UPCOMING",
          description: "A full meeting",
          organizerName: "CEO",
          organizerId: 1,
        };
        mockReturningResult = [created];
        const result = await caller.smartMeeting.meeting.create({
          title: "Full Meeting",
          type: "MAJOR",
          description: "A full meeting",
          organizerName: "CEO",
          organizerId: 1,
          scheduledStart: "2026-03-01T09:00:00.000Z",
          scheduledEnd: "2026-03-01T10:00:00.000Z",
          expectedAttendees: 50,
        });
        expect(result).toEqual(created);
      });

      it("rejects empty title", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.meeting.create({ title: "" })
        ).rejects.toThrow();
      });

      it("rejects invalid type enum", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.meeting.create({
            title: "Test",
            type: "INVALID" as any,
          })
        ).rejects.toThrow();
      });
    });

    describe("updateStatus", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.meeting.updateStatus({ id: 1, status: "LIVE" })
        ).rejects.toThrow();
      });

      it("transitions to LIVE", async () => {
        const caller = createAuthenticatedCaller();
        const updated = { id: 1, status: "LIVE", actualStart: new Date() };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.meeting.updateStatus({
          id: 1,
          status: "LIVE",
        });
        expect(result).toEqual(updated);
      });

      it("transitions to ENDED", async () => {
        const caller = createAuthenticatedCaller();
        const updated = { id: 1, status: "ENDED", actualEnd: new Date() };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.meeting.updateStatus({
          id: 1,
          status: "ENDED",
        });
        expect(result).toEqual(updated);
      });

      it("accepts string id", async () => {
        const caller = createAuthenticatedCaller();
        mockReturningResult = [{ id: 5, status: "UPCOMING" }];
        const result = await caller.smartMeeting.meeting.updateStatus({
          id: "5",
          status: "UPCOMING",
        });
        expect(result).toHaveProperty("status", "UPCOMING");
      });

      it("rejects invalid status enum", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.meeting.updateStatus({
            id: 1,
            status: "CANCELLED" as any,
          })
        ).rejects.toThrow();
      });
    });

    describe("updateTranscript", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.meeting.updateTranscript({
            id: 1,
            transcript: "test",
          })
        ).rejects.toThrow();
      });

      it("updates transcript successfully", async () => {
        const caller = createAuthenticatedCaller();
        const updated = {
          id: 1,
          transcript: "New transcript content",
        };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.meeting.updateTranscript({
          id: 1,
          transcript: "New transcript content",
        });
        expect(result).toEqual(updated);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe("generateQuiz", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.meeting.generateQuiz({ id: 1 })
        ).rejects.toThrow();
      });

      it("throws when meeting not found", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        await expect(
          caller.smartMeeting.meeting.generateQuiz({ id: 999 })
        ).rejects.toThrow("Meeting not found");
      });

      it("submits task and returns taskId with processing status", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          {
            id: 1,
            title: "Strategy Meeting",
            transcript: "AI manufacturing discussion...",
            description: null,
          },
        ]);
        const result = await caller.smartMeeting.meeting.generateQuiz({
          id: 1,
        });
        expect(result).toHaveProperty("success", true);
        expect(result.taskId).toBe(42);
        expect(result.status).toBe("processing");
        expect(result.questions).toBeNull();
        expect(mockSubmitTask).toHaveBeenCalledOnce();
      });

      it("calls submitTask with MEETING_QUIZ_GENERATE type", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          {
            id: 5,
            title: "Test Meeting",
            transcript: "Some transcript text",
            description: null,
          },
        ]);
        await caller.smartMeeting.meeting.generateQuiz({ id: 5 });

        expect(mockSubmitTask).toHaveBeenCalledOnce();
        expect(mockSubmitTask.mock.calls[0][0]).toBe("MEETING_QUIZ_GENERATE");
        expect(mockSubmitTask.mock.calls[0][1]).toEqual({
          meetingId: 5,
          meetingTitle: "Test Meeting",
          transcript: "Some transcript text",
        });
      });

      it("uses description when transcript is missing", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          {
            id: 1,
            title: "Meeting Title",
            transcript: null,
            description: "Meeting Description",
          },
        ]);
        await caller.smartMeeting.meeting.generateQuiz({ id: 1 });

        expect(mockSubmitTask.mock.calls[0][1].transcript).toBe(
          "Meeting Description"
        );
      });

      it("uses title as fallback when both transcript and description are missing", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          {
            id: 1,
            title: "Fallback Title",
            transcript: null,
            description: null,
          },
        ]);
        await caller.smartMeeting.meeting.generateQuiz({ id: 1 });

        expect(mockSubmitTask.mock.calls[0][1].transcript).toBe(
          "Fallback Title"
        );
      });

      it("propagates submitTask failure", async () => {
        const caller = createAuthenticatedCaller();
        mockSubmitTask.mockRejectedValueOnce(new Error("Queue unavailable"));
        selectResultsQueue.push([
          {
            id: 1,
            title: "Test",
            transcript: "text",
            description: null,
          },
        ]);
        await expect(
          caller.smartMeeting.meeting.generateQuiz({ id: 1 })
        ).rejects.toThrow("Queue unavailable");
      });
    });

    describe("getQuizStatus", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.meeting.getQuizStatus({ taskId: 42, meetingId: 1 })
        ).rejects.toThrow();
      });

      it("returns completed status with quiz questions", async () => {
        const caller = createAuthenticatedCaller();
        const questions = [
          { id: 1, question: "Q1?", type: "MULTIPLE_CHOICE", options: ["A", "B"], correctAnswer: "A" },
          { id: 2, question: "Q2?", type: "TRUE_FALSE", options: ["True", "False"], correctAnswer: "True" },
        ];
        mockGetTaskStatus.mockResolvedValue({
          id: 42,
          status: "completed",
          resultData: { questions },
        });

        const result = await caller.smartMeeting.meeting.getQuizStatus({
          taskId: 42,
          meetingId: 1,
        });
        expect(result.taskStatus).toBe("completed");
        expect(result.questions).toEqual(questions);
      });

      it("returns not_found when task does not exist", async () => {
        const caller = createAuthenticatedCaller();
        mockGetTaskStatus.mockResolvedValue(null);

        const result = await caller.smartMeeting.meeting.getQuizStatus({
          taskId: 999,
          meetingId: 1,
        });
        expect(result.taskStatus).toBe("not_found");
        expect(result.questions).toBeNull();
      });

      it("returns pending status while task is queued", async () => {
        const caller = createAuthenticatedCaller();
        mockGetTaskStatus.mockResolvedValue({
          id: 42,
          status: "pending",
          resultData: null,
        });

        const result = await caller.smartMeeting.meeting.getQuizStatus({
          taskId: 42,
          meetingId: 1,
        });
        expect(result.taskStatus).toBe("pending");
        expect(result.questions).toBeNull();
      });

      it("returns processing status while task is running", async () => {
        const caller = createAuthenticatedCaller();
        mockGetTaskStatus.mockResolvedValue({
          id: 42,
          status: "processing",
          resultData: null,
        });

        const result = await caller.smartMeeting.meeting.getQuizStatus({
          taskId: 42,
          meetingId: 1,
        });
        expect(result.taskStatus).toBe("processing");
        expect(result.questions).toBeNull();
      });

      it("falls back to meeting quiz questions on task failure", async () => {
        const caller = createAuthenticatedCaller();
        const existingQuestions = [
          { id: 1, question: "Existing?", type: "MULTIPLE_CHOICE", options: ["A"], correctAnswer: "A" },
        ];
        mockGetTaskStatus.mockResolvedValue({
          id: 42,
          status: "failed",
          resultData: null,
          errorMessage: "LLM timeout",
        });
        // The fallback DB query for meeting's aiQuizQuestions
        selectResultsQueue.push([{ aiQuizQuestions: existingQuestions }]);

        const result = await caller.smartMeeting.meeting.getQuizStatus({
          taskId: 42,
          meetingId: 1,
        });
        expect(result.taskStatus).toBe("completed");
        expect(result.questions).toEqual(existingQuestions);
      });

      it("returns failed status when no fallback quiz exists", async () => {
        const caller = createAuthenticatedCaller();
        mockGetTaskStatus.mockResolvedValue({
          id: 42,
          status: "failed",
          resultData: null,
          errorMessage: "LLM timeout",
        });
        // No existing quiz on the meeting
        selectResultsQueue.push([{ aiQuizQuestions: null }]);

        const result = await caller.smartMeeting.meeting.getQuizStatus({
          taskId: 42,
          meetingId: 1,
        });
        expect(result.taskStatus).toBe("failed");
        expect(result.questions).toBeNull();
        expect(result.error).toBe("LLM timeout");
      });

      it("returns failed when meeting not found in fallback", async () => {
        const caller = createAuthenticatedCaller();
        mockGetTaskStatus.mockResolvedValue({
          id: 42,
          status: "failed",
          resultData: null,
          errorMessage: "Service error",
        });
        // Empty result from meeting query
        selectResultsQueue.push([]);

        const result = await caller.smartMeeting.meeting.getQuizStatus({
          taskId: 42,
          meetingId: 1,
        });
        expect(result.taskStatus).toBe("failed");
        expect(result.questions).toBeNull();
      });
    });

    describe("createTeamsLink", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.meeting.createTeamsLink({ meetingId: 1 })
        ).rejects.toThrow();
      });

      it("throws when meeting not found", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        await expect(
          caller.smartMeeting.meeting.createTeamsLink({ meetingId: 999 })
        ).rejects.toThrow("Meeting not found");
      });

      it("creates Teams link and updates meeting", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          {
            id: 1,
            title: "Test Meeting",
            description: "A meeting",
            scheduledStart: new Date("2026-03-01T09:00:00Z"),
            scheduledEnd: new Date("2026-03-01T10:00:00Z"),
            organizerName: "CEO",
          },
        ]);
        const result = await caller.smartMeeting.meeting.createTeamsLink({
          meetingId: 1,
        });
        expect(result).toHaveProperty("teamsUrl");
        expect(result).toHaveProperty("teamsMeetingId", "GRT-MTG-MOCK");
        expect(mockCreateTeamsMeeting).toHaveBeenCalledTimes(1);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe("getStats", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.meeting.getStats()
        ).rejects.toThrow();
      });

      it("returns aggregated stats by status and type", async () => {
        const caller = createAuthenticatedCaller();
        // First query: status counts
        selectResultsQueue.push([
          { status: "LIVE", count: 3 },
          { status: "ENDED", count: 10 },
          { status: "UPCOMING", count: 2 },
        ]);
        // Second query: type counts
        selectResultsQueue.push([
          { type: "MAJOR", count: 5 },
          { type: "MINOR", count: 10 },
        ]);
        const result = await caller.smartMeeting.meeting.getStats();
        expect(result.byStatus).toEqual({
          LIVE: 3,
          ENDED: 10,
          UPCOMING: 2,
        });
        expect(result.byType).toEqual({
          MAJOR: 5,
          MINOR: 10,
        });
      });

      it("returns empty objects when no meetings exist", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([]);
        selectResultsQueue.push([]);
        const result = await caller.smartMeeting.meeting.getStats();
        expect(result.byStatus).toEqual({});
        expect(result.byType).toEqual({});
      });
    });
  });

  // ───────────────────────────────────────────────────────
  //  2. attendance sub-router
  // ───────────────────────────────────────────────────────
  describe("attendance", () => {
    describe("listByMeeting", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.attendance.listByMeeting({ id: 1 })
        ).rejects.toThrow();
      });

      it("returns attendance records for a meeting", async () => {
        const caller = createAuthenticatedCaller();
        const records = [
          { id: 1, meetingId: 1, userId: 10, status: "PRESENT_PHYSICAL" },
          { id: 2, meetingId: 1, userId: 11, status: "ABSENT" },
        ];
        mockQueryResult = records;
        const result = await caller.smartMeeting.attendance.listByMeeting({
          id: 1,
        });
        expect(result).toEqual(records);
      });

      it("returns empty array when no records", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.attendance.listByMeeting({
          id: 1,
        });
        expect(result).toEqual([]);
      });
    });

    describe("checkIn", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.attendance.checkIn({
            meetingId: 1,
            status: "PRESENT_PHYSICAL",
          })
        ).rejects.toThrow();
      });

      it("creates new attendance record when none exists", async () => {
        const caller = createAuthenticatedCaller();
        // First select: check existing (none found)
        selectResultsQueue.push([]);
        // Insert returning
        const newRecord = {
          id: 1,
          meetingId: 1,
          userId: 1,
          status: "PRESENT_PHYSICAL",
        };
        mockReturningResult = [newRecord];
        const result = await caller.smartMeeting.attendance.checkIn({
          meetingId: 1,
          status: "PRESENT_PHYSICAL",
        });
        expect(result).toEqual(newRecord);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("updates existing attendance record when one exists", async () => {
        const caller = createAuthenticatedCaller();
        // First select: check existing (found one)
        selectResultsQueue.push([{ id: 5, meetingId: 1, userId: 1, status: "ABSENT" }]);
        // Update returning
        const updated = {
          id: 5,
          meetingId: 1,
          userId: 1,
          status: "PRESENT_ONLINE",
        };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.attendance.checkIn({
          meetingId: 1,
          status: "PRESENT_ONLINE",
        });
        expect(result).toEqual(updated);
        expect(mockDb.update).toHaveBeenCalled();
      });

      it("accepts optional checkInMethod", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([]);
        mockReturningResult = [
          { id: 1, meetingId: 1, userId: 1, status: "PRESENT_PHYSICAL", checkInMethod: "NFC" },
        ];
        const result = await caller.smartMeeting.attendance.checkIn({
          meetingId: 1,
          status: "PRESENT_PHYSICAL",
          checkInMethod: "NFC",
        });
        expect(result).toHaveProperty("checkInMethod", "NFC");
      });

      it("rejects invalid status enum", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.attendance.checkIn({
            meetingId: 1,
            status: "INVALID" as any,
          })
        ).rejects.toThrow();
      });
    });

    describe("requestLeave", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.attendance.requestLeave({
            meetingId: 1,
            reason: "Emergency",
          })
        ).rejects.toThrow();
      });

      it("creates new leave record when no existing record", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([]);
        const newRecord = {
          id: 1,
          meetingId: 1,
          userId: 1,
          status: "LEAVED",
          leaveReason: "Emergency",
        };
        mockReturningResult = [newRecord];
        const result = await caller.smartMeeting.attendance.requestLeave({
          meetingId: 1,
          reason: "Emergency",
        });
        expect(result).toEqual(newRecord);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("updates existing record to LEAVED", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          { id: 3, meetingId: 1, userId: 1, status: "PRESENT_PHYSICAL" },
        ]);
        const updated = {
          id: 3,
          meetingId: 1,
          userId: 1,
          status: "LEAVED",
          leaveReason: "Family issue",
        };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.attendance.requestLeave({
          meetingId: 1,
          reason: "Family issue",
        });
        expect(result).toEqual(updated);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe("markAbsent", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.attendance.markAbsent({ meetingId: 1 })
        ).rejects.toThrow();
      });

      it("creates an ABSENT record", async () => {
        const caller = createAuthenticatedCaller();
        const record = {
          id: 1,
          meetingId: 1,
          userId: 1,
          userName: "Test User",
          status: "ABSENT",
        };
        mockReturningResult = [record];
        const result = await caller.smartMeeting.attendance.markAbsent({
          meetingId: 1,
        });
        expect(result).toEqual(record);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("uses ctx.user.name for userName", async () => {
        const caller = createAuthenticatedCaller({ name: "Custom Name" });
        mockReturningResult = [
          { id: 1, meetingId: 1, userId: 1, userName: "Custom Name", status: "ABSENT" },
        ];
        const result = await caller.smartMeeting.attendance.markAbsent({
          meetingId: 1,
        });
        expect(result).toHaveProperty("userName", "Custom Name");
      });
    });
  });

  // ───────────────────────────────────────────────────────
  //  3. interaction sub-router
  // ───────────────────────────────────────────────────────
  describe("interaction", () => {
    describe("getByUser", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.interaction.getByUser({
            meetingId: 1,
            userId: 1,
          })
        ).rejects.toThrow();
      });

      it("returns interaction when found", async () => {
        const caller = createAuthenticatedCaller();
        const interaction = {
          id: 1,
          meetingId: 1,
          userId: 1,
          personalNotes: "Good meeting",
        };
        mockQueryResult = [interaction];
        const result = await caller.smartMeeting.interaction.getByUser({
          meetingId: 1,
          userId: 1,
        });
        expect(result).toEqual(interaction);
      });

      it("returns null when not found", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.interaction.getByUser({
          meetingId: 1,
          userId: 999,
        });
        expect(result).toBeNull();
      });
    });

    describe("saveNotes", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.interaction.saveNotes({
            meetingId: 1,
            personalNotes: "notes",
          })
        ).rejects.toThrow();
      });

      it("creates new interaction when none exists", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([]);
        const newRecord = {
          id: 1,
          meetingId: 1,
          userId: 1,
          personalNotes: "My notes",
        };
        mockReturningResult = [newRecord];
        const result = await caller.smartMeeting.interaction.saveNotes({
          meetingId: 1,
          personalNotes: "My notes",
        });
        expect(result).toEqual(newRecord);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("updates existing interaction notes", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          { id: 5, meetingId: 1, userId: 1, personalNotes: "Old notes" },
        ]);
        const updated = {
          id: 5,
          meetingId: 1,
          userId: 1,
          personalNotes: "Updated notes",
        };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.interaction.saveNotes({
          meetingId: 1,
          personalNotes: "Updated notes",
        });
        expect(result).toEqual(updated);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe("submitQuiz", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.interaction.submitQuiz({
            meetingId: 1,
            answers: [],
            score: 80,
          })
        ).rejects.toThrow();
      });

      it("creates new quiz record when none exists", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([]);
        const answers = [
          { questionId: 1, selectedAnswer: "A", isCorrect: true },
          { questionId: 2, selectedAnswer: "B", isCorrect: false },
        ];
        const newRecord = {
          id: 1,
          meetingId: 1,
          userId: 1,
          aiQuizScore: 50,
          aiQuizAnswers: answers,
        };
        mockReturningResult = [newRecord];
        const result = await caller.smartMeeting.interaction.submitQuiz({
          meetingId: 1,
          answers,
          score: 50,
        });
        expect(result).toEqual(newRecord);
      });

      it("updates existing quiz record", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          { id: 3, meetingId: 1, userId: 1, aiQuizScore: 50 },
        ]);
        const updated = { id: 3, meetingId: 1, userId: 1, aiQuizScore: 100 };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.interaction.submitQuiz({
          meetingId: 1,
          answers: [{ questionId: 1, selectedAnswer: "A", isCorrect: true }],
          score: 100,
        });
        expect(result).toEqual(updated);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe("submitReflection", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.interaction.submitReflection({
            meetingId: 1,
            reflection: "Great insights",
          })
        ).rejects.toThrow();
      });

      it("creates new reflection when none exists", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([]);
        const newRecord = {
          id: 1,
          meetingId: 1,
          userId: 1,
          takeawayReflection: "I learned a lot",
        };
        mockReturningResult = [newRecord];
        const result = await caller.smartMeeting.interaction.submitReflection({
          meetingId: 1,
          reflection: "I learned a lot",
        });
        expect(result).toEqual(newRecord);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("updates existing reflection", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([
          { id: 7, meetingId: 1, userId: 1, takeawayReflection: "Old" },
        ]);
        const updated = {
          id: 7,
          takeawayReflection: "Updated reflection",
        };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.interaction.submitReflection({
          meetingId: 1,
          reflection: "Updated reflection",
        });
        expect(result).toEqual(updated);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────
  //  4. penalty sub-router
  // ───────────────────────────────────────────────────────
  describe("penalty", () => {
    describe("list", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.penalty.list()
        ).rejects.toThrow();
      });

      it("returns list of penalties with default limit", async () => {
        const caller = createAuthenticatedCaller();
        const penalties = [
          { id: 1, userId: 10, penaltyLevel: "WARNING" },
          { id: 2, userId: 11, penaltyLevel: "BLACK_L2" },
        ];
        mockQueryResult = penalties;
        const result = await caller.smartMeeting.penalty.list();
        expect(result).toEqual(penalties);
      });

      it("filters by userId and penaltyLevel", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [{ id: 1, userId: 10, penaltyLevel: "WARNING" }];
        const result = await caller.smartMeeting.penalty.list({
          userId: 10,
          penaltyLevel: "WARNING",
          limit: 50,
        });
        expect(result).toHaveLength(1);
      });

      it("returns empty array when no penalties", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.penalty.list();
        expect(result).toEqual([]);
      });
    });

    describe("processAbsences", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.penalty.processAbsences({
            meetingId: 1,
            meetingType: "MAJOR",
          })
        ).rejects.toThrow();
      });

      it("processes absences and returns actions", async () => {
        const caller = createAuthenticatedCaller();
        const result = await caller.smartMeeting.penalty.processAbsences({
          meetingId: 1,
          meetingType: "MAJOR",
        });
        expect(result).toHaveProperty("processed", 1);
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toHaveProperty("penaltyLevel", "WARNING");
        expect(mockProcessAbsences).toHaveBeenCalledWith(1, "MAJOR");
      });

      it("processes MINOR meeting absences", async () => {
        const caller = createAuthenticatedCaller();
        mockProcessAbsences.mockResolvedValueOnce([]);
        const result = await caller.smartMeeting.penalty.processAbsences({
          meetingId: 2,
          meetingType: "MINOR",
        });
        expect(result).toHaveProperty("processed", 0);
        expect(result.actions).toEqual([]);
        expect(mockProcessAbsences).toHaveBeenCalledWith(2, "MINOR");
      });

      it("rejects invalid meetingType enum", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.penalty.processAbsences({
            meetingId: 1,
            meetingType: "INVALID" as any,
          })
        ).rejects.toThrow();
      });
    });

    describe("getStats", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.penalty.getStats()
        ).rejects.toThrow();
      });

      it("returns penalty stats by level", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [
          { level: "WARNING", count: 5 },
          { level: "BLACK_L2", count: 2 },
          { level: "BLACK_L1", count: 1 },
        ];
        const result = await caller.smartMeeting.penalty.getStats();
        expect(result.byLevel).toEqual({
          WARNING: 5,
          BLACK_L2: 2,
          BLACK_L1: 1,
        });
      });

      it("returns empty stats when no penalties", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.penalty.getStats();
        expect(result.byLevel).toEqual({});
      });
    });
  });

  // ───────────────────────────────────────────────────────
  //  5. chat sub-router (in-memory)
  // ───────────────────────────────────────────────────────
  describe("chat", () => {
    describe("getMessages", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.chat.getMessages({ id: 1 })
        ).rejects.toThrow();
      });

      it("returns empty array for meeting with no chat", async () => {
        const caller = createAuthenticatedCaller();
        const result = await caller.smartMeeting.chat.getMessages({
          id: 99999,
        });
        expect(result).toEqual([]);
      });
    });

    describe("sendMessage", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.chat.sendMessage({
            meetingId: 1,
            message: "Hello",
          })
        ).rejects.toThrow();
      });

      it("sends message and returns it", async () => {
        const caller = createAuthenticatedCaller({ id: 42, name: "Alice" });
        const result = await caller.smartMeeting.chat.sendMessage({
          meetingId: 50000,
          message: "Hello everyone!",
        });
        expect(result).toHaveProperty("userId", 42);
        expect(result).toHaveProperty("userName", "Alice");
        expect(result).toHaveProperty("message", "Hello everyone!");
        expect(result).toHaveProperty("time");
      });

      it("messages persist in chat store and can be retrieved", async () => {
        const meetingId = 50001;
        const caller = createAuthenticatedCaller({ id: 1, name: "Test User" });
        await caller.smartMeeting.chat.sendMessage({
          meetingId,
          message: "First message",
        });
        await caller.smartMeeting.chat.sendMessage({
          meetingId,
          message: "Second message",
        });
        const messages = await caller.smartMeeting.chat.getMessages({
          id: meetingId,
        });
        expect(messages).toHaveLength(2);
        expect(messages[0].message).toBe("First message");
        expect(messages[1].message).toBe("Second message");
      });

      it("rejects empty message", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.chat.sendMessage({
            meetingId: 1,
            message: "",
          })
        ).rejects.toThrow();
      });

      it("falls back to User#id when name is missing", async () => {
        const caller = createAuthenticatedCaller({ id: 77, name: undefined as any });
        const result = await caller.smartMeeting.chat.sendMessage({
          meetingId: 50002,
          message: "No name user",
        });
        expect(result.userName).toBe("User#77");
      });
    });
  });

  // ───────────────────────────────────────────────────────
  //  6. seed sub-router
  // ───────────────────────────────────────────────────────
  describe("seed", () => {
    describe("seedDemo", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.seed.seedDemo()
        ).rejects.toThrow();
      });

      it("returns existing meeting if demo already seeded", async () => {
        const caller = createAuthenticatedCaller();
        const existing = { id: 1, title: "GRT 2026 demo" };
        selectResultsQueue.push([existing]);
        const result = await caller.smartMeeting.seed.seedDemo();
        expect(result).toHaveProperty("message", "Demo meeting already exists");
        expect(result).toHaveProperty("meeting", existing);
      });

      it("seeds new demo meeting when none exists", async () => {
        const caller = createAuthenticatedCaller();
        // Check existing: none found
        selectResultsQueue.push([]);
        // Insert returning: new meeting
        const newMeeting = { id: 10, title: "GRT 2026 Demo" };
        mockReturningResult = [newMeeting];
        const result = await caller.smartMeeting.seed.seedDemo();
        expect(result).toHaveProperty("message", "Demo meeting seeded");
        expect(result).toHaveProperty("meeting", newMeeting);
        expect(mockDb.insert).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────
  //  7. speaker sub-router
  // ───────────────────────────────────────────────────────
  describe("speaker", () => {
    describe("analyze", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.speaker.analyze({ meetingId: 1 })
        ).rejects.toThrow();
      });

      it("runs diarization analysis and returns result", async () => {
        const caller = createAuthenticatedCaller();
        const result = await caller.smartMeeting.speaker.analyze({
          meetingId: 1,
        });
        expect(result).toHaveProperty("meetingId", 1);
        expect(result).toHaveProperty("totalSpeakers", 4);
        expect(result).toHaveProperty("matchedCount", 2);
        expect(result).toHaveProperty("unknownCount", 2);
        expect(mockAnalyzeMeetingAudio).toHaveBeenCalledWith(1);
      });

      it("accepts string meetingId", async () => {
        const caller = createAuthenticatedCaller();
        await caller.smartMeeting.speaker.analyze({ meetingId: "42" });
        expect(mockAnalyzeMeetingAudio).toHaveBeenCalledWith(42);
      });
    });

    describe("listByMeeting", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.speaker.listByMeeting({ meetingId: 1 })
        ).rejects.toThrow();
      });

      it("returns speakers for a meeting", async () => {
        const caller = createAuthenticatedCaller();
        const speakers = [
          { id: 1, meetingId: 1, speakerLabel: "Speaker 1" },
          { id: 2, meetingId: 1, speakerLabel: "Speaker 2" },
        ];
        mockQueryResult = speakers;
        const result = await caller.smartMeeting.speaker.listByMeeting({
          meetingId: 1,
        });
        expect(result).toEqual(speakers);
      });

      it("returns empty array when no speakers", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.speaker.listByMeeting({
          meetingId: 999,
        });
        expect(result).toEqual([]);
      });
    });

    describe("bindProfile", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.speaker.bindProfile({
            speakerId: 1,
            profileId: 100,
            profileType: "EMPLOYEE",
            profileName: "John",
          })
        ).rejects.toThrow();
      });

      it("binds speaker to a profile", async () => {
        const caller = createAuthenticatedCaller();
        const updated = {
          id: 1,
          matchedProfileId: 100,
          matchedProfileType: "EMPLOYEE",
          matchedProfileName: "John Doe",
          matchConfidence: "1.00",
        };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.speaker.bindProfile({
          speakerId: 1,
          profileId: 100,
          profileType: "EMPLOYEE",
          profileName: "John Doe",
        });
        expect(result).toEqual(updated);
        expect(mockDb.update).toHaveBeenCalled();
      });

      it("returns null when speaker not found", async () => {
        const caller = createAuthenticatedCaller();
        mockReturningResult = [];
        const result = await caller.smartMeeting.speaker.bindProfile({
          speakerId: 999,
          profileId: 100,
          profileType: "CUSTOMER",
          profileName: "Customer",
        });
        expect(result).toBeNull();
      });

      it("rejects invalid profileType enum", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.speaker.bindProfile({
            speakerId: 1,
            profileId: 100,
            profileType: "INVALID" as any,
            profileName: "Test",
          })
        ).rejects.toThrow();
      });

      it("accepts EXTERNAL profileType", async () => {
        const caller = createAuthenticatedCaller();
        mockReturningResult = [
          { id: 1, matchedProfileType: "EXTERNAL", matchedProfileName: "External Speaker" },
        ];
        const result = await caller.smartMeeting.speaker.bindProfile({
          speakerId: 1,
          profileId: 200,
          profileType: "EXTERNAL",
          profileName: "External Speaker",
        });
        expect(result).toHaveProperty("matchedProfileType", "EXTERNAL");
      });
    });

    describe("unbindProfile", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.speaker.unbindProfile({ speakerId: 1 })
        ).rejects.toThrow();
      });

      it("resets speaker profile to unknown", async () => {
        const caller = createAuthenticatedCaller();
        const updated = {
          id: 1,
          matchedProfileId: null,
          matchedProfileType: null,
          matchedProfileName: null,
          matchConfidence: null,
        };
        mockReturningResult = [updated];
        const result = await caller.smartMeeting.speaker.unbindProfile({
          speakerId: 1,
        });
        expect(result).toEqual(updated);
        expect(result!.matchedProfileId).toBeNull();
        expect(result!.matchedProfileType).toBeNull();
        expect(result!.matchedProfileName).toBeNull();
        expect(result!.matchConfidence).toBeNull();
      });

      it("returns null when speaker not found", async () => {
        const caller = createAuthenticatedCaller();
        mockReturningResult = [];
        const result = await caller.smartMeeting.speaker.unbindProfile({
          speakerId: 999,
        });
        expect(result).toBeNull();
      });

      it("accepts string speakerId", async () => {
        const caller = createAuthenticatedCaller();
        mockReturningResult = [{ id: 42, matchedProfileId: null }];
        const result = await caller.smartMeeting.speaker.unbindProfile({
          speakerId: "42",
        });
        expect(result).toHaveProperty("id", 42);
      });
    });
  });

  // ───────────────────────────────────────────────────────
  //  8. analytics sub-router
  // ───────────────────────────────────────────────────────
  describe("analytics", () => {
    describe("meetingRoi", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.analytics.meetingRoi({ meetingId: 1 })
        ).rejects.toThrow();
      });

      it("returns ROI for a meeting", async () => {
        const caller = createAuthenticatedCaller();
        const result = await caller.smartMeeting.analytics.meetingRoi({
          meetingId: 1,
        });
        expect(result).toHaveProperty("meetingId", 1);
        expect(result).toHaveProperty("roiScore", 72);
        expect(result).toHaveProperty("roiBreakdown");
        expect(result.roiBreakdown).toHaveProperty("participationComponent", 70);
        expect(result.roiBreakdown).toHaveProperty("actionComponent", 60);
        expect(result.roiBreakdown).toHaveProperty("attendanceComponent", 80);
        expect(result.roiBreakdown).toHaveProperty("engagementComponent", 75);
        expect(mockCalculateMeetingROI).toHaveBeenCalledWith(1);
      });

      it("accepts string meetingId", async () => {
        const caller = createAuthenticatedCaller();
        await caller.smartMeeting.analytics.meetingRoi({ meetingId: "5" });
        expect(mockCalculateMeetingROI).toHaveBeenCalledWith(5);
      });
    });

    describe("aggregatedRoi", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.analytics.aggregatedRoi()
        ).rejects.toThrow();
      });

      it("returns aggregated ROI across all meetings", async () => {
        const caller = createAuthenticatedCaller();
        const result = await caller.smartMeeting.analytics.aggregatedRoi();
        expect(result).toHaveProperty("totalMeetings", 3);
        expect(result).toHaveProperty("avgRoiScore", 65);
        expect(result).toHaveProperty("avgParticipationBalance", 60);
        expect(result).toHaveProperty("avgActionCompletionRate", 55);
        expect(result).toHaveProperty("avgAttendanceRate", 75);
        expect(result).toHaveProperty("avgEngagementScore", 70);
        expect(result.meetingRois).toHaveLength(2);
        expect(mockGetAggregatedROI).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ───────────────────────────────────────────────────────
  //  9. review sub-router
  // ───────────────────────────────────────────────────────
  describe("review", () => {
    describe("createReviewMeeting", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.review.createReviewMeeting({
            title: "Review",
            speakers: [{ id: 1, name: "Speaker" }],
            evaluators: [{ id: 2, name: "Evaluator" }],
          })
        ).rejects.toThrow();
      });

      it("creates a review meeting with speakers and evaluators", async () => {
        const caller = createAuthenticatedCaller();
        const meeting = { id: 10, title: "Annual Review", type: "MAJOR", status: "LIVE" };
        mockReturningResult = [meeting];
        const result = await caller.smartMeeting.review.createReviewMeeting({
          title: "Annual Review",
          speakers: [
            { id: 201, name: "Speaker A" },
            { id: 202, name: "Speaker B" },
          ],
          evaluators: [
            { id: 301, name: "Evaluator 1" },
            { id: 302, name: "Evaluator 2" },
          ],
        });
        expect(result).toHaveProperty("meeting", meeting);
        expect(result.speakers).toHaveLength(2);
        expect(result.evaluators).toHaveLength(2);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("accepts optional teamsLink", async () => {
        const caller = createAuthenticatedCaller();
        mockReturningResult = [{ id: 11, title: "Review with Teams" }];
        const result = await caller.smartMeeting.review.createReviewMeeting({
          title: "Review with Teams",
          speakers: [{ id: 1, name: "A" }],
          evaluators: [{ id: 2, name: "B" }],
          teamsLink: "https://teams.microsoft.com/mock",
        });
        expect(result).toHaveProperty("meeting");
      });

      it("rejects empty title", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.review.createReviewMeeting({
            title: "",
            speakers: [{ id: 1, name: "A" }],
            evaluators: [{ id: 2, name: "B" }],
          })
        ).rejects.toThrow();
      });
    });

    describe("submitEvaluation", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.review.submitEvaluation({
            meetingId: 1,
            speakerId: 201,
            dimension: "performance",
            score: 8,
          })
        ).rejects.toThrow();
      });

      it("submits evaluation (delete then insert upsert)", async () => {
        const caller = createAuthenticatedCaller();
        const evaluation = {
          id: 1,
          meetingId: 1,
          speakerId: 201,
          evaluatorId: 1,
          dimension: "performance",
          score: 9,
        };
        mockReturningResult = [evaluation];
        const result = await caller.smartMeeting.review.submitEvaluation({
          meetingId: 1,
          speakerId: 201,
          dimension: "performance",
          score: 9,
          comment: "Excellent performance",
        });
        expect(result).toEqual(evaluation);
        // Should delete existing then insert
        expect(mockDb.delete).toHaveBeenCalled();
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("validates score range (min 1, max 10)", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.review.submitEvaluation({
            meetingId: 1,
            speakerId: 201,
            dimension: "performance",
            score: 0,
          })
        ).rejects.toThrow();
        await expect(
          caller.smartMeeting.review.submitEvaluation({
            meetingId: 1,
            speakerId: 201,
            dimension: "performance",
            score: 11,
          })
        ).rejects.toThrow();
      });

      it("rejects invalid dimension", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.smartMeeting.review.submitEvaluation({
            meetingId: 1,
            speakerId: 201,
            dimension: "invalid_dimension" as any,
            score: 5,
          })
        ).rejects.toThrow();
      });

      it("accepts all valid dimension values", async () => {
        const caller = createAuthenticatedCaller();
        const dimensions = ["performance", "execution", "innovation", "teamwork", "strategy"] as const;
        for (const dim of dimensions) {
          mockReturningResult = [
            { id: 1, meetingId: 1, speakerId: 201, dimension: dim, score: 7 },
          ];
          const result = await caller.smartMeeting.review.submitEvaluation({
            meetingId: 1,
            speakerId: 201,
            dimension: dim,
            score: 7,
          });
          expect(result).toHaveProperty("dimension", dim);
        }
      });

      it("includes optional speakerName and comment", async () => {
        const caller = createAuthenticatedCaller();
        mockReturningResult = [
          {
            id: 1,
            meetingId: 1,
            speakerId: 201,
            speakerName: "Speaker A",
            dimension: "teamwork",
            score: 8,
            comment: "Great team player",
          },
        ];
        const result = await caller.smartMeeting.review.submitEvaluation({
          meetingId: 1,
          speakerId: 201,
          speakerName: "Speaker A",
          dimension: "teamwork",
          score: 8,
          comment: "Great team player",
        });
        expect(result).toHaveProperty("speakerName", "Speaker A");
        expect(result).toHaveProperty("comment", "Great team player");
      });
    });

    describe("getEvaluations", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.review.getEvaluations({ meetingId: 1 })
        ).rejects.toThrow();
      });

      it("returns evaluations grouped by speaker", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [
          { speakerId: 201, speakerName: "Speaker A", dimension: "performance", score: 8, evaluatorId: 1 },
          { speakerId: 201, speakerName: "Speaker A", dimension: "execution", score: 7, evaluatorId: 1 },
          { speakerId: 202, speakerName: "Speaker B", dimension: "performance", score: 9, evaluatorId: 1 },
        ];
        const result = await caller.smartMeeting.review.getEvaluations({
          meetingId: 1,
        });
        expect(result[201]).toBeDefined();
        expect(result[201].speakerName).toBe("Speaker A");
        expect(result[201].evaluations).toHaveLength(2);
        expect(result[202]).toBeDefined();
        expect(result[202].speakerName).toBe("Speaker B");
        expect(result[202].evaluations).toHaveLength(1);
      });

      it("returns empty object when no evaluations", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.review.getEvaluations({
          meetingId: 999,
        });
        expect(result).toEqual({});
      });
    });

    describe("getAnalysis", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.review.getAnalysis({ meetingId: 1 })
        ).rejects.toThrow();
      });

      it("returns analysis with radar data and rankings", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [
          { speakerId: 201, speakerName: "Speaker A", dimension: "performance", score: 8 },
          { speakerId: 201, speakerName: "Speaker A", dimension: "execution", score: 7 },
          { speakerId: 201, speakerName: "Speaker A", dimension: "innovation", score: 6 },
          { speakerId: 201, speakerName: "Speaker A", dimension: "teamwork", score: 9 },
          { speakerId: 201, speakerName: "Speaker A", dimension: "strategy", score: 7 },
          { speakerId: 202, speakerName: "Speaker B", dimension: "performance", score: 9 },
          { speakerId: 202, speakerName: "Speaker B", dimension: "execution", score: 8 },
          { speakerId: 202, speakerName: "Speaker B", dimension: "innovation", score: 9 },
          { speakerId: 202, speakerName: "Speaker B", dimension: "teamwork", score: 7 },
          { speakerId: 202, speakerName: "Speaker B", dimension: "strategy", score: 8 },
        ];
        const result = await caller.smartMeeting.review.getAnalysis({
          meetingId: 1,
        });
        expect(result).toHaveProperty("totalEvaluations", 10);
        expect(result.speakers).toHaveLength(2);
        // Each speaker should have radarData with 5 dimensions
        for (const speaker of result.speakers) {
          expect(speaker.radarData).toHaveLength(5);
          expect(speaker).toHaveProperty("overall");
          expect(speaker).toHaveProperty("speakerId");
          expect(speaker).toHaveProperty("speakerName");
        }
        // Speakers should be sorted by overall score descending
        expect(result.speakers[0].overall).toBeGreaterThanOrEqual(
          result.speakers[1].overall
        );
      });

      it("returns empty analysis when no evaluations", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [];
        const result = await caller.smartMeeting.review.getAnalysis({
          meetingId: 999,
        });
        expect(result).toHaveProperty("totalEvaluations", 0);
        expect(result.speakers).toEqual([]);
      });

      it("handles multiple evaluators for the same dimension (averages scores)", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [
          { speakerId: 201, speakerName: "Speaker A", dimension: "performance", score: 8 },
          { speakerId: 201, speakerName: "Speaker A", dimension: "performance", score: 6 },
        ];
        const result = await caller.smartMeeting.review.getAnalysis({
          meetingId: 1,
        });
        const speaker = result.speakers[0];
        const perfDim = speaker.radarData.find(
          (d: any) => d.dimension === "performance"
        );
        // Average of 8 and 6 = 7
        expect(perfDim!.average).toBe(7);
        expect(perfDim!.count).toBe(2);
      });

      it("handles null scores gracefully", async () => {
        const caller = createAuthenticatedCaller();
        mockQueryResult = [
          { speakerId: 201, speakerName: "Speaker A", dimension: "performance", score: null },
          { speakerId: 201, speakerName: "Speaker A", dimension: "execution", score: 8 },
        ];
        const result = await caller.smartMeeting.review.getAnalysis({
          meetingId: 1,
        });
        const speaker = result.speakers[0];
        const perfDim = speaker.radarData.find(
          (d: any) => d.dimension === "performance"
        );
        // null score should not be pushed, so count = 0 and average = 0
        expect(perfDim!.count).toBe(0);
        expect(perfDim!.average).toBe(0);
      });
    });

    describe("seedDemo", () => {
      it("rejects anonymous access", async () => {
        const caller = createAnonymousCaller();
        await expect(
          caller.smartMeeting.review.seedDemo()
        ).rejects.toThrow();
      });

      it("returns existing if review demo already seeded", async () => {
        const caller = createAuthenticatedCaller();
        selectResultsQueue.push([{ id: 5, title: "Existing Review" }]);
        const result = await caller.smartMeeting.review.seedDemo();
        expect(result).toHaveProperty(
          "message",
          "Review demo already exists"
        );
        expect(result).toHaveProperty("meetingId", 5);
      });

      it("seeds review demo with meeting + evaluations", async () => {
        const caller = createAuthenticatedCaller();
        // First query: check existing (none)
        selectResultsQueue.push([]);
        // Insert returning: new meeting
        const newMeeting = { id: 20, title: "2026 Review" };
        mockReturningResult = [newMeeting];
        const result = await caller.smartMeeting.review.seedDemo();
        expect(result).toHaveProperty("message", "Review demo seeded");
        expect(result).toHaveProperty("meetingId", 20);
        expect(result).toHaveProperty("evaluationsCreated");
        // 2 speakers x 5 dimensions x (3 + 2) evaluators = 25
        expect(result.evaluationsCreated).toBe(25);
        // Should have called insert at least twice (meeting + evaluations)
        expect(mockDb.insert).toHaveBeenCalled();
      });
    });
  });
});
