import { z } from "zod";
import { jsonValue } from "@shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// ────────────────── GRT Standard Field Schema ──────────────────

const GRT_STANDARD_FIELDS = [
  { key: "customer_name", label: "Customer Name", labelZh: "客户名称", type: "string" },
  { key: "customer_code", label: "Customer Code", labelZh: "客户编码", type: "string" },
  { key: "contact_person", label: "Contact Person", labelZh: "联系人", type: "string" },
  { key: "contact_phone", label: "Contact Phone", labelZh: "联系电话", type: "string" },
  { key: "contact_email", label: "Contact Email", labelZh: "联系邮箱", type: "string" },
  { key: "company_address", label: "Company Address", labelZh: "公司地址", type: "string" },
  { key: "industry", label: "Industry", labelZh: "行业", type: "string" },
  { key: "order_number", label: "Order Number", labelZh: "订单号", type: "string" },
  { key: "order_date", label: "Order Date", labelZh: "订单日期", type: "date" },
  { key: "product_name", label: "Product Name", labelZh: "产品名称", type: "string" },
  { key: "product_code", label: "Product Code", labelZh: "产品编号", type: "string" },
  { key: "quantity", label: "Quantity", labelZh: "数量", type: "number" },
  { key: "unit_price", label: "Unit Price", labelZh: "单价", type: "number" },
  { key: "total_amount", label: "Total Amount", labelZh: "总金额", type: "number" },
  { key: "currency", label: "Currency", labelZh: "币种", type: "string" },
  { key: "delivery_date", label: "Delivery Date", labelZh: "交付日期", type: "date" },
  { key: "status", label: "Status", labelZh: "状态", type: "string" },
  { key: "project_name", label: "Project Name", labelZh: "项目名称", type: "string" },
  { key: "project_code", label: "Project Code", labelZh: "项目编号", type: "string" },
  { key: "department", label: "Department", labelZh: "部门", type: "string" },
  { key: "employee_name", label: "Employee Name", labelZh: "员工姓名", type: "string" },
  { key: "employee_id", label: "Employee ID", labelZh: "员工工号", type: "string" },
  { key: "notes", label: "Notes", labelZh: "备注", type: "string" },
] as const;

// ────────────────── AI Semantic Field Mapper (Mock Gemini) ──────────────────

/** Semantic similarity mapping — simulates Gemini's field-matching intelligence */
const SEMANTIC_ALIASES: Record<string, string> = {
  // Customer
  custname: "customer_name", customer: "customer_name", customername: "customer_name",
  clientname: "customer_name", client: "customer_name", companyname: "customer_name",
  custcode: "customer_code", customerid: "customer_code", clientcode: "customer_code",
  // Contact
  contact: "contact_person", contactname: "contact_person", person: "contact_person",
  liaison: "contact_person", representative: "contact_person",
  phone: "contact_phone", tel: "contact_phone", telephone: "contact_phone",
  mobile: "contact_phone", cellphone: "contact_phone",
  email: "contact_email", mail: "contact_email", emailaddress: "contact_email",
  // Address
  address: "company_address", addr: "company_address", location: "company_address",
  companyaddr: "company_address", officeaddress: "company_address",
  // Order
  orderno: "order_number", orderid: "order_number", ordernum: "order_number",
  purchaseorder: "order_number", pono: "order_number", sono: "order_number",
  orderdate: "order_date", dateordered: "order_date", podate: "order_date",
  // Product
  productname: "product_name", product: "product_name", itemname: "product_name",
  item: "product_name", partname: "product_name", materialname: "product_name",
  productcode: "product_code", partno: "product_code", partnumber: "product_code",
  itemcode: "product_code", sku: "product_code", materialcode: "product_code",
  // Quantity/Price
  qty: "quantity", amount: "quantity", count: "quantity", num: "quantity",
  unitprice: "unit_price", price: "unit_price", costperunit: "unit_price",
  totalamount: "total_amount", total: "total_amount", grandtotal: "total_amount",
  subtotal: "total_amount", sum: "total_amount",
  // Date/Status
  deliverydate: "delivery_date", duedate: "delivery_date", shipdate: "delivery_date",
  expecteddate: "delivery_date", etd: "delivery_date",
  status: "status", state: "status", orderstatus: "status",
  // Project
  projectname: "project_name", projname: "project_name", proj: "project_name",
  projectcode: "project_code", projcode: "project_code", projno: "project_code",
  // HR
  dept: "department", department: "department", division: "department",
  empname: "employee_name", employeename: "employee_name", staffname: "employee_name",
  empid: "employee_id", employeeid: "employee_id", staffid: "employee_id",
  // Other
  remark: "notes", remarks: "notes", note: "notes", comment: "notes", memo: "notes",
  industry: "industry", sector: "industry", tradetype: "industry",
  currency: "currency", curr: "currency", ccy: "currency",
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapFieldWithAI(dirtyKey: string): { mappedTo: string; confidence: number } {
  const normalized = normalizeKey(dirtyKey);

  // Exact match on standard key
  const exactMatch = GRT_STANDARD_FIELDS.find(f => normalizeKey(f.key) === normalized);
  if (exactMatch) return { mappedTo: exactMatch.key, confidence: 1.0 };

  // Semantic alias lookup
  const alias = SEMANTIC_ALIASES[normalized];
  if (alias) return { mappedTo: alias, confidence: 0.92 };

  // Substring match — partial overlap
  for (const field of GRT_STANDARD_FIELDS) {
    const fieldNorm = normalizeKey(field.key);
    if (normalized.includes(fieldNorm) || fieldNorm.includes(normalized)) {
      return { mappedTo: field.key, confidence: 0.75 };
    }
  }

  // No match
  return { mappedTo: "__unmapped__", confidence: 0 };
}

// ────────────────── Sandbox Data Store (In-Memory) ──────────────────

interface SandboxRecord {
  id: string;
  importedAt: string;
  source: string;
  recordCount: number;
  data: Record<string, unknown>[];
  fieldMappings: { sourceField: string; targetField: string; confidence: number }[];
}

let sandboxStore: SandboxRecord[] = [];
let importCounter = 0;

// ────────────────── Router ──────────────────

export const dataMigrationRouter = router({
  /** Get GRT standard field definitions */
  getStandardFields: protectedProcedure.query(() => {
    return GRT_STANDARD_FIELDS.map(f => ({
      key: f.key,
      label: f.label,
      labelZh: f.labelZh,
      type: f.type,
    }));
  }),

  /** Analyze a dirty JSON payload and return AI-mapped field suggestions */
  analyzePayload: requirePermission('system:data:migrate')
    .input(z.object({
      data: z.array(z.record(z.string(), jsonValue)).min(1),
      source: z.string().optional().default("manual"),
    }))
    .mutation(({ input }) => {
      const sampleRow = input.data[0];
      const sourceFields = Object.keys(sampleRow);

      const mappings = sourceFields.map(field => {
        const { mappedTo, confidence } = mapFieldWithAI(field);
        return {
          sourceField: field,
          targetField: mappedTo,
          confidence: Math.round(confidence * 100) / 100,
          sampleValue: String(sampleRow[field] ?? ""),
        };
      });

      // Build cleaned preview rows (first 5)
      const previewRows = input.data.slice(0, 5).map(row => {
        const cleaned: Record<string, unknown> = {};
        for (const m of mappings) {
          if (m.targetField !== "__unmapped__") {
            cleaned[m.targetField] = row[m.sourceField];
          }
        }
        return cleaned;
      });

      return {
        totalRows: input.data.length,
        fieldCount: sourceFields.length,
        mappings,
        previewRows,
        unmappedCount: mappings.filter(m => m.targetField === "__unmapped__").length,
        autoMappedCount: mappings.filter(m => m.targetField !== "__unmapped__").length,
      };
    }),

  /** Commit analyzed data to sandbox (staging area) */
  commitToSandbox: protectedProcedure
    .input(z.object({
      data: z.array(z.record(z.string(), jsonValue)),
      fieldMappings: z.array(z.object({
        sourceField: z.string(),
        targetField: z.string(),
        confidence: z.number(),
      })),
      source: z.string().optional().default("import"),
    }))
    .mutation(({ input }) => {
      importCounter++;
      const record: SandboxRecord = {
        id: `SANDBOX-${String(importCounter).padStart(4, "0")}`,
        importedAt: new Date().toISOString(),
        source: input.source,
        recordCount: input.data.length,
        data: input.data,
        fieldMappings: input.fieldMappings,
      };
      sandboxStore.push(record);
      return {
        success: true,
        sandboxId: record.id,
        recordCount: record.recordCount,
        message: `${record.recordCount} records staged in sandbox ${record.id}`,
      };
    }),

  /** List all sandbox imports */
  listSandboxImports: protectedProcedure.query(() => {
    return sandboxStore.map(r => ({
      id: r.id,
      importedAt: r.importedAt,
      source: r.source,
      recordCount: r.recordCount,
      fieldMappings: r.fieldMappings,
    }));
  }),

  /** Wipe all sandbox/test data — for production readiness */
  wipeSandboxData: requirePermission('system:data:migrate')
    .input(z.object({
      confirmPhrase: z.literal("WIPE ALL TEST DATA"),
    }))
    .mutation(({ input: _input }) => {
      const count = sandboxStore.length;
      const totalRecords = sandboxStore.reduce((sum, r) => sum + r.recordCount, 0);
      sandboxStore = [];
      importCounter = 0;
      return {
        success: true,
        deletedImports: count,
        deletedRecords: totalRecords,
        message: `Wiped ${count} sandbox imports (${totalRecords} total records). Database is clean for production.`,
      };
    }),

  /** Get sandbox statistics */
  getSandboxStats: protectedProcedure.query(() => {
    return {
      totalImports: sandboxStore.length,
      totalRecords: sandboxStore.reduce((sum, r) => sum + r.recordCount, 0),
      sources: [...new Set(sandboxStore.map(r => r.source))],
      lastImport: sandboxStore.length > 0 ? sandboxStore[sandboxStore.length - 1].importedAt : null,
    };
  }),
});
