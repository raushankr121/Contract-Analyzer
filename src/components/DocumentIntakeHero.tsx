import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  BookOpen, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  ShieldAlert, 
  Loader2, 
  CalendarClock,
  HelpCircle,
  Layers,
  CheckCircle2,
  Shield,
  Clock
} from 'lucide-react';
import { parsePdf, parseDocx, parsePlainText } from '../utils/documentParser';
import { extractPolicyRules } from '../utils/contractExtractor';
import { 
  SAMPLE_CONTRACT_V1_TEXT, 
  SAMPLE_POLICY_TEXT 
} from '../utils/sampleContracts';
import type { OrganizationalPolicy } from '../types/contract';

interface DocumentIntakeHeroProps {
  onAnalyzeContract: (contractText: string, fileName: string, policy?: OrganizationalPolicy) => void;
}

export const DocumentIntakeHero: React.FC<DocumentIntakeHeroProps> = ({
  onAnalyzeContract,
}) => {
  // Contract input state
  const [contractInputType, setContractInputType] = useState<'FILE' | 'PASTE'>('FILE');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractText, setContractText] = useState('');
  const [contractTitle, setContractTitle] = useState('');

  // Policy input state (Optional)
  const [includePolicy, setIncludePolicy] = useState(true);
  const [policyInputType, setPolicyInputType] = useState<'FILE' | 'PASTE'>('FILE');
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [policyText, setPolicyText] = useState('');
  const [policyTitle, setPolicyTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setContractFile(file);
      setContractTitle(file.name);
      setError(null);
    }
  };

  const handlePolicyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPolicyFile(file);
      setPolicyTitle(file.name);
    }
  };

  const handleRunAnalysis = async () => {
    setError(null);
    setLoading(true);
    setLoadingStep('Ingesting document & extracting text...');

    try {
      let finalContractText = '';
      let effectiveContractName = contractTitle || 'Contract_Document.txt';

      // 1. Process Contract
      if (contractInputType === 'FILE') {
        if (!contractFile) {
          setError('Please select a contract document (PDF, DOCX, or TXT) to upload.');
          setLoading(false);
          return;
        }

        effectiveContractName = contractFile.name;
        const lower = contractFile.name.toLowerCase();

        if (lower.endsWith('.pdf')) {
          setLoadingStep('Parsing PDF pages via local document extractor...');
          const res = await parsePdf(contractFile, contractFile.name);
          finalContractText = res.text;
        } else if (lower.endsWith('.docx')) {
          setLoadingStep('Extracting DOCX XML content...');
          const res = await parseDocx(contractFile, contractFile.name);
          finalContractText = res.text;
        } else {
          setLoadingStep('Reading text content...');
          const raw = await contractFile.text();
          const res = parsePlainText(raw, contractFile.name);
          finalContractText = res.text;
        }
      } else {
        // Pasted contract text
        if (!contractText.trim()) {
          setError('Please paste the contract text into the input field before starting analysis.');
          setLoading(false);
          return;
        }
        finalContractText = contractText.trim();
        effectiveContractName = contractTitle.trim() || 'Pasted_Contract.txt';
      }

      if (!finalContractText.trim()) {
        setError('No readable text could be extracted from the document. Please ensure it is a text-based document.');
        setLoading(false);
        return;
      }

      // 2. Process Policy (if included)
      let finalPolicy: OrganizationalPolicy | undefined = undefined;
      if (includePolicy) {
        setLoadingStep('Parsing organizational policy benchmark rules...');
        let policyRaw = '';
        let effectivePolicyName = policyTitle || 'Organizational_Policy.txt';

        if (policyInputType === 'FILE') {
          if (policyFile) {
            effectivePolicyName = policyFile.name;
            const lowerP = policyFile.name.toLowerCase();
            if (lowerP.endsWith('.pdf')) {
              const resP = await parsePdf(policyFile, policyFile.name);
              policyRaw = resP.text;
            } else if (lowerP.endsWith('.docx')) {
              const resP = await parseDocx(policyFile, policyFile.name);
              policyRaw = resP.text;
            } else {
              policyRaw = await policyFile.text();
            }
          }
        } else {
          policyRaw = policyText.trim();
        }

        if (!policyRaw.trim() && !policyFile) {
          policyRaw = SAMPLE_POLICY_TEXT;
          effectivePolicyName = 'Apex_Procurement_Policy_v3.2.txt';
        }

        if (policyRaw.trim()) {
          finalPolicy = extractPolicyRules(policyRaw, effectivePolicyName);
        }
      }

      setLoadingStep('Identifying parties, dates, renewal clauses & obligations...');
      await new Promise((resolve) => setTimeout(resolve, 350));

      onAnalyzeContract(finalContractText, effectiveContractName, finalPolicy);
      setLoading(false);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(`Extraction failed: ${err.message || 'Error parsing document'}`);
      setLoading(false);
    }
  };

  const handleQuickLoadDemo = () => {
    const policyObj = extractPolicyRules(SAMPLE_POLICY_TEXT, 'Apex_Procurement_Policy_v3.2.txt');
    onAnalyzeContract(SAMPLE_CONTRACT_V1_TEXT, 'Master_Enterprise_Agreement_v1.0.txt', policyObj);
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0.75rem auto 3rem auto' }}>
      {/* Executive Split Card (Directly inspired by Corporate Executive Contract Specification) */}
      <div className="executive-split-card">
        {/* LEFT PANEL: Deep Executive Slate Teal */}
        <div className="split-panel-slate">
          <div>
            {/* Gold Monogram Emblem mirroring reference logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div className="gold-roundel" style={{ width: '46px', height: '46px', fontSize: '1.2rem' }}>
                CA
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--brand-gold-light)', textTransform: 'uppercase' }}>
                  FANTASY CONTRACT SUITE
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Deterministic Obligations & Renewal Governance
                </div>
              </div>
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '0.85rem', textTransform: 'uppercase' }}>
              CONTRACT OBLIGATION & RENEWAL SYSTEM
            </h1>

            <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.55, marginBottom: '1.5rem' }}>
              Enterprise document intake for text-based PDF, DOCX, or pasted contracts. Automatically extracts parties, dates, renewal clauses, and key obligations with exact verbatim source section citations.
            </p>

            {/* Angular Chevron Accent Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', opacity: 0.85 }}>
              <div style={{ height: '2px', background: 'linear-gradient(90deg, #d4b26f 0%, transparent 100%)', flex: 1 }} />
              <span className="chevron-accent">◄ ▲ ►</span>
              <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, #223847 100%)', width: '30px' }} />
            </div>

            {/* Capabilities Specs List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.82rem', color: '#f1f5f9' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--brand-gold-primary)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong style={{ color: 'var(--brand-gold-light)' }}>Deterministic Notice Engine:</strong> Automatic reminder dates ($T-90, T-60, T-30, T-14, T-7$) to prevent unwanted automatic renewals.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.82rem', color: '#f1f5f9' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--brand-gold-primary)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong style={{ color: 'var(--brand-gold-light)' }}>Verbatim Citations:</strong> Quotes exact contract clauses and cites source sections behind every extracted term.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.82rem', color: '#f1f5f9' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--brand-gold-primary)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong style={{ color: 'var(--brand-gold-light)' }}>Policy Discrepancy Audit:</strong> Cross-checks notice windows, payment terms, and liability limits vs your procurement rules.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.82rem', color: '#f1f5f9' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--brand-gold-primary)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong style={{ color: 'var(--brand-gold-light)' }}>Version Reconciliation:</strong> Preserves approvals across contract amendments and marks altered clauses as Potentially Stale.
                </span>
              </div>
            </div>
          </div>

          {/* Quick 1-Click Evaluation Card */}
          <div style={{ background: 'rgba(12, 21, 28, 0.7)', border: '1px solid rgba(212, 178, 111, 0.28)', borderRadius: '10px', padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
              <Sparkles size={15} style={{ color: 'var(--brand-gold-light)' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                Instant Evaluation Demo
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              Want to test the extraction and audit workflow immediately? Load our pre-configured enterprise SaaS contract and procurement policy in 1 click.
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleQuickLoadDemo}
              style={{ width: '100%', fontSize: '0.82rem', borderColor: 'rgba(212, 178, 111, 0.4)', color: 'var(--brand-gold-light)' }}
            >
              <Sparkles size={13} />
              ⚡ Load Demo SaaS Contract (1-Click)
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Intake Specification Dropzone & Settings */}
        <div className="split-panel-sand">
          <div>
            {/* Dark Ribbon Banner Header mirroring the "Client" banner in reference image */}
            <div className="dark-ribbon-header">
              <span>DOCUMENT INTAKE SPECIFICATION</span>
              <span className="chevron-accent">◄ ▲ ►</span>
            </div>

            {/* Error Notice */}
            {error && (
              <div
                style={{
                  background: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  color: '#f87171',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* 1. CONTRACT DOCUMENT INPUT */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Contract Document <span style={{ color: '#ef4444' }}>*</span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${contractInputType === 'FILE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setContractInputType('FILE')}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    <Upload size={12} />
                    File Upload
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${contractInputType === 'PASTE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setContractInputType('PASTE')}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    <FileText size={12} />
                    Paste Text
                  </button>
                </div>
              </div>

              {contractInputType === 'FILE' ? (
                <div>
                  <div
                    style={{
                      border: '2px dashed rgba(212, 178, 111, 0.35)',
                      borderRadius: '10px',
                      padding: '1.75rem 1.25rem',
                      textAlign: 'center',
                      background: 'rgba(12, 21, 28, 0.75)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => document.getElementById('contract-file-input')?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--brand-gold-primary)'; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(212, 178, 111, 0.35)'; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = 'rgba(212, 178, 111, 0.35)';
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setContractFile(e.dataTransfer.files[0]);
                        setContractTitle(e.dataTransfer.files[0].name);
                        setError(null);
                      }
                    }}
                  >
                    <Upload size={32} style={{ color: 'var(--brand-gold-light)', margin: '0 auto 0.5rem auto' }} />
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem' }}>
                      {contractFile ? contractFile.name : 'Click to Browse or Drag & Drop Contract'}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Supports text-based PDF (.pdf), Word (.docx), Plain Text (.txt, .md)
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '0.75rem' }}>
                      <span className="pill pill-confirmed" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>.PDF</span>
                      <span className="pill pill-confirmed" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>.DOCX</span>
                      <span className="pill pill-confirmed" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>.TXT</span>
                    </div>
                    <input
                      id="contract-file-input"
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={handleContractFileChange}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {contractFile && (
                    <div className="file-selected-box" style={{ marginTop: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff' }}>
                            {contractFile.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {(contractFile.size / 1024).toFixed(1)} KB • Document verified & ready
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => document.getElementById('contract-file-input')?.click()}
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Document Title (e.g. Master_Agreement.txt)"
                    value={contractTitle}
                    onChange={(e) => setContractTitle(e.target.value)}
                    style={{ marginBottom: '0.6rem', fontSize: '0.85rem' }}
                  />
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="Paste full contract text here (including parties, effective date, renewal, termination, and obligations clauses)..."
                    value={contractText}
                    onChange={(e) => setContractText(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
              )}
            </div>

            {/* 2. OPTIONAL ORGANIZATIONAL POLICY SECTION */}
            <div style={{ background: 'rgba(12, 21, 28, 0.65)', border: '1px solid rgba(212, 178, 111, 0.22)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: '#ffffff', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={includePolicy}
                    onChange={(e) => setIncludePolicy(e.target.checked)}
                    style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--brand-gold-primary)' }}
                  />
                  <span>Policy Compliance Benchmark</span>
                  <span className="gold-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>Recommended</span>
                </label>
              </div>

              {includePolicy && (
                <div style={{ marginTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                  <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '0.65rem' }}>
                    Cross-audits contract clauses against corporate standards (such as notice &ge; 90 days, payment terms, liability caps).
                  </p>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span className="policy-rule-chip" style={{ fontSize: '0.7rem' }}>
                      <Clock size={11} style={{ color: 'var(--brand-gold-light)' }} />
                      90d Renewal Notice
                    </span>
                    <span className="policy-rule-chip" style={{ fontSize: '0.7rem' }}>
                      <Shield size={11} style={{ color: '#38bdf8' }} />
                      Net 60 Payment
                    </span>
                    <span className="policy-rule-chip" style={{ fontSize: '0.7rem' }}>
                      <ShieldAlert size={11} style={{ color: '#f59e0b' }} />
                      $5M Cyber / E&O
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${policyInputType === 'FILE' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPolicyInputType('FILE')}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    >
                      Custom Policy File
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${policyInputType === 'PASTE' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPolicyInputType('PASTE')}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    >
                      Paste Policy Text
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setPolicyText(SAMPLE_POLICY_TEXT);
                        setPolicyTitle('Apex_Procurement_Policy_v3.2.txt');
                        setPolicyInputType('PASTE');
                      }}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    >
                      Use Standard Policy
                    </button>
                  </div>

                  {policyInputType === 'FILE' && (
                    <div
                      style={{
                        border: '1px dashed rgba(212, 178, 111, 0.25)',
                        borderRadius: '6px',
                        padding: '0.85rem',
                        textAlign: 'center',
                        background: 'rgba(11, 17, 32, 0.5)',
                        cursor: 'pointer',
                        marginTop: '0.65rem',
                      }}
                      onClick={() => document.getElementById('policy-file-input')?.click()}
                    >
                      <BookOpen size={18} style={{ color: 'var(--brand-gold-light)', margin: '0 auto 0.25rem auto' }} />
                      <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                        {policyFile ? policyFile.name : 'Select Custom Policy (.pdf, .docx, .txt)'}
                      </div>
                      <input
                        id="policy-file-input"
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handlePolicyFileChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Primary CTA Submit Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRunAnalysis}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.95rem 1.5rem',
              fontSize: '0.96rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{loadingStep || 'Analyzing Document...'}</span>
              </>
            ) : (
              <>
                <span>ANALYZE CONTRACT & EXTRACT OBLIGATIONS</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Feature Bento Specification Cards */}
      <div className="hero-features-grid">
        <div className="hero-feature-card">
          <div className="hero-feature-icon">
            <CalendarClock size={18} />
          </div>
          <div className="hero-feature-title">Deterministic Reminders</div>
          <div className="hero-feature-desc">
            Exact notice calculation ($T-90, T-60, T-30, T-14, T-7, T-1$ days) based strictly on explicit contract terms to prevent rollover.
          </div>
        </div>

        <div className="hero-feature-card">
          <div className="hero-feature-icon">
            <CheckCircle2 size={18} />
          </div>
          <div className="hero-feature-title">Source Citations</div>
          <div className="hero-feature-desc">
            Every extracted party, date, and operational obligation cites its exact verbatim contract section for human verification.
          </div>
        </div>

        <div className="hero-feature-card">
          <div className="hero-feature-icon">
            <HelpCircle size={18} />
          </div>
          <div className="hero-feature-title">Clarification Questions</div>
          <div className="hero-feature-desc">
            Flags missing dates, placeholder blanks ('XXX'), and drafts targeted clarification questions for legal counsel review.
          </div>
        </div>

        <div className="hero-feature-card">
          <div className="hero-feature-icon">
            <Layers size={18} />
          </div>
          <div className="hero-feature-title">Version Staleness</div>
          <div className="hero-feature-desc">
            Preserves human approvals when amendments are uploaded, highlighting altered clauses as Potentially Stale.
          </div>
        </div>
      </div>

      {/* Legal Notice Pill */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.95rem',
            borderRadius: '9999px',
            background: 'rgba(212, 178, 111, 0.12)',
            border: '1px solid rgba(212, 178, 111, 0.35)',
            color: 'var(--brand-gold-light)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <ShieldAlert size={14} />
          <span>Information-Management Tool • Does Not Provide Legal Advice</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentIntakeHero;
