import React from 'react';
import { 
  Users, 
  Calendar, 
  RefreshCw, 
  XCircle, 
  Mail, 
  ListChecks, 
  Check, 
  X, 
  Edit3, 
  HelpCircle, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import type { 
  ContractVersion, 
  ReviewStatus 
} from '../types/contract';
import { formatFriendlyDate } from '../utils/deterministicDate';

interface ExtractionWorkbenchProps {
  version: ContractVersion;
  onUpdatePartyStatus: (partyId: string, status: ReviewStatus) => void;
  onUpdateDateStatus: (dateField: 'effectiveDate' | 'initialTerm' | 'expiryDate', status: ReviewStatus) => void;
  onUpdateRenewalStatus: (status: ReviewStatus) => void;
  onUpdateTerminationStatus: (status: ReviewStatus) => void;
  onUpdateNoticeStatus: (status: ReviewStatus) => void;
  onUpdateObligationStatus: (obligationId: string, status: ReviewStatus) => void;
  onOpenEditModal: (item: any, type: string) => void;
  onApproveAllPending: () => void;
  onOpenSetDates?: () => void;
  onOpenAiConsult?: (title: string, quote: string) => void;
}

export const ExtractionWorkbench: React.FC<ExtractionWorkbenchProps> = ({
  version,
  onUpdatePartyStatus,
  onUpdateDateStatus,
  onUpdateRenewalStatus,
  onUpdateTerminationStatus,
  onUpdateNoticeStatus,
  onUpdateObligationStatus,
  onOpenEditModal,
  onApproveAllPending,
  onOpenSetDates,
  onOpenAiConsult,
}) => {
  const renderStatusBadge = (status: ReviewStatus, staleReason?: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="pill pill-approved"><Check size={11} /> Approved</span>;
      case 'REJECTED':
        return <span className="pill pill-rejected"><X size={11} /> Rejected</span>;
      case 'EDITED':
        return <span className="pill pill-edited"><Edit3 size={11} /> User Edited</span>;
      case 'STALE':
        return (
          <span className="pill pill-stale" title={staleReason || 'Clause changed in new version'}>
            <RotateCcw size={11} /> Potentially Stale
          </span>
        );
      case 'PENDING':
      default:
        return <span className="pill pill-pending"><Clock size={11} /> Pending Review</span>;
    }
  };

  const renderCertaintyBadge = (certainty: 'CONFIRMED' | 'UNCERTAIN_INTERPRETATION') => {
    if (certainty === 'CONFIRMED') {
      return (
        <span className="pill pill-confirmed" title="Explicit, unambiguous term directly stated in contract text">
          <ShieldCheck size={11} /> Confirmed Fact
        </span>
      );
    }
    return (
      <span className="pill pill-uncertain" title="Inferred, conditional, or ambiguous interpretation requiring human confirmation">
        <AlertCircle size={11} /> Uncertain Interpretation
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Quick Bulk Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(22,38,51,0.7)', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
            <ListChecks size={18} style={{ color: 'var(--brand-gold-primary)' }} />
            Contract Extraction & Verification Workbench
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Review, edit, approve, or reject each extracted term. Every item links to its verbatim contract source section.
          </p>
        </div>

        <button className="btn btn-outline-success btn-sm" onClick={onApproveAllPending}>
          <Check size={14} />
          Approve All Pending / Stale Items
        </button>
      </div>

      {/* Visual Guide & Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'rgba(18, 33, 44, 0.6)',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', color: 'var(--text-muted)' }}>
          <strong style={{ color: '#fff' }}>Quick Legend:</strong>
          <span className="pill pill-confirmed" style={{ fontSize: '0.7rem' }}>
            <ShieldCheck size={11} /> Confirmed Fact
          </span>
          <span className="pill pill-uncertain" style={{ fontSize: '0.7rem' }}>
            <AlertCircle size={11} /> Uncertain Interpretation
          </span>
          <span className="pill pill-stale" style={{ fontSize: '0.7rem' }}>
            <RotateCcw size={11} /> Potentially Stale
          </span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          💡 <em>Click <strong>Approve</strong>, <strong>Reject</strong>, or <strong>Edit</strong> to record verification decisions.</em>
        </div>
      </div>

      {/* 1. CONTRACT PARTIES */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users size={20} style={{ color: 'var(--brand-gold-light)' }} />
            Contract Parties & Corporate Entities
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            2 verified legal entities
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Role & Entity Name</th>
                <th style={{ width: '25%' }}>Corporate Jurisdiction & Address</th>
                <th style={{ width: '20%' }}>Certainty & Source Section</th>
                <th style={{ width: '15%' }}>Review Status</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {version.parties.map((party) => (
                <tr key={party.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{party.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-gold-light)', fontWeight: 600 }}>{party.role}</div>
                    {party.userCorrection && (
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                        ✏️ User note: {party.userCorrection}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{party.jurisdiction || 'N/A'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{party.address || 'N/A'}</div>
                  </td>
                  <td>
                    <div style={{ marginBottom: '0.35rem' }}>
                      {renderCertaintyBadge(party.certainty)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-gold-light)', fontFamily: 'var(--font-mono)' }}>
                      {party.citation}
                    </div>
                  </td>
                  <td>
                    {renderStatusBadge(party.status, party.staleReason)}
                    {party.status === 'STALE' && party.staleReason && (
                      <div style={{ fontSize: '0.72rem', color: '#f472b6', marginTop: '0.25rem' }}>
                        {party.staleReason}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-btn-group">
                      {party.status !== 'APPROVED' ? (
                        <button
                          className="btn btn-outline-success btn-sm"
                          onClick={() => onUpdatePartyStatus(party.id, 'APPROVED')}
                          title="Approve extracted party"
                        >
                          <Check size={12} /> Approve
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => onUpdatePartyStatus(party.id, 'REJECTED')}
                          title="Reject"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenEditModal(party, 'PARTY')}
                        title="Edit entity details"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. CORE CONTRACT DATES & TERM */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Calendar size={20} style={{ color: '#06b6d4' }} />
            Effective Date, Initial Term & Expiration
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {onOpenSetDates && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onOpenSetDates}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                ⚡ Set Operational Dates
              </button>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Baseline term parameters
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {/* Effective Date Card */}
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Effective Date</span>
              {renderStatusBadge(version.dates.effectiveDate.status, version.dates.effectiveDate.staleReason)}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
              {formatFriendlyDate(version.dates.effectiveDate.value)}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              {renderCertaintyBadge(version.dates.effectiveDate.certainty)}
            </div>
            <div className="citation-box">
              <div className="citation-header">{version.dates.effectiveDate.citation}</div>
              <div className="citation-quote">"{version.dates.effectiveDate.exactQuote}"</div>
            </div>
            {version.dates.effectiveDate.clarificationQuestion && (
              <div className="clarification-callout" style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
                <HelpCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div>{version.dates.effectiveDate.clarificationQuestion}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.75rem' }}>
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => onUpdateDateStatus('effectiveDate', 'APPROVED')}
              >
                <Check size={12} /> Approve
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenEditModal(version.dates.effectiveDate, 'DATE_EFFECTIVE')}
              >
                <Edit3 size={12} /> Edit
              </button>
            </div>
          </div>

          {/* Initial Term Card */}
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Initial Term Duration</span>
              {renderStatusBadge(version.dates.initialTerm.status, version.dates.initialTerm.staleReason)}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
              {version.dates.initialTerm.value}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              {renderCertaintyBadge(version.dates.initialTerm.certainty)}
            </div>
            <div className="citation-box">
              <div className="citation-header">{version.dates.initialTerm.citation}</div>
              <div className="citation-quote">"{version.dates.initialTerm.exactQuote}"</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.75rem' }}>
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => onUpdateDateStatus('initialTerm', 'APPROVED')}
              >
                <Check size={12} /> Approve
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenEditModal(version.dates.initialTerm, 'DATE_TERM')}
              >
                <Edit3 size={12} /> Edit
              </button>
            </div>
          </div>

          {/* Expiry Date Card */}
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Expiration Date</span>
              {renderStatusBadge(version.dates.expiryDate.status, version.dates.expiryDate.staleReason)}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.35rem' }}>
              {formatFriendlyDate(version.dates.expiryDate.value)}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              {renderCertaintyBadge(version.dates.expiryDate.certainty)}
            </div>
            <div className="citation-box">
              <div className="citation-header">{version.dates.expiryDate.citation}</div>
              <div className="citation-quote">"{version.dates.expiryDate.exactQuote}"</div>
            </div>
            {version.dates.expiryDate.clarificationQuestion && (
              <div className="clarification-callout" style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
                <HelpCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div>{version.dates.expiryDate.clarificationQuestion}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.75rem' }}>
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => onUpdateDateStatus('expiryDate', 'APPROVED')}
              >
                <Check size={12} /> Approve
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenEditModal(version.dates.expiryDate, 'DATE_EXPIRY')}
              >
                <Edit3 size={12} /> Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RENEWAL CLAUSE & DETERMINISTIC CUTOFF */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <RefreshCw size={20} style={{ color: '#a855f7' }} />
            Renewal Clause & Deterministic Calculation
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {renderCertaintyBadge(version.renewal.certainty)}
            {renderStatusBadge(version.renewal.status, version.renewal.staleReason)}
          </div>
        </div>

        {version.renewal.status === 'STALE' && (
          <div className="stale-warning-callout">
            <AlertCircle size={18} style={{ color: '#f472b6', flexShrink: 0 }} />
            <div>
              <strong>Clause Modified in New Version ({version.versionLabel}):</strong> {version.renewal.staleReason}
              <br />
              <span style={{ fontSize: '0.76rem' }}>Previously approved terms are now marked potentially stale. Please verify before re-approving.</span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Renewal Structure
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                {version.renewal.type === 'NO_RENEWAL'
                  ? 'No Auto-Renewal Provision (Fixed Term)'
                  : version.renewal.type === 'AUTO_RENEWAL'
                  ? 'Automatic Rollover'
                  : 'Fixed Term'}{' '}
                ({version.renewal.renewalPeriodText})
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Required Notice Window
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: version.renewal.noticeWindowDays > 0 ? '#fbbf24' : '#94a3b8', marginTop: '0.2rem' }}>
                {version.renewal.noticeWindowDays > 0
                  ? `${version.renewal.noticeWindowDays} calendar days advance written notice prior to expiration`
                  : 'None specified (Document is silent on renewal notice)'}
              </div>
            </div>

            {version.renewal.priceCapOrAdjustment && (
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Price Cap / Fee Adjustment Terms
                </span>
                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                  {version.renewal.priceCapOrAdjustment}
                </div>
              </div>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Deterministic Non-Renewal Decision Deadline
            </span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: version.renewal.deterministicRenewalDeadline === 'N/A' ? '#cbd5e1' : '#a5b4fc', marginTop: '0.25rem' }}>
              {version.renewal.deterministicRenewalDeadline === 'N/A'
                ? 'N/A — Not Mentioned in PDF'
                : formatFriendlyDate(version.renewal.deterministicRenewalDeadline)}
            </div>

            <div className="formula-box">
              <code>{version.renewal.calculationFormula}</code>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {version.renewal.type === 'NO_RENEWAL' || version.renewal.deterministicRenewalDeadline === 'N/A'
                ? 'The uploaded contract does not contain a renewal clause or renewal date. Performance concludes on contract expiration unless extended by written amendment.'
                : 'Notice must be delivered on or prior to this date to prevent automatic commercial commitment.'}
            </div>
          </div>
        </div>

        {/* Source Citation */}
        <div className="citation-box" style={{ marginTop: '1rem' }}>
          <div className="citation-header">{version.renewal.citation}</div>
          <div className="citation-quote">"{version.renewal.exactQuote}"</div>
        </div>

        {/* Ambiguity Clarification Question */}
        {version.renewal.clarificationQuestion && (
          <div className="clarification-callout">
            <HelpCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <strong>Clarification Question for Ambiguous Clause:</strong>
              <div style={{ marginTop: '0.2rem' }}>{version.renewal.clarificationQuestion}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {onOpenAiConsult && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenAiConsult('Renewal Clause', version.renewal.exactQuote || version.renewal.renewalPeriodText)}
              title="Consult Gemini AI Agent on renewal risk"
              style={{ color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.4)' }}
            >
              <Sparkles size={12} /> AI Advisor
            </button>
          )}
          <button
            className="btn btn-outline-success btn-sm"
            onClick={() => onUpdateRenewalStatus('APPROVED')}
          >
            <Check size={13} /> {version.renewal.status === 'STALE' ? 'Re-Approve Updated Renewal Terms' : 'Approve Clause'}
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => onUpdateRenewalStatus('REJECTED')}
          >
            <X size={13} /> Reject
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenEditModal(version.renewal, 'RENEWAL')}
          >
            <Edit3 size={13} /> Edit Terms
          </button>
        </div>
      </div>

      {/* 4. TERMINATION & NOTICE CLAUSES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.25rem' }}>
        {/* Termination Clause */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <XCircle size={19} style={{ color: '#ef4444' }} />
              Termination Framework
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renderCertaintyBadge(version.termination.certainty)}
              {renderStatusBadge(version.termination.status, version.termination.staleReason)}
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.75rem', lineHeight: 1.6 }}>
            <div>
              <strong>Termination for Convenience:</strong>{' '}
              {version.termination.hasConvenienceTermination
                ? `Permitted (${version.termination.convenienceNoticeDays} days advance notice)`
                : 'Not Permitted'}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {version.termination.convenienceConditions}
              </div>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Termination for Cause:</strong> Cure period of {version.termination.causeCurePeriodDays} calendar days upon written notice of breach.
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Post-Termination Assistance:</strong> Data transition assistance for up to {version.termination.postTerminationTransitionDays || 60} days.
            </div>
          </div>

          <div className="citation-box">
            <div className="citation-header">{version.termination.citation}</div>
            <div className="citation-quote">"{version.termination.exactQuote}"</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
            {onOpenAiConsult && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenAiConsult('Termination Clause', version.termination.exactQuote)}
                title="Consult Gemini AI Agent on termination risk"
                style={{ color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.4)' }}
              >
                <Sparkles size={12} /> AI Advisor
              </button>
            )}
            <button
              className="btn btn-outline-success btn-sm"
              onClick={() => onUpdateTerminationStatus('APPROVED')}
            >
              <Check size={12} /> Approve
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenEditModal(version.termination, 'TERMINATION')}
            >
              <Edit3 size={12} /> Edit
            </button>
          </div>
        </div>

        {/* Notice Clause */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Mail size={19} style={{ color: '#38bdf8' }} />
              Formal Notice Requirements
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renderCertaintyBadge(version.notice.certainty)}
              {renderStatusBadge(version.notice.status, version.notice.staleReason)}
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.75rem', lineHeight: 1.6 }}>
            <div>
              <strong>Permitted Methods:</strong> {version.notice.permittedMethods.join(', ')}
            </div>
            {version.notice.restrictedMethods && version.notice.restrictedMethods.length > 0 && (
              <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                ⚠️ Restriction: {version.notice.restrictedMethods.join(', ')}
              </div>
            )}
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem' }}>
              <strong>Recipient:</strong> {version.notice.designatedRecipient}
            </div>
            <div style={{ marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <strong>Deemed Received:</strong> {version.notice.deemedReceivedDays} business days after mailing
            </div>
          </div>

          <div className="citation-box">
            <div className="citation-header">{version.notice.citation}</div>
            <div className="citation-quote">"{version.notice.exactQuote}"</div>
          </div>

          {version.notice.clarificationQuestion && (
            <div className="clarification-callout">
              <HelpCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div style={{ fontSize: '0.78rem' }}>
                <strong>Ambiguity Flag:</strong> {version.notice.clarificationQuestion}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
            {onOpenAiConsult && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenAiConsult('Notice Clause', version.notice.exactQuote)}
                title="Consult Gemini AI Agent on notice requirements"
                style={{ color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.4)' }}
              >
                <Sparkles size={12} /> AI Advisor
              </button>
            )}
            <button
              className="btn btn-outline-success btn-sm"
              onClick={() => onUpdateNoticeStatus('APPROVED')}
            >
              <Check size={12} /> Approve
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenEditModal(version.notice, 'NOTICE')}
            >
              <Edit3 size={12} /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* 5. KEY OBLIGATIONS TABLE */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ListChecks size={20} style={{ color: '#10b981' }} />
            Key Contract Obligations, Deadlines & Responsible Parties
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {version.obligations.length} total operational obligations extracted
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Obligation & Responsible Party</th>
                <th style={{ width: '13%' }}>Category & Recurrence</th>
                <th style={{ width: '18%' }}>Target Deadline & Reminder</th>
                <th style={{ width: '18%' }}>Certainty & Exact Citation</th>
                <th style={{ width: '12%' }}>Review Status</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {version.obligations.map((item) => (
                <tr key={item.id} style={{ background: item.status === 'STALE' ? 'rgba(236,72,153,0.06)' : undefined }}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      {item.description}
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.responsibleParty === 'Vendor' ? 'var(--brand-gold-light)' : '#34d399', background: 'rgba(212, 178, 111, 0.1)', border: '1px solid rgba(212, 178, 111, 0.25)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        Party: {item.responsibleParty}
                      </span>
                      {item.curePeriodDays !== undefined && item.curePeriodDays > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Cure: {item.curePeriodDays}d
                        </span>
                      )}
                    </div>
                    {item.userNotes && (
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.25rem' }}>
                        📝 {item.userNotes}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="pill pill-pending" style={{ fontSize: '0.7rem' }}>
                      {item.category}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {item.recurrence}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.82rem' }}>
                      {item.targetDate}
                    </div>
                    {item.dateCalculationMethod && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--brand-gold-light)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                        {item.dateCalculationMethod}
                      </div>
                    )}
                    {item.reminders && item.reminders.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#34d399', marginTop: '0.25rem' }}>
                        🔔 {item.reminders[0].label} ({formatFriendlyDate(item.reminders[0].date)})
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ marginBottom: '0.3rem' }}>
                      {renderCertaintyBadge(item.certainty)}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--brand-gold-light)', fontFamily: 'var(--font-mono)' }}>
                      {item.citation}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.2rem', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      "{item.exactQuote}"
                    </div>
                    {item.clarificationQuestion && (
                      <div style={{ fontSize: '0.74rem', color: '#fbbf24', marginTop: '0.35rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.35rem 0.55rem', borderRadius: '6px' }}>
                        <strong>❓ Question for Counsel:</strong> {item.clarificationQuestion}
                      </div>
                    )}
                  </td>
                  <td>
                    {renderStatusBadge(item.status, item.staleReason)}
                    {item.status === 'STALE' && item.staleReason && (
                      <div style={{ fontSize: '0.72rem', color: '#f472b6', marginTop: '0.25rem' }}>
                        {item.staleReason}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-btn-group">
                      {onOpenAiConsult && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenAiConsult(item.title, item.exactQuote || item.description)}
                          title="Consult Gemini AI Agent on this obligation"
                          style={{ color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                        >
                          <Sparkles size={12} />
                        </button>
                      )}
                      {item.status !== 'APPROVED' ? (
                        <button
                          className="btn btn-outline-success btn-sm"
                          onClick={() => onUpdateObligationStatus(item.id, 'APPROVED')}
                          title={item.status === 'STALE' ? 'Re-approve updated obligation' : 'Approve obligation'}
                        >
                          <Check size={12} /> {item.status === 'STALE' ? 'Re-Approve' : 'Approve'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => onUpdateObligationStatus(item.id, 'REJECTED')}
                          title="Reject obligation"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenEditModal(item, 'OBLIGATION')}
                        title="Edit obligation parameters"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
