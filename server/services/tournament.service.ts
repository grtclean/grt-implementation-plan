/**
 * Tournament Service
 * Tournament manager with formats: single_elimination, round_robin, swiss.
 * Participant management, leaderboard.
 */

// ==================== Types ====================

export type TournamentFormat = 'single_elimination' | 'round_robin' | 'swiss';
export type TournamentStatus = 'draft' | 'registration' | 'in_progress' | 'completed' | 'cancelled';

interface Participant {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  score: number;
}

interface Match {
  id: string;
  round: number;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  scores: number[];
}

interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  maxParticipants: number;
  participants: Participant[];
  matches: Match[];
  currentRound: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

interface TournamentManager {
  getTournament(): Tournament;
  addParticipant(info: { id: string; name: string; rating: number }): Participant;
  removeParticipant(participantId: string): boolean;
  startTournament(): boolean;
  generateNextRound(): Match[];
  reportMatchResult(matchId: string, winnerId: string, scores: number[]): boolean;
  getLeaderboard(): Participant[];
  getMatchHistory(participantId: string): Match[];
  getCurrentRoundMatches(): Match[];
}

// ==================== Tournament Manager ====================

export function createTournamentManager(
  name: string,
  format: TournamentFormat,
  options?: { maxParticipants?: number }
): TournamentManager {
  const tournament: Tournament = {
    id: `tournament_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    format,
    status: 'registration',
    maxParticipants: options?.maxParticipants || 16,
    participants: [],
    matches: [],
    currentRound: 0,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
  };

  function generateRoundRobinMatches(): Match[] {
    const newMatches: Match[] = [];
    const participants = tournament.participants;
    const round = tournament.currentRound;

    // Generate all pairings not yet played
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const alreadyPlayed = tournament.matches.some(
          m => (m.player1Id === participants[i].id && m.player2Id === participants[j].id) ||
               (m.player1Id === participants[j].id && m.player2Id === participants[i].id)
        );
        if (!alreadyPlayed) {
          const match: Match = {
            id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            round,
            player1Id: participants[i].id,
            player2Id: participants[j].id,
            winnerId: null,
            status: 'pending',
            scores: [],
          };
          newMatches.push(match);
        }
      }
    }

    // Take only enough matches for one round
    const matchesPerRound = Math.floor(participants.length / 2);
    const roundMatches = newMatches.slice(0, matchesPerRound);
    tournament.matches.push(...roundMatches);
    return roundMatches;
  }

  function generateSingleEliminationMatches(): Match[] {
    const newMatches: Match[] = [];
    const round = tournament.currentRound;

    // For first round, pair all participants
    if (round === 1) {
      for (let i = 0; i < tournament.participants.length; i += 2) {
        if (i + 1 < tournament.participants.length) {
          const match: Match = {
            id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            round,
            player1Id: tournament.participants[i].id,
            player2Id: tournament.participants[i + 1].id,
            winnerId: null,
            status: 'pending',
            scores: [],
          };
          newMatches.push(match);
        }
      }
    } else {
      // Pair winners from previous round
      const prevRoundMatches = tournament.matches.filter(m => m.round === round - 1 && m.status === 'completed');
      const winners = prevRoundMatches.map(m => m.winnerId!).filter(Boolean);
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          const match: Match = {
            id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            round,
            player1Id: winners[i],
            player2Id: winners[i + 1],
            winnerId: null,
            status: 'pending',
            scores: [],
          };
          newMatches.push(match);
        }
      }
    }

    tournament.matches.push(...newMatches);
    return newMatches;
  }

  function generateSwissMatches(): Match[] {
    const newMatches: Match[] = [];
    const round = tournament.currentRound;

    // Sort by score, then pair adjacent players
    const sorted = [...tournament.participants].sort((a, b) => b.score - a.score);
    const paired = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      if (paired.has(sorted[i].id)) continue;
      for (let j = i + 1; j < sorted.length; j++) {
        if (paired.has(sorted[j].id)) continue;
        // Check not already played
        const alreadyPlayed = tournament.matches.some(
          m => (m.player1Id === sorted[i].id && m.player2Id === sorted[j].id) ||
               (m.player1Id === sorted[j].id && m.player2Id === sorted[i].id)
        );
        if (!alreadyPlayed) {
          const match: Match = {
            id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            round,
            player1Id: sorted[i].id,
            player2Id: sorted[j].id,
            winnerId: null,
            status: 'pending',
            scores: [],
          };
          newMatches.push(match);
          paired.add(sorted[i].id);
          paired.add(sorted[j].id);
          break;
        }
      }
    }

    tournament.matches.push(...newMatches);
    return newMatches;
  }

  return {
    getTournament(): Tournament {
      return { ...tournament };
    },

    addParticipant(info: { id: string; name: string; rating: number }): Participant {
      const participant: Participant = {
        id: info.id,
        name: info.name,
        rating: info.rating,
        wins: 0,
        losses: 0,
        draws: 0,
        score: 0,
      };
      tournament.participants.push(participant);
      return participant;
    },

    removeParticipant(participantId: string): boolean {
      const idx = tournament.participants.findIndex(p => p.id === participantId);
      if (idx === -1) return false;
      tournament.participants.splice(idx, 1);
      return true;
    },

    startTournament(): boolean {
      if (tournament.participants.length < 2) return false;
      tournament.status = 'in_progress';
      tournament.startedAt = Date.now();
      tournament.currentRound = 1;
      return true;
    },

    generateNextRound(): Match[] {
      tournament.currentRound++;
      if (format === 'round_robin') return generateRoundRobinMatches();
      if (format === 'single_elimination') return generateSingleEliminationMatches();
      if (format === 'swiss') return generateSwissMatches();
      return [];
    },

    reportMatchResult(matchId: string, winnerId: string, scores: number[]): boolean {
      const match = tournament.matches.find(m => m.id === matchId);
      if (!match) return false;

      match.winnerId = winnerId;
      match.status = 'completed';
      match.scores = scores;

      // Update participant stats
      const winner = tournament.participants.find(p => p.id === winnerId);
      const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      const loser = tournament.participants.find(p => p.id === loserId);

      if (winner) {
        winner.wins++;
        winner.score += 3;
      }
      if (loser) {
        loser.losses++;
      }

      return true;
    },

    getLeaderboard(): Participant[] {
      return [...tournament.participants].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.rating - a.rating;
      });
    },

    getMatchHistory(participantId: string): Match[] {
      return tournament.matches.filter(
        m => m.player1Id === participantId || m.player2Id === participantId
      );
    },

    getCurrentRoundMatches(): Match[] {
      return tournament.matches.filter(m => m.round === tournament.currentRound);
    },
  };
}
