/**
 * Mock Microsoft Teams / Graph API Integration Service
 *
 * Simulates:
 *   - Creating a Teams meeting via Graph API
 *   - Syncing agenda to Outlook calendar
 *   - Returning a join URL
 *
 * In production, this would call the Microsoft Graph REST API with
 * an OAuth2 token (delegated or application permissions).
 */

export interface TeamsAgendaDetails {
  title: string;
  description?: string;
  scheduledStart?: string; // ISO 8601
  scheduledEnd?: string;
  organizerName?: string;
  attendeeEmails?: string[];
}

export interface TeamsCreateResult {
  teamsUrl: string;
  teamsMeetingId: string;
  outlookEventId: string;
  calendarSynced: boolean;
  createdAt: string;
}

/**
 * Create a Microsoft Teams meeting (mock).
 * Returns a fake Teams join URL and Outlook calendar event ID.
 */
export async function createTeamsMeeting(
  agenda: TeamsAgendaDetails
): Promise<TeamsCreateResult> {
  // Simulate 200ms Graph API latency
  await new Promise((r) => setTimeout(r, 200));

  const meetingId = `GRT-MTG-${Date.now().toString(36).toUpperCase()}`;
  const threadId = `19:${Math.random().toString(36).slice(2, 14)}@thread.v2`;

  return {
    teamsUrl: `https://teams.microsoft.com/l/meetup-join/${encodeURIComponent(threadId)}/0?context=${encodeURIComponent(
      JSON.stringify({ Tid: "grt-tenant-id", Oid: meetingId })
    )}`,
    teamsMeetingId: meetingId,
    outlookEventId: `AAMk${Math.random().toString(36).slice(2, 20)}`,
    calendarSynced: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get the Teams meeting status (mock).
 * In production, would poll Graph API for participant count etc.
 */
export async function getTeamsMeetingStatus(teamsUrl: string) {
  return {
    isActive: true,
    participantCount: Math.floor(Math.random() * 20) + 5,
    duration: Math.floor(Math.random() * 3600),
    recordingAvailable: false,
  };
}
