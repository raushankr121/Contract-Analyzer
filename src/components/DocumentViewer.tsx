import React, { useState } from 'react';
import { FileText, Search, BookOpen } from 'lucide-react';
import type { ContractVersion, OrganizationalPolicy } from '../types/contract';

interface DocumentViewerProps {
  version: ContractVersion;
  policy?: OrganizationalPolicy;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ version, policy }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'CONTRACT' | 'POLICY'>('CONTRACT');

  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} style={{ background: '#f59e0b', color: '#000', borderRadius: '2px', padding: '0 2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn btn-sm ${activeTab === 'CONTRACT' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('CONTRACT')}
            >
              <FileText size={14} />
              Contract Text ({version.versionLabel})
            </button>
            {policy && (
              <button
                className={`btn btn-sm ${activeTab === 'POLICY' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('POLICY')}
              >
                <BookOpen size={14} />
                Policy Document ({policy.fileName})
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '320px', maxWidth: '100%' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search sections, clauses, terms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', maxHeight: '720px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-gold-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {activeTab === 'CONTRACT' ? `${version.fileName} — Full Text (${version.versionLabel})` : `${policy?.fileName} — Policy Text`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Text length: {activeTab === 'CONTRACT' ? version.rawText.length : policy?.rawText.length} characters
          </span>
        </div>

        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            lineHeight: 1.7,
            color: '#cbd5e1',
          }}
        >
          {highlightMatches(
            activeTab === 'CONTRACT' ? version.rawText : policy?.rawText || '',
            searchTerm
          )}
        </pre>
      </div>
    </div>
  );
};
