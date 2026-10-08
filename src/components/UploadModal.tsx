import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, Layers } from 'lucide-react';
import { parsePdf, parseDocx, parsePlainText } from '../utils/documentParser';

interface UploadModalProps {
  isOpen: boolean;
  mode: 'CONTRACT' | 'POLICY' | 'CONTRACT_NEW_VERSION';
  onClose: () => void;
  onProcessContract: (text: string, fileName: string, isNewVersion: boolean) => void;
  onProcessPolicy: (text: string, fileName: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  mode,
  onClose,
  onProcessContract,
  onProcessPolicy,
}) => {
  const [inputTab, setInputTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadAction, setUploadAction] = useState<'REPLACE' | 'NEW_VERSION'>('REPLACE');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name);
      }
      setError(null);
    }
  };

  const handleProcess = async () => {
    setError(null);
    setLoading(true);

    try {
      let extractedText = '';
      let effectiveFileName = docTitle || 'document.txt';

      if (inputTab === 'FILE') {
        if (!selectedFile) {
          setError('Please select a PDF, DOCX, or text file to upload.');
          setLoading(false);
          return;
        }

        effectiveFileName = selectedFile.name;
        const lowerName = selectedFile.name.toLowerCase();

        if (lowerName.endsWith('.pdf')) {
          const res = await parsePdf(selectedFile, selectedFile.name);
          extractedText = res.text;
        } else if (lowerName.endsWith('.docx')) {
          const res = await parseDocx(selectedFile, selectedFile.name);
          extractedText = res.text;
        } else {
          // Plain text file (.txt, .md)
          const text = await selectedFile.text();
          const res = parsePlainText(text, selectedFile.name);
          extractedText = res.text;
        }
      } else {
        // Pasted text
        if (!pastedText.trim()) {
          setError('Please paste contract or policy text before proceeding.');
          setLoading(false);
          return;
        }
        effectiveFileName = docTitle.trim() || (mode === 'POLICY' ? 'policy_document.txt' : 'contract_document.txt');
        const res = parsePlainText(pastedText, effectiveFileName);
        extractedText = res.text;
      }

      if (!extractedText.trim()) {
        setError('Could not extract readable text from the provided document. Please ensure it is a text-based PDF, DOCX, or text.');
        setLoading(false);
        return;
      }

      if (mode === 'POLICY') {
        onProcessPolicy(extractedText, effectiveFileName);
      } else {
        const isNewVer = mode === 'CONTRACT_NEW_VERSION' && uploadAction === 'NEW_VERSION';
        onProcessContract(extractedText, effectiveFileName, isNewVer);
      }

      setLoading(false);
      onClose();
    } catch (err: any) {
      console.error('Error parsing document:', err);
      setError(`Extraction error: ${err.message || 'Failed to parse document'}`);
      setLoading(false);
    }
  };

  const modalTitle =
    mode === 'POLICY'
      ? 'Upload Organizational Policy Document'
      : mode === 'CONTRACT_NEW_VERSION'
      ? 'Upload Contract Document'
      : 'Upload Contract Document';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} style={{ color: 'var(--brand-gold-primary)' }} />
            {modalTitle}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {mode === 'CONTRACT_NEW_VERSION' && (
          <div style={{ marginBottom: '1.25rem', background: 'rgba(30,41,59,0.7)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              CHOOSE INGESTION METHOD:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${uploadAction === 'REPLACE' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setUploadAction('REPLACE')}
                style={{ flex: 1, fontSize: '0.78rem' }}
              >
                Analyze as New Primary Contract (Start Fresh)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${uploadAction === 'NEW_VERSION' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setUploadAction('NEW_VERSION')}
                style={{ flex: 1, fontSize: '0.78rem' }}
              >
                Compare as New Version / Amendment
              </button>
            </div>
            {uploadAction === 'NEW_VERSION' && (
              <div className="stale-warning-callout" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                <Layers size={16} style={{ color: '#f472b6', flexShrink: 0 }} />
                <div style={{ fontSize: '0.75rem' }}>
                  <strong>Version Preservation:</strong> Uploading as an amendment preserves previous versions and flags modified approved items as <strong>Potentially Stale</strong>.
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            className={`btn btn-sm ${inputTab === 'FILE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setInputTab('FILE')}
          >
            Upload File (PDF / DOCX / TXT)
          </button>
          <button
            className={`btn btn-sm ${inputTab === 'PASTE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setInputTab('PASTE')}
          >
            Paste Text Directly
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: '#f87171', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {inputTab === 'FILE' ? (
          <div>
            <div
              style={{
                border: '2px dashed var(--border-light)',
                borderRadius: '12px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(15,23,42,0.5)',
                marginBottom: '1.25rem',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <FileText size={36} style={{ color: 'var(--brand-gold-light)', margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                {selectedFile ? selectedFile.name : 'Choose a PDF, DOCX, or TXT file'}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Text-based PDF, Microsoft Word .docx, or plain text'}
              </p>
              <input
                id="file-upload-input"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="form-group">
              <label className="form-label">Document Title / File Name</label>
              <input
                type="text"
                className="form-control"
                placeholder={mode === 'POLICY' ? 'e.g. Apex_Procurement_Policy_v3.txt' : 'e.g. Master_Cloud_Agreement_v1.txt'}
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Paste Document Text</label>
              <textarea
                className="form-control"
                style={{ minHeight: '180px' }}
                placeholder="Paste the full contract or organizational policy text here..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleProcess} disabled={loading}>
            {loading ? 'Processing Document...' : 'Ingest & Extract Clauses'}
          </button>
        </div>
      </div>
    </div>
  );
};
