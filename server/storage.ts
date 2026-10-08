import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CONTRACTS_FILE = path.join(DATA_DIR, 'contracts.json');
const POLICY_FILE = path.join(DATA_DIR, 'policy.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

export interface StructuredLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'AI_AGENT' | 'AUDIT' | 'DEBUG';
  module: 'PARSER' | 'GEMINI_AGENT' | 'DATE_MATH' | 'RECONCILER' | 'HUMAN_REVIEW' | 'STORAGE' | 'API';
  message: string;
  metadata?: Record<string, any>;
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Contract Persistence
export function loadContracts(): any[] {
  return readJsonFile<any[]>(CONTRACTS_FILE, []);
}

export function saveContracts(contracts: any[]): void {
  writeJsonFile(CONTRACTS_FILE, contracts);
}

// Policy Persistence
export function loadPolicy(): any | null {
  return readJsonFile<any | null>(POLICY_FILE, null);
}

export function savePolicy(policy: any | null): void {
  writeJsonFile(POLICY_FILE, policy);
}

// Structured Logs Persistence
export function loadLogs(limit = 100): StructuredLog[] {
  const logs = readJsonFile<StructuredLog[]>(LOGS_FILE, []);
  return logs.slice(-limit);
}

export function appendLog(entry: Omit<StructuredLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): StructuredLog {
  const fullEntry: StructuredLog = {
    id: entry.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    level: entry.level,
    module: entry.module,
    message: entry.message,
    metadata: entry.metadata,
  };

  const currentLogs = readJsonFile<StructuredLog[]>(LOGS_FILE, []);
  currentLogs.push(fullEntry);
  // Keep last 1,000 log records
  const trimmed = currentLogs.slice(-1000);
  writeJsonFile(LOGS_FILE, trimmed);

  console.log(`[${fullEntry.timestamp}] [${fullEntry.level}] [${fullEntry.module}] ${fullEntry.message}`);
  return fullEntry;
}

export function clearLogs(): void {
  writeJsonFile(LOGS_FILE, []);
}
