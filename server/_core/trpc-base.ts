/**
 * tRPC base initialization — extracted to avoid circular dependencies.
 *
 * Middleware files (gateway-audit, gateway-bu-context) import `t` from here.
 * The main `trpc.ts` also imports `t` from here and re-exports procedures.
 */

import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

export const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});
