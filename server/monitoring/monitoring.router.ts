import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { monitoringService } from "./monitoring.service";

/**
 * 监控数据API路由
 * 提供系统监控数据、历史数据、告警统计等接口
 */

export const monitoringRouter = router({
  /**
   * 获取系统实时指标
   * 包括CPU、内存、磁盘、网络使用情况
   */
  getSystemMetrics: protectedProcedure.query(async () => {
    return monitoringService.getSystemMetrics();
  }),

  /**
   * 获取应用实时指标
   * 包括响应时间、请求数、错误率、内存使用等
   */
  getApplicationMetrics: protectedProcedure.query(async () => {
    return monitoringService.getApplicationMetrics();
  }),

  /**
   * 获取数据库实时指标
   * 包括连接数、查询时间、慢查询、事务数等
   */
  getDatabaseMetrics: protectedProcedure.query(async () => {
    return monitoringService.getDatabaseMetrics();
  }),

  /**
   * 获取告警统计
   * 包括总告警数、成功率、虚假告警率、响应时间等
   */
  getAlertStatistics: protectedProcedure.query(async () => {
    return monitoringService.getAlertStatistics();
  }),

  /**
   * 获取历史数据
   * 支持CPU、内存、磁盘使用率的历史数据查询
   */
  getHistoricalData: protectedProcedure
    .input(
      z.object({
        type: z.enum(["cpu", "memory", "disk"]),
        hours: z.number().min(1).max(720).default(24), // 1-30 days
      })
    )
    .query(async ({ input }) => {
      return monitoringService.getHistoricalData(input.type, input.hours);
    }),

  /**
   * 获取优化建议
   * 基于当前系统指标，提供优化建议
   */
  getOptimizationSuggestions: protectedProcedure.query(async () => {
    return monitoringService.getOptimizationSuggestions();
  }),

  /**
   * 获取完整监控仪表板数据
   * 一次性获取所有必要的监控数据
   */
  getDashboardData: protectedProcedure.query(async () => {
    return {
      system: monitoringService.getSystemMetrics(),
      application: monitoringService.getApplicationMetrics(),
      database: monitoringService.getDatabaseMetrics(),
      alerts: monitoringService.getAlertStatistics(),
      suggestions: monitoringService.getOptimizationSuggestions(),
      cpuHistory: monitoringService.getHistoricalData("cpu", 24),
      memoryHistory: monitoringService.getHistoricalData("memory", 24),
      diskHistory: monitoringService.getHistoricalData("disk", 24),
    };
  }),

  /**
   * 获取实时监控数据（用于实时更新）
   * 返回最新的系统、应用、数据库指标
   */
  getRealtimeMetrics: protectedProcedure.query(async () => {
    return {
      system: monitoringService.getSystemMetrics(),
      application: monitoringService.getApplicationMetrics(),
      database: monitoringService.getDatabaseMetrics(),
      timestamp: Date.now(),
    };
  }),

  /**
   * 获取告警规则执行情况
   * 显示告警规则的执行统计和效果评估
   */
  getAlertRulePerformance: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(7), // 1-90 days
      })
    )
    .query(async ({ input }) => {
      // In production, query actual alert rule performance data
      return {
        totalRules: 15,
        activeRules: 14,
        disabledRules: 1,
        performance: [
          {
            ruleId: "cpu-high",
            ruleName: "CPU使用率过高",
            triggeredCount: 12,
            successCount: 11,
            falseAlertCount: 1,
            accuracy: 91.67,
            averageResponseTime: 45,
          },
          {
            ruleId: "memory-high",
            ruleName: "内存使用率过高",
            triggeredCount: 8,
            successCount: 8,
            falseAlertCount: 0,
            accuracy: 100,
            averageResponseTime: 38,
          },
          {
            ruleId: "disk-high",
            ruleName: "磁盘使用率过高",
            triggeredCount: 5,
            successCount: 5,
            falseAlertCount: 0,
            accuracy: 100,
            averageResponseTime: 52,
          },
          {
            ruleId: "response-time-high",
            ruleName: "响应时间过长",
            triggeredCount: 20,
            successCount: 18,
            falseAlertCount: 2,
            accuracy: 90,
            averageResponseTime: 35,
          },
          {
            ruleId: "error-rate-high",
            ruleName: "错误率过高",
            triggeredCount: 3,
            successCount: 3,
            falseAlertCount: 0,
            accuracy: 100,
            averageResponseTime: 28,
          },
        ],
        overallAccuracy: 96.4,
        overallAverageResponseTime: 39.6,
      };
    }),

  /**
   * 获取告警规则优化建议
   * 基于告警规则的执行情况，提供优化建议
   */
  getAlertRuleOptimizations: protectedProcedure.query(async () => {
    return [
      {
        id: "optimize-cpu-threshold",
        ruleId: "cpu-high",
        title: "优化CPU告警阈值",
        description:
          "建议将CPU告警阈值从80%调整到85%，以减少虚假告警",
        currentThreshold: 80,
        recommendedThreshold: 85,
        expectedImpact: "虚假告警率从8.3%降低到2%",
        priority: "medium",
      },
      {
        id: "optimize-memory-threshold",
        ruleId: "memory-high",
        title: "优化内存告警阈值",
        description:
          "建议将内存告警阈值从85%调整到90%，以提高告警的准确性",
        currentThreshold: 85,
        recommendedThreshold: 90,
        expectedImpact: "告警准确性保持100%，减少告警频率",
        priority: "low",
      },
      {
        id: "add-response-time-rule",
        ruleId: "response-time-optimization",
        title: "添加响应时间优化规则",
        description:
          "建议添加P95响应时间告警规则，以更好地监控应用性能",
        currentThreshold: null,
        recommendedThreshold: 500,
        expectedImpact: "提高应用性能监控的准确性",
        priority: "high",
      },
    ];
  }),
});
