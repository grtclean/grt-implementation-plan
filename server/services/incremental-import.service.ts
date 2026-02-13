/**
 * Incremental Import Service
 * Provides record comparison, diff report generation, record merging,
 * and import preview for incremental data import operations.
 */

export interface ImportConfig {
  primaryKeyField: string;
  compareFields: string[];
  ignoreFields: string[];
  mode: 'incremental' | 'full';
  conflictResolution: 'overwrite' | 'skip' | 'merge';
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface RecordComparison {
  changeType: 'added' | 'modified' | 'deleted' | 'unchanged';
  fieldChanges: FieldChange[];
  primaryKey?: string;
}

export interface DiffReport {
  importId: string;
  tableName: string;
  importMode: 'incremental' | 'full';
  totalRecords: number;
  addedRecords: number;
  modifiedRecords: number;
  deletedRecords: number;
  unchangedRecords: number;
  changes: RecordComparison[];
  summary: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  generatedAt: number;
}

export interface ImportPreview {
  summary: string;
  recommendations: string[];
  estimatedDuration?: number;
}

/**
 * Compare an existing record with a new record to determine what changed.
 */
export function compareRecords(
  existingRecord: Record<string, any> | null,
  newRecord: Record<string, any>,
  config: ImportConfig
): RecordComparison {
  // New record (no existing match)
  if (existingRecord === null || existingRecord === undefined) {
    return {
      changeType: 'added',
      fieldChanges: [],
      primaryKey: newRecord[config.primaryKeyField],
    };
  }

  // Compare fields
  const fieldChanges: FieldChange[] = [];
  for (const field of config.compareFields) {
    if (config.ignoreFields.includes(field)) continue;
    if (existingRecord[field] !== newRecord[field]) {
      fieldChanges.push({
        field,
        oldValue: existingRecord[field],
        newValue: newRecord[field],
      });
    }
  }

  if (fieldChanges.length === 0) {
    return {
      changeType: 'unchanged',
      fieldChanges: [],
      primaryKey: newRecord[config.primaryKeyField],
    };
  }

  return {
    changeType: 'modified',
    fieldChanges,
    primaryKey: newRecord[config.primaryKeyField],
  };
}

/**
 * Generate a diff report comparing existing records with new records.
 */
export function generateDiffReport(
  tableName: string,
  existingRecords: Record<string, any>[],
  newRecords: Record<string, any>[],
  config: ImportConfig
): DiffReport {
  const existingMap = new Map<string, Record<string, any>>();
  for (const rec of existingRecords) {
    existingMap.set(String(rec[config.primaryKeyField]), rec);
  }

  const newMap = new Map<string, Record<string, any>>();
  for (const rec of newRecords) {
    newMap.set(String(rec[config.primaryKeyField]), rec);
  }

  const changes: RecordComparison[] = [];
  let addedRecords = 0;
  let modifiedRecords = 0;
  let unchangedRecords = 0;

  // Check new records against existing
  for (const [key, newRec] of newMap) {
    const existingRec = existingMap.get(key) ?? null;
    const comparison = compareRecords(existingRec, newRec, config);
    changes.push(comparison);

    if (comparison.changeType === 'added') addedRecords++;
    else if (comparison.changeType === 'modified') modifiedRecords++;
    else if (comparison.changeType === 'unchanged') unchangedRecords++;
  }

  // Check for deleted records (in existing but not in new)
  let deletedRecords = 0;
  for (const key of existingMap.keys()) {
    if (!newMap.has(key)) {
      deletedRecords++;
      changes.push({
        changeType: 'deleted',
        fieldChanges: [],
        primaryKey: key,
      });
    }
  }

  const totalRecords = newRecords.length;
  const summaryParts: string[] = [];
  if (addedRecords > 0) summaryParts.push(`新增 ${addedRecords} 条`);
  if (modifiedRecords > 0) summaryParts.push(`修改 ${modifiedRecords} 条`);
  if (deletedRecords > 0) summaryParts.push(`删除 ${deletedRecords} 条`);
  if (unchangedRecords > 0) summaryParts.push(`未变更 ${unchangedRecords} 条`);

  const impactScore = (addedRecords + modifiedRecords + deletedRecords) / Math.max(totalRecords, 1);
  const estimatedImpact: 'low' | 'medium' | 'high' =
    impactScore > 0.5 ? 'high' : impactScore > 0.2 ? 'medium' : 'low';

  return {
    importId: `import_${Date.now()}`,
    tableName,
    importMode: config.mode,
    totalRecords,
    addedRecords,
    modifiedRecords,
    deletedRecords,
    unchangedRecords,
    changes,
    summary: summaryParts.join('，') || '无变更',
    estimatedImpact,
    generatedAt: Date.now(),
  };
}

/**
 * Merge an existing record with a new record using the specified strategy.
 */
export function mergeRecords(
  existingRecord: Record<string, any>,
  newRecord: Record<string, any>,
  strategy: 'overwrite' | 'skip' | 'merge'
): Record<string, any> {
  if (strategy === 'skip') {
    return { ...existingRecord };
  }

  if (strategy === 'overwrite' || strategy === 'merge') {
    // Overwrite: apply new fields on top of existing, keeping fields not in new
    return { ...existingRecord, ...newRecord };
  }

  return { ...existingRecord, ...newRecord };
}

/**
 * Generate a preview of what would happen if the import is executed.
 */
export function generateImportPreview(diffReport: DiffReport): ImportPreview {
  const recommendations: string[] = [];

  if (diffReport.addedRecords > 0) {
    recommendations.push(`将新增 ${diffReport.addedRecords} 条记录`);
  }
  if (diffReport.modifiedRecords > 0) {
    recommendations.push(`将修改 ${diffReport.modifiedRecords} 条记录`);
  }
  if (diffReport.deletedRecords > 0) {
    recommendations.push(`建议检查 ${diffReport.deletedRecords} 条待删除记录`);
  }
  if (diffReport.estimatedImpact === 'high') {
    recommendations.push('影响范围较大，建议在非高峰时段执行');
  }

  return {
    summary: diffReport.summary,
    recommendations,
    estimatedDuration: diffReport.totalRecords * 10, // rough estimate ms
  };
}
