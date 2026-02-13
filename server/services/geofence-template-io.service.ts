/**
 * Geofence Template Import/Export Service
 */

import { BUILT_IN_TEMPLATES, type GeofenceTemplate } from './geofence-undo-redo.service';

export const EXPORT_FORMAT_VERSION = '1.0.0';

interface TemplatePackageMetadata {
  version: string;
  templateCount: number;
  checksum: string;
  exportedAt: number;
  description?: string;
}

export interface TemplatePackage {
  metadata: TemplatePackageMetadata;
  templates: GeofenceTemplate[];
}

export function calculateChecksum(templates: any): string {
  const str = JSON.stringify(templates);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

export function exportTemplates(
  templates: GeofenceTemplate[],
  options?: { includeBuiltIn?: boolean; categoryFilter?: string[]; description?: string }
): TemplatePackage {
  let allTemplates = [...templates];
  if (options?.includeBuiltIn) {
    allTemplates = [...allTemplates, ...BUILT_IN_TEMPLATES];
  }
  if (options?.categoryFilter) {
    allTemplates = allTemplates.filter(t => options.categoryFilter!.includes(t.category));
  }
  return {
    metadata: {
      version: EXPORT_FORMAT_VERSION,
      templateCount: allTemplates.length,
      checksum: calculateChecksum(allTemplates),
      exportedAt: Date.now(),
      description: options?.description,
    },
    templates: allTemplates,
  };
}

export function exportToJsonString(
  templates: GeofenceTemplate[],
  options?: { minify?: boolean; includeBuiltIn?: boolean; description?: string }
): string {
  const pkg = exportTemplates(templates, options);
  return options?.minify ? JSON.stringify(pkg) : JSON.stringify(pkg, null, 2);
}

export function parseImportJson(jsonStr: string): { success: boolean; package?: TemplatePackage; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr) as TemplatePackage;
    if (!parsed.metadata || !parsed.templates) {
      return { success: false, error: 'Invalid package structure' };
    }
    return { success: true, package: parsed };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function importTemplates(
  jsonStr: string,
  existingTemplates: GeofenceTemplate[],
  options?: { skipDuplicates?: boolean; categoryFilter?: string[] }
): {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  importedTemplates: GeofenceTemplate[];
  errors: string[];
} {
  const parseResult = parseImportJson(jsonStr);
  if (!parseResult.success || !parseResult.package) {
    return { success: false, importedCount: 0, skippedCount: 0, importedTemplates: [], errors: [parseResult.error || 'Parse failed'] };
  }

  const errors: string[] = [];
  let templates = parseResult.package.templates;

  // Validate templates
  for (const t of templates) {
    if (!t.name || t.name.trim() === '') {
      errors.push(`Template missing name`);
    }
  }
  if (errors.length > 0) {
    return { success: false, importedCount: 0, skippedCount: 0, importedTemplates: [], errors };
  }

  // Apply category filter
  if (options?.categoryFilter) {
    templates = templates.filter(t => options.categoryFilter!.includes(t.category));
  }

  // Skip duplicates
  let skippedCount = 0;
  if (options?.skipDuplicates) {
    const existingIds = new Set(existingTemplates.map(t => t.id));
    const existingNames = new Set(existingTemplates.map(t => t.name));
    const filtered = templates.filter(t => {
      if (existingIds.has(t.id) || existingNames.has(t.name)) {
        skippedCount++;
        return false;
      }
      return true;
    });
    templates = filtered;
  }

  return {
    success: true,
    importedCount: templates.length,
    skippedCount,
    importedTemplates: templates,
    errors: [],
  };
}

export function validateImportFile(jsonStr: string): {
  valid: boolean;
  templateCount: number;
  categories: string[];
  errors: string[];
} {
  const parseResult = parseImportJson(jsonStr);
  if (!parseResult.success || !parseResult.package) {
    return { valid: false, templateCount: 0, categories: [], errors: [parseResult.error || 'Parse failed'] };
  }
  const categories = [...new Set(parseResult.package.templates.map(t => t.category))];
  return {
    valid: true,
    templateCount: parseResult.package.templates.length,
    categories,
    errors: [],
  };
}

export function getImportPreview(jsonStr: string): {
  valid: boolean;
  summary?: {
    totalTemplates: number;
    byCategory: Array<{ category: string; count: number }>;
  };
  error?: string;
} {
  const parseResult = parseImportJson(jsonStr);
  if (!parseResult.success || !parseResult.package) {
    return { valid: false, error: parseResult.error };
  }
  const categoryMap = new Map<string, number>();
  for (const t of parseResult.package.templates) {
    categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1);
  }
  return {
    valid: true,
    summary: {
      totalTemplates: parseResult.package.templates.length,
      byCategory: Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count })),
    },
  };
}

export function mergeTemplates(
  existing: GeofenceTemplate[],
  imported: GeofenceTemplate[],
  overwrite: boolean = false
): GeofenceTemplate[] {
  const result = [...existing];
  for (const imp of imported) {
    const existingIndex = result.findIndex(t => t.name === imp.name);
    if (existingIndex >= 0) {
      if (overwrite) {
        result[existingIndex] = { ...imp };
      }
    } else {
      result.push(imp);
    }
  }
  return result;
}

export function generateExportFilename(): string {
  const now = new Date();
  const date = now.toISOString().replace(/[-:T]/g, '').slice(0, 15).replace('.', '_');
  const parts = date.split('');
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `geofence-templates_${dateStr}_${timeStr}.json`;
}

export function compareTemplatePackages(
  pkg1: TemplatePackage,
  pkg2: TemplatePackage
): {
  added: GeofenceTemplate[];
  removed: GeofenceTemplate[];
  modified: GeofenceTemplate[];
  unchanged: GeofenceTemplate[];
} {
  const names1 = new Set(pkg1.templates.map(t => t.name));
  const names2 = new Set(pkg2.templates.map(t => t.name));

  const added = pkg2.templates.filter(t => !names1.has(t.name));
  const removed = pkg1.templates.filter(t => !names2.has(t.name));
  const modified: GeofenceTemplate[] = [];
  const unchanged: GeofenceTemplate[] = [];

  for (const t2 of pkg2.templates) {
    const t1 = pkg1.templates.find(t => t.name === t2.name);
    if (t1) {
      if (JSON.stringify({ ...t1, updatedAt: 0, createdAt: 0 }) !== JSON.stringify({ ...t2, updatedAt: 0, createdAt: 0 })) {
        modified.push(t2);
      } else {
        unchanged.push(t2);
      }
    }
  }

  return { added, removed, modified, unchanged };
}
