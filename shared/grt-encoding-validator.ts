/**
 * GRT编码第一规则 — Universal Encoding Validator
 *
 * Shared between server and client.
 * Validates 6 code types: Drawing, Material, Project, BOM, ECR, ECO.
 *
 * Drawing: GRT-XX-YY-ZZZ(-RR) — XX=产品线, YY=图纸类型, ZZZ=序号, RR=修订
 * Material: UC-PMP-CEN-DN50-0001 — 大类-中类-小类-规格-序号
 * Project: GRT001 (production) / T001 (test)
 * BOM: BOM-[产品]-[序号]
 * ECR: ECR-[年]-[产品]-[序号]
 * ECO: ECO-[年]-[产品]-[序号]
 */

// ── Types ────────────────────────────────────────────────

export type GrtCodeType = "drawing" | "material" | "project" | "bom" | "ecr" | "eco";

export interface ValidationResult {
  valid: boolean;
  codeType: GrtCodeType | "unknown";
  code: string;
  error?: string;
  segments?: Record<string, string>;
}

export interface ComplianceReport {
  totalCodes: number;
  validCount: number;
  invalidCount: number;
  compliancePercent: number;
  byType: Record<GrtCodeType | "unknown", { total: number; valid: number; invalid: number }>;
  invalidCodes: Array<{ code: string; error: string; detectedType: GrtCodeType | "unknown" }>;
}

export interface EncodingRule {
  type: GrtCodeType;
  pattern: string;
  regex: RegExp;
  description: string;
  descriptionZh: string;
  examples: string[];
}

// ── Patterns ─────────────────────────────────────────────

const DRAWING_REGEX = /^GRT-[A-Z]{2}-[A-Z]{2}-\d{3}(-R\d{1,2})?$/;
const MATERIAL_REGEX = /^[A-Z]{2,4}(-[A-Z0-9]{2,5})+-\d{4}$/;
const PROJECT_REGEX = /^(GRT|T)\d{3}$/;
const BOM_REGEX = /^BOM-[A-Z0-9]+-\d{3}$/;
const ECR_REGEX = /^ECR-\d{4}-[A-Z0-9]+-\d{3}$/;
const ECO_REGEX = /^ECO-\d{4}-[A-Z0-9]+-\d{3}$/;

// ── Validators ───────────────────────────────────────────

export function validateDrawingCode(code: string): ValidationResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, codeType: "drawing", code, error: "Code is empty" };

  if (!DRAWING_REGEX.test(trimmed)) {
    return {
      valid: false,
      codeType: "drawing",
      code: trimmed,
      error: `Drawing code must match GRT-XX-YY-ZZZ(-RNN). Got: ${trimmed}`,
    };
  }

  const parts = trimmed.split("-");
  return {
    valid: true,
    codeType: "drawing",
    code: trimmed,
    segments: {
      prefix: parts[0],
      productLine: parts[1],
      drawingType: parts[2],
      sequence: parts[3],
      revision: parts[4] || "",
    },
  };
}

export function validateMaterialCode(code: string): ValidationResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, codeType: "material", code, error: "Code is empty" };

  if (!MATERIAL_REGEX.test(trimmed)) {
    return {
      valid: false,
      codeType: "material",
      code: trimmed,
      error: `Material code must match XX-YYY-ZZZ-SPEC-NNNN. Got: ${trimmed}`,
    };
  }

  const parts = trimmed.split("-");
  const seq = parts.pop()!;
  return {
    valid: true,
    codeType: "material",
    code: trimmed,
    segments: {
      category: parts[0],
      subcategories: parts.slice(1).join("-"),
      sequence: seq,
    },
  };
}

export function validateProjectCode(code: string): ValidationResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, codeType: "project", code, error: "Code is empty" };

  if (!PROJECT_REGEX.test(trimmed)) {
    return {
      valid: false,
      codeType: "project",
      code: trimmed,
      error: `Project code must be GRT001 (production) or T001 (test). Got: ${trimmed}`,
    };
  }

  return {
    valid: true,
    codeType: "project",
    code: trimmed,
    segments: {
      type: trimmed.startsWith("GRT") ? "production" : "test",
      number: trimmed.replace(/^(GRT|T)/, ""),
    },
  };
}

export function validateBomCode(code: string): ValidationResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, codeType: "bom", code, error: "Code is empty" };

  if (!BOM_REGEX.test(trimmed)) {
    return {
      valid: false,
      codeType: "bom",
      code: trimmed,
      error: `BOM code must match BOM-PRODUCT-NNN. Got: ${trimmed}`,
    };
  }

  const parts = trimmed.split("-");
  return {
    valid: true,
    codeType: "bom",
    code: trimmed,
    segments: { prefix: parts[0], product: parts[1], sequence: parts[2] },
  };
}

export function validateEcrCode(code: string): ValidationResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, codeType: "ecr", code, error: "Code is empty" };

  if (!ECR_REGEX.test(trimmed)) {
    return {
      valid: false,
      codeType: "ecr",
      code: trimmed,
      error: `ECR code must match ECR-YYYY-PRODUCT-NNN. Got: ${trimmed}`,
    };
  }

  const parts = trimmed.split("-");
  return {
    valid: true,
    codeType: "ecr",
    code: trimmed,
    segments: { prefix: parts[0], year: parts[1], product: parts[2], sequence: parts[3] },
  };
}

export function validateEcoCode(code: string): ValidationResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, codeType: "eco", code, error: "Code is empty" };

  if (!ECO_REGEX.test(trimmed)) {
    return {
      valid: false,
      codeType: "eco",
      code: trimmed,
      error: `ECO code must match ECO-YYYY-PRODUCT-NNN. Got: ${trimmed}`,
    };
  }

  const parts = trimmed.split("-");
  return {
    valid: true,
    codeType: "eco",
    code: trimmed,
    segments: { prefix: parts[0], year: parts[1], product: parts[2], sequence: parts[3] },
  };
}

// ── Auto-Detect ──────────────────────────────────────────

const DETECT_ORDER: Array<{ prefix: RegExp; type: GrtCodeType; validate: (c: string) => ValidationResult }> = [
  { prefix: /^GRT-/i, type: "drawing", validate: validateDrawingCode },
  { prefix: /^BOM-/i, type: "bom", validate: validateBomCode },
  { prefix: /^ECR-/i, type: "ecr", validate: validateEcrCode },
  { prefix: /^ECO-/i, type: "eco", validate: validateEcoCode },
  { prefix: /^(GRT|T)\d/i, type: "project", validate: validateProjectCode },
  { prefix: /^[A-Z]{2,4}-/i, type: "material", validate: validateMaterialCode },
];

export function autoDetectAndValidate(code: string): ValidationResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, codeType: "unknown", code, error: "Code is empty" };

  for (const { prefix, validate } of DETECT_ORDER) {
    if (prefix.test(trimmed)) {
      return validate(trimmed);
    }
  }

  return { valid: false, codeType: "unknown", code: trimmed, error: "Cannot detect code type" };
}

// ── Compliance Report ────────────────────────────────────

export function getComplianceReport(codes: string[]): ComplianceReport {
  const byType: ComplianceReport["byType"] = {
    drawing: { total: 0, valid: 0, invalid: 0 },
    material: { total: 0, valid: 0, invalid: 0 },
    project: { total: 0, valid: 0, invalid: 0 },
    bom: { total: 0, valid: 0, invalid: 0 },
    ecr: { total: 0, valid: 0, invalid: 0 },
    eco: { total: 0, valid: 0, invalid: 0 },
    unknown: { total: 0, valid: 0, invalid: 0 },
  };
  const invalidCodes: ComplianceReport["invalidCodes"] = [];
  let validCount = 0;

  for (const code of codes) {
    const result = autoDetectAndValidate(code);
    const bucket = byType[result.codeType];
    bucket.total++;
    if (result.valid) {
      bucket.valid++;
      validCount++;
    } else {
      bucket.invalid++;
      invalidCodes.push({ code: result.code, error: result.error || "Invalid", detectedType: result.codeType });
    }
  }

  return {
    totalCodes: codes.length,
    validCount,
    invalidCount: codes.length - validCount,
    compliancePercent: codes.length > 0 ? Math.round((validCount / codes.length) * 100) : 100,
    byType,
    invalidCodes,
  };
}

// ── Encoding Rules Reference ─────────────────────────────

export function getEncodingRulesReference(): EncodingRule[] {
  return [
    {
      type: "drawing",
      pattern: "GRT-XX-YY-ZZZ(-RNN)",
      regex: DRAWING_REGEX,
      description: "XX=Product Line (2 letters), YY=Drawing Type (ME/EL/AS), ZZZ=Sequence (3 digits), RNN=Revision",
      descriptionZh: "XX=产品线(2字母), YY=图纸类型(ME机械/EL电气/AS装配), ZZZ=序号(3位), RNN=修订号",
      examples: ["GRT-RC-ME-001", "GRT-SC-EL-042-R2", "GRT-IU-AS-005"],
    },
    {
      type: "material",
      pattern: "XX-YYY-ZZZ-SPEC-NNNN",
      regex: MATERIAL_REGEX,
      description: "Multi-segment hierarchy: Category-SubCategory-Type-Spec-Sequence(4 digits)",
      descriptionZh: "多段层级: 大类-中类-小类-规格-序号(4位数字)",
      examples: ["UC-PMP-CEN-DN50-0001", "EL-MOT-SRV-400W-0003", "MC-BRG-SKF-6205-0012"],
    },
    {
      type: "project",
      pattern: "GRT001 / T001",
      regex: PROJECT_REGEX,
      description: "GRT+3 digits for production, T+3 digits for test",
      descriptionZh: "GRT+3位数字=生产项目, T+3位数字=测试项目",
      examples: ["GRT001", "GRT042", "T001", "T005"],
    },
    {
      type: "bom",
      pattern: "BOM-PRODUCT-NNN",
      regex: BOM_REGEX,
      description: "BOM prefix + product code + 3-digit sequence",
      descriptionZh: "BOM前缀 + 产品代号 + 3位序号",
      examples: ["BOM-RC300-001", "BOM-SC200-003"],
    },
    {
      type: "ecr",
      pattern: "ECR-YYYY-PRODUCT-NNN",
      regex: ECR_REGEX,
      description: "Engineering Change Request: year + product + sequence",
      descriptionZh: "工程变更请求: 年份 + 产品代号 + 序号",
      examples: ["ECR-2026-RC300-001", "ECR-2026-SC200-005"],
    },
    {
      type: "eco",
      pattern: "ECO-YYYY-PRODUCT-NNN",
      regex: ECO_REGEX,
      description: "Engineering Change Order: year + product + sequence",
      descriptionZh: "工程变更指令: 年份 + 产品代号 + 序号",
      examples: ["ECO-2026-RC300-001", "ECO-2026-SC200-005"],
    },
  ];
}
