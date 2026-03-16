/**
 * User selection and search functions
 * Auto-decomposed from server/db.ts
 */
import { or, like } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  users,
} from "../../drizzle/schema";

// ============================================
// User Management Functions
// ============================================

/**
 * Get all users for selection (e.g., for adding training participants)
 */
export async function getAllUsersForSelection(): Promise<{ id: number; name: string | null; email: string | null }[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
  }).from(users).orderBy(users.name).limit(1000);

  return result;
}

/**
 * Search users by name or email
 */
export async function searchUsers(query: string): Promise<{ id: number; name: string | null; email: string | null }[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
  }).from(users)
    .where(
      or(
        like(users.name, `%${query}%`),
        like(users.email, `%${query}%`)
      )
    )
    .orderBy(users.name)
    .limit(20);
  
  return result;
}
