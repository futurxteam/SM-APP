import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import api from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AlertTriangle, ExternalLink } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  { value: 'material', label: 'Material charges' },
  { value: 'tools_rental', label: 'Rental (Tools / Equipment / Material Rental)' },
  { value: 'labour', label: 'Labour / Contractor Charges' },
  { value: 'transportation', label: 'Transportation charges' },
  { value: 'fuel', label: 'Fuel expenses' },
  { value: 'accommodation', label: 'Accommodation expenses' },
  { value: 'tools', label: 'Tools charges' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'travel', label: 'Travel expenses' },
  { value: 'food', label: 'Food expenses' },
  { value: 'custom', label: 'Custom expense' },
];

const SUBDIVISIONS = [
  'Civil', 'Electrical', 'Plumbing', 'Carpentry', 'Painting',
  'Welding', 'Tiles', 'Partition', 'Glazing', 'Gypsum', 'Unloading', 'Cleaning', 'General',
];

export default function EditExpenseModal({ isOpen, onClose, projectId, transaction, onSaved }) {
  const [form, setForm] = useState({
    category: 'material',
    customCategoryName: '',
    subDivision: 'General',
    description: '',
    amount: '',
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (transaction && isOpen) {
      setForm({
        category: transaction.category || 'material',
        customCategoryName: transaction.customCategoryName || '',
        subDivision: transaction.subDivision || transaction.materialSubDivision || 'General',
        description: transaction.description || '',
        amount: transaction.amount ?? '',
      });
      setReceiptFile(null);
      setError(null);
    }
  }, [transaction, isOpen]);

  if (!transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('customCategoryName', form.customCategoryName || '');
      fd.append('subDivision', form.subDivision || 'General');
      fd.append('description', form.description || '');
      fd.append('amount', form.amount);
      if (receiptFile) {
        fd.append('receiptImage', receiptFile);
      }

      await api.put(`/projects/${projectId}/pettycash/expenses/${transaction._id}`, fd);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update expense.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSaving && onClose()}
      title={`Edit Expense — ${dayjs(transaction.date).format('DD MMM YYYY')}`}
      maxWidth="500px"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} isLoading={isSaving} loadingText="Saving...">
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#1E40AF',
        }}>
          Editing expense recorded on <strong>{dayjs(transaction.date).format('DD MMM YYYY')}</strong>. The original transaction date will be preserved.
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#DC2626',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label>Category *</label>
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {form.category === 'custom' && (
          <div className="form-group">
            <label>Custom Category Name *</label>
            <input
              className="input"
              value={form.customCategoryName}
              onChange={(e) => setForm({ ...form, customCategoryName: e.target.value })}
              required
            />
          </div>
        )}

        {(form.category === 'material' || form.category === 'labour') && (
          <div className="form-group">
            <label>Trade / Sub-Division</label>
            <select
              className="input"
              value={form.subDivision || 'General'}
              onChange={(e) => setForm({ ...form, subDivision: e.target.value })}
            >
              {SUBDIVISIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Amount (₹) *</label>
          <input
            type="number"
            min="1"
            step="any"
            className="input"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Description / Remarks</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Receipt Image (Optional replacement)</label>
          {transaction.receiptImage && (
            <div style={{ marginBottom: '6px', fontSize: '12px' }}>
              <a
                href={transaction.receiptImage}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--color-brand)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
              >
                <ExternalLink size={12} /> View current receipt
              </a>
            </div>
          )}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="input"
            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
          />
        </div>
      </form>
    </Modal>
  );
}
