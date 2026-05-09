import fs from 'fs';
import path from 'path';

async function testImport(csvFileName: string, label: string) {
  const csvText = fs.readFileSync(path.join(process.cwd(), 'scratch', csvFileName), 'utf-8');
  console.log(`\n--- Testing ${label} (${csvFileName}) ---`);
  
  const response = await fetch('http://localhost:3000/api/quotes/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvText })
  });
  
  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Result:', JSON.stringify(result, null, 2));
  return result;
}

async function verifyDb() {
  // Use tsx to run this, so I can use fetch and fs.
  // Actually, I can just query the DB using prisma in a separate command.
}

async function run() {
  try {
    await testImport('import_test_fail.csv', 'FAIL Scenario (Format)');
    await testImport('import_test_fail_v2.csv', 'FAIL Scenario (DB Check)');
    await testImport('import_test_success.csv', 'SUCCESS Scenario');
  } catch (e) {
    console.error('Test script error:', e);
  }
}

run();
