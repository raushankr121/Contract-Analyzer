import React, { useState } from 'react';
import { 
  CalendarClock, 
  Filter, 
  Calculator,
  Calendar,
  Clock
} from 'lucide-react';
import type { ContractVersion } from '../types/contract';
import { 
  getDaysRemaining, 
  formatFriendlyDate, 
  getUrgencyTier,
} from '../utils/deterministicDate';

interface DeadlinesTimelineProps {
  version: ContractVersion;
}

interface TimelineEvent {
  id: string;
  type: 'RENEWAL_DEADLINE' | 'OBLIGATION' | 'REMINDER_ALERT';
  title: string;
  category: string;
  responsibleParty: string;
  targetDate: string;
  daysRemaining: number;
  urgency: ReturnType<typeof getUrgencyTier>;
  formulaDescription: string;
  citation: string;
  status: string;
  isReminderOnly?: boolean;
}

export const DeadlinesTimeline: React.FC<DeadlinesTimelineProps> = ({ version }) => {
  const [filterParty, setFilterParty] = useState<'ALL' | 'Vendor' | 'Customer'>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'OVERDUE' | 'URGENT' | 'UPCOMING'>('ALL');
  const [showSubReminders, setShowSubReminders] = useState(true);

  // Compile all chronological events
  const events: TimelineEvent[] = [];

  const hasNoRenewal = 
    version.renewal.type === 'NO_RENEWAL' ||
    !version.renewal.deterministicRenewalDeadline ||
    version.renewal.deterministicRenewalDeadline === 'N/A' ||
    version.renewal.deterministicRenewalDeadline.includes('Unstated');

  // 1. Renewal Deadline Main Event (Only if renewal clause exists)
  if (!hasNoRenewal) {
    const renewalDays = getDaysRemaining(version.renewal.deterministicRenewalDeadline);
    events.push({
      id: 'evt-renewal-main',
      type: 'RENEWAL_DEADLINE',
      title: 'Non-Renewal Decision & Written Notice Deadline',
      category: 'RENEWAL_NOTICE',
      responsibleParty: 'Mutual / Either Party',
      targetDate: version.renewal.deterministicRenewalDeadline,
      daysRemaining: renewalDays,
      urgency: getUrgencyTier(renewalDays),
      formulaDescription: version.renewal.calculationFormula,
      citation: version.renewal.citation,
      status: version.renewal.status,
    });

    // 1b. Renewal Sub-reminders (T-90, T-60, T-30, etc.)
    if (showSubReminders && version.renewal.reminders && version.renewal.reminders.length > 0) {
      version.renewal.reminders.forEach((r) => {
        const rDays = getDaysRemaining(r.date);
        events.push({
          id: r.id,
          type: 'REMINDER_ALERT',
          title: r.label,
          category: 'NOTIFICATION_TRIGGER',
          responsibleParty: 'Internal Operations',
          targetDate: r.date,
          daysRemaining: rDays,
          urgency: getUrgencyTier(rDays),
          formulaDescription: `Deterministic alert scheduled ${r.daysBefore} days prior to renewal cutoff (${version.renewal.deterministicRenewalDeadline})`,
          citation: version.renewal.citation,
          status: 'SCHEDULED',
          isReminderOnly: true,
        });
      });
    }
  }

  // 2. Contract Expiry Event
  const isExpiryValid = !version.dates.expiryDate.value.includes('Unstated') && !version.dates.expiryDate.value.includes('XXX');
  const expiryDays = isExpiryValid ? getDaysRemaining(version.dates.expiryDate.value) : 999;
  events.push({
    id: 'evt-expiry',
    type: 'RENEWAL_DEADLINE',
    title: `Contract Term Expiration (${version.dates.initialTerm.value})`,
    category: 'EXPIRATION',
    responsibleParty: 'Mutual',
    targetDate: version.dates.expiryDate.value,
    daysRemaining: expiryDays,
    urgency: isExpiryValid ? getUrgencyTier(expiryDays) : { tier: 'LATER', label: 'Unspecified in PDF', colorClass: 'badge-neutral' },
    formulaDescription: isExpiryValid 
      ? `Initial Term End Date as stated in Section 1.1`
      : `Performance Period in Schedule I Section 2 lists unpopulated placeholder 'XXX'`,
    citation: version.dates.expiryDate.citation,
    status: version.dates.expiryDate.status,
  });

  // 3. Operational Obligations
  version.obligations.forEach((ob) => {
    // Check if targetDate is a valid ISO date
    const isIso = /^\d{4}-\d{2}-\d{2}$/.test(ob.targetDate);
    const obDays = isIso ? getDaysRemaining(ob.targetDate) : 180; // default order for conditional events
    
    events.push({
      id: `evt-${ob.id}`,
      type: 'OBLIGATION',
      title: ob.title,
      category: ob.category,
      responsibleParty: ob.responsibleParty,
      targetDate: ob.targetDate,
      daysRemaining: obDays,
      urgency: getUrgencyTier(obDays),
      formulaDescription: ob.dateCalculationMethod || 'Target obligation date',
      citation: ob.citation,
      status: ob.status,
    });

    // Sub reminders
    if (showSubReminders && ob.reminders) {
      ob.reminders.forEach((r) => {
        const rDays = getDaysRemaining(r.date);
        events.push({
          id: r.id,
          type: 'REMINDER_ALERT',
          title: `${ob.title}: ${r.label}`,
          category: 'NOTIFICATION_TRIGGER',
          responsibleParty: ob.responsibleParty,
          targetDate: r.date,
          daysRemaining: rDays,
          urgency: getUrgencyTier(rDays),
          formulaDescription: `Deterministic reminder offset: ${r.daysBefore} days before ${ob.targetDate}`,
          citation: ob.citation,
          status: 'SCHEDULED',
          isReminderOnly: true,
        });
      });
    }
  });

  // Sort chronologically by targetDate (or daysRemaining)
  events.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Apply filters
  const filteredEvents = events.filter((e) => {
    if (filterParty !== 'ALL' && e.responsibleParty !== filterParty && e.responsibleParty !== 'Mutual' && e.responsibleParty !== 'Mutual / Either Party') {
      return false;
    }
    if (filterUrgency !== 'ALL' && e.urgency.tier !== filterUrgency) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Filter Controls */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
              <CalendarClock size={20} style={{ color: 'var(--brand-gold-primary)' }} />
              Deterministic Timeline & Upcoming Deadlines
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              All reminder alerts and cutoff dates are calculated deterministically from verified contract terms.
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Party:</span>
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value as any)}
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', width: 'auto', fontSize: '0.8rem' }}
              >
                <option value="ALL">All Parties</option>
                <option value="Customer">Customer</option>
                <option value="Vendor">Vendor</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Urgency:</span>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value as any)}
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', width: 'auto', fontSize: '0.8rem' }}
              >
                <option value="ALL">All Urgencies</option>
                <option value="OVERDUE">Overdue</option>
                <option value="URGENT">Urgent (≤ 14d)</option>
                <option value="UPCOMING">Upcoming (≤ 60d)</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={showSubReminders}
                onChange={(e) => setShowSubReminders(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Show T-minus Reminder Triggers
            </label>
          </div>
        </div>
      </div>

      {/* Fixed term informational banner */}
      {hasNoRenewal && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            color: '#cbd5e1',
            fontSize: '0.85rem',
          }}
        >
          <CalendarClock size={22} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#fff' }}>Fixed-Term Agreement — No Renewal Clause:</strong>{' '}
            The uploaded contract does not specify any renewal date or automatic renewal rollover mechanism. No renewal decision countdown is scheduled. Timeline below tracks performance expiration and operational compliance obligations only.
          </div>
        </div>
      )}

      {/* Timeline List */}
      <div className="card">
        <div className="timeline-list">
          {filteredEvents.map((evt) => {
            const isRenewal = evt.type === 'RENEWAL_DEADLINE';
            const isAlert = evt.isReminderOnly;
            const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(evt.targetDate);

            return (
              <div key={evt.id} className="timeline-item">
                <div
                  className={`timeline-node ${
                    evt.urgency.tier === 'OVERDUE' || evt.urgency.tier === 'URGENT'
                      ? 'critical'
                      : isRenewal
                      ? 'warning'
                      : 'info'
                  }`}
                />

                <div
                  style={{
                    background: isRenewal
                      ? 'rgba(99, 102, 241, 0.08)'
                      : isAlert
                      ? 'rgba(15, 23, 42, 0.4)'
                      : 'rgba(15, 23, 42, 0.7)',
                    border: isRenewal
                      ? '1px solid rgba(99, 102, 241, 0.35)'
                      : '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                          {evt.title}
                        </span>

                        <span className="pill pill-pending" style={{ fontSize: '0.68rem' }}>
                          {evt.category}
                        </span>

                        <span style={{ fontSize: '0.72rem', color: 'var(--brand-gold-light)', fontWeight: 600 }}>
                          Responsible: {evt.responsibleParty}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                        <span style={{ color: isIsoDate ? '#38bdf8' : 'var(--brand-gold-light)', fontWeight: 600 }}>
                          <Calendar size={13} style={{ display: 'inline', marginRight: '3px' }} />
                          {isIsoDate ? `${formatFriendlyDate(evt.targetDate)} (${evt.targetDate})` : evt.targetDate}
                        </span>

                        <span style={{ color: 'var(--text-muted)' }}>
                          <Clock size={13} style={{ display: 'inline', marginRight: '3px' }} />
                          {isIsoDate
                            ? evt.daysRemaining >= 0
                              ? `${evt.daysRemaining} days remaining`
                              : `${Math.abs(evt.daysRemaining)} days ago`
                            : 'Operational trigger'}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        className="pill"
                        style={{
                          background:
                            evt.urgency.tier === 'OVERDUE'
                              ? 'var(--color-danger-bg)'
                              : evt.urgency.tier === 'URGENT'
                              ? 'var(--color-warning-bg)'
                              : 'rgba(212, 178, 111, 0.15)',
                          color:
                            evt.urgency.tier === 'OVERDUE'
                              ? '#f87171'
                              : evt.urgency.tier === 'URGENT'
                              ? '#fbbf24'
                              : 'var(--brand-gold-light)',
                          border: '1px solid currentColor',
                        }}
                      >
                        {evt.urgency.label}
                      </span>
                    </div>
                  </div>

                  {/* Formula description */}
                  <div className="formula-box" style={{ marginTop: '0.65rem' }}>
                    <Calculator size={13} />
                    <span>{evt.formulaDescription}</span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--brand-gold-light)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                    Citation: {evt.citation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
