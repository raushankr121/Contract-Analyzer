import React from 'react';
import { 
  GitCompare, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  History
} from 'lucide-react';
import type { ContractVersion } from '../types/contract';
import { reconcileNewVersion } from '../utils/versionManager';

interface VersionDiffViewProps {
  versions: ContractVersion[];
  currentVersion: ContractVersion;
  onReApproveItem: (itemId: string, itemType: string) => void;
}

export const VersionDiffView: React.FC<VersionDiffViewProps> = ({
  versions,
  currentVersion,
  onReApproveItem,
}) => {
  if (versions.length < 2) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <GitCompare size={42} style={{ color: 'var(--brand-gold-primary)', margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
          Single Contract Version Loaded ({currentVersion.versionLabel})
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '520px', margin: '0.5rem auto 1.5rem auto' }}>
          To view contract version diffs and observe previously approved items automatically marked as <strong>Potentially Stale</strong>, upload a new version or click <strong>Load Amendment v2</strong> in the top header.
        </p>
      </div>
    );
  }

  // Compare previous version (e.g. v1) with current version (e.g. v2)
  const prevVersion = versions[0];
  const newVersion = versions[versions.length - 1];
  const comparison = reconcileNewVersion(prevVersion, newVersion);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Staleness Summary Banner */}
      <div
        className="card"
        style={{
          borderLeft: comparison.staleCount > 0 ? '4px solid var(--color-stale)' : '4px solid var(--color-success)',
          background: comparison.staleCount > 0 ? 'rgba(236,72,153,0.08)' : undefined,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <GitCompare size={22} style={{ color: '#ec4899' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                Contract Version Diff: {prevVersion.versionLabel} vs {newVersion.versionLabel}
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
              Preserving version history, user corrections, and flagging modified clauses as potentially stale.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: comparison.staleCount > 0 ? '#f472b6' : '#34d399' }}>
                {comparison.staleCount}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Stale Items
              </div>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                {comparison.changedCount}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Modified Clauses
              </div>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                {comparison.preservedCorrectionCount}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Preserved Edits
              </div>
            </div>
          </div>
        </div>

        {comparison.staleCount > 0 && (
          <div className="stale-warning-callout" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <AlertCircle size={18} style={{ color: '#f472b6', flexShrink: 0 }} />
            <div>
              <strong>Audit Safety Alert:</strong> When a new contract amendment or version is uploaded, any previously approved clauses whose terms or dates were altered in the new text are automatically flagged as <strong>POTENTIALLY STALE</strong>. Review the side-by-side changes below to re-verify compliance.
            </div>
          </div>
        )}
      </div>

      {/* Side-by-side Diffs Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={18} style={{ color: 'var(--brand-gold-primary)' }} />
            Clause-by-Clause Version Comparison Matrix
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Clause / Parameter</th>
                <th style={{ width: '30%' }}>Previous ({prevVersion.versionLabel})</th>
                <th style={{ width: '30%' }}>New ({newVersion.versionLabel})</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Staleness & Action</th>
              </tr>
            </thead>
            <tbody>
              {comparison.diffItems.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    background: item.isStaleFlagged ? 'rgba(236,72,153,0.07)' : undefined,
                  }}
                >
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{item.title}</div>
                    <span className="pill pill-pending" style={{ fontSize: '0.68rem', marginTop: '0.2rem' }}>
                      {item.category}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
                      {item.explanation}
                    </div>
                  </td>

                  <td>
                    <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: '#cbd5e1' }}>
                      {item.v1Value}
                    </div>
                  </td>

                  <td>
                    <div
                      style={{
                        background: item.isChanged ? 'rgba(99,102,241,0.1)' : 'rgba(15,23,42,0.6)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: item.isChanged ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border-subtle)',
                        fontSize: '0.82rem',
                        color: item.isChanged ? '#fff' : '#cbd5e1',
                        fontWeight: item.isChanged ? 600 : 400,
                      }}
                    >
                      {item.v2Value}
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    {item.isStaleFlagged ? (
                      <div>
                        <span className="pill pill-stale" style={{ marginBottom: '0.4rem', display: 'inline-flex' }}>
                          <RotateCcw size={11} /> POTENTIALLY STALE
                        </span>
                        <div>
                          <button
                            className="btn btn-outline-success btn-sm"
                            onClick={() => onReApproveItem(item.id, item.category)}
                          >
                            <Check size={12} /> Re-Approve New Term
                          </button>
                        </div>
                      </div>
                    ) : item.isChanged ? (
                      <span className="pill pill-edited">Modified</span>
                    ) : (
                      <span className="pill pill-confirmed">Unchanged</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Log */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={18} style={{ color: '#38bdf8' }} />
            Contract Version Audit Trail & User Corrections Log
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {(newVersion?.auditLog || []).map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 0.85rem',
                background: 'rgba(15,23,42,0.4)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: 'var(--brand-gold-light)', marginRight: '0.5rem' }}>
                  [{log.action}]
                </span>
                <span style={{ color: '#cbd5e1' }}>{log.notes}</span>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                {new Date(log.timestamp).toLocaleString()} • {log.user}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
