import React from 'react';
import { 
  CalendarClock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
} from 'lucide-react';
import type { ContractVersion, OrganizationalPolicy } from '../types/contract';
import { getDaysRemaining, formatFriendlyDate } from '../utils/deterministicDate';

interface StatCardsProps {
  version: ContractVersion;
  policy?: OrganizationalPolicy;
  onOpenSetDates?: () => void;
  onOpenEditRenewal?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ 
  version, 
  policy,
  onOpenSetDates,
  onOpenEditRenewal,
}) => {
  const hasNoRenewal = 
    version.renewal.type === 'NO_RENEWAL' ||
    !version.renewal.deterministicRenewalDeadline ||
    version.renewal.deterministicRenewalDeadline === 'N/A' ||
    version.renewal.deterministicRenewalDeadline.includes('Unstated');

  const daysUntilRenewalDeadline = hasNoRenewal ? 0 : getDaysRemaining(version.renewal.deterministicRenewalDeadline);

  const isExpiryValid = 
    !version.dates.expiryDate.value.includes('Unstated') && 
    !version.dates.expiryDate.value.includes('XXX');
  const daysUntilExpiry = isExpiryValid ? getDaysRemaining(version.dates.expiryDate.value) : null;

  const totalObligations = version.obligations.length;
  const approvedObligations = version.obligations.filter((o) => o.status === 'APPROVED').length;
  const pendingObligations = version.obligations.filter((o) => o.status === 'PENDING').length;
  const staleObligations = version.obligations.filter((o) => o.status === 'STALE').length;

  const openConflicts = version.conflicts.filter((c) => c.status === 'OPEN').length;
  const policyViolations = version.conflicts.filter((c) => c.conflictType === 'POLICY_VIOLATION' && c.status === 'OPEN').length;

  return (
    <div className="stats-grid">
      {/* 1. Renewal Cutoff Countdown */}
      <div className="stat-card" style={{ borderTop: hasNoRenewal ? '3px solid #64748b' : '3px solid var(--brand-gold-primary)' }}>
        <div className="stat-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="chevron-accent">▲</span>
            <span>{hasNoRenewal ? 'Renewal Status' : 'Renewal Cutoff'}</span>
          </div>
          <CalendarClock size={16} style={{ color: hasNoRenewal ? '#94a3b8' : 'var(--brand-gold-light)' }} />
        </div>
        <div className="stat-card-value">
          {hasNoRenewal ? (
            <>
              <span style={{ color: '#cbd5e1', fontSize: '1.3rem', fontWeight: 700 }}>
                No Auto-Renewal
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                fixed term
              </span>
            </>
          ) : (
            <>
              <span style={{ color: daysUntilRenewalDeadline <= 30 ? '#f59e0b' : 'var(--brand-gold-light)' }}>
                {daysUntilRenewalDeadline > 0 ? `${daysUntilRenewalDeadline}d` : `${Math.abs(daysUntilRenewalDeadline)}d ago`}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                countdown
              </span>
            </>
          )}
        </div>
        <div className="stat-card-subtext">
          {hasNoRenewal ? (
            <div>
              <span style={{ color: '#fcd34d', fontWeight: 600 }}>Date not mentioned in PDF</span>
              <br />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Fixed performance period • No renewal rollover clause
              </span>
              {onOpenEditRenewal && (
                <div style={{ marginTop: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={onOpenEditRenewal}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(212, 178, 111, 0.4)' }}
                  >
                    Configure Renewal Terms
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <strong style={{ color: 'var(--brand-gold-light)' }}>Cutoff:</strong> {formatFriendlyDate(version.renewal.deterministicRenewalDeadline)}
              <br />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                ({version.renewal.noticeWindowDays}d notice required before {version.dates.expiryDate.value})
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. Obligations Review Progress */}
      <div className="stat-card" style={{ borderTop: staleObligations > 0 ? '3px solid var(--color-stale)' : '3px solid var(--color-success)' }}>
        <div className="stat-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="chevron-accent" style={{ color: staleObligations > 0 ? '#f43f5e' : '#34d399' }}>▲</span>
            <span>Obligations Verified</span>
          </div>
          <CheckCircle2 size={16} style={{ color: staleObligations > 0 ? '#f43f5e' : '#34d399' }} />
        </div>
        <div className="stat-card-value">
          <span style={{ color: '#ffffff' }}>{approvedObligations}/{totalObligations}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
            {Math.round((approvedObligations / (totalObligations || 1)) * 100)}% verified
          </span>
        </div>
        <div className="stat-card-subtext">
          {staleObligations > 0 ? (
            <span style={{ color: '#f43f5e', fontWeight: 700 }}>
              ⚠️ {staleObligations} item{staleObligations > 1 ? 's' : ''} POTENTIALLY STALE (Version changed)
            </span>
          ) : (
            <span>
              {pendingObligations} pending review • {totalObligations - approvedObligations - pendingObligations} other
            </span>
          )}
        </div>
      </div>

      {/* 3. Contract Term & Expiry */}
      <div className="stat-card" style={{ borderTop: isExpiryValid ? '3px solid #38bdf8' : '3px solid #f59e0b' }}>
        <div className="stat-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="chevron-accent" style={{ color: isExpiryValid ? '#38bdf8' : '#f59e0b' }}>▲</span>
            <span>Contract Expiration</span>
          </div>
          <Calendar size={16} style={{ color: isExpiryValid ? '#38bdf8' : '#f59e0b' }} />
        </div>
        <div className="stat-card-value">
          {isExpiryValid ? (
            <span style={{ color: '#ffffff' }}>{formatFriendlyDate(version.dates.expiryDate.value)}</span>
          ) : (
            <span style={{ color: '#f59e0b', fontSize: '1.2rem' }}>
              Unstated in PDF
            </span>
          )}
        </div>
        <div className="stat-card-subtext">
          <strong style={{ color: 'var(--brand-gold-light)' }}>Term:</strong> {version.dates.initialTerm.value}
          <br />
          {isExpiryValid ? (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Commenced: {formatFriendlyDate(version.dates.effectiveDate.value)} ({daysUntilExpiry} days remaining)
            </span>
          ) : (
            <div style={{ marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#fcd34d' }}>
                Schedule I Section 2 lists start: 'XXX', end: 'XXX'
              </span>
              {onOpenSetDates && (
                <div style={{ marginTop: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={onOpenSetDates}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(212, 178, 111, 0.4)' }}
                  >
                    ⚡ Set Operational Dates
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Ambiguities & Policy Conflicts */}
      <div className="stat-card" style={{ borderTop: openConflicts > 0 ? '3px solid #f59e0b' : '3px solid rgba(212, 178, 111, 0.3)' }}>
        <div className="stat-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="chevron-accent" style={{ color: '#f59e0b' }}>▲</span>
            <span>Policy & Clarifications</span>
          </div>
          <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
        </div>
        <div className="stat-card-value">
          <span style={{ color: openConflicts > 0 ? '#f59e0b' : '#ffffff' }}>
            {openConflicts}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            open item{openConflicts === 1 ? '' : 's'}
          </span>
        </div>
        <div className="stat-card-subtext">
          {policy ? (
            <span>
              <strong style={{ color: 'var(--brand-gold-light)' }}>{policyViolations}</strong> policy mismatch{policyViolations === 1 ? '' : 'es'} vs {policy.fileName}
            </span>
          ) : (
            <span>Upload or load Organizational Policy to run policy compliance audit</span>
          )}
        </div>
      </div>
    </div>
  );
};
