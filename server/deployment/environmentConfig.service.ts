/**
 * 环境配置服务
 * 管理测试环境和正式环境的配置信息
 */

import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("env-config");

export type Environment = 'test' | 'production';

export interface EnvironmentConfig {
  id: number;
  environment: Environment;
  configKey: string;
  configValue: string | null;
  description: string | null;
  isSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentStatus {
  environment: Environment;
  version: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncAt: Date | null;
  configCount: number;
}

/**
 * 获取指定环境的所有配置
 */
export async function getEnvironmentConfigs(environment: Environment): Promise<EnvironmentConfig[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      id,
      environment,
      config_key as configKey,
      CASE WHEN is_secret = 1 THEN '********' ELSE config_value END as configValue,
      description,
      is_secret as isSecret,
      created_at as createdAt,
      updated_at as updatedAt
    FROM environment_configs
    WHERE environment = ${environment}
    ORDER BY config_key
  `);

  return (result[0] as any[]) || [];
}

/**
 * 获取指定环境的单个配置
 */
export async function getEnvironmentConfig(
  environment: Environment,
  configKey: string
): Promise<EnvironmentConfig | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT 
      id,
      environment,
      config_key as configKey,
      config_value as configValue,
      description,
      is_secret as isSecret,
      created_at as createdAt,
      updated_at as updatedAt
    FROM environment_configs
    WHERE environment = ${environment} AND config_key = ${configKey}
    LIMIT 1
  `);

  const rows = result[0] as any[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 设置环境配置
 */
export async function setEnvironmentConfig(
  environment: Environment,
  configKey: string,
  configValue: string,
  description?: string,
  isSecret: boolean = false
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.execute(sql`
      INSERT INTO environment_configs (environment, config_key, config_value, description, is_secret)
      VALUES (${environment}, ${configKey}, ${configValue}, ${description || null}, ${isSecret})
      ON DUPLICATE KEY UPDATE 
        config_value = ${configValue},
        description = COALESCE(${description || null}, description),
        is_secret = ${isSecret}
    `);
    return true;
  } catch (error) {
    log.error({ err: error }, "Failed to set config");
    return false;
  }
}

/**
 * 删除环境配置
 */
export async function deleteEnvironmentConfig(
  environment: Environment,
  configKey: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.execute(sql`
      DELETE FROM environment_configs
      WHERE environment = ${environment} AND config_key = ${configKey}
    `);
    return true;
  } catch (error) {
    log.error({ err: error }, "Failed to delete config");
    return false;
  }
}

/**
 * 获取双环境状态对比
 */
export async function getEnvironmentComparison(): Promise<{
  test: EnvironmentStatus;
  production: EnvironmentStatus;
  versionDiff: boolean;
  configDiff: string[];
}> {
  const db = await getDb();
  
  const defaultStatus = (env: Environment): EnvironmentStatus => ({
    environment: env,
    version: 'unknown',
    status: 'offline',
    lastSyncAt: null,
    configCount: 0,
  });

  if (!db) {
    return {
      test: defaultStatus('test'),
      production: defaultStatus('production'),
      versionDiff: false,
      configDiff: [],
    };
  }

  // 获取测试环境状态
  const testConfigs = await getEnvironmentConfigs('test');
  const testVersion = testConfigs.find(c => c.configKey === 'APP_VERSION')?.configValue || 'unknown';
  
  // 获取正式环境状态
  const prodConfigs = await getEnvironmentConfigs('production');
  const prodVersion = prodConfigs.find(c => c.configKey === 'APP_VERSION')?.configValue || 'unknown';

  // 比较配置差异
  const testKeys = new Set(testConfigs.map(c => c.configKey));
  const prodKeys = new Set(prodConfigs.map(c => c.configKey));
  
  const configDiff: string[] = [];
  
  // 找出测试环境有但正式环境没有的配置
  testKeys.forEach(key => {
    if (!prodKeys.has(key)) {
      configDiff.push(`+ ${key} (仅测试环境)`);
    }
  });
  
  // 找出正式环境有但测试环境没有的配置
  prodKeys.forEach(key => {
    if (!testKeys.has(key)) {
      configDiff.push(`- ${key} (仅正式环境)`);
    }
  });

  // 找出值不同的配置
  testConfigs.forEach(testConfig => {
    const prodConfig = prodConfigs.find(c => c.configKey === testConfig.configKey);
    if (prodConfig && testConfig.configValue !== prodConfig.configValue && !testConfig.isSecret) {
      configDiff.push(`~ ${testConfig.configKey} (值不同)`);
    }
  });

  return {
    test: {
      environment: 'test',
      version: testVersion as string,
      status: 'online',
      lastSyncAt: new Date(),
      configCount: testConfigs.length,
    },
    production: {
      environment: 'production',
      version: prodVersion as string,
      status: 'online',
      lastSyncAt: new Date(),
      configCount: prodConfigs.length,
    },
    versionDiff: testVersion !== prodVersion,
    configDiff,
  };
}

/**
 * 同步测试环境配置到正式环境
 */
export async function syncTestToProduction(configKeys?: string[]): Promise<{
  success: boolean;
  syncedKeys: string[];
  errors: string[];
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, syncedKeys: [], errors: ['数据库连接不可用'] };
  }

  const syncedKeys: string[] = [];
  const errors: string[] = [];

  try {
    const testConfigs = await getEnvironmentConfigs('test');
    const configsToSync = configKeys 
      ? testConfigs.filter(c => configKeys.includes(c.configKey))
      : testConfigs;

    for (const config of configsToSync) {
      // 跳过环境特定的配置
      if (config.configKey.includes('_HOST') || config.configKey.includes('_URL')) {
        continue;
      }

      try {
        // 获取真实值（因为getEnvironmentConfigs会隐藏secret值）
        const realConfig = await getEnvironmentConfig('test', config.configKey);
        if (realConfig) {
          await setEnvironmentConfig(
            'production',
            config.configKey,
            realConfig.configValue || '',
            config.description || undefined,
            config.isSecret
          );
          syncedKeys.push(config.configKey);
        }
      } catch (err) {
        errors.push(`同步 ${config.configKey} 失败: ${err}`);
      }
    }

    return {
      success: errors.length === 0,
      syncedKeys,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      syncedKeys,
      errors: [`同步失败: ${error}`],
    };
  }
}

/**
 * 批量导入环境配置
 */
export async function importEnvironmentConfigs(
  environment: Environment,
  configs: Array<{
    key: string;
    value: string;
    description?: string;
    isSecret?: boolean;
  }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const config of configs) {
    const result = await setEnvironmentConfig(
      environment,
      config.key,
      config.value,
      config.description,
      config.isSecret
    );
    
    if (result) {
      success++;
    } else {
      failed++;
      errors.push(`导入 ${config.key} 失败`);
    }
  }

  return { success, failed, errors };
}

/**
 * 导出环境配置（不包含敏感信息）
 */
export async function exportEnvironmentConfigs(
  environment: Environment,
  includeSecrets: boolean = false
): Promise<string> {
  const db = await getDb();
  if (!db) return '';

  const configs = await getEnvironmentConfigs(environment);
  
  const exportData = configs
    .filter(c => includeSecrets || !c.isSecret)
    .map(c => ({
      key: c.configKey,
      value: c.configValue,
      description: c.description,
      isSecret: c.isSecret,
    }));

  return JSON.stringify(exportData, null, 2);
}
