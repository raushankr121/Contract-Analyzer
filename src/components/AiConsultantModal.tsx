import React, { useState } from 'react';
import { X, Sparkles, Send, CheckCircle2, ShieldAlert, FileText, Loader2 } from 'lucide-react';
import { askAiAgentAboutClause, logStructuredEvent } from '../services/api';

interface AiConsultantModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextTitle: string;
  clauseText: string;
  onApplySuggestedEdit?: (newText: string) => void;
}

export const AiConsultantModal: React.FC<AiConsultantModalProps> = ({
  isOpen,
  onClose,
  contextTitle,
  clauseText,
  onApplySuggestedEdit,
}) => {
  const [question, setQuestion] = useState<string>('What are the key operational risks in this clause, and what counter-language should we propose?');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAskAgent = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);

    await logStructuredEvent(
      'AI_AGENT',
      'GEMINI_AGENT',
      `User initiated AI Agent consultation for: ${contextTitle}`,
      { question, clauseLength: clauseText.length }
    );

    try {
      const result = await askAiAgentAboutClause(clauseText, question, contextTitle);
      setResponse(result);
      await logStructuredEvent(
        'AI_AGENT',
        'GEMINI_AGENT',
        `AI Agent generated risk advisory response for: ${contextTitle}`,
        { responseLength: result.length }
      );
    } catch (err: any) {
      setResponse(`Error consulting AI agent: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge ai-badge">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>AI Agent Clause Consultant (Gemini 2.5 Flash)</h3>
              <p className="modal-subtitle">Context: <strong>{contextTitle}</strong></p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-content">
          {/* Target Clause Display */}
          <div className="clause-preview-box">
            <span className="clause-preview-label">
              <FileText size={14} /> Referenced Clause Text:
            </span>
            <p className="clause-preview-text">{clauseText || 'No specific text cited.'}</p>
          </div>

          {/* Quick Prompts */}
          <div className="quick-prompts-row">
            <span className="quick-prompt-label">Quick Prompts:</span>
            <button
              className="quick-prompt-pill"
              onClick={() => setQuestion('Assess legal and operational risk severity (Critical, High, Medium, Low) and explain why.')}
            >
              Analyze Risk Severity
            </button>
            <button
              className="quick-prompt-pill"
              onClick={() => setQuestion('Provide standard compromise counter-language that protects the customer.')}
            >
              Draft Counter-Language
            </button>
            <button
              className="quick-prompt-pill"
              onClick={() => setQuestion('What clarification question should our procurement team send to the vendor?')}
            >
              Generate Clarification Question
            </button>
          </div>

          {/* Prompt Input */}
          <div className="form-group">
            <label className="form-label">Ask the AI Agent:</label>
            <div className="input-with-button">
              <textarea
                className="form-textarea"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask specific questions about dates, risk exposure, cure periods, or redlining..."
              />
            </div>
          </div>

          <button
            className="btn btn-primary w-full flex items-center justify-center gap-2"
            onClick={handleAskAgent}
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spinning" />
                Gemini Agent Analyzing Clause...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Inquiry to Gemini Agent
              </>
            )}
          </button>

          {/* Response Container */}
          {response && (
            <div className="ai-response-container">
              <div className="ai-response-header">
                <span className="ai-response-badge">
                  <ShieldAlert size={14} /> Gemini 2.5 Flash Advisory Output
                </span>
                {onApplySuggestedEdit && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      onApplySuggestedEdit(response);
                      onClose();
                    }}
                  >
                    <CheckCircle2 size={14} /> Apply to User Notes
                  </button>
                )}
              </div>
              <div className="ai-response-body">
                <pre className="ai-response-text">{response}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
