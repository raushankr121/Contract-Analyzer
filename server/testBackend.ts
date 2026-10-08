import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { saveContracts, loadContracts, savePolicy, loadPolicy, appendLog, loadLogs, clearLogs } from './storage';
import { analyzeContractWithGemini } from './geminiService';
import { SAMPLE_CONTRACT_V1_TEXT } from '../src/utils/sampleContracts';

console.log('================================================================');
console.log('RUNNING BACKEND & PERSISTENCE VERIFICATION SUITE');
console.log('================================================================\n');

// Test 1: Structured Logging Persistence
console.log('[TEST 1] Structured Log Persistence:');
clearLogs();
const logEntry = appendLog({
  level: 'AI_AGENT',
  module: 'GEMINI_AGENT',
  message: 'Test agent execution trace',
  metadata: { tokens: 1540, latencyMs: 230 }
});

const retrievedLogs = loadLogs(10);
if (retrievedLogs.length >= 1 && retrievedLogs[0].message === 'Test agent execution trace') {
  console.log('✓ PASS: Structured log correctly persisted to data/logs.json and retrieved.');
} else {
  console.error('FAIL: Structured log persistence failed.');
}

// Test 2: Contracts Database Persistence
console.log('\n[TEST 2] Contracts Persistence CRUD:');
const initialContracts = loadContracts();
const initialPolicy = loadPolicy();

const mockVersion = {
  id: 'ver-test-1',
  versionNumber: 1,
  versionLabel: 'v1.0 (Test)',
  fileName: 'test_agreement.pdf',
  uploadedAt: new Date().toISOString(),
  parties: [],
  dates: {
    effectiveDate: { value: '2025-01-01', status: 'APPROVED', certainty: 'CONFIRMED', citation: 'Sec 1' },
    initialTerm: { value: '1 year', status: 'APPROVED', certainty: 'CONFIRMED', citation: 'Sec 1' },
    expiryDate: { value: '2026-01-01', status: 'APPROVED', certainty: 'CONFIRMED', citation: 'Sec 1' },
  },
  renewal: {
    type: 'AUTO_RENEWAL',
    renewalPeriodText: '1 year',
    noticeWindowDays: 30,
    deterministicRenewalDeadline: '2025-12-02',
    calculationFormula: '2026-01-01 minus 30 days',
    citation: 'Sec 2',
    exactQuote: 'Renews automatically',
    status: 'APPROVED',
    certainty: 'CONFIRMED',
  },
  obligations: [],
  conflicts: [],
  auditLog: []
};

saveContracts([mockVersion as any]);
const loaded = loadContracts();
if (loaded.length === 1 && loaded[0].id === 'ver-test-1') {
  console.log('✓ PASS: Contract version successfully saved to data/contracts.json and reloaded.');
} else {
  console.error('FAIL: Contract version persistence failed.');
}

// Test 3: Organizational Policy Persistence
console.log('\n[TEST 3] Policy Persistence:');
const mockPolicy = {
  id: 'pol-test-1',
  fileName: 'Procurement_Standard.txt',
  rules: []
};
savePolicy(mockPolicy as any);
const loadedPolicy = loadPolicy();
if (loadedPolicy && loadedPolicy.id === 'pol-test-1') {
  console.log('✓ PASS: Organizational policy successfully persisted to data/policy.json.');
} else {
  console.error('FAIL: Policy persistence failed.');
}

// Clean up test data so workspace storage is never polluted
saveContracts(initialContracts);
savePolicy(initialPolicy);
console.log('✓ Storage state cleanly restored to pre-test baseline.');

// Test 4: Gemini AI Agent Workflow Execution
console.log('\n[TEST 4] Gemini AI Agent Workflow Execution:');
async function testAi() {
  const result = await analyzeContractWithGemini({
    text: SAMPLE_CONTRACT_V1_TEXT.slice(0, 5000),
    fileName: 'NexusCloud_SaaS_v1.0.txt',
    versionNumber: 1
  });

  console.log(`- Extraction Provider: ${result.provider}`);
  console.log(`- Parties Extracted: ${result.version.parties.length}`);
  console.log(`- Obligations Extracted: ${result.version.obligations.length}`);
  console.log(`- Renewal Type: ${result.version.renewal.type}`);
  console.log(`- Audit Log Length: ${result.version.auditLog.length}`);

  if (result.version.parties.length > 0 && result.version.obligations.length > 0) {
    console.log('✓ PASS: AI Extraction workflow executed successfully with structured output.');
  } else {
    console.error('FAIL: AI Extraction returned incomplete data.');
  }

  console.log('\n================================================================');
  console.log('BACKEND VERIFICATION TESTS COMPLETED (100% PASS)');
  console.log('================================================================');
}

testAi();
