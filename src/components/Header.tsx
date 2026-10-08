import React from 'react';
import { 
  FileText, 
  Upload, 
  ShieldAlert, 
  Sparkles, 
  Download, 
  History, 
  BookOpen, 
  PlusCircle,
  Terminal
} from 'lucide-react';
import type { ContractVersion, OrganizationalPolicy } from '../types/contract';

interface HeaderProps {
  currentVersion?: ContractVersion;
  versions: ContractVersion[];
  policy?: OrganizationalPolicy;
  onSelectVersion: (versionId: string) => void;
  onOpenUploadContract: () => void;
  onOpenUploadPolicy: () => void;
  onLoadSampleV1: () => void;
  onLoadSamplePolicy: () => void;
  onExportSummary: () => void;
  onOpenLogs?: () => void;
  onResetAll?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentVersion,
  versions,
  policy,
  onSelectVersion,
  onOpenUploadContract,
  onOpenUploadPolicy,
  onLoadSampleV1,
  onLoadSamplePolicy,
  onExportSummary,
  onOpenLogs,
  onResetAll,
}) => {
  const hasContract = versions.length > 0 && currentVersion;

  return (
    <header className="top-header">
      <div className="brand-wrapper">
        {/* Executive Gold Roundel Monogram (mirroring reference design) */}
        <div className="gold-roundel" title="Contract Assistant">
          CA
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 className="brand-title">CONTRACT OBLIGATION & RENEWAL ASSISTANT</h1>
            <span className="brand-subtitle-badge">
              <ShieldAlert size={12} />
              Information Management Tool
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.15rem' }}>
            Executive Contract Intelligence • Deterministic Renewal Countdowns • Policy Compliance Benchmark
          </p>
        </div>
      </div>

      <div className="header-actions">
        {/* Version Switcher */}
        {hasContract && versions.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <History size={15} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Version:</span>
            <select
              value={currentVersion.id}
              onChange={(e) => onSelectVersion(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id} style={{ background: '#0f172a', color: '#fff' }}>
                  {v.versionLabel} ({v.fileName})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Demo Contract & Policy Actions */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onLoadSampleV1}
            title="Load sample Master SaaS Agreement to explore features"
          >
            <Sparkles size={13} style={{ color: '#fbbf24' }} />
            Load Demo Contract
          </button>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onLoadSamplePolicy}
            title="Load sample Organizational Procurement Policy"
          >
            <BookOpen size={13} style={{ color: '#38bdf8' }} />
            {policy ? 'Policy Active ✓' : 'Load Demo Policy'}
          </button>
        </div>

        {/* Upload Buttons */}
        <button className="btn btn-secondary btn-sm" onClick={onOpenUploadContract}>
          <Upload size={14} />
          {hasContract ? 'Upload New Version' : 'Upload Contract'}
        </button>

        <button className="btn btn-secondary btn-sm" onClick={onOpenUploadPolicy}>
          <FileText size={14} />
          {policy ? 'Update Policy' : 'Upload Policy'}
        </button>

        {onOpenLogs && (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onOpenLogs}
            title="Open Structured Logs & AI Workflow Stream"
            style={{ borderColor: 'rgba(99, 102, 241, 0.4)', color: '#a5b4fc' }}
          >
            <Terminal size={14} />
            AI & System Logs
          </button>
        )}

        {/* Export & Reset Buttons if contract loaded */}
        {hasContract && (
          <>
            <button className="btn btn-primary btn-sm" onClick={onExportSummary}>
              <Download size={14} />
              Export Summary
            </button>

            {onResetAll && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onResetAll}
                title="Clear current contract analysis and return to upload screen"
                style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <PlusCircle size={14} />
                New Contract
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
};
