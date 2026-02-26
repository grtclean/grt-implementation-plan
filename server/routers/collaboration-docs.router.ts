import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

// Mock file data
const MOCK_FILES = [
  {
    id: 1,
    title: "GRT SYSTEM 调试追踪",
    fileName: "GRT SYSTEM 调试追踪.xlsx",
    fileType: "xlsx",
    fileSize: 46285,
    modifiedAt: "2026-02-18T10:30:00Z",
    uploadedBy: "CEO",
    status: "active" as const,
    parsedContent: [
      ["To do", "suggestion excute time", "gemini perparation", "claude done"],
      ["Step 1: Claude 全局体检", "2026-02-20", "N/A", "\u2705 Complete"],
      ["Step 2: Gemini 战略规划", "2026-02-21", "Strategic analysis done", "Pending"],
      ["Step 3: 双AI协同对齐", "2026-02-22", "Alignment spec ready", "In Progress"],
      ["Step 4: 系统集成测试", "2026-02-23", "Test matrix prepared", "Pending"],
      ["Step 5: CEO验收 & 上线", "2026-02-25", "Launch checklist", "Pending"],
      ["Step 6: 持续优化迭代", "2026-03-01", "Feedback loop designed", "Pending"],
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
    parsedContent: [
      ["Quarter", "Target", "KPI", "Owner"],
      ["Q1", "Launch GRT System v2", "System uptime > 99.5%", "CTO"],
      ["Q2", "Expand to 3 new BUs", "User adoption > 80%", "COO"],
      ["Q3", "AI Integration Phase 2", "Automation rate > 60%", "AI Lead"],
      ["Q4", "Full Digital Transformation", "Paper reduction > 90%", "CEO"],
    ],
  },
];

export const collaborationDocsRouter = router({
  listFiles: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        fileType: z.string().optional(),
      }).optional()
    )
    .query(({ input }) => {
      let files = MOCK_FILES.map(({ parsedContent: _, ...rest }) => rest);
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
      return MOCK_FILES.find((f) => f.id === input.id) ?? null;
    }),

  uploadFile: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
      })
    )
    .mutation(({ input }) => {
      const ext = input.fileName.split(".").pop()?.toLowerCase() || "other";
      return {
        id: Date.now(),
        title: input.fileName.replace(/\.[^.]+$/, ""),
        fileName: input.fileName,
        fileType: ext,
        fileSize: Math.floor(Math.random() * 100000) + 5000,
        modifiedAt: new Date().toISOString(),
        uploadedBy: "Current User",
        status: "active" as const,
      };
    }),
});
