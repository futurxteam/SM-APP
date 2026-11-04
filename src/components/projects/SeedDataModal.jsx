import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import api from '../../services/api';
import { downloadExportFile } from '../../utils/exportUtils';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Building2,
  Wallet,
  Users,
  Layers,
  ShoppingBag,
  RefreshCw,
  FileCheck,
  Check,
  X
} from 'lucide-react';
import dayjs from 'dayjs';

export default function SeedDataModal({ isOpen, onClose, project, onSuccess }) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [seedResult, setSeedResult] = useState(null);
  const [trackExpenseMaterials, setTrackExpenseMaterials] = useState(true);

  useEffect(() => {
    if (isOpen && project?._id) {
      fetchStatus();
      setSelectedFile(null);
      setUploadError(null);
      setSeedResult(null);
    }
  }, [isOpen, project?._id]);

  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await api.get(`/projects/${project._id}/seed/status`);
      setSeedStatus(res.data.data);
    } catch (err) {
      console.error('Failed to fetch seed status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!project?._id || isDownloading) return;
    try {
      setIsDownloading(true);
      const fileName = `Seed_Template_${project.code || 'Project'}.xlsx`;
      await downloadExportFile(
        `/projects/${project._id}/seed/template`,
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to download template.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setUploadError('Please select a valid Excel (.xlsx or .xls) file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setUploadError('Please select a valid Excel (.xlsx or .xls) file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !project?._id || isUploading) return;
    try {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('trackExpenseMaterials', trackExpenseMaterials ? 'true' : 'false');

      const res = await api.post(`/projects/${project._id}/seed/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSeedResult(res.data.data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Seeding error:', err);
      setUploadError(err.response?.data?.message || err.message || 'Failed to seed data. Please check Excel format.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Seed Historical Data — ${project.name} (${project.code})`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 1. PROJECT & OPENING BALANCE STATUS BANNER */}
        {statusLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <LoadingSpinner size="sm" text="Checking current project setup..." />
          </div>
        ) : (
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="var(--color-brand)" />
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B' }}>
                  {project.code}: {project.name}
                </span>
              </div>

              {seedStatus?.hasOpeningBalance ? (
                <span style={{
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CheckCircle2 size={13} />
                  Opening Balance: ₹{Number(seedStatus.openingBalance.amount).toLocaleString('en-IN')}
                </span>
              ) : (
                <span style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <AlertTriangle size={13} />
                  Opening Balance: Not Set
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              fontSize: '12px',
              color: '#475569',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '8px'
            }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Ledger Balance: </span>
                <strong style={{ color: '#0F172A' }}>₹{seedStatus?.pettyCashSummary?.currentBalance?.toLocaleString('en-IN') || 0}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Transactions: </span>
                <strong style={{ color: '#0F172A' }}>{seedStatus?.pettyCashSummary?.totalTransactions || 0}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Active Workers: </span>
                <strong style={{ color: '#0F172A' }}>{seedStatus?.stats?.workersCount || 0}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Attendance Days: </span>
                <strong style={{ color: '#0F172A' }}>{seedStatus?.stats?.attendanceDaysCount || 0}</strong>
              </div>
            </div>
          </div>
        )}

        {/* 2. SUCCESS SCREEN */}
        {seedResult ? (
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DCFCE7', margin: '0 auto', color: '#16A34A' }}>
              <CheckCircle2 size={28} />
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '17px', color: '#166534', fontWeight: 700 }}>Data Successfully Seeded!</h4>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#15803D' }}>
                All records have been backfilled. Historical transactions are marked as <strong>"Seeded by Excel"</strong> in the Admin UI.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: '#64748B' }}>Opening Balance:</span>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>
                  {seedResult.openingBalance ? `₹${seedResult.openingBalance.amount.toLocaleString('en-IN')} (${seedResult.openingBalance.status})` : 'Unchanged'}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Expenses & Refills:</span>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>
                  {seedResult.pettyCashTransactionsCount} transactions
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Workers Updated:</span>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>
                  {seedResult.workersCreatedCount} created, {seedResult.workersLinkedCount} linked
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Attendance Records:</span>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>
                  {seedResult.attendanceDaysCount} days ({seedResult.attendanceEntriesCount} entries)
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Materials Inventory:</span>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>
                  {seedResult.materialsSeededCount} items
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Company Purchases:</span>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>
                  {seedResult.companyPurchasesCount} direct bills
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px' }}>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  if (onSuccess) onSuccess();
                }}
              >
                Done & Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 1: DOWNLOAD TEMPLATE */}
            <div style={{
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '16px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileSpreadsheet size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>
                    Step 1: Download Seed Template (.xlsx)
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
                    Download the pre-formatted Excel workbook pre-filled with this project's code and current opening balance. It includes ready-to-use example rows for expenses, workers, attendance, materials, and company direct purchases.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={handleDownloadTemplate}
                  disabled={isDownloading}
                  style={{ fontSize: '13px' }}
                >
                  {isDownloading ? 'Generating Workbook...' : 'Download Template (.xlsx)'}
                </Button>
              </div>
            </div>

            {/* STEP 2: UPLOAD FILLED WORKBOOK */}
            <div style={{
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '16px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>
                  Step 2: Upload Completed Excel Sheet
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Fill in your historical records in the Excel file and upload it below. Seeded transactions will be marked in the admin ledger as <strong>Seeded by Excel</strong> (physical proof not required).
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('seed-excel-input')?.click()}
                style={{
                  border: '2px dashed',
                  borderColor: selectedFile ? 'var(--color-brand)' : '#CBD5E1',
                  backgroundColor: selectedFile ? '#F8FAFC' : '#F8FAFC',
                  borderRadius: '10px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease'
                }}
              >
                <input
                  id="seed-excel-input"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {selectedFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                      <FileCheck size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{selectedFile.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{(selectedFile.size / 1024).toFixed(1)} KB — Click to change file</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                      <Upload size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-brand)' }}>Click to browse</span>
                      <span style={{ fontSize: '13px', color: '#64748B' }}> or drag and drop your Excel file here</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>Supported formats: .xlsx, .xls (Up to 15MB)</span>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {uploadError && (
                <div style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#991B1B',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Option to Track or Not Track Seeded Material Expenses in Material List */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#92400E',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={trackExpenseMaterials}
                  onChange={(e) => setTrackExpenseMaterials(e.target.checked)}
                />
                <span>📦 Track & add seeded material expenses / direct purchases into Materials List</span>
              </label>

              {/* Upload Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isUploading}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  icon={isUploading ? null : Upload}
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? 'Seeding Project Data...' : 'Upload & Seed Data'}
                </Button>
              </div>
            </div>
          </>
        )}

      </div>
    </Modal>
  );
}
