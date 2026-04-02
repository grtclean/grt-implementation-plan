import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

export const employmentOfferRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql.raw("SELECT * FROM employment_offers ORDER BY created_at DESC LIMIT 100"));
    return (result as any).rows ?? result;
  }),

  checkSalaryViewPermission: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const userName = ctx.user?.name;
    const result = await db.execute(sql.raw("SELECT * FROM salary_view_permissions WHERE viewer_name = '" + (userName || '').replace(/'/g, "''") + "' LIMIT 1"));
    const perm = ((result as any).rows ?? result)[0];
    if (!perm) return { canView: false, scope: "self" };
    return { canView: perm.can_view_scope !== "none", scope: perm.can_view_scope, details: perm.can_view_details };
  }),
});
