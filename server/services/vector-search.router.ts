/**
 * Vector Search Router (Task #74)
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as vsSvc from "./vector-search.service";

export const vectorSearchRouter = router({
  generateEmbedding: protectedProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return { embedding: vsSvc.generateEmbedding(input.text), dimensions: 384 };
    }),

  indexDocument: protectedProcedure
    .input(z.object({ docId: z.number(), content: z.string() }))
    .mutation(async ({ input }) => {
      return vsSvc.indexDocument(input.docId, input.content);
    }),

  searchSimilar: protectedProcedure
    .input(z.object({ query: z.string(), topK: z.number().optional() }))
    .query(async ({ input }) => {
      return vsSvc.searchSimilar(input.query, input.topK);
    }),

  reindex: protectedProcedure
    .mutation(async () => {
      return vsSvc.reindexAll();
    }),
});