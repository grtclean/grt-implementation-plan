/**
 * Battle Simulator Service
 * Battle sessions, AI moves, replay, visualization, analysis, reports.
 */

// ==================== Types ====================

export interface Player {
  id: string;
  name: string;
  type: 'human' | 'ai';
  aiConfig?: {
    algorithm: string;
    difficulty: string;
    thinkingTime: number;
  };
}

export interface GameConfig {
  id: string;
  name: string;
  type: string;
  players: Player[];
  simultaneousMoves: boolean;
  rounds: number;
}

interface HistoryEntry {
  playerId: string;
  action: string;
  round: number;
  timestamp: number;
}

interface BattleState {
  status: 'waiting' | 'playing' | 'paused' | 'finished';
  round: number;
  history: HistoryEntry[];
  scores: number[];
  winner: number | null;
}

interface BattleSession {
  id: string;
  config: GameConfig;
  state: BattleState;
  startTime: number | null;
  endTime: number | null;
}

interface ReplayController {
  session: BattleSession;
  currentStep: number;
  totalSteps: number;
  playbackSpeed: number;
  isPlaying: boolean;
  annotations: Array<{ step: number; text: string }>;
}

interface VisualizationData {
  gameBoard: any;
  playerPositions: Array<{ id: string; x: number; y: number }>;
  scores: number[];
  round: number;
}

interface BattleAnalysis {
  summary: string;
  playerPerformance: Array<{ playerId: string; score: number; moves: number }>;
  recommendations: string[];
  statistics: Record<string, any>;
}

// ==================== Session Management ====================

let _sessionCounter = 0;

export function createBattleSession(config: GameConfig): BattleSession {
  _sessionCounter++;
  return {
    id: `battle_${Date.now()}_${_sessionCounter}`,
    config,
    state: {
      status: 'waiting',
      round: 0,
      history: [],
      scores: config.players.map(() => 0),
      winner: null,
    },
    startTime: null,
    endTime: null,
  };
}

export function startBattle(session: BattleSession): BattleSession {
  return {
    ...session,
    state: { ...session.state, status: 'playing', round: 1 },
    startTime: Date.now(),
  };
}

export function pauseBattle(session: BattleSession): BattleSession {
  return {
    ...session,
    state: { ...session.state, status: 'paused' },
  };
}

export function resumeBattle(session: BattleSession): BattleSession {
  return {
    ...session,
    state: { ...session.state, status: 'playing' },
  };
}

export function makeMove(session: BattleSession, playerId: string, action: string): BattleSession {
  const entry: HistoryEntry = {
    playerId,
    action,
    round: session.state.round,
    timestamp: Date.now(),
  };
  return {
    ...session,
    state: {
      ...session.state,
      history: [...session.state.history, entry],
    },
  };
}

export function endBattle(session: BattleSession, winnerIndex: number | null): BattleSession {
  return {
    ...session,
    state: { ...session.state, status: 'finished', winner: winnerIndex },
    endTime: Date.now(),
  };
}

// ==================== AI Player ====================

export function getAIMove(session: BattleSession, aiPlayerId: string): string {
  const player = session.config.players.find(p => p.id === aiPlayerId);
  if (!player || player.type !== 'ai') {
    return 'cooperate';
  }

  const algorithm = player.aiConfig?.algorithm || 'random';

  if (algorithm === 'random') {
    const actions = ['cooperate', 'defect'];
    return actions[Math.floor(Math.random() * actions.length)];
  }

  if (algorithm === 'tit_for_tat') {
    // Copy last opponent move
    const opponentMoves = session.state.history.filter(h => h.playerId !== aiPlayerId);
    if (opponentMoves.length > 0) {
      return opponentMoves[opponentMoves.length - 1].action;
    }
    return 'cooperate';
  }

  return 'cooperate';
}

// ==================== Replay System ====================

export function createReplayController(session: BattleSession): ReplayController {
  return {
    session,
    currentStep: 0,
    totalSteps: session.state.history.length,
    playbackSpeed: 1.0,
    isPlaying: false,
    annotations: [],
  };
}

export function stepForward(controller: ReplayController): ReplayController {
  const nextStep = Math.min(controller.currentStep + 1, controller.totalSteps);
  return { ...controller, currentStep: nextStep };
}

export function stepBackward(controller: ReplayController): ReplayController {
  const prevStep = Math.max(controller.currentStep - 1, 0);
  return { ...controller, currentStep: prevStep };
}

export function jumpToStep(controller: ReplayController, step: number): ReplayController {
  const targetStep = Math.max(0, Math.min(step, controller.totalSteps));
  return { ...controller, currentStep: targetStep };
}

export function setPlaybackSpeed(controller: ReplayController, speed: number): ReplayController {
  return { ...controller, playbackSpeed: speed };
}

export function addAnnotation(controller: ReplayController, step: number, text: string): ReplayController {
  return {
    ...controller,
    annotations: [...controller.annotations, { step, text }],
  };
}

// ==================== Visualization ====================

export function generateVisualizationData(session: BattleSession): VisualizationData {
  return {
    gameBoard: {
      type: session.config.type,
      rounds: session.config.rounds,
      currentRound: session.state.round,
    },
    playerPositions: session.config.players.map((p, i) => ({
      id: p.id,
      x: i * 100 + 50,
      y: 50,
    })),
    scores: [...session.state.scores],
    round: session.state.round,
  };
}

// ==================== Analysis ====================

export function analyzeBattle(session: BattleSession): BattleAnalysis {
  const playerPerformance = session.config.players.map((p, i) => ({
    playerId: p.id,
    score: session.state.scores[i] || 0,
    moves: session.state.history.filter(h => h.playerId === p.id).length,
  }));

  const recommendations: string[] = [];
  if (session.state.history.length === 0) {
    recommendations.push('No moves recorded yet. Start playing to get analysis.');
  } else {
    recommendations.push('Consider varying your strategy to keep opponents guessing.');
    recommendations.push('Analyze opponent patterns for potential exploitation.');
  }

  return {
    summary: `Battle with ${session.config.players.length} players over ${session.state.round} rounds. ${session.state.history.length} total moves.`,
    playerPerformance,
    recommendations,
    statistics: {
      totalMoves: session.state.history.length,
      rounds: session.state.round,
      avgMovesPerRound: session.state.round > 0 ? session.state.history.length / session.state.round : 0,
    },
  };
}

// ==================== Report Export ====================

export function exportBattleReport(session: BattleSession): string {
  const analysis = analyzeBattle(session);
  let report = `# Battle Report\n\n`;
  report += `## Game: ${session.config.name}\n\n`;
  report += `**Status:** ${session.state.status}\n\n`;
  report += `**Players:**\n`;
  for (const p of session.config.players) {
    report += `- ${p.name} (${p.type})\n`;
  }
  report += `\n## Summary\n\n${analysis.summary}\n\n`;
  report += `## Player Performance\n\n`;
  for (const perf of analysis.playerPerformance) {
    report += `- ${perf.playerId}: Score ${perf.score}, Moves ${perf.moves}\n`;
  }
  report += `\n## Recommendations\n\n`;
  for (const rec of analysis.recommendations) {
    report += `- ${rec}\n`;
  }
  if (session.state.winner !== null) {
    report += `\n## Winner\n\n${session.config.players[session.state.winner]?.name || 'Unknown'}\n`;
  }
  return report;
}
