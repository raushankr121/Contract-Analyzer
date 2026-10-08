import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { 
  loadContracts, 
  saveContracts, 
  loadPolicy, 
  savePolicy, 
  loadLogs, 
  appendLog, 
  clearLogs 
} from './storage';
import { analyzeContractWithGemini, consultAiAgentOnClause } from './geminiService';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  const contracts = loadContracts();
  const policy = loadPolicy();
  const hasKey = !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_gemini');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiEngine: hasKey ? 'Google Gemini 2.5 Flash (Active)' : 'Local Heuristics Engine (Active)',
    hasApiKey: hasKey,
    contractsCount: contracts.length,
    hasPolicy: !!policy,
  });
});

// Contracts CRUD & Persistence
app.get('/api/contracts', (req: Request, res: Response) => {
  try {
    const contracts = loadContracts();
    res.json(contracts);
  } catch (err: any) {
    appendLog({ level: 'ERROR', module: 'STORAGE', message: `Failed to load contracts: ${err.message}` });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contracts', (req: Request, res: Response) => {
  try {
    const { versions } = req.body;
    if (!Array.isArray(versions)) {
      return res.status(400).json({ error: 'Expected versions array' });
    }
    saveContracts(versions);
    appendLog({
      level: 'INFO',
      module: 'STORAGE',
      message: `Persisted ${versions.length} contract version(s) to database`,
      metadata: { count: versions.length, ids: versions.map(v => v.id) },
    });
    res.json({ success: true, count: versions.length });
  } catch (err: any) {
    appendLog({ level: 'ERROR', module: 'STORAGE', message: `Failed to save contracts: ${err.message}` });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contracts', (req: Request, res: Response) => {
  try {
    saveContracts([]);
    appendLog({ level: 'INFO', module: 'STORAGE', message: 'Cleared all contracts from database' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Organizational Policy Persistence
app.get('/api/policy', (req: Request, res: Response) => {
  try {
    const policy = loadPolicy();
    res.json(policy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/policy', (req: Request, res: Response) => {
  try {
    const { policy } = req.body;
    savePolicy(policy || null);
    appendLog({
      level: 'INFO',
      module: 'STORAGE',
      message: policy ? `Saved organizational policy "${policy.fileName}"` : 'Cleared active policy',
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Agent Analysis Endpoint
app.post('/api/ai/extract', async (req: Request, res: Response) => {
  try {
    const { text, fileName, versionNumber, policy } = req.body;
    if (!text || !fileName) {
      return res.status(400).json({ error: 'text and fileName are required' });
    }

    const result = await analyzeContractWithGemini({
      text,
      fileName,
      versionNumber: versionNumber || 1,
      policy,
    });

    res.json(result);
  } catch (err: any) {
    appendLog({
      level: 'ERROR',
      module: 'GEMINI_AGENT',
      message: `Extraction endpoint error: ${err.message}`,
    });
    res.status(500).json({ error: err.message });
  }
});

// AI Agent Clause Advisory Endpoint
app.post('/api/ai/advise', async (req: Request, res: Response) => {
  try {
    const { clauseText, userQuestion, contextTitle } = req.body;
    if (!clauseText || !userQuestion) {
      return res.status(400).json({ error: 'clauseText and userQuestion are required' });
    }

    const advice = await consultAiAgentOnClause(clauseText, userQuestion, contextTitle || 'Contract Clause');
    res.json({ advice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Structured Application & AI Logs
app.get('/api/logs', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = loadLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', (req: Request, res: Response) => {
  try {
    const { level, module, message, metadata } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    const log = appendLog({
      level: level || 'INFO',
      module: module || 'API',
      message,
      metadata,
    });
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/logs', (req: Request, res: Response) => {
  try {
    clearLogs();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  appendLog({
    level: 'INFO',
    module: 'API',
    message: `Contract Obligation Assistant backend server active on port ${PORT}`,
  });
  console.log(`Backend server ready at http://127.0.0.1:${PORT}`);
});
