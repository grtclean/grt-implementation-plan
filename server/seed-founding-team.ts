/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║             GRT SYSTEM — FOUNDING TIGER TEAM SEED              ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                ║
 * ║  This script seeds the 7 founding members of the GRT System    ║
 * ║  Tiger Team, their RBAC roles, and user-role assignments.      ║
 * ║                                                                ║
 * ║  ── Official Organizational Roster ──                          ║
 * ║                                                                ║
 * ║  1. Ni Weiwei  — Project Sponsor / General Director            ║
 * ║     Roles: SUPER_ADMIN, EXECUTIVE_SPONSOR                     ║
 * ║                                                                ║
 * ║  2. Liu Aoyun  — Project Manager & Chief Architect             ║
 * ║     Roles: SYSTEM_ARCHITECT, ADMIN                            ║
 * ║                                                                ║
 * ║  3. Xi Wang    — Data Architect & Backend Lead                 ║
 * ║     Role:  DATA_ENGINEER                                      ║
 * ║                                                                ║
 * ║  4. Hu Yang    — AI & System Integration Engineer              ║
 * ║     Role:  AI_ENGINEER                                        ║
 * ║                                                                ║
 * ║  5. Zhu Yuhao  — IT Infrastructure & DevOps                   ║
 * ║     Role:  DEVOPS_ADMIN                                       ║
 * ║                                                                ║
 * ║  6. Xiao Zhu   — UI/UX Designer                               ║
 * ║     Role:  FRONTEND_DEVELOPER                                 ║
 * ║                                                                ║
 * ║  7. Liu Kun    — Product Owner - Market & Customer             ║
 * ║     Roles: BUSINESS_ANALYST, SALES_MANAGER                   ║
 * ║                                                                ║
 * ║  Run:  npx tsx server/seed-founding-team.ts                    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { roles, userRoles } from "../drizzle/permission-schema";

// ── Tiger Team Role Definitions ──────────────────────

interface RoleDef {
  name: string;
  displayName: string;
  displayNameZh: string;
  description: string;
  roleType: string;
  category: string;
  level: number;
  defaultDataScope: string;
}

const TIGER_TEAM_ROLES: RoleDef[] = [
  {
    name: "SUPER_ADMIN",
    displayName: "Super Administrator",
    displayNameZh: "超级管理员",
    description: "Full system access. Can manage all modules, users, roles, and system configuration.",
    roleType: "system",
    category: "executive",
    level: 10,
    defaultDataScope: "all",
  },
  {
    name: "EXECUTIVE_SPONSOR",
    displayName: "Executive Sponsor",
    displayNameZh: "项目赞助人",
    description: "Strategic oversight and approval authority. Read access to all dashboards and reports.",
    roleType: "system",
    category: "executive",
    level: 8,
    defaultDataScope: "all",
  },
  {
    name: "SYSTEM_ARCHITECT",
    displayName: "System Architect",
    displayNameZh: "系统架构师",
    description: "Full technical oversight. Write access to all engineering modules, schema management, and deployment configuration.",
    roleType: "technical",
    category: "engineering",
    level: 8,
    defaultDataScope: "all",
  },
  {
    name: "ADMIN",
    displayName: "Administrator",
    displayNameZh: "管理员",
    description: "System administration. Manage users, roles, permissions, and module configuration.",
    roleType: "system",
    category: "executive",
    level: 7,
    defaultDataScope: "all",
  },
  {
    name: "DATA_ENGINEER",
    displayName: "Data Engineer",
    displayNameZh: "数据工程师",
    description: "Database architecture, schema design, migration management, and backend API development.",
    roleType: "technical",
    category: "engineering",
    level: 5,
    defaultDataScope: "all",
  },
  {
    name: "AI_ENGINEER",
    displayName: "AI Engineer",
    displayNameZh: "AI工程师",
    description: "AI model integration, prompt engineering, AI agent configuration, and system intelligence modules.",
    roleType: "technical",
    category: "engineering",
    level: 5,
    defaultDataScope: "all",
  },
  {
    name: "DEVOPS_ADMIN",
    displayName: "DevOps Administrator",
    displayNameZh: "运维管理员",
    description: "Infrastructure management, CI/CD pipelines, monitoring, deployment, and security configuration.",
    roleType: "technical",
    category: "engineering",
    level: 6,
    defaultDataScope: "all",
  },
  {
    name: "FRONTEND_DEVELOPER",
    displayName: "Frontend Developer",
    displayNameZh: "前端开发工程师",
    description: "UI/UX implementation, component development, and frontend testing across all modules.",
    roleType: "technical",
    category: "engineering",
    level: 4,
    defaultDataScope: "all",
  },
  {
    name: "BUSINESS_ANALYST",
    displayName: "Business Analyst",
    displayNameZh: "业务分析师",
    description: "Requirements analysis, business process mapping, user story definition, and acceptance criteria.",
    roleType: "business",
    category: "operations",
    level: 5,
    defaultDataScope: "all",
  },
  {
    name: "SALES_MANAGER",
    displayName: "Sales Manager",
    displayNameZh: "销售经理",
    description: "CRM management, customer interactions, sales pipeline oversight, and market analytics.",
    roleType: "business",
    category: "operations",
    level: 5,
    defaultDataScope: "own_dept",
  },
];

// ── Tiger Team Members ───────────────────────────────

interface MemberDef {
  name: string;
  email: string;
  openId: string;
  title: string;
  roles: string[];  // references TIGER_TEAM_ROLES[].name
}

const FOUNDING_MEMBERS: MemberDef[] = [
  {
    name: "Ni Weiwei",
    email: "ni.weiwei@grt-group.com",
    openId: "grt-nww-001",
    title: "Project Sponsor / General Director",
    roles: ["SUPER_ADMIN", "EXECUTIVE_SPONSOR"],
  },
  {
    name: "Liu Aoyun",
    email: "liu.aoyun@grt-group.com",
    openId: "grt-lay-002",
    title: "Project Manager & Chief Architect",
    roles: ["SYSTEM_ARCHITECT", "ADMIN"],
  },
  {
    name: "Xi Wang",
    email: "xi.wang@grt-group.com",
    openId: "grt-xw-003",
    title: "Data Architect & Backend Lead",
    roles: ["DATA_ENGINEER"],
  },
  {
    name: "Hu Yang",
    email: "hu.yang@grt-group.com",
    openId: "grt-hy-004",
    title: "AI & System Integration Engineer",
    roles: ["AI_ENGINEER"],
  },
  {
    name: "Zhu Yuhao",
    email: "zhu.yuhao@grt-group.com",
    openId: "grt-zyh-005",
    title: "IT Infrastructure & DevOps",
    roles: ["DEVOPS_ADMIN"],
  },
  {
    name: "Xiao Zhu",
    email: "xiao.zhu@grt-group.com",
    openId: "grt-xz-006",
    title: "UI/UX Designer",
    roles: ["FRONTEND_DEVELOPER"],
  },
  {
    name: "Liu Kun",
    email: "liu.kun@grt-group.com",
    openId: "grt-lk-007",
    title: "Product Owner - Market & Customer",
    roles: ["BUSINESS_ANALYST", "SALES_MANAGER"],
  },
];

// ── Seed Execution ───────────────────────────────────

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[Seed] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   GRT Tiger Team — Founding Team Seed Script        ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  try {
    // ── Step 1: Seed roles into grt_roles ──

    console.log("[1/3] Seeding Tiger Team roles...");
    const roleIdMap = new Map<string, number>();

    for (const roleDef of TIGER_TEAM_ROLES) {
      // Upsert: skip if role already exists
      const existing = await db.select().from(roles).where(eq(roles.name, roleDef.name));
      if (existing.length > 0) {
        roleIdMap.set(roleDef.name, existing[0].id);
        console.log(`  [skip] Role "${roleDef.name}" already exists (id=${existing[0].id})`);
        continue;
      }

      const [created] = await db.insert(roles).values({
        name: roleDef.name,
        displayName: roleDef.displayName,
        displayNameZh: roleDef.displayNameZh,
        description: roleDef.description,
        roleType: roleDef.roleType,
        category: roleDef.category,
        level: roleDef.level,
        defaultDataScope: roleDef.defaultDataScope,
        isActive: true,
      }).returning();

      roleIdMap.set(roleDef.name, created.id);
      console.log(`  [+] Role "${roleDef.name}" created (id=${created.id}, level=${roleDef.level})`);
    }

    console.log(`  => ${roleIdMap.size} roles ready.\n`);

    // ── Step 2: Seed users ──

    console.log("[2/3] Seeding founding team members...");
    const userIdMap = new Map<string, number>();

    for (const member of FOUNDING_MEMBERS) {
      // Upsert: skip if user with this openId already exists
      const existing = await db.select().from(users).where(eq(users.openId, member.openId));
      if (existing.length > 0) {
        userIdMap.set(member.openId, existing[0].id);
        console.log(`  [skip] User "${member.name}" already exists (id=${existing[0].id})`);
        continue;
      }

      const [created] = await db.insert(users).values({
        openId: member.openId,
        name: member.name,
        email: member.email,
        loginMethod: "password",
        role: "admin",  // All Tiger Team members get admin in the base users table
      }).returning();

      userIdMap.set(member.openId, created.id);
      console.log(`  [+] User "${member.name}" (${member.title}) created (id=${created.id})`);
    }

    console.log(`  => ${userIdMap.size} users ready.\n`);

    // ── Step 3: Link users to roles in grt_user_roles ──

    console.log("[3/3] Linking users to roles...");
    let linkCount = 0;

    for (const member of FOUNDING_MEMBERS) {
      const userId = userIdMap.get(member.openId);
      if (!userId) {
        console.warn(`  [!] Could not find userId for ${member.name}, skipping role assignment.`);
        continue;
      }

      for (const roleName of member.roles) {
        const roleId = roleIdMap.get(roleName);
        if (!roleId) {
          console.warn(`  [!] Could not find roleId for "${roleName}", skipping.`);
          continue;
        }

        // Check if this exact assignment already exists
        const existing = await db.select().from(userRoles)
          .where(and(eq(userRoles.userId, String(userId)), eq(userRoles.roleId, roleId)));

        if (existing.length > 0) {
          console.log(`  [skip] ${member.name} <-> ${roleName} already linked`);
          continue;
        }

        await db.insert(userRoles).values({
          userId: String(userId),
          roleId: roleId,
          isActive: true,
        });

        linkCount++;
        console.log(`  [+] ${member.name} <-> ${roleName} (userId=${userId}, roleId=${roleId})`);
      }
    }

    console.log(`  => ${linkCount} user-role links created.\n`);

    // ── Summary ──

    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║                   SEED COMPLETE                     ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║  Roles created/verified:  ${String(roleIdMap.size).padStart(3)}                        ║`);
    console.log(`║  Users created/verified:  ${String(userIdMap.size).padStart(3)}                        ║`);
    console.log(`║  User-role links:         ${String(linkCount).padStart(3)}                        ║`);
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log("║  Tiger Team Roster:                                 ║");
    for (const m of FOUNDING_MEMBERS) {
      const line = `║  · ${m.name.padEnd(14)} ${m.roles.join(", ").padEnd(35)}║`;
      console.log(line);
    }
    console.log("╚══════════════════════════════════════════════════════╝");
  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
