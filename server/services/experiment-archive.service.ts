/**
 * Experiment Archive Service
 * Provides experiment archival, knowledge base, comparison, auto-archiving,
 * and multi-format report generation.
 */

// ==================== Types ====================

export interface VariantConfig {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface VariantResult {
  variantId: string;
  samples: number;
  conversions: number;
  conversionRate: number;
  meanValue: number;
  standardDeviation: number;
  metrics: Record<string, number>;
}

export interface ExperimentRecord {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'running' | 'completed' | 'archived';
  startTime: number;
  endTime?: number;
  config: {
    variants: VariantConfig[];
    targetMetric: string;
    secondaryMetrics: string[];
    sampleSize: number;
    confidenceLevel: number;
    minimumDetectableEffect: number;
    trafficAllocation: number[];
  };
  results: {
    totalSamples: number;
    variantResults: VariantResult[];
    winner: string;
    statisticalSignificance: number;
    effectSize: number;
    confidenceInterval: number[];
    conclusions: string[];
  };
  metadata: {
    owner: string;
    team: string;
    project: string;
    hypothesis: string;
    learnings: string[];
    relatedExperiments: string[];
  };
  tags: string[];
}

export interface SearchQuery {
  keywords?: string[];
  tags?: string[];
  type?: string;
  status?: string;
  team?: string;
  dateFrom?: number;
  dateTo?: number;
}

export interface SearchResult {
  experiments: ExperimentRecord[];
  totalCount: number;
  facets: {
    types: Record<string, number>;
    tags: Record<string, number>;
    teams: Record<string, number>;
    statuses: Record<string, number>;
  };
}

export interface ArchiveEntry {
  id: string;
  experimentId: string;
  version: number;
  archivedBy: string;
  archivedAt: number;
  note?: string;
  data: ExperimentRecord;
}

export interface ArchiveStats {
  totalArchives: number;
  totalSize: number;
  oldestArchive: number;
  newestArchive: number;
}

export interface ComparisonReport {
  experiments: ExperimentRecord[];
  commonMetrics: string[];
  metricComparison: Record<string, number[]>;
  bestPerforming: string;
}

export interface BestPractice {
  title: string;
  description: string;
  evidence: string[];
}

export interface Insight {
  type: string;
  title: string;
  description: string;
  confidence: number;
}

export interface AutoArchiverConfig {
  archiveAfterDays: number;
  autoArchiveCompleted: boolean;
}

// ==================== Archive Manager ====================

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

export function createArchiveManager() {
  const archives = new Map<string, ArchiveEntry>();
  const experimentVersions = new Map<string, ArchiveEntry[]>();

  return {
    archive(experiment: ExperimentRecord, archivedBy: string, note?: string): ArchiveEntry {
      const history = experimentVersions.get(experiment.id) || [];
      const version = history.length + 1;

      const entry: ArchiveEntry = {
        id: generateId('archive'),
        experimentId: experiment.id,
        version,
        archivedBy,
        archivedAt: Date.now(),
        note,
        data: JSON.parse(JSON.stringify(experiment)),
      };

      archives.set(entry.id, entry);
      history.push(entry);
      experimentVersions.set(experiment.id, history);

      return entry;
    },

    restore(archiveId: string): ExperimentRecord | undefined {
      const entry = archives.get(archiveId);
      if (!entry) return undefined;
      return JSON.parse(JSON.stringify(entry.data));
    },

    getHistory(experimentId: string): ArchiveEntry[] {
      return experimentVersions.get(experimentId) || [];
    },

    getArchiveStats(): ArchiveStats {
      const entries = Array.from(archives.values());
      const timestamps = entries.map((e) => e.archivedAt);

      return {
        totalArchives: archives.size,
        totalSize: entries.reduce((sum, e) => sum + JSON.stringify(e.data).length, 0),
        oldestArchive: timestamps.length > 0 ? Math.min(...timestamps) : 0,
        newestArchive: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      };
    },
  };
}

// ==================== Knowledge Base ====================

export function createKnowledgeBase() {
  const experiments = new Map<string, ExperimentRecord>();

  return {
    add(experiment: ExperimentRecord): void {
      experiments.set(experiment.id, experiment);
    },

    get(id: string): ExperimentRecord | undefined {
      return experiments.get(id);
    },

    search(query: SearchQuery): SearchResult {
      let results = Array.from(experiments.values());

      // Filter by keywords
      if (query.keywords && query.keywords.length > 0) {
        const lowerKeywords = query.keywords.map((k) => k.toLowerCase());
        results = results.filter((exp) => {
          const text = `${exp.name} ${exp.description} ${exp.metadata.hypothesis}`.toLowerCase();
          return lowerKeywords.some((kw) => text.includes(kw));
        });
      }

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        results = results.filter((exp) => query.tags!.some((tag) => exp.tags.includes(tag)));
      }

      // Filter by type
      if (query.type) {
        results = results.filter((exp) => exp.type === query.type);
      }

      // Filter by status
      if (query.status) {
        results = results.filter((exp) => exp.status === query.status);
      }

      // Filter by team
      if (query.team) {
        results = results.filter((exp) => exp.metadata.team === query.team);
      }

      // Build facets from all experiments (not just filtered)
      const allExperiments = Array.from(experiments.values());
      const types: Record<string, number> = {};
      const tags: Record<string, number> = {};
      const teams: Record<string, number> = {};
      const statuses: Record<string, number> = {};

      for (const exp of allExperiments) {
        types[exp.type] = (types[exp.type] || 0) + 1;
        statuses[exp.status] = (statuses[exp.status] || 0) + 1;
        teams[exp.metadata.team] = (teams[exp.metadata.team] || 0) + 1;
        for (const tag of exp.tags) {
          tags[tag] = (tags[tag] || 0) + 1;
        }
      }

      return {
        experiments: results,
        totalCount: results.length,
        facets: { types, tags, teams, statuses },
      };
    },

    getSimilar(experimentId: string, limit: number): ExperimentRecord[] {
      const target = experiments.get(experimentId);
      if (!target) return [];

      const others = Array.from(experiments.values()).filter((e) => e.id !== experimentId);

      // Score similarity based on shared tags, same team, same type
      const scored = others.map((exp) => {
        let score = 0;
        // Shared tags
        const sharedTags = exp.tags.filter((t) => target.tags.includes(t)).length;
        score += sharedTags * 3;
        // Same team
        if (exp.metadata.team === target.metadata.team) score += 2;
        // Same type
        if (exp.type === target.type) score += 1;
        // Same project
        if (exp.metadata.project === target.metadata.project) score += 2;
        return { exp, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map((s) => s.exp);
    },
  };
}

// ==================== Experiment Comparator ====================

export function createExperimentComparator() {
  return {
    compare(experiments: ExperimentRecord[]): ComparisonReport {
      // Find common metrics across all experiments
      const metricSets = experiments.map((exp) => {
        const metrics = new Set<string>();
        metrics.add(exp.config.targetMetric);
        for (const m of exp.config.secondaryMetrics) {
          metrics.add(m);
        }
        return metrics;
      });

      const commonMetrics: string[] = [];
      if (metricSets.length > 0) {
        for (const metric of metricSets[0]) {
          if (metricSets.every((s) => s.has(metric))) {
            commonMetrics.push(metric);
          }
        }
      }

      // Build metric comparison
      const metricComparison: Record<string, number[]> = {};
      for (const metric of commonMetrics) {
        metricComparison[metric] = experiments.map((exp) => {
          if (metric === exp.config.targetMetric) {
            const winner = exp.results.variantResults.find((v) => v.variantId === exp.results.winner);
            return winner?.conversionRate || 0;
          }
          const winner = exp.results.variantResults.find((v) => v.variantId === exp.results.winner);
          return winner?.metrics[metric] || 0;
        });
      }

      // Find best performing
      let bestIdx = 0;
      let bestEffect = 0;
      experiments.forEach((exp, i) => {
        if (exp.results.effectSize > bestEffect) {
          bestEffect = exp.results.effectSize;
          bestIdx = i;
        }
      });

      return {
        experiments,
        commonMetrics,
        metricComparison,
        bestPerforming: experiments[bestIdx]?.id || '',
      };
    },

    findBestPractices(experiments: ExperimentRecord[]): BestPractice[] {
      const practices: BestPractice[] = [];

      // Analyze successful experiments
      const successful = experiments.filter((e) => e.results.statisticalSignificance >= 0.95);

      if (successful.length > 0) {
        practices.push({
          title: 'Achieve statistical significance',
          description: `${successful.length} out of ${experiments.length} experiments achieved significance`,
          evidence: successful.map((e) => e.name),
        });
      }

      // Sample size practice
      const largeEnough = experiments.filter((e) => e.results.totalSamples >= e.config.sampleSize);
      if (largeEnough.length > 0) {
        practices.push({
          title: 'Meet target sample size',
          description: 'Experiments that meet their target sample size produce more reliable results',
          evidence: largeEnough.map((e) => e.name),
        });
      }

      // Always add a general practice
      practices.push({
        title: 'Document learnings',
        description: 'Recording learnings from experiments helps build institutional knowledge',
        evidence: experiments.filter((e) => e.metadata.learnings.length > 0).map((e) => e.name),
      });

      return practices;
    },

    generateInsights(experiments: ExperimentRecord[]): Insight[] {
      const insights: Insight[] = [];

      // Effect size insight
      const avgEffectSize = experiments.reduce((sum, e) => sum + e.results.effectSize, 0) / experiments.length;
      insights.push({
        type: 'effect-size',
        title: 'Average Effect Size',
        description: `The average effect size across ${experiments.length} experiments is ${(avgEffectSize * 100).toFixed(1)}%`,
        confidence: 0.8,
      });

      // Winner distribution
      const winnerCounts = new Map<string, number>();
      for (const exp of experiments) {
        const count = winnerCounts.get(exp.results.winner) || 0;
        winnerCounts.set(exp.results.winner, count + 1);
      }
      insights.push({
        type: 'winner-distribution',
        title: 'Treatment Success Rate',
        description: `Treatment variants won in ${experiments.filter((e) => e.results.winner !== 'control').length} out of ${experiments.length} experiments`,
        confidence: 0.9,
      });

      return insights;
    },
  };
}

// ==================== Auto Archiver ====================

export function createAutoArchiver(initialConfig: AutoArchiverConfig) {
  let config = { ...initialConfig };

  return {
    checkAndArchive(experiments: ExperimentRecord[]): { experimentId: string; archivedAt: number }[] {
      const archived: { experimentId: string; archivedAt: number }[] = [];

      if (!config.autoArchiveCompleted) return archived;

      const cutoff = Date.now() - config.archiveAfterDays * 24 * 60 * 60 * 1000;

      for (const exp of experiments) {
        if (exp.status === 'completed' && exp.endTime && exp.endTime < cutoff) {
          archived.push({
            experimentId: exp.id,
            archivedAt: Date.now(),
          });
        }
      }

      return archived;
    },

    getConfig(): AutoArchiverConfig {
      return { ...config };
    },

    setConfig(updates: Partial<AutoArchiverConfig>): void {
      config = { ...config, ...updates };
    },
  };
}

// ==================== Report Generation ====================

export function generateArchiveReport(experiments: ExperimentRecord[], format: 'markdown' | 'json' | 'html'): string {
  const summary = {
    totalExperiments: experiments.length,
    completedExperiments: experiments.filter((e) => e.status === 'completed').length,
    avgEffectSize: experiments.reduce((sum, e) => sum + e.results.effectSize, 0) / experiments.length,
    significantResults: experiments.filter((e) => e.results.statisticalSignificance >= 0.95).length,
    totalSamples: experiments.reduce((sum, e) => sum + e.results.totalSamples, 0),
  };

  if (format === 'json') {
    return JSON.stringify({
      summary,
      experiments: experiments.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        status: e.status,
        winner: e.results.winner,
        effectSize: e.results.effectSize,
        significance: e.results.statisticalSignificance,
      })),
      generatedAt: Date.now(),
    });
  }

  if (format === 'html') {
    const rows = experiments
      .map(
        (e) =>
          `<tr><td>${e.id}</td><td>${e.name}</td><td>${e.type}</td><td>${e.results.winner}</td><td>${(e.results.effectSize * 100).toFixed(1)}%</td></tr>`
      )
      .join('\n');

    return `<!DOCTYPE html>
<html>
<head><title>Experiment Archive Report</title></head>
<body>
<h1>Experiment Archive Report</h1>
<h2>Summary</h2>
<p>Total experiments: ${summary.totalExperiments}</p>
<p>Completed: ${summary.completedExperiments}</p>
<p>Significant results: ${summary.significantResults}</p>
<h2>Experiments</h2>
<table>
<tr><th>ID</th><th>Name</th><th>Type</th><th>Winner</th><th>Effect Size</th></tr>
${rows}
</table>
</body>
</html>`;
  }

  // Default: markdown
  const experimentList = experiments
    .map(
      (e) =>
        `### ${e.name} (${e.id})\n- Type: ${e.type}\n- Status: ${e.status}\n- Winner: ${e.results.winner}\n- Effect Size: ${(e.results.effectSize * 100).toFixed(1)}%\n- Significance: ${(e.results.statisticalSignificance * 100).toFixed(1)}%`
    )
    .join('\n\n');

  return `# Experiment Archive Report

## Summary
- Total experiments: ${summary.totalExperiments}
- Completed: ${summary.completedExperiments}
- Significant results: ${summary.significantResults}
- Average effect size: ${(summary.avgEffectSize * 100).toFixed(1)}%
- Total samples: ${summary.totalSamples}

## Experiments

${experimentList}

---
*Report generated at ${new Date().toISOString()}*`;
}
