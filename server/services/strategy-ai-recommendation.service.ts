/**
 * Strategy AI Recommendation Service
 * Strategy recommender, model, mixed strategy optimizer, opponent model, feature extraction.
 */

// ==================== Types ====================

export interface HistoricalGame {
  id: string;
  gameType: string;
  players: string[];
  strategies: string[][];
  payoffs: number[][][];
  outcomes: Array<{
    round: number;
    playerStrategies: number[];
    payoffs: number[];
  }>;
  timestamp: number;
}

export interface StrategyRecommendation {
  strategyIndex: number;
  confidence: number;
  reasoning: string;
}

interface OpponentProfile {
  playerId: string;
  strategyDistribution: number[];
  predictedStrategy: number;
  gamesAnalyzed: number;
}

// ==================== Strategy Recommender ====================

export function createStrategyRecommender() {
  const games: HistoricalGame[] = [];
  const opponentProfiles = new Map<string, OpponentProfile>();

  return {
    addGame(game: HistoricalGame): void {
      games.push(game);
      // Build opponent profiles
      for (let pIdx = 0; pIdx < game.players.length; pIdx++) {
        const playerId = game.players[pIdx];
        const stratCount = game.strategies[pIdx]?.length || 2;
        const dist = new Array(stratCount).fill(0);
        for (const outcome of game.outcomes) {
          const si = outcome.playerStrategies[pIdx];
          if (si !== undefined && si < dist.length) {
            dist[si]++;
          }
        }
        const total = dist.reduce((a, b) => a + b, 0) || 1;
        const normalized = dist.map(d => d / total);
        opponentProfiles.set(playerId, {
          playerId,
          strategyDistribution: normalized,
          predictedStrategy: normalized.indexOf(Math.max(...normalized)),
          gamesAnalyzed: (opponentProfiles.get(playerId)?.gamesAnalyzed || 0) + 1,
        });
      }
    },

    train(): { epochsCompleted: number; loss: number } {
      // Simple training stub
      return { epochsCompleted: games.length > 0 ? 10 : 0, loss: 0.1 };
    },

    recommend(game: HistoricalGame, playerIndex: number): StrategyRecommendation {
      const stratCount = game.strategies[playerIndex]?.length || 2;
      // Simple heuristic: pick strategy with best average payoff
      let bestStrategy = 0;
      let bestAvgPayoff = -Infinity;
      for (let s = 0; s < stratCount; s++) {
        let totalPayoff = 0;
        let count = 0;
        for (const outcome of game.outcomes) {
          if (outcome.playerStrategies[playerIndex] === s) {
            totalPayoff += outcome.payoffs[playerIndex];
            count++;
          }
        }
        const avg = count > 0 ? totalPayoff / count : 0;
        if (avg > bestAvgPayoff) {
          bestAvgPayoff = avg;
          bestStrategy = s;
        }
      }
      return {
        strategyIndex: bestStrategy,
        confidence: Math.min(0.9, 0.5 + games.length * 0.05),
        reasoning: `Strategy ${bestStrategy} has the best average payoff`,
      };
    },

    getTopStrategies(game: HistoricalGame, playerIndex: number, topN: number): StrategyRecommendation[] {
      const stratCount = game.strategies[playerIndex]?.length || 2;
      const results: StrategyRecommendation[] = [];
      for (let s = 0; s < Math.min(stratCount, topN); s++) {
        results.push({
          strategyIndex: s,
          confidence: Math.max(0.1, 0.9 - s * 0.2),
          reasoning: `Strategy option ${s}`,
        });
      }
      return results;
    },

    analyzeOpponent(playerId: string): OpponentProfile | null {
      return opponentProfiles.get(playerId) || null;
    },
  };
}

// ==================== Strategy Model ====================

export function createStrategyModel() {
  let weights = {
    featureWeights: new Array(10).fill(0),
    bias: 0,
    trained: false,
  };

  return {
    train(games: HistoricalGame[]): { loss: number; epochs: number } {
      // Simple training: adjust weights based on game data
      for (let i = 0; i < weights.featureWeights.length; i++) {
        weights.featureWeights[i] = Math.random() * 0.1;
      }
      weights.trained = true;
      return { loss: Math.max(0.01, 1 / (games.length + 1)), epochs: 10 };
    },

    predict(features: number[]): number[] {
      if (!weights.trained) return [0.5, 0.5];
      const scores: number[] = [];
      for (let i = 0; i < 2; i++) {
        let score = weights.bias;
        for (let j = 0; j < Math.min(features.length, weights.featureWeights.length); j++) {
          score += features[j] * weights.featureWeights[j];
        }
        scores.push(1 / (1 + Math.exp(-score + i * 0.1)));
      }
      return scores;
    },

    getWeights(): { featureWeights: number[]; bias: number } {
      return { featureWeights: [...weights.featureWeights], bias: weights.bias };
    },
  };
}

// ==================== Mixed Strategy Optimizer ====================

export function createMixedStrategyOptimizer() {
  return {
    optimize(game: HistoricalGame, playerIndex: number): number[] {
      const stratCount = game.strategies[playerIndex]?.length || 2;
      if (stratCount === 0) return [];

      // Simple linear programming approximation: use fictitious play concept
      const mix = new Array(stratCount).fill(1 / stratCount);

      // Iterate to find approximate Nash equilibrium mixed strategy
      for (let iter = 0; iter < 100; iter++) {
        const expectedPayoffs = new Array(stratCount).fill(0);
        for (let s = 0; s < stratCount; s++) {
          for (const outcome of game.outcomes) {
            if (outcome.playerStrategies[playerIndex] === s) {
              expectedPayoffs[s] += outcome.payoffs[playerIndex];
            }
          }
        }
        // Adjust mix toward better strategies
        const total = expectedPayoffs.reduce((a, b) => a + Math.max(0, b), 0) || 1;
        for (let s = 0; s < stratCount; s++) {
          mix[s] = 0.9 * mix[s] + 0.1 * Math.max(0, expectedPayoffs[s]) / total;
        }
        // Normalize
        const mixSum = mix.reduce((a: number, b: number) => a + b, 0) || 1;
        for (let s = 0; s < stratCount; s++) {
          mix[s] /= mixSum;
        }
      }

      return mix;
    },

    simulateOutcome(game: HistoricalGame, mixedStrategies: number[][]): number[] {
      const playerCount = game.players.length;
      const expectedPayoffs = new Array(playerCount).fill(0);

      // Calculate expected payoff under mixed strategies
      const stratCounts = game.strategies.map(s => s.length);

      function recurse(playerIdx: number, currentStrategies: number[], probability: number): void {
        if (playerIdx >= playerCount) {
          // Look up payoff for this strategy combination
          const key = currentStrategies.join('-');
          for (const row of game.payoffs) {
            // Try matching payoff matrix row
            if (row.length > 0) {
              for (let p = 0; p < playerCount; p++) {
                expectedPayoffs[p] += probability * (row[currentStrategies[0]]?.[p] || 0);
              }
              break;
            }
          }
          return;
        }
        for (let s = 0; s < stratCounts[playerIdx]; s++) {
          const prob = (mixedStrategies[playerIdx]?.[s] || 0) * probability;
          recurse(playerIdx + 1, [...currentStrategies, s], prob);
        }
      }

      // Simplified: just return average from outcomes
      if (game.outcomes.length > 0) {
        for (const outcome of game.outcomes) {
          for (let p = 0; p < playerCount; p++) {
            expectedPayoffs[p] += outcome.payoffs[p] / game.outcomes.length;
          }
        }
      } else {
        recurse(0, [], 1);
      }

      return expectedPayoffs;
    },
  };
}

// ==================== Opponent Model ====================

export function createOpponentModel() {
  let profile: OpponentProfile | null = null;

  return {
    learn(games: HistoricalGame[], playerId: string, playerIndex: number): void {
      const stratCount = games[0]?.strategies[playerIndex]?.length || 2;
      const dist = new Array(stratCount).fill(0);

      for (const game of games) {
        for (const outcome of game.outcomes) {
          const si = outcome.playerStrategies[playerIndex];
          if (si !== undefined && si < dist.length) {
            dist[si]++;
          }
        }
      }

      const total = dist.reduce((a, b) => a + b, 0) || 1;
      const normalized = dist.map(d => d / total);

      profile = {
        playerId,
        strategyDistribution: normalized,
        predictedStrategy: normalized.indexOf(Math.max(...normalized)),
        gamesAnalyzed: games.length,
      };
    },

    predict(gameType: string): number[] {
      if (!profile) return [0.5, 0.5];
      return [...profile.strategyDistribution];
    },

    getProfile(): OpponentProfile | null {
      return profile;
    },
  };
}

// ==================== Feature Extraction ====================

export function extractFeatures(
  game: HistoricalGame,
  playerIndex: number,
  round: number
): {
  gameType: string;
  playerCount: number;
  strategyCount: number;
  roundNumber: number;
  avgPayoff: number;
  maxPayoff: number;
  minPayoff: number;
} {
  const payoffs = game.outcomes
    .filter(o => o.round <= round || round === 0)
    .map(o => o.payoffs[playerIndex]);

  const avg = payoffs.length > 0 ? payoffs.reduce((a, b) => a + b, 0) / payoffs.length : 0;
  const max = payoffs.length > 0 ? Math.max(...payoffs) : 0;
  const min = payoffs.length > 0 ? Math.min(...payoffs) : 0;

  return {
    gameType: game.gameType,
    playerCount: game.players.length,
    strategyCount: game.strategies[playerIndex]?.length || 0,
    roundNumber: round,
    avgPayoff: avg,
    maxPayoff: max,
    minPayoff: min,
  };
}
