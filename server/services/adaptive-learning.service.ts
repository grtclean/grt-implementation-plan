/**
 * Adaptive Learning Service
 * Q-tables, Q-learning, SARSA, epsilon-greedy, softmax, experience replay, adaptive learning agent.
 */

// ==================== Types ====================

export interface Action {
  id: string;
  name: string;
}

export interface State {
  id: string;
  features: number[];
  timestamp: number;
}

export interface Experience {
  state: State;
  action: Action;
  reward: { value: number; timestamp: number };
  nextState: State;
  done: boolean;
}

export interface LearningConfig {
  algorithm: 'q_learning' | 'sarsa';
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  epsilonDecay: number;
  minEpsilon: number;
}

// ==================== Q-Table ====================

export function createQTable(): Map<string, Map<string, number>> {
  return new Map();
}

export function getQValue(qTable: Map<string, Map<string, number>>, stateId: string, actionId: string): number {
  const stateMap = qTable.get(stateId);
  if (!stateMap) return 0;
  return stateMap.get(actionId) ?? 0;
}

export function setQValue(qTable: Map<string, Map<string, number>>, stateId: string, actionId: string, value: number): void {
  if (!qTable.has(stateId)) {
    qTable.set(stateId, new Map());
  }
  qTable.get(stateId)!.set(actionId, value);
}

export function getMaxQValue(qTable: Map<string, Map<string, number>>, stateId: string, actions: Action[]): number {
  let maxQ = -Infinity;
  for (const action of actions) {
    const q = getQValue(qTable, stateId, action.id);
    if (q > maxQ) maxQ = q;
  }
  return maxQ === -Infinity ? 0 : maxQ;
}

export function getBestAction(qTable: Map<string, Map<string, number>>, stateId: string, actions: Action[]): Action {
  let bestAction = actions[0];
  let bestQ = -Infinity;
  for (const action of actions) {
    const q = getQValue(qTable, stateId, action.id);
    if (q > bestQ) {
      bestQ = q;
      bestAction = action;
    }
  }
  return bestAction;
}

// ==================== Q-Learning & SARSA ====================

export function qLearningUpdate(
  qTable: Map<string, Map<string, number>>,
  experience: Experience,
  config: LearningConfig,
  actions: Action[]
): void {
  const { state, action, reward, nextState, done } = experience;
  const currentQ = getQValue(qTable, state.id, action.id);
  const maxNextQ = done ? 0 : getMaxQValue(qTable, nextState.id, actions);
  const newQ = currentQ + config.learningRate * (reward.value + config.discountFactor * maxNextQ - currentQ);
  setQValue(qTable, state.id, action.id, newQ);
}

export function sarsaUpdate(
  qTable: Map<string, Map<string, number>>,
  experience: Experience,
  nextAction: Action,
  config: LearningConfig
): void {
  const { state, action, reward, nextState, done } = experience;
  const currentQ = getQValue(qTable, state.id, action.id);
  const nextQ = done ? 0 : getQValue(qTable, nextState.id, nextAction.id);
  const newQ = currentQ + config.learningRate * (reward.value + config.discountFactor * nextQ - currentQ);
  setQValue(qTable, state.id, action.id, newQ);
}

// ==================== Policies ====================

export function epsilonGreedyPolicy(
  qTable: Map<string, Map<string, number>>,
  stateId: string,
  actions: Action[],
  epsilon: number
): Action {
  if (Math.random() < epsilon) {
    return actions[Math.floor(Math.random() * actions.length)];
  }
  return getBestAction(qTable, stateId, actions);
}

export function softmaxPolicy(
  qTable: Map<string, Map<string, number>>,
  stateId: string,
  actions: Action[],
  temperature: number
): Action {
  const qValues = actions.map(a => getQValue(qTable, stateId, a.id));
  const maxQ = Math.max(...qValues);
  const exps = qValues.map(q => Math.exp((q - maxQ) / temperature));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  const probabilities = exps.map(e => e / sumExps);

  let rand = Math.random();
  for (let i = 0; i < actions.length; i++) {
    rand -= probabilities[i];
    if (rand <= 0) return actions[i];
  }
  return actions[actions.length - 1];
}

// ==================== Experience Replay ====================

export function addExperience(buffer: Experience[], experience: Experience, maxSize: number): void {
  buffer.push(experience);
  if (buffer.length > maxSize) {
    buffer.shift();
  }
}

export function sampleExperiences(buffer: Experience[], batchSize: number): Experience[] {
  if (buffer.length <= batchSize) return [...buffer];
  const sampled: Experience[] = [];
  const indices = new Set<number>();
  while (indices.size < batchSize) {
    indices.add(Math.floor(Math.random() * buffer.length));
  }
  for (const idx of indices) {
    sampled.push(buffer[idx]);
  }
  return sampled;
}

// ==================== Adaptive Learning Agent ====================

export function createAdaptiveLearningAgent(config: LearningConfig) {
  const qTable = createQTable();
  const experienceBuffer: Experience[] = [];
  let currentEpsilon = config.epsilon;

  return {
    selectAction(stateId: string, actions: Action[]): Action {
      return epsilonGreedyPolicy(qTable, stateId, actions, currentEpsilon);
    },

    learn(experience: Experience, actions: Action[]): void {
      addExperience(experienceBuffer, experience, 10000);
      if (config.algorithm === 'q_learning') {
        qLearningUpdate(qTable, experience, config, actions);
      } else {
        const nextAction = epsilonGreedyPolicy(qTable, experience.nextState.id, actions, currentEpsilon);
        sarsaUpdate(qTable, experience, nextAction, config);
      }
      currentEpsilon = Math.max(config.minEpsilon, currentEpsilon * config.epsilonDecay);
    },

    getQTable(): Map<string, Map<string, number>> {
      return qTable;
    },

    getEpsilon(): number {
      return currentEpsilon;
    },
  };
}
