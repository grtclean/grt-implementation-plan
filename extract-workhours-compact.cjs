const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'data/副本部件&工序工时最新(3).xlsx');
const outDir = path.resolve(__dirname, 'data');

console.log('Reading file:', filePath);

const workbook = xlsx.readFile(filePath, { cellDates: true, cellNF: true, cellText: true });

console.log('\n=== SHEET NAMES ===');
console.log(JSON.stringify(workbook.SheetNames, null, 2));

const allData = {};

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const ref = sheet['!ref'];

  // Use header:1 to get truly raw rows including row 1
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

  allData[sheetName] = rawRows;

  const outFile = path.join(outDir, `sheet_${sheetName.replace(/[\/\\:*?"<>|]/g, '_')}.json`);
  fs.writeFileSync(outFile, JSON.stringify(rawRows, null, 2), 'utf8');

  console.log(`\nSheet: ${sheetName}`);
  console.log(`  Range: ${ref}`);
  console.log(`  Rows: ${rawRows.length}`);
  console.log(`  Cols: ${rawRows[0] ? rawRows[0].length : 0}`);
  console.log(`  Written to: ${outFile}`);

  // Print first 5 rows as preview
  console.log('  Preview (first 5 rows):');
  rawRows.slice(0, 5).forEach((row, i) => {
    console.log(`    Row[${i}]: ${JSON.stringify(row)}`);
  });
}

// Also write combined file
const combinedOut = path.join(outDir, 'all_sheets_combined.json');
fs.writeFileSync(combinedOut, JSON.stringify(allData, null, 2), 'utf8');
console.log(`\nCombined JSON written to: ${combinedOut}`);
console.log('\n=== EXTRACTION COMPLETE ===');
