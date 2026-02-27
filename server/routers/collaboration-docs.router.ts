import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

// ---------------------------------------------------------------------------
// Folder model
// ---------------------------------------------------------------------------

interface MockFolder {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  createdBy: string;
}

const MOCK_FOLDERS: MockFolder[] = [
  { id: 1, name: "CEO 文件", parentId: null, createdAt: "2026-02-10T08:00:00Z", createdBy: "CEO" },
  { id: 2, name: "项目模板", parentId: null, createdAt: "2026-02-12T09:00:00Z", createdBy: "COO" },
];
let nextFolderId = 3;

// ---------------------------------------------------------------------------
// Role levels (mirrors client ROLE_HIERARCHY)
// ---------------------------------------------------------------------------

const ROLE_LEVELS: Record<string, number> = {
  guest: 0,
  employee: 1,
  production_worker: 1,
  team_lead: 2,
  bu_sales: 2,
  bu_mech: 2,
  bu_elec: 2,
  procurement_eng: 2,
  cs_engineer: 2,
  dept_manager: 3,
  bu_pm: 3,
  hr_specialist: 3,
  finance_specialist: 3,
  hr_manager: 4,
  finance_manager: 4,
  director: 5,
  bu_gm: 6,
  admin: 10,
};

// ---------------------------------------------------------------------------
// Mock file data
// ---------------------------------------------------------------------------

const MOCK_FILES = [
  {
    id: 1,
    title: "CEO 3-Week Masterplan Tracker",
    fileName: "CEO-3Week-Masterplan-Tracker.xlsx",
    fileType: "xlsx",
    fileSize: 52480,
    modifiedAt: "2026-02-27T08:00:00Z",
    uploadedBy: "CEO",
    status: "active" as const,
    folderId: 1 as number | null,
    parsedContent: [
      ["Task ID", "To do", "suggestion execute time", "gemini preparation", "claude done"],
      ["1.1", "HR / RBAC User Management", "2026-02-25", "Role matrix designed", "✅ Complete"],
      ["1.2", "Collaboration & Document Hub", "2026-02-27", "OneDrive spec ready", "🔄 In Progress"],
      ["1.3", "OKR + Strategy Cockpit", "2026-02-28", "KPI tree drafted", "Pending"],
      ["2.1", "IoT Fleet Dashboard v2", "2026-03-01", "Sensor API mapped", "Pending"],
      ["2.2", "AI Performance Engine v2", "2026-03-02", "Scoring model tuned", "Pending"],
      ["2.3", "Meeting Intelligence Hub", "2026-03-03", "Diarization spec", "Pending"],
      ["3.1", "Mobile Super-App Shell", "2026-03-05", "DingTalk SDK ready", "Pending"],
      ["3.2", "Enterprise Search + Copilot", "2026-03-07", "RAG index built", "Pending"],
      ["3.3", "CEO Launch & Go-Live", "2026-03-10", "Launch checklist", "Pending"],
    ],
  },
  {
    id: 2,
    title: "Q4 Quality Audit Report",
    fileName: "Q4-Quality-Audit-Report.xlsx",
    fileType: "xlsx",
    fileSize: 131584,
    modifiedAt: "2026-02-15T14:20:00Z",
    uploadedBy: "Quality Manager",
    status: "active" as const,
    folderId: null as number | null,
    parsedContent: [
      ["Audit Item", "Status", "Score", "Remarks"],
      ["Process Control", "Passed", "92", "Minor observation on SPC"],
      ["Document Control", "Passed", "88", "Update revision matrix"],
      ["Calibration", "Passed", "95", "All instruments within spec"],
    ],
  },
  {
    id: 3,
    title: "供应商评估矩阵",
    fileName: "供应商评估矩阵.csv",
    fileType: "csv",
    fileSize: 23654,
    modifiedAt: "2026-02-10T09:15:00Z",
    uploadedBy: "采购部",
    status: "active" as const,
    folderId: null as number | null,
    parsedContent: [
      ["供应商", "质量评分", "交期评分", "综合等级"],
      ["Supplier A", "95", "90", "A"],
      ["Supplier B", "88", "85", "B"],
      ["Supplier C", "72", "80", "C"],
    ],
  },
  {
    id: 4,
    title: "2026年度运营计划",
    fileName: "2026年度运营计划.xlsx",
    fileType: "xlsx",
    fileSize: 91853,
    modifiedAt: "2026-02-05T16:45:00Z",
    uploadedBy: "COO",
    status: "active" as const,
    folderId: 2 as number | null,
    parsedContent: [
      ["Quarter", "Target", "KPI", "Owner"],
      ["Q1", "Launch GRT System v2", "System uptime > 99.5%", "CTO"],
      ["Q2", "Expand to 3 new BUs", "User adoption > 80%", "COO"],
      ["Q3", "AI Integration Phase 2", "Automation rate > 60%", "AI Lead"],
      ["Q4", "Full Digital Transformation", "Paper reduction > 90%", "CEO"],
    ],
  },
];

// File type with widened status
type MockFile = Omit<typeof MOCK_FILES[number], "status"> & { status: "active" | "pending_approval" };

// Mutable state for uploaded files
const uploadedFiles: MockFile[] = [];
let nextUploadId = 100;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const collaborationDocsRouter = router({
  listFiles: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        fileType: z.string().optional(),
        folderId: z.number().nullable().optional(),
      }).optional()
    )
    .query(({ input }) => {
      const allFiles = [...MOCK_FILES, ...uploadedFiles];
      let files = allFiles.map(({ parsedContent: _, ...rest }) => rest);

      // Filter by folder
      if (input?.folderId !== undefined) {
        files = files.filter((f) => f.folderId === input.folderId);
      }

      if (input?.search) {
        const q = input.search.toLowerCase();
        files = files.filter(
          (f) => f.title.toLowerCase().includes(q) || f.fileName.toLowerCase().includes(q)
        );
      }
      if (input?.fileType) {
        files = files.filter((f) => f.fileType === input.fileType);
      }
      return { items: files, total: files.length };
    }),

  getFile: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      const allFiles = [...MOCK_FILES, ...uploadedFiles];
      return allFiles.find((f) => f.id === input.id) ?? null;
    }),

  uploadFile: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
        userRole: z.string().optional(),
        folderId: z.number().nullable().optional(),
      })
    )
    .mutation(({ input }) => {
      const ext = input.fileName.split(".").pop()?.toLowerCase() || "other";
      const roleLevel = ROLE_LEVELS[input.userRole ?? "employee"] ?? 1;
      const status = roleLevel >= 3 ? "active" : "pending_approval";

      const newFile = {
        id: nextUploadId++,
        title: input.fileName.replace(/\.[^.]+$/, ""),
        fileName: input.fileName,
        fileType: ext,
        fileSize: Math.floor(Math.random() * 100000) + 5000,
        modifiedAt: new Date().toISOString(),
        uploadedBy: input.userRole ?? "Current User",
        status: status as "active" | "pending_approval",
        folderId: input.folderId ?? null,
        parsedContent: [
          ["Column A", "Column B", "Column C"],
          ["(uploaded file)", "", ""],
        ],
      };

      uploadedFiles.push(newFile);
      return { ...newFile, parsedContent: undefined };
    }),

  listFolders: publicProcedure
    .input(
      z.object({
        parentId: z.number().nullable().optional(),
      }).optional()
    )
    .query(({ input }) => {
      const parentId = input?.parentId ?? null;
      return MOCK_FOLDERS.filter((f) => f.parentId === parentId);
    }),

  createFolder: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        parentId: z.number().nullable().optional(),
      })
    )
    .mutation(({ input }) => {
      const folder: MockFolder = {
        id: nextFolderId++,
        name: input.name,
        parentId: input.parentId ?? null,
        createdAt: new Date().toISOString(),
        createdBy: "Current User",
      };
      MOCK_FOLDERS.push(folder);
      return folder;
    }),

  approveFile: publicProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(({ input }) => {
      const file = uploadedFiles.find((f) => f.id === input.fileId);
      if (!file) {
        throw new Error("File not found or not an uploaded file");
      }
      file.status = "active";
      return { success: true, fileId: input.fileId };
    }),
});
