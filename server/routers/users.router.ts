import { z } from "zod";
import { router, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, desc, ilike } from "drizzle-orm";

export const usersRouter = router({
  getAll: requirePermission('system:users:view').query(async () => {
    const db = await requireDb();
    return await db.select().from(users).orderBy(users.name);
  }),

  search: requirePermission('system:users:view').input(z.object({ query: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const all = await db.select().from(users);
    const q = input.query.toLowerCase();
    return all.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.openId?.toLowerCase().includes(q)
    );
  }),
});
