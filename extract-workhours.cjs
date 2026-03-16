const xlsx = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, 'data/副本部件&工序工时最新(3).xlsx');

console.log('Reading file:', filePath);

const workbook = xlsx.readFile(filePath, { cellDates: true, cellNF: true, cellText: true });

console.log('\n=== SHEET NAMES ===');
console.log(JSON.stringify(workbook.SheetNames, null, 2));

for (const sheetName of workbook.SheetNames) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`=== SHEET: ${sheetName} ===`);
  console.log('='.repeat(80));

  const sheet = workbook.Sheets[sheetName];

  // Get sheet range
  const ref = sheet['!ref'];
  console.log('Range:', ref);

  // Dump as JSON with header row
  const jsonData = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });
  console.log('Row count:', jsonData.length);
  console.log('DATA:');
  console.log(JSON.stringify(jsonData, null, 2));

  // Also dump raw (no header) to catch any data in first row
  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
  if (rawData.length > 0) {
    console.log('\nRAW (header:1):');
    console.log(JSON.stringify(rawData, null, 2));
  }
}

console.log('\n=== EXTRACTION COMPLETE ===');
