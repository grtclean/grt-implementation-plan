/**
 * Translation Coverage Checker
 * 
 * This script analyzes the codebase to find missing translations.
 * It scans all TSX files for t("key") calls and compares them against
 * the translation files to identify missing keys.
 * 
 * Usage: npx tsx scripts/check-translations.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CLIENT_SRC_PATH = path.join(__dirname, '../client/src');
const I18N_PATH = path.join(CLIENT_SRC_PATH, 'lib/i18n.ts');

// Languages to check
const LANGUAGES = ['zh', 'en', 'de', 'fr'] as const;
type Language = typeof LANGUAGES[number];

interface TranslationReport {
  totalKeysUsed: number;
  missingByLanguage: Record<Language, string[]>;
  unusedKeys: string[];
  duplicateKeys: string[];
  keysWithFallback: string[];
}

// Extract translation keys from i18n.ts
function extractTranslationKeys(i18nContent: string): Record<Language, Set<string>> {
  const result: Record<Language, Set<string>> = {
    zh: new Set(),
    en: new Set(),
    de: new Set(),
    fr: new Set(),
  };

  // Match each language block
  for (const lang of LANGUAGES) {
    const langRegex = new RegExp(`${lang}:\\s*\\{([\\s\\S]*?)\\}\\s*(?:,\\s*(?:${LANGUAGES.join('|')})|\\}\\s*;)`, 'g');
    const match = langRegex.exec(i18nContent);
    
    if (match) {
      // Extract keys from the language block
      const keyRegex = /"([^"]+)":\s*"/g;
      let keyMatch;
      while ((keyMatch = keyRegex.exec(match[1])) !== null) {
        result[lang].add(keyMatch[1]);
      }
    }
  }

  return result;
}

// Find all t("key") calls in TSX files
function findTranslationCalls(dir: string): Set<string> {
  const keys = new Set<string>();
  
  function scanDirectory(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        }
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Match t("key") or t('key') patterns
        const tCallRegex = /\bt\s*\(\s*["']([^"']+)["']\s*\)/g;
        let match;
        while ((match = tCallRegex.exec(content)) !== null) {
          keys.add(match[1]);
        }
        
        // Also match {t("key")} patterns in JSX
        const jsxTCallRegex = /\{t\s*\(\s*["']([^"']+)["']\s*\)\}/g;
        while ((match = jsxTCallRegex.exec(content)) !== null) {
          keys.add(match[1]);
        }
      }
    }
  }
  
  scanDirectory(dir);
  return keys;
}

// Generate the translation report
function generateReport(): TranslationReport {
  // Read i18n file
  const i18nContent = fs.readFileSync(I18N_PATH, 'utf-8');
  
  // Extract existing translations
  const existingTranslations = extractTranslationKeys(i18nContent);
  
  // Find all translation calls in the codebase
  const usedKeys = findTranslationCalls(CLIENT_SRC_PATH);
  
  // Get all unique keys from all languages
  const allExistingKeys = new Set<string>();
  for (const lang of LANGUAGES) {
    for (const key of existingTranslations[lang]) {
      allExistingKeys.add(key);
    }
  }
  
  // Find missing keys by language
  const missingByLanguage: Record<Language, string[]> = {
    zh: [],
    en: [],
    de: [],
    fr: [],
  };
  
  for (const key of usedKeys) {
    for (const lang of LANGUAGES) {
      if (!existingTranslations[lang].has(key)) {
        missingByLanguage[lang].push(key);
      }
    }
  }
  
  // Find unused keys (keys in translations but not used in code)
  const unusedKeys: string[] = [];
  for (const key of allExistingKeys) {
    if (!usedKeys.has(key)) {
      unusedKeys.push(key);
    }
  }
  
  // Find keys that are only in some languages (potential fallback issues)
  const keysWithFallback: string[] = [];
  for (const key of usedKeys) {
    const presentIn = LANGUAGES.filter(lang => existingTranslations[lang].has(key));
    if (presentIn.length > 0 && presentIn.length < LANGUAGES.length) {
      keysWithFallback.push(`${key} (present in: ${presentIn.join(', ')})`);
    }
  }
  
  // Sort all arrays
  for (const lang of LANGUAGES) {
    missingByLanguage[lang].sort();
  }
  unusedKeys.sort();
  keysWithFallback.sort();
  
  return {
    totalKeysUsed: usedKeys.size,
    missingByLanguage,
    unusedKeys,
    duplicateKeys: [],
    keysWithFallback,
  };
}

// Format and print the report
function printReport(report: TranslationReport) {
  console.log('\\n========================================');
  console.log('   TRANSLATION COVERAGE REPORT');
  console.log('========================================\\n');
  
  console.log(`Total translation keys used in code: ${report.totalKeysUsed}\\n`);
  
  // Missing keys by language
  console.log('--- Missing Keys by Language ---\\n');
  for (const lang of LANGUAGES) {
    const missing = report.missingByLanguage[lang];
    console.log(`${lang.toUpperCase()}: ${missing.length} missing keys`);
    if (missing.length > 0 && missing.length <= 20) {
      missing.forEach(key => console.log(`  - ${key}`));
    } else if (missing.length > 20) {
      missing.slice(0, 10).forEach(key => console.log(`  - ${key}`));
      console.log(`  ... and ${missing.length - 10} more`);
    }
    console.log('');
  }
  
  // Keys with partial translations
  if (report.keysWithFallback.length > 0) {
    console.log('--- Keys with Partial Translations ---\\n');
    console.log(`${report.keysWithFallback.length} keys are only translated in some languages:`);
    report.keysWithFallback.slice(0, 20).forEach(key => console.log(`  - ${key}`));
    if (report.keysWithFallback.length > 20) {
      console.log(`  ... and ${report.keysWithFallback.length - 20} more`);
    }
    console.log('');
  }
  
  // Unused keys
  if (report.unusedKeys.length > 0) {
    console.log('--- Potentially Unused Keys ---\\n');
    console.log(`${report.unusedKeys.length} keys in translations but not found in code:`);
    report.unusedKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    if (report.unusedKeys.length > 10) {
      console.log(`  ... and ${report.unusedKeys.length - 10} more`);
    }
    console.log('');
  }
  
  // Summary
  console.log('========================================');
  console.log('   SUMMARY');
  console.log('========================================\\n');
  
  const totalMissing = LANGUAGES.reduce((sum, lang) => sum + report.missingByLanguage[lang].length, 0);
  const coveragePercent = report.totalKeysUsed > 0 
    ? ((report.totalKeysUsed * LANGUAGES.length - totalMissing) / (report.totalKeysUsed * LANGUAGES.length) * 100).toFixed(1)
    : '100';
  
  console.log(`Overall Translation Coverage: ${coveragePercent}%`);
  console.log(`Total Missing Translations: ${totalMissing}`);
  console.log(`Keys with Partial Coverage: ${report.keysWithFallback.length}`);
  console.log(`Potentially Unused Keys: ${report.unusedKeys.length}`);
  console.log('');
}

// Export report to JSON file
function exportReportToJson(report: TranslationReport, outputPath: string) {
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Report exported to: ${outputPath}`);
}

// Main execution
function main() {
  console.log('Scanning codebase for translation usage...');
  
  const report = generateReport();
  printReport(report);
  
  // Export to JSON for further analysis
  const outputPath = path.join(__dirname, '../translation-report.json');
  exportReportToJson(report, outputPath);
}

main();
