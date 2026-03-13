/**
 * IDO File Classifier Service
 *
 * Classifies uploaded files by extension, MIME type, and Chinese keyword
 * patterns to determine document category and likely document type key.
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ido-file-classifier");

// ── Extension → Category mapping ───────────────────────────────────────────

export type FileCategory =
  | "mechanical_cad"
  | "mechanical_drawing"
  | "electrical_cad"
  | "plc_program"
  | "plc_config"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "image"
  | "video"
  | "archive"
  | "unknown";

const EXTENSION_MAP: Record<string, FileCategory> = {
  // CAD / 3D
  ".sldprt": "mechanical_cad",
  ".sldasm": "mechanical_cad",
  ".slddrw": "mechanical_drawing",
  ".step": "mechanical_cad",
  ".stp": "mechanical_cad",
  ".iges": "mechanical_cad",
  ".igs": "mechanical_cad",
  ".stl": "mechanical_cad",
  ".dxf": "mechanical_drawing",
  ".dwg": "mechanical_drawing",
  ".x_t": "mechanical_cad",
  ".x_b": "mechanical_cad",
  // Electrical
  ".elk": "electrical_cad",
  ".elp": "electrical_cad",
  ".elc": "electrical_cad",
  ".zw1": "electrical_cad",
  ".epl": "electrical_cad",
  // PLC
  ".plc": "plc_program",
  ".gsd": "plc_config",
  ".gx3": "plc_program",
  ".zap": "plc_program",
  // Documents
  ".docx": "document",
  ".doc": "document",
  ".pdf": "document",
  ".txt": "document",
  ".rtf": "document",
  ".odt": "document",
  // Spreadsheets
  ".xlsx": "spreadsheet",
  ".xls": "spreadsheet",
  ".csv": "spreadsheet",
  ".ods": "spreadsheet",
  // Presentations
  ".pptx": "presentation",
  ".ppt": "presentation",
  ".odp": "presentation",
  // Images
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".bmp": "image",
  ".tiff": "image",
  ".svg": "image",
  // Video
  ".mp4": "video",
  ".avi": "video",
  ".mov": "video",
  // Archives
  ".zip": "archive",
  ".rar": "archive",
  ".7z": "archive",
};

// ── Chinese keyword patterns ───────────────────────────────────────────────

interface KeywordHint {
  pattern: RegExp;
  documentCategory: string;
  documentTypeHint: string;
}

const KEYWORD_HINTS: KeywordHint[] = [
  { pattern: /BOM|物料清单|物料|bom/i, documentCategory: "design", documentTypeHint: "bom" },
  { pattern: /原理图|schematic|电路图/i, documentCategory: "design", documentTypeHint: "electrical_schematic" },
  { pattern: /接线图|wiring|线路图/i, documentCategory: "design", documentTypeHint: "wiring_diagram" },
  { pattern: /机械.*图|总图|装配图|assembly/i, documentCategory: "design", documentTypeHint: "mechanical_drawing" },
  { pattern: /PLC.*程序|控制程序|plc.*program/i, documentCategory: "design", documentTypeHint: "plc_program" },
  { pattern: /FAT.*测试|fat.*test|工厂验收/i, documentCategory: "report", documentTypeHint: "fat_test" },
  { pattern: /SAT.*测试|sat.*test|现场验收/i, documentCategory: "report", documentTypeHint: "sat_test" },
  { pattern: /调试.*记录|commissioning|调试报告/i, documentCategory: "report", documentTypeHint: "commissioning" },
  { pattern: /评审|review|审查/i, documentCategory: "report", documentTypeHint: "review_record" },
  { pattern: /需求.*规格|requirement|需求记录/i, documentCategory: "report", documentTypeHint: "requirements" },
  { pattern: /可行性|feasibility|可行性报告/i, documentCategory: "report", documentTypeHint: "feasibility" },
  { pattern: /方案|proposal|技术方案/i, documentCategory: "design", documentTypeHint: "proposal" },
  { pattern: /报价|quotation|商务报价/i, documentCategory: "contract", documentTypeHint: "quotation" },
  { pattern: /合同|contract|协议/i, documentCategory: "contract", documentTypeHint: "contract" },
  { pattern: /采购|purchase|PO/i, documentCategory: "report", documentTypeHint: "purchase" },
  { pattern: /仿真|simulation|FEA|有限元/i, documentCategory: "report", documentTypeHint: "simulation" },
  { pattern: /手册|manual|操作指南/i, documentCategory: "manual", documentTypeHint: "manual" },
  { pattern: /培训|training|教程/i, documentCategory: "report", documentTypeHint: "training" },
  { pattern: /质量|quality|IATF|PPAP/i, documentCategory: "report", documentTypeHint: "quality" },
  { pattern: /风险|risk|FMEA/i, documentCategory: "report", documentTypeHint: "risk" },
  { pattern: /备件|spare.*part|配件/i, documentCategory: "report", documentTypeHint: "spare_parts" },
  { pattern: /发货|shipping|运输/i, documentCategory: "report", documentTypeHint: "shipping" },
  { pattern: /安装|installation|现场安装/i, documentCategory: "manual", documentTypeHint: "installation" },
  { pattern: /总结|summary|结项|closure/i, documentCategory: "report", documentTypeHint: "project_closure" },
];

// ── Public API ─────────────────────────────────────────────────────────────

export interface FileClassification {
  fileCategory: FileCategory;
  documentCategory: string | null;
  documentTypeHint: string | null;
  keywordMatches: string[];
  confidence: number;
}

/**
 * Classify a file by its name, extension, and optional MIME type.
 */
export function classifyFile(
  fileName: string,
  fileExtension?: string,
  mimeType?: string,
): FileClassification {
  const ext = (fileExtension || extractExtension(fileName)).toLowerCase();
  const fileCategory = EXTENSION_MAP[ext] || "unknown";

  // Keyword matching on filename
  const keywordMatches: string[] = [];
  let documentCategory: string | null = null;
  let documentTypeHint: string | null = null;
  let bestConfidence = 0;

  for (const hint of KEYWORD_HINTS) {
    if (hint.pattern.test(fileName)) {
      keywordMatches.push(hint.documentTypeHint);
      if (!documentCategory) {
        documentCategory = hint.documentCategory;
        documentTypeHint = hint.documentTypeHint;
        bestConfidence = 70;
      }
    }
  }

  // If no keyword match, infer from file category
  if (!documentCategory) {
    switch (fileCategory) {
      case "mechanical_cad":
      case "mechanical_drawing":
        documentCategory = "design";
        documentTypeHint = "mechanical";
        bestConfidence = 60;
        break;
      case "electrical_cad":
        documentCategory = "design";
        documentTypeHint = "electrical";
        bestConfidence = 60;
        break;
      case "plc_program":
      case "plc_config":
        documentCategory = "design";
        documentTypeHint = "plc";
        bestConfidence = 60;
        break;
      case "spreadsheet":
        documentCategory = "report";
        documentTypeHint = "spreadsheet";
        bestConfidence = 30;
        break;
      case "document":
        documentCategory = "report";
        documentTypeHint = "document";
        bestConfidence = 20;
        break;
      case "presentation":
        documentCategory = "report";
        documentTypeHint = "presentation";
        bestConfidence = 20;
        break;
      default:
        bestConfidence = 10;
    }
  }

  // Boost confidence if keyword + extension agree
  if (keywordMatches.length > 0 && fileCategory !== "unknown") {
    bestConfidence = Math.min(90, bestConfidence + 15);
  }

  log.debug({ fileName, ext, fileCategory, documentCategory, documentTypeHint, confidence: bestConfidence }, "File classified");

  return {
    fileCategory,
    documentCategory,
    documentTypeHint,
    keywordMatches,
    confidence: bestConfidence,
  };
}

/**
 * Extract file extension from filename.
 */
export function extractExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot < 0) return "";
  return fileName.slice(lastDot).toLowerCase();
}

/**
 * Map a document category to likely SharePoint folder names.
 */
export function suggestSharepointFolders(
  documentCategory: string | null,
  documentTypeHint: string | null,
): string[] {
  if (!documentCategory) return [];

  const suggestions: string[] = [];

  switch (documentTypeHint) {
    case "mechanical":
    case "mechanical_drawing":
      suggestions.push("03_Mechanical_Design");
      break;
    case "electrical_schematic":
    case "electrical":
    case "wiring_diagram":
    case "plc":
    case "plc_program":
      suggestions.push("04_Electrical_Design");
      break;
    case "bom":
    case "purchase":
      suggestions.push("05_BOM_Procurement");
      break;
    case "fat_test":
    case "quality":
      suggestions.push("07_Testing_QC");
      break;
    case "sat_test":
      suggestions.push("08_FAT_SAT");
      break;
    case "commissioning":
      suggestions.push("06_Assembly");
      break;
    case "shipping":
      suggestions.push("09_Shipping");
      break;
    case "installation":
      suggestions.push("10_Site_Installation");
      break;
    case "manual":
    case "spare_parts":
      suggestions.push("11_Warranty_Service");
      break;
    case "project_closure":
    case "training":
      suggestions.push("12_Lessons_Learned");
      break;
    case "requirements":
    case "feasibility":
      suggestions.push("01_Requirements");
      break;
    case "proposal":
    case "quotation":
    case "contract":
      suggestions.push("02_Proposal");
      break;
    default:
      // Fallback by broad category
      if (documentCategory === "design") suggestions.push("03_Mechanical_Design");
      else if (documentCategory === "contract") suggestions.push("02_Proposal");
      else if (documentCategory === "manual") suggestions.push("11_Warranty_Service");
      else suggestions.push("01_Requirements");
  }

  return suggestions;
}
