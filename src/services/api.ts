import type { ContractVersion, OrganizationalPolicy } from '../types/contract';
import { extractContract } from '../utils/contractExtractor';

// In development: empty string → Vite proxy forwards /api/* to localhost:3001
// In production:  set VITE_API_URL=https://your-app.railway.app in Vercel env vars
const BASE_URL = (import.meta.env.VITE_API_URL as string) || '';

export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'AI_AGENT' | 'AUDIT' | 'DEBUG';
  module: 'PARSER' | 'GEMINI_AGENT' | 'DATE_MATH' | 'RECONCILER' | 'HUMAN_REVIEW' | 'STORAGE' | 'API';
  message: string;
  metadata?: Record<string, any>;
}

export interface BackendHealth {
  status: string;
  timestamp: string;
  aiEngine: string;
  hasApiKey: boolean;
  contractsCount: number;
  hasPolicy: boolean;
}

const LOCAL_STORAGE_KEY_CONTRACTS = 'aggroso_contracts_v1';
const LOCAL_STORAGE_KEY_POLICY = 'aggroso_policy_v1';
const LOCAL_STORAGE_KEY_LOGS = 'aggroso_logs_v1';

// Health Check
export async function getBackendHealth(): Promise<BackendHealth | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Contracts Persistence
export async function getSavedContracts(): Promise<ContractVersion[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/contracts`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY_CONTRACTS, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend unavailable, reading from localStorage:', err);
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY_CONTRACTS);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('Failed reading localStorage:', err);
  }
  return [];
}

export async function saveContracts(versions: ContractVersion[]): Promise<void> {
  // Save to localStorage immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_CONTRACTS, JSON.stringify(versions));
  } catch (e) {
    console.warn('Could not write to localStorage', e);
  }

  // Persist to backend
  try {
    await fetch(`${BASE_URL}/api/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versions }),
    });
  } catch (err) {
    console.warn('Could not persist to backend:', err);
  }
}

// Policy Persistence
export async function getSavedPolicy(): Promise<OrganizationalPolicy | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/policy`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        localStorage.setItem(LOCAL_STORAGE_KEY_POLICY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend policy unavailable, reading from localStorage:', err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY_POLICY);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore
  }
  return null;
}

export async function savePolicy(policy: OrganizationalPolicy | null): Promise<void> {
  try {
    if (policy) {
      localStorage.setItem(LOCAL_STORAGE_KEY_POLICY, JSON.stringify(policy));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_POLICY);
    }
  } catch (e) {
    console.warn('Could not save policy to localStorage', e);
  }

  try {
    await fetch(`${BASE_URL}/api/policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy }),
    });
  } catch (err) {
    console.warn('Could not persist policy to backend:', err);
  }
}

// AI Extraction Call
export async function runAiContractAnalysis(
  text: string,
  fileName: string,
  versionNumber: number,
  policy?: OrganizationalPolicy
): Promise<{ version: ContractVersion; provider: 'GEMINI_AI' | 'LOCAL_HEURISTICS' }> {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, fileName, versionNumber, policy }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.version) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend AI analysis endpoint unavailable, using local heuristics engine:', err);
  }

  // Resilient fallback
  const localVersion = extractContract(text, fileName, versionNumber, policy);
  return { version: localVersion, provider: 'LOCAL_HEURISTICS' };
}

// AI Agent Clause Advisory
export async function askAiAgentAboutClause(
  clauseText: string,
  userQuestion: string,
  contextTitle: string
): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/advise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clauseText, userQuestion, contextTitle }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.advice;
    }
  } catch (err) {
    console.warn('AI Agent advisory unavailable:', err);
  }
  return 'AI Agent advisory currently unreachable. Please check backend connection.';
}

// Structured Logging
export async function getStructuredLogs(limit = 100): Promise<StructuredLogEntry[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/logs?limit=${limit}`);
    if (res.ok) {
      const logs = await res.json();
      return logs;
    }
  } catch {
    // Fallback to localStorage
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY_LOGS);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore
  }
  return [];
}

export async function logStructuredEvent(
  level: StructuredLogEntry['level'],
  module: StructuredLogEntry['module'],
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  const entry: StructuredLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    metadata,
  };

  // Local storage cache
  try {
    const existing: StructuredLogEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_LOGS) || '[]');
    existing.push(entry);
    localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify(existing.slice(-200)));
  } catch {
    // Ignore
  }

  // Post to backend
  try {
    await fetch(`${BASE_URL}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // Ignore
  }
}
