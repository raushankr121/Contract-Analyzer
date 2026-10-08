import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ShieldAlert, 
  HelpCircle,
  FileCode
} from 'lucide-react';
import type { ContractVersion, OrganizationalPolicy } from '../types/contract';
import { 
  generateReviewedContractSummaryMarkdown, 
  downloadFile,
  LEGAL_DISCLAIMER_TEXT 
} from '../utils/summaryGenerator';
import { formatFriendlyDate, getDaysRemaining } from '../utils/deterministicDate';

interface ReviewedSummaryViewProps {
  version: ContractVersion;
  policy?: OrganizationalPolicy;
}

export const ReviewedSummaryView: React.FC<ReviewedSummaryViewProps> = ({
  version,
  policy,
}) => {
  const [copied, setCopied] = useState(false);

  const markdownContent = generateReviewedContractSummaryMarkdown(version, policy);

  const handleDownloadMarkdown = () => {
    downloadFile(
      markdownContent,
      `${version.fileName.replace(/\.[^/.]+$/, '')}_Reviewed_Summary.md`,
      'text/markdown'
    );
  };

  const handleDownloadJSON = () => {
    const exportData = {
      appInfo: {
        toolName: 'Contract Obligation and Renewal Assistant',
        disclaimer: LEGAL_DISCLAIMER_TEXT,
        exportedAt: new Date().toISOString(),
      },
      contractVersion: version,
      policyBenchmark: policy,
    };
    downloadFile(
      JSON.stringify(exportData, null, 2),
      `${version.fileName.replace(/\.[^/.]+$/, '')}_Audit_Export.json`,
      'application/json'
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const approvedObligations = (version?.obligations || []).filter((o) => o.status === 'APPROVED');
  const staleObligations = (version?.obligations || []).filter((o) => o.status === 'STALE');
  const daysUntilRenewal = version?.renewal?.deterministicRenewalDeadline ? getDaysRemaining(version.renewal.deterministicRenewalDeadline) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Action Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={22} style={{ color: 'var(--brand-gold-primary)' }} />
              Reviewed Contract Executive Summary
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Comprehensive operational summary ready for procurement sign-off, internal audit, and executive reporting.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
              {copied ? 'Copied Markdown' : 'Copy Markdown'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadMarkdown}>
              <Download size={14} /> Download .MD
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadJSON}>
              <FileCode size={14} /> Download JSON
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={14} /> Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Printable Executive Report Container */}
      <div className="card" style={{ padding: '2rem' }}>
        {/* Report Header */}
        <div style={{ borderBottom: '2px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="pill pill-confirmed" style={{ marginBottom: '0.45rem', display: 'inline-flex' }}>
                REVIEWED AUDIT SUMMARY
              </span>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                {version?.fileName || 'Contract'}
              </h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Version: <strong>{version?.versionLabel || 'v1.0'}</strong> | Audit Date: <strong>{formatFriendlyDate(version?.uploadedAt ? version.uploadedAt.split('T')[0] : '')}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                {approvedObligations.length} / {version?.obligations?.length || 0} Approved
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {staleObligations.length > 0 ? `⚠️ ${staleObligations.length} items flagged stale` : 'Zero stale clauses'}
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="disclaimer-banner" style={{ marginBottom: '1.75rem' }}>
          <ShieldAlert size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
              INFORMATION-MANAGEMENT TOOL NOTICE & DISCLAIMER
            </strong>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
              {LEGAL_DISCLAIMER_TEXT}
            </p>
          </div>
        </div>

        {/* Section 1: Parties & Dates */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-gold-light)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
            1. Contracting Parties & Baseline Dates
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Legal Entity & Jurisdiction</th>
                  <th>Verification Status</th>
                  <th>Contract Citation</th>
                </tr>
              </thead>
              <tbody>
                {(version?.parties || []).map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.role}</strong></td>
                    <td>{p.name} ({p.jurisdiction})</td>
                    <td><span className="pill pill-approved">{p.status}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{p.citation}</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Effective Date</strong></td>
                  <td>{formatFriendlyDate(version?.dates?.effectiveDate?.value || '')}</td>
                  <td><span className="pill pill-approved">{version?.dates?.effectiveDate?.status || 'PENDING'}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{version?.dates?.effectiveDate?.citation || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Initial Term</strong></td>
                  <td>{version?.dates?.initialTerm?.value || 'Unstated'}</td>
                  <td><span className="pill pill-approved">{version?.dates?.initialTerm?.status || 'PENDING'}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{version?.dates?.initialTerm?.citation || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Contract Expiration</strong></td>
                  <td>
                    {version?.dates?.expiryDate?.value &&
                    !version.dates.expiryDate.value.includes('Unstated') && 
                    !version.dates.expiryDate.value.includes('XXX')
                      ? `${formatFriendlyDate(version.dates.expiryDate.value)} (${getDaysRemaining(version.dates.expiryDate.value)} days remaining)`
                      : version?.dates?.expiryDate?.value || 'Unstated'}
                  </td>
                  <td><span className="pill pill-approved">{version?.dates?.expiryDate?.status || 'PENDING'}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{version?.dates?.expiryDate?.citation || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Renewal & Reminders */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-gold-light)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
            2. Deterministic Renewal & Termination Schedule
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>RENEWAL STRUCTURE</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                {version?.renewal?.type === 'NO_RENEWAL'
                  ? 'No Auto-Renewal Provision (Fixed Term)'
                  : version?.renewal?.type === 'AUTO_RENEWAL'
                  ? 'Automatic Rollover'
                  : 'Fixed Term'}{' '}
                ({version?.renewal?.renewalPeriodText || 'Fixed Term'})
              </div>
              <div style={{ fontSize: '0.8rem', color: (version?.renewal?.noticeWindowDays ?? 0) > 0 ? '#fbbf24' : '#94a3b8', marginTop: '0.4rem' }}>
                {(version?.renewal?.noticeWindowDays ?? 0) > 0
                  ? `Notice Window: ${version.renewal.noticeWindowDays} calendar days advance written notice`
                  : 'Notice Window: N/A (Contract is silent on renewal)'}
              </div>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>DETERMINISTIC DECISION DEADLINE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: !version?.renewal?.deterministicRenewalDeadline || version.renewal.deterministicRenewalDeadline === 'N/A' ? '#cbd5e1' : 'var(--brand-gold-light)', marginTop: '0.2rem' }}>
                {!version?.renewal?.deterministicRenewalDeadline || version.renewal.deterministicRenewalDeadline === 'N/A'
                  ? 'N/A — Not Mentioned in PDF'
                  : formatFriendlyDate(version.renewal.deterministicRenewalDeadline)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {!version?.renewal?.deterministicRenewalDeadline || version.renewal.deterministicRenewalDeadline === 'N/A'
                  ? 'Fixed-term services • Performance concludes on expiration'
                  : `${daysUntilRenewal} calendar days remaining`}
              </div>
            </div>
          </div>

          <div className="formula-box" style={{ marginBottom: '1rem' }}>
            <code>{version?.renewal?.calculationFormula || 'N/A'}</code>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
            <strong>Scheduled Reminder Triggers:</strong>
            {version?.renewal?.reminders && version.renewal.reminders.length > 0 ? (
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', lineHeight: 1.6 }}>
                {version.renewal.reminders.map((r) => (
                  <li key={r.id}>
                    <strong>{formatFriendlyDate(r.date)}:</strong> {r.label} — <em>{r.triggerDescription}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ marginTop: '0.35rem', color: '#94a3b8', fontStyle: 'italic' }}>
                No renewal reminder triggers scheduled (Contract has no renewal clause and no renewal date is specified in the PDF).
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Approved Key Obligations */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-gold-light)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
            3. Verified Operational Obligations ({approvedObligations.length})
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Obligation Title</th>
                  <th>Responsible Party</th>
                  <th>Target Date</th>
                  <th>Source Citation</th>
                </tr>
              </thead>
              <tbody>
                {approvedObligations.map((o) => (
                  <tr key={o.id}>
                    <td><span className="pill pill-pending" style={{ fontSize: '0.68rem' }}>{o.category}</span></td>
                    <td>
                      <strong>{o.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.description}</div>
                    </td>
                    <td><strong>{o.responsibleParty}</strong></td>
                    <td>{o.targetDate}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{o.citation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Identified Conflicts & AI Clarification Questions */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-gold-light)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
            4. Ambiguities, AI Clarification Questions & Policy Alignment
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(version?.conflicts || []).map((c, i) => (
              <div
                key={c.id}
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                    {i + 1}. {c.title}
                  </div>
                  <span className={`pill ${c.status === 'RESOLVED' ? 'pill-confirmed' : 'pill-uncertain'}`}>
                    {c.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  {c.description}
                </p>
                <div className="clarification-callout" style={{ marginTop: 0, padding: '0.5rem 0.75rem' }}>
                  <HelpCircle size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>AI Clarification Question:</strong> {c.clarificationQuestion}
                  </div>
                </div>
                {c.userResolutionNote && (
                  <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.4rem' }}>
                    <strong>✓ User Resolution:</strong> {c.userResolutionNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
