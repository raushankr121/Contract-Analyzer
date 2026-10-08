import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside aria-label="Legal Disclaimers" className="disclaimer-banner">
      <ShieldAlert size={20} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <p>
          <strong>Information-Management Tool Notice:</strong> This application provides automated document data extraction, deterministic calendar date calculations, and operational tracking assistance. <strong>It does not provide legal advice, legal interpretations, or legal recommendations.</strong>
        </p>

        {expanded && (
          <p style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: '#94a3b8' }}>
            All extracted clauses, calculated reminder triggers, and identified policy discrepancies must be independently reviewed, verified, and approved by qualified procurement or legal personnel prior to executing notices or renewals. The system does not provide electronic signatures, external calendar synchronization, or binding legal representations.
          </p>
        )}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          color: 'var(--text-muted)',
          padding: '0.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.2rem',
          fontSize: '0.72rem',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          background: 'rgba(255,255,255,0.03)'
        }}
        title="Toggle disclaimer details"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span>{expanded ? 'Less' : 'Details'}</span>
      </button>
    </aside>
  );
};
