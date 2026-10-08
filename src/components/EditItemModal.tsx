import React, { useState, useEffect } from 'react';
import { X, Check, Edit3 } from 'lucide-react';
import type { ReviewStatus, CertaintyLevel } from '../types/contract';

interface EditItemModalProps {
  isOpen: boolean;
  item: any;
  itemType: string;
  onClose: () => void;
  onSave: (updatedItem: any, itemType: string, correctionNote: string) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  item,
  itemType,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<any>(item ? { ...item } : {});
  const [userCorrection, setUserCorrection] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
      setUserCorrection(item.userCorrection || item.userNotes || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(
      {
        ...formData,
        status: 'EDITED' as ReviewStatus,
        userCorrection: userCorrection.trim() || undefined,
        userNotes: userCorrection.trim() || undefined,
      },
      itemType,
      userCorrection
    );
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={18} style={{ color: 'var(--brand-gold-primary)' }} />
            Edit Extracted Term ({itemType.replace(/_/g, ' ')})
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div>
          {/* Title or Name */}
          {(formData.name !== undefined || formData.title !== undefined) && (
            <div className="form-group">
              <label className="form-label">Title / Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.title ?? formData.name ?? ''}
                onChange={(e) => handleChange(formData.title !== undefined ? 'title' : 'name', e.target.value)}
              />
            </div>
          )}

          {/* Description */}
          {formData.description !== undefined && (
            <div className="form-group">
              <label className="form-label">Description / Summary</label>
              <textarea
                className="form-control"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Dates */}
          {formData.value !== undefined && (
            <div className="form-group">
              <label className="form-label">Extracted Date / Term Value</label>
              <input
                type="text"
                className="form-control"
                value={formData.value}
                onChange={(e) => handleChange('value', e.target.value)}
              />
            </div>
          )}

          {formData.targetDate !== undefined && (
            <div className="form-group">
              <label className="form-label">Target Due Date</label>
              <input
                type="text"
                className="form-control"
                value={formData.targetDate}
                onChange={(e) => handleChange('targetDate', e.target.value)}
              />
            </div>
          )}

          {/* Notice Window Days */}
          {formData.noticeWindowDays !== undefined && (
            <div className="form-group">
              <label className="form-label">Notice Window (Calendar Days)</label>
              <input
                type="number"
                className="form-control"
                value={formData.noticeWindowDays}
                onChange={(e) => handleChange('noticeWindowDays', parseInt(e.target.value, 10))}
              />
            </div>
          )}

          {/* Responsible Party */}
          {formData.responsibleParty !== undefined && (
            <div className="form-group">
              <label className="form-label">Responsible Party</label>
              <select
                className="form-control"
                value={formData.responsibleParty}
                onChange={(e) => handleChange('responsibleParty', e.target.value)}
              >
                <option value="Vendor">Vendor</option>
                <option value="Customer">Customer</option>
                <option value="Mutual">Mutual</option>
              </select>
            </div>
          )}

          {/* Certainty Level */}
          {formData.certainty !== undefined && (
            <div className="form-group">
              <label className="form-label">Interpretation Certainty</label>
              <select
                className="form-control"
                value={formData.certainty}
                onChange={(e) => handleChange('certainty', e.target.value as CertaintyLevel)}
              >
                <option value="CONFIRMED">CONFIRMED (Explicit factual term)</option>
                <option value="UNCERTAIN_INTERPRETATION">UNCERTAIN INTERPRETATION (Ambiguous/inferred)</option>
              </select>
            </div>
          )}

          {/* User Correction & Audit Note */}
          <div className="form-group">
            <label className="form-label">User Correction / Human Audit Reason</label>
            <textarea
              className="form-control"
              value={userCorrection}
              onChange={(e) => setUserCorrection(e.target.value)}
              placeholder="Explain why this field was adjusted or note operational context (saved into contract audit log)..."
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Check size={14} /> Save Changes & Record Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
