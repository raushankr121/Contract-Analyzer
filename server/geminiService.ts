import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { appendLog } from './storage';
import { extractContract } from '../src/utils/contractExtractor';
import { calculateRenewalDeadline, generateDeterministicReminders } from '../src/utils/deterministicDate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const GEMINI_MODEL = 'gemini-2.5-flash';

function getGeminiApiUrl(): string {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
}

export interface ExtractionRequest {
  text: string;
  fileName: string;
  versionNumber?: number;
  policy?: any;
}

/**
 * Call Gemini 2.5 Flash to extract contract terms, obligations, dates, and ambiguities.
 * Falls back to deterministic extraction engine if Gemini is unavailable.
 */
export async function analyzeContractWithGemini(req: ExtractionRequest): Promise<{ version: any; provider: 'GEMINI_AI' | 'LOCAL_HEURISTICS' }> {
  const startTime = Date.now();
  appendLog({
    level: 'AI_AGENT',
    module: 'GEMINI_AGENT',
    message: `Initiating AI contract analysis for ${req.fileName} using model ${GEMINI_MODEL}`,
    metadata: { fileName: req.fileName, textLength: req.text.length, hasPolicy: !!req.policy },
  });

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey || apiKey.includes('your_gemini')) {
    appendLog({
      level: 'WARN',
      module: 'GEMINI_AGENT',
      message: 'GEMINI_API_KEY not configured or placeholder detected. Falling back to local deterministic extractor.',
    });
    const fallbackVersion = extractContract(req.text, req.fileName, req.versionNumber || 1, req.policy);
    return { version: fallbackVersion, provider: 'LOCAL_HEURISTICS' };
  }

  const prompt = `You are an expert Commercial Legal Auditor and Contract Information-Management Agent.
Analyze the following contract document and extract all key terms, parties, dates, renewal terms, termination provisions, and operational obligations.

For EVERY extracted item, you MUST include:
1. "citation": Exact section or clause header (e.g. "Section 1.1", "Article 4", "Preamble").
2. "exactQuote": Verbatim snippet from the contract text supporting the extraction.
3. "certainty": Either "CONFIRMED" (explicit, clear) or "UNCERTAIN_INTERPRETATION" (conditional, ambiguous, discretionary).

Return a valid JSON object matching this EXACT structure (no markdown fences, just pure JSON):
{
  "parties": [
    {
      "id": "party-1",
      "name": "Full legal party name",
      "role": "Customer / Client" or "Vendor / Service Provider" or "Partner" or "Other",
      "jurisdiction": "State/Country or N/A",
      "citation": "Section citation",
      "exactQuote": "Verbatim quote",
      "certainty": "CONFIRMED" or "UNCERTAIN_INTERPRETATION",
      "confidenceScore": 0.95,
      "status": "PENDING"
    }
  ],
  "dates": {
    "effectiveDate": {
      "value": "YYYY-MM-DD or Unstated",
      "citation": "Section citation",
      "exactQuote": "Verbatim quote",
      "certainty": "CONFIRMED" or "UNCERTAIN_INTERPRETATION",
      "status": "PENDING"
    },
    "initialTerm": {
      "value": "e.g. 36 months",
      "durationMonths": 36,
      "citation": "Section citation",
      "exactQuote": "Verbatim quote",
      "certainty": "CONFIRMED",
      "status": "PENDING"
    },
    "expiryDate": {
      "value": "YYYY-MM-DD or Unstated",
      "citation": "Section citation",
      "exactQuote": "Verbatim quote",
      "certainty": "CONFIRMED" or "UNCERTAIN_INTERPRETATION",
      "status": "PENDING"
    }
  },
  "renewal": {
    "type": "AUTO_RENEWAL" or "OPT_IN" or "FIXED_TERM" or "NO_RENEWAL",
    "renewalPeriodMonths": 12,
    "renewalPeriodText": "e.g. successive 12-month periods",
    "noticeWindowDays": 60,
    "noticeWindowText": "e.g. 60 days prior written notice",
    "citation": "Section citation",
    "exactQuote": "Verbatim quote",
    "certainty": "CONFIRMED" or "UNCERTAIN_INTERPRETATION",
    "clarificationQuestion": "Optional clarification question if renewal condition is ambiguous",
    "status": "PENDING"
  },
  "termination": {
    "hasConvenienceTermination": true,
    "convenienceNoticeDays": 30,
    "hasCauseTermination": true,
    "causeCurePeriodDays": 30,
    "citation": "Section citation",
    "exactQuote": "Verbatim quote",
    "certainty": "CONFIRMED",
    "status": "PENDING"
  },
  "notice": {
    "permittedMethods": ["Certified Mail", "Email", "Courier"],
    "designatedRecipient": "Name/Title or N/A",
    "designatedAddress": "Physical address or email",
    "deemedReceivedDays": 3,
    "citation": "Section citation",
    "exactQuote": "Verbatim quote",
    "certainty": "CONFIRMED",
    "status": "PENDING"
  },
  "obligations": [
    {
      "id": "ob-1",
      "title": "Clear obligation title",
      "description": "Operational description of what must be performed",
      "category": "PAYMENT" or "DELIVERABLE" or "COMPLIANCE" or "AUDIT" or "INSURANCE" or "REPORTING" or "CONFIDENTIALITY" or "DATA_PROTECTION" or "OTHER",
      "responsibleParty": "Vendor" or "Customer" or "Mutual",
      "recurrence": "ONE_TIME" or "MONTHLY" or "QUARTERLY" or "ANNUAL" or "EVENT_DRIVEN",
      "targetDate": "YYYY-MM-DD or Ongoing",
      "citation": "Section citation",
      "exactQuote": "Verbatim quote",
      "certainty": "CONFIRMED" or "UNCERTAIN_INTERPRETATION",
      "clarificationQuestion": "Optional question if condition is ambiguous",
      "status": "PENDING"
    }
  ],
  "conflicts": [
    {
      "id": "conf-1",
      "title": "Short title of conflict or ambiguity",
      "conflictType": "INTERNAL_CONTRACT_CONFLICT" or "POLICY_VIOLATION" or "AMBIGUOUS_TIMELINE" or "MISSING_STANDARD_CLAUSE",
      "severity": "CRITICAL" or "HIGH" or "MEDIUM" or "LOW",
      "description": "Detailed explanation of discrepancy",
      "contractSectionA": "First section cited",
      "quoteA": "Verbatim quote from section A",
      "contractSectionB": "Second section cited or N/A",
      "quoteB": "Verbatim quote from section B or N/A",
      "clarificationQuestion": "Targeted operational question to ask the counterparty or procurement legal team",
      "operationalRecommendation": "Recommended course of action",
      "status": "OPEN"
    }
  ]
}

CONTRACT TEXT TO ANALYZE:
"""
${req.text.slice(0, 35000)}
"""`;

  try {
    const res = await fetch(getGeminiApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API returned status ${res.status}: ${errorText}`);
    }

    const jsonRes = await res.json();
    const rawContent = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      throw new Error('Gemini returned an empty response');
    }

    const parsedData = JSON.parse(rawContent);

    // Enrich with deterministic date calculations and reminders
    const expiryVal = parsedData.dates?.expiryDate?.value;
    const noticeDays = parsedData.renewal?.noticeWindowDays || 0;
    let deadlineStr = 'N/A';
    let formulaStr = 'N/A';
    let reminders: any[] = [];

    if (expiryVal && !expiryVal.includes('Unstated') && noticeDays > 0) {
      const calc = calculateRenewalDeadline(expiryVal, noticeDays);
      deadlineStr = calc.deadline;
      formulaStr = calc.formula;
      reminders = generateDeterministicReminders(deadlineStr, 'Contract Non-Renewal Cancellation Window', [90, 60, 30, 7]);
    }

    const versionId = `ver-${Date.now()}`;
    const versionNumber = req.versionNumber || 1;

    const enrichedVersion = {
      id: versionId,
      versionNumber,
      versionLabel: `v${versionNumber}.0 (${versionNumber === 1 ? 'Initial Ingestion' : 'Amendment'})`,
      fileName: req.fileName,
      uploadedAt: new Date().toISOString(),
      rawText: req.text,
      parties: (parsedData.parties || []).map((p: any, idx: number) => ({
        id: p.id || `party-${idx + 1}`,
        name: p.name || 'Unnamed Party',
        role: p.role || 'Other',
        jurisdiction: p.jurisdiction || 'N/A',
        citation: p.citation || 'Preamble',
        exactQuote: p.exactQuote || '',
        certainty: p.certainty || 'CONFIRMED',
        confidenceScore: p.confidenceScore || 0.95,
        status: 'PENDING',
      })),
      dates: parsedData.dates || {
        effectiveDate: { value: 'Unstated', citation: 'N/A', exactQuote: '', certainty: 'UNCERTAIN_INTERPRETATION', status: 'PENDING' },
        initialTerm: { value: 'Unstated', durationMonths: 0, citation: 'N/A', exactQuote: '', certainty: 'UNCERTAIN_INTERPRETATION', status: 'PENDING' },
        expiryDate: { value: 'Unstated', citation: 'N/A', exactQuote: '', certainty: 'UNCERTAIN_INTERPRETATION', status: 'PENDING' },
      },
      renewal: {
        id: 'renewal-clause',
        type: parsedData.renewal?.type || 'FIXED_TERM',
        renewalPeriodMonths: parsedData.renewal?.renewalPeriodMonths || 0,
        renewalPeriodText: parsedData.renewal?.renewalPeriodText || 'Fixed Term',
        noticeWindowDays: noticeDays,
        noticeWindowText: parsedData.renewal?.noticeWindowText || `${noticeDays} days`,
        deterministicRenewalDeadline: deadlineStr,
        calculationFormula: formulaStr,
        reminders,
        citation: parsedData.renewal?.citation || 'General Terms',
        exactQuote: parsedData.renewal?.exactQuote || '',
        certainty: parsedData.renewal?.certainty || 'CONFIRMED',
        clarificationQuestion: parsedData.renewal?.clarificationQuestion,
        status: 'PENDING',
      },
      termination: {
        id: 'term-clause',
        hasConvenienceTermination: !!parsedData.termination?.hasConvenienceTermination,
        convenienceNoticeDays: parsedData.termination?.convenienceNoticeDays || 30,
        hasCauseTermination: parsedData.termination?.hasCauseTermination !== false,
        causeCurePeriodDays: parsedData.termination?.causeCurePeriodDays || 30,
        citation: parsedData.termination?.citation || 'Termination Clause',
        exactQuote: parsedData.termination?.exactQuote || '',
        certainty: parsedData.termination?.certainty || 'CONFIRMED',
        status: 'PENDING',
      },
      notice: {
        id: 'notice-clause',
        permittedMethods: parsedData.notice?.permittedMethods || ['Certified Mail', 'Email'],
        designatedRecipient: parsedData.notice?.designatedRecipient || 'Legal Department',
        designatedAddress: parsedData.notice?.designatedAddress || 'As specified in contract',
        deemedReceivedDays: parsedData.notice?.deemedReceivedDays || 3,
        citation: parsedData.notice?.citation || 'Notices Clause',
        exactQuote: parsedData.notice?.exactQuote || '',
        certainty: parsedData.notice?.certainty || 'CONFIRMED',
        status: 'PENDING',
      },
      obligations: (parsedData.obligations || []).map((o: any, idx: number) => ({
        id: o.id || `ob-${idx + 1}`,
        title: o.title || `Obligation #${idx + 1}`,
        description: o.description || '',
        category: o.category || 'OTHER',
        responsibleParty: o.responsibleParty || 'Mutual',
        recurrence: o.recurrence || 'ONE_TIME',
        targetDate: o.targetDate || expiryVal || 'Ongoing',
        reminders: o.targetDate && !o.targetDate.includes('Ongoing') ? generateDeterministicReminders(o.targetDate, o.title, [30, 14, 7]) : [],
        citation: o.citation || 'General Terms',
        exactQuote: o.exactQuote || '',
        certainty: o.certainty || 'CONFIRMED',
        clarificationQuestion: o.clarificationQuestion,
        status: 'PENDING',
      })),
      conflicts: (parsedData.conflicts || []).map((c: any, idx: number) => ({
        id: c.id || `conf-${idx + 1}`,
        title: c.title || `Ambiguity #${idx + 1}`,
        conflictType: c.conflictType || 'AMBIGUOUS_TIMELINE',
        severity: c.severity || 'MEDIUM',
        description: c.description || '',
        contractSectionA: c.contractSectionA || '',
        quoteA: c.quoteA || '',
        contractSectionB: c.contractSectionB,
        quoteB: c.quoteB,
        clarificationQuestion: c.clarificationQuestion || '',
        operationalRecommendation: c.operationalRecommendation || '',
        status: 'OPEN',
      })),
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          itemId: versionId,
          itemType: 'AI_INGESTION',
          action: 'PENDING',
          timestamp: new Date().toISOString(),
          user: `Gemini AI Agent (${GEMINI_MODEL})`,
          notes: `Extracted contract terms using Gemini 2.5 Flash in ${Date.now() - startTime}ms`,
        },
      ],
    };

    appendLog({
      level: 'AI_AGENT',
      module: 'GEMINI_AGENT',
      message: `Successfully analyzed contract with Gemini AI Agent in ${Date.now() - startTime}ms`,
      metadata: {
        partiesCount: enrichedVersion.parties.length,
        obligationsCount: enrichedVersion.obligations.length,
        conflictsCount: enrichedVersion.conflicts.length,
        durationMs: Date.now() - startTime,
      },
    });

    return { version: enrichedVersion, provider: 'GEMINI_AI' };
  } catch (err: any) {
    appendLog({
      level: 'WARN',
      module: 'GEMINI_AGENT',
      message: `Gemini API call failed (${err.message}). Activating local deterministic extractor fallback.`,
      metadata: { error: err.message, stack: err.stack },
    });

    // Fallback safely to our local rule extractor
    const fallbackVersion = extractContract(req.text, req.fileName, req.versionNumber || 1, req.policy);
    return { version: fallbackVersion, provider: 'LOCAL_HEURISTICS' };
  }
}

/**
 * AI Agent Clause Advisory Tool: Answer specific questions or generate counter-proposals for a clause
 */
export async function consultAiAgentOnClause(clauseText: string, userQuestion: string, contextTitle: string): Promise<string> {
  appendLog({
    level: 'AI_AGENT',
    module: 'GEMINI_AGENT',
    message: `Consulting AI Agent on clause: "${contextTitle}"`,
    metadata: { contextTitle, userQuestion },
  });

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey || apiKey.includes('your_gemini')) {
    return `[Local Heuristic Advice]: Review the clause carefully against your organizational procurement guidelines. Pay special attention to delivery windows, liability limits, and termination cures.`;
  }

  const prompt = `You are a Commercial Contract Negotiations and Risk Advisory AI Agent.
Analyze the following clause and address the user's inquiry.
Provide actionable legal-operational insights, risk levels, and suggested compromise language if requested.

CLAUSE (${contextTitle}):
"""${clauseText}"""

USER QUESTION / REQUEST:
"${userQuestion}"

Provide a clear, concise, structured response with bullet points and risk assessment:`;

  try {
    const res = await fetch(getGeminiApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated from AI agent.';
  } catch (err: any) {
    appendLog({
      level: 'ERROR',
      module: 'GEMINI_AGENT',
      message: `Clause consultation failed: ${err.message}`,
    });
    return `AI Agent consultation encountered an issue: ${err.message}`;
  }
}
