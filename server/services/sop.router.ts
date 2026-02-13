/**
 * SOP Template Library tRPC Router
 *
 * Exposes SOP CRUD and search endpoints via tRPC.
 */

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import {
  listSOPs,
  getSOPById,
  createSOP,
  updateSOP,
  searchSOPs,
  getSOPCategories,
  versionSOP,
} from "./sop.service";

const sopCategoryEnum = z.enum([
  "清洗工艺",
  "质量检测",
  "设备维护",
  "安全操作",
  "客户验收",
  "包装运输",
]);

const sopStatusEnum = z.enum(["draft", "review", "approved", "archived"]);

export const sopRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          category: sopCategoryEnum.optional(),
          status: sopStatusEnum.optional(),
          stage: z.string().optional(),
          equipmentModel: z.string().optional(),
        })
        .optional()
    )
    .query(({ input }) => {
      return listSOPs(input ?? undefined);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      return getSOPById(input.id);
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        category: sopCategoryEnum,
        content: z.string(),
        equipmentModels: z.array(z.string()),
        stages: z.array(z.string()),
        author: z.string(),
      })
    )
    .mutation(({ input }) => {
      return createSOP(input);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        category: sopCategoryEnum.optional(),
        content: z.string().optional(),
        equipmentModels: z.array(z.string()).optional(),
        stages: z.array(z.string()).optional(),
        status: sopStatusEnum.optional(),
        approver: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateSOP(id, data);
    }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(({ input }) => {
      return searchSOPs(input.query);
    }),

  categories: publicProcedure.query(() => {
    return getSOPCategories();
  }),

  version: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      return versionSOP(input.id);
    }),
});
