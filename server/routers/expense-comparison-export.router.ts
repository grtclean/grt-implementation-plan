/**
 * GRT 5.0 费用对比导出 tRPC 路由 (stub)
 *
 * 功能:
 * - 导出费用对比数据 (URL)
 * - 导出费用对比报告 (二进制)
 *
 * No DB tables — returns empty/stub data.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

export const expenseComparisonExportRouter = router({
  export: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), format: z.string().optional() }).optional())
    .mutation(() => {
      return { url: "" };
    }),

  exportReport: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), format: z.string().optional() }).optional())
    .mutation(() => {
      return {
        data: "",
        mimeType: "application/octet-stream",
        filename: "expense-comparison.xlsx",
      };
    }),
});
