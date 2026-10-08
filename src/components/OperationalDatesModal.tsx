import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, AlertCircle } from 'lucide-react';
import type { ContractVersion } from '../types/contract';

interface OperationalDatesModalProps {
  isOpen: boolean;
  version?: ContractVersion;
  onClose: () => void;
  onSaveDates: (payload: {
    effectiveDate: string;
    expiryDate: string;
    initialTerm: string;
    hasRenewalOption: boolean;
    renewalNoticeDays: number;
    renewalPeriodMonths: number;
    auditNote: string;
  }) => void;
}

export const OperationalDatesModal: React.FC<OperationalDatesModalProps> = ({
  isOpen,
  version,
  onClose,
  onSaveDates,
}) => {
  const currentEffective = version?.dates.effectiveDate.value.startsWith('Unstated')
    ? '2026-01-01'
    : version?.dates.effectiveDate.value || '2026-01-01';
  const currentExpiry = version?.dates.expiryDate.value.startsWith('Unstated')
    ? '2026-12-31'
    : version?.dates.expiryDate.value || '2026-12-31';
  const currentTerm = version?.dates.initialTerm.value.startsWith('Unstated')
    ? '12 months (Performance Period: Jan 1, 2026 to Dec 31, 2026)'
    : version?.dates.initialTerm.value || '12 months';

  const [effectiveDate, setEffectiveDate] = useState(currentEffective);
  const [expiryDate, setExpiryDate] = useState(currentExpiry);
  const [initialTerm, setInitialTerm] = useState(currentTerm);
  const [hasRenewalOption, setHasRenewalOption] = useState(
    version?.renewal.type !== 'NO_RENEWAL'
  );
  const [renewalNoticeDays, setRenewalNoticeDays] = useState(
    version?.renewal.noticeWindowDays || 30
  );
  const [renewalPeriodMonths, setRenewalPeriodMonths] = useState(
    version?.renewal.renewalPeriodMonths || 12
  );
  const [auditNote, setAuditNote] = useState(
    'Configured verified operational dates from executed countersigned copy.'
  );

  useEffect(() => {
    if (version) {
      setEffectiveDate(currentEffective);
      setExpiryDate(currentExpiry);
      setInitialTerm(currentTerm);
      setHasRenewalOption(version.renewal.type !== 'NO_RENEWAL');
      setRenewalNoticeDays(version.renewal.noticeWindowDays || 30);
      setRenewalPeriodMonths(version.renewal.renewalPeriodMonths || 12);
    }
  }, [version, isOpen, currentEffective, currentExpiry, currentTerm]);

  if (!isOpen || !version) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDates({
      effectiveDate,
      expiryDate,
      initialTerm,
      hasRenewalOption,
      renewalNoticeDays: hasRenewalOption ? renewalNoticeDays : 0,
      renewalPeriodMonths: hasRenewalOption ? renewalPeriodMonths : 0,
      auditNote,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '580px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--brand-gold-primary)' }} />
            Set Operational Dates & Renewal Terms
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Informational Callout */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              display: 'flex',
              gap: '0.65rem',
            }}
          >
            <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#fff' }}>Template Date Reconciliation:</strong>
              <br />
              The uploaded document contains unpopulated placeholders (<code style={{ color: '#fbbf24' }}>XXX</code> or blank lines) and does not state any renewal date. Enter the confirmed countersigned dates below to calculate calendar deadlines.
            </div>
          </div>

          {/* Effective Date */}
          <div className="form-group">
            <label className="form-label">
              Operational Inception / Effective Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              className="form-control"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>

          {/* Expiry Date */}
          <div className="form-group">
            <label className="form-label">
              Contract End / Expiration Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              className="form-control"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>

          {/* Initial Term Description */}
          <div className="form-group">
            <label className="form-label">Term Description</label>
            <input
              type="text"
              className="form-control"
              value={initialTerm}
              onChange={(e) => setInitialTerm(e.target.value)}
              placeholder="e.g. 12 months (Jan 1, 2026 to Dec 31, 2026)"
              required
            />
          </div>

          {/* Renewal Toggle */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#fff',
                fontSize: '0.85rem',
              }}
            >
              <input
                type="checkbox"
                checked={hasRenewalOption}
                onChange={(e) => setHasRenewalOption(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Enable Automatic Renewal or Extension Option
            </label>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginLeft: '1.4rem' }}>
              {hasRenewalOption
                ? 'Will calculate deterministic non-renewal notice cutoff date.'
                : 'Keep as Fixed-Term: Contract document contains no renewal clause and expires on end date.'}
            </div>

            {hasRenewalOption && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Notice Window (Days)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={renewalNoticeDays}
                    onChange={(e) => setRenewalNoticeDays(parseInt(e.target.value, 10) || 0)}
                    min={1}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Extension Term (Months)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={renewalPeriodMonths}
                    onChange={(e) => setRenewalPeriodMonths(parseInt(e.target.value, 10) || 0)}
                    min={1}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Audit Reason */}
          <div className="form-group">
            <label className="form-label">Audit Log Explanation</label>
            <textarea
              className="form-control"
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              rows={2}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={14} /> Apply Confirmed Operational Dates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
