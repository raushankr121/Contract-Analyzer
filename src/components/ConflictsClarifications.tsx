import React, { useState } from 'react';
import { 
  HelpCircle, 
  CheckCircle, 
  BookOpen, 
  ShieldAlert, 
  Check, 
} from 'lucide-react';
import type { ContractVersion, OrganizationalPolicy, ConflictingOrUnclearTerm } from '../types/contract';

interface ConflictsClarificationsProps {
  version: ContractVersion;
  policy?: OrganizationalPolicy;
  onResolveConflict: (conflictId: string, resolutionNote: string) => void;
  onDismissConflict: (conflictId: string) => void;
  onOpenUploadPolicy: () => void;
}

export const ConflictsClarifications: React.FC<ConflictsClarificationsProps> = ({
  version,
  policy,
  onResolveConflict,
  onDismissConflict,
  onOpenUploadPolicy,
}) => {
  const [activeResolvingId, setActiveResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const handleStartResolve = (c: ConflictingOrUnclearTerm) => {
    setActiveResolvingId(c.id);
    setResolutionNote(c.userResolutionNote || '');
  };

  const handleSaveResolve = (conflictId: string) => {
    onResolveConflict(conflictId, resolutionNote);
    setActiveResolvingId(null);
    setResolutionNote('');
  };

  const openItems = (version?.conflicts || []).filter((c) => c.status === 'OPEN');
  const resolvedItems = (version?.conflicts || []).filter((c) => c.status === 'RESOLVED');

  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="pill pill-rejected">CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="pill pill-uncertain">HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="pill pill-pending">MEDIUM</span>;
      default:
        return <span className="pill pill-confirmed">INFO</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Policy Benchmark Status Card */}
      <div className="card" style={{ borderLeft: policy ? '4px solid #38bdf8' : '4px solid #f59e0b' }}>
        <div className="card-header">
          <div className="card-title">
            <BookOpen size={20} style={{ color: '#38bdf8' }} />
            Organizational Policy Benchmark
          </div>
          <div>
            {policy ? (
              <span className="pill pill-confirmed">
                <Check size={11} /> Policy Active: {policy.fileName}
              </span>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={onOpenUploadPolicy}>
                Upload Policy Document
              </button>
            )}
          </div>
        </div>

        {policy ? (
          <div>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
              The contract clauses are automatically benchmarked against corporate rules defined in <strong>{policy.fileName}</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {policy.rules.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.2rem' }}>
                    {rule.ruleTitle}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Standard: <strong style={{ color: '#fff' }}>{rule.thresholdOrStandard}</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--brand-gold-light)', fontFamily: 'var(--font-mono)', marginTop: '0.35rem' }}>
                    {rule.citation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              No Organizational Policy document has been uploaded yet. Upload a policy or click <strong>Load Org Policy</strong> above to test automatic detection of non-compliant renewal windows, payment deviations, and insurance thresholds.
            </p>
          </div>
        )}
      </div>

      {/* Identified Conflicts & Ambiguities */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShieldAlert size={20} style={{ color: '#f59e0b' }} />
            Identified Ambiguities, Unclear Terms & Policy Conflicts
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {openItems.length} open issues requiring commercial/legal clarification
          </span>
        </div>

        {openItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <CheckCircle size={36} style={{ color: '#10b981', margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem' }}>
              All Contract Ambiguities & Conflicts Resolved!
            </div>
            <p style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>
              No unresolved ambiguities or policy discrepancies detected in {version.versionLabel}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {openItems.map((conflict, index) => (
              <div
                key={conflict.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  borderLeft: conflict.severity === 'CRITICAL' ? '4px solid #ef4444' : '4px solid #f59e0b',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)' }}>
                        #{index + 1}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                        {conflict.title}
                      </h3>
                      {renderSeverityBadge(conflict.severity)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Type: {conflict.conflictType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="action-btn-group">
                    <button
                      className="btn btn-outline-success btn-sm"
                      onClick={() => handleStartResolve(conflict)}
                    >
                      <Check size={12} /> Resolve / Add Note
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onDismissConflict(conflict.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.55, marginBottom: '0.85rem' }}>
                  {conflict.description}
                </p>

                {/* Citations comparison grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div className="citation-box" style={{ marginTop: 0 }}>
                    <div className="citation-header">{conflict.contractSectionA}</div>
                    <div className="citation-quote">"{conflict.quoteA}"</div>
                  </div>

                  {conflict.contractSectionB && (
                    <div className="citation-box" style={{ marginTop: 0 }}>
                      <div className="citation-header">{conflict.contractSectionB}</div>
                      <div className="citation-quote">"{conflict.quoteB}"</div>
                    </div>
                  )}

                  {conflict.policySection && (
                    <div className="citation-box" style={{ marginTop: 0, borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                      <div className="citation-header" style={{ color: '#38bdf8' }}>{conflict.policySection}</div>
                      <div className="citation-quote" style={{ borderLeftColor: '#38bdf8' }}>"{conflict.policyQuote}"</div>
                    </div>
                  )}
                </div>

                {/* AI Clarification Question */}
                <div className="clarification-callout" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
                  <HelpCircle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: '#fbbf24' }}>AI Clarification Question for Parties:</strong>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', color: '#fff' }}>
                      {conflict.clarificationQuestion}
                    </div>
                  </div>
                </div>

                {/* Operational Recommendation */}
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: '#a5b4fc' }}>
                  <strong>Operational Recommendation:</strong> {conflict.operationalRecommendation}
                </div>

                {/* User inline resolve form */}
                {activeResolvingId === conflict.id && (
                  <div style={{ marginTop: '1rem', background: '#0b1120', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glow)' }}>
                    <label className="form-label">Commercial / Legal Resolution Note</label>
                    <textarea
                      className="form-control"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="e.g. Discussed with Vendor Counsel; they confirmed 90 calendar days will be respected, or Procurement waiver approved..."
                      rows={3}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setActiveResolvingId(null)}>
                        Cancel
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveResolve(conflict.id)}>
                        <Check size={12} /> Save Resolution Note & Mark Resolved
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Conflicts List */}
      {resolvedItems.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <CheckCircle size={18} style={{ color: '#10b981' }} />
              Resolved Ambiguities & Audit History ({resolvedItems.length})
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {resolvedItems.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#94a3b8', textDecoration: 'line-through' }}>
                    {c.title}
                  </div>
                  {c.userResolutionNote && (
                    <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.2rem' }}>
                      ✓ Resolution: {c.userResolutionNote}
                    </div>
                  )}
                </div>
                <span className="pill pill-confirmed">RESOLVED</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
