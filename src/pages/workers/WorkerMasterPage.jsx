import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, Search, UserCheck, Phone, Wrench, IndianRupee, History } from 'lucide-react';

export default function WorkerMasterPage() {
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    skill: 'General',
    workerType: 'daily_wage',
    dailyRate: 800,
    vendorName: ''
  });

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedWorkerHistory, setSelectedWorkerHistory] = useState(null);
  const [activeHistoryWorkerId, setActiveHistoryWorkerId] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyDate, setHistoryDate] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    loadWorkers();
  }, [search, page]);

  const loadWorkers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/workers', {
        params: { search: search.trim(), page, limit: 30 }
      });
      setWorkers(res.data.data || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (isSubmittingWorker) return;
    try {
      setIsSubmittingWorker(true);
      await api.post('/workers', formData);
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', skill: 'General', workerType: 'daily_wage', dailyRate: 800, vendorName: '' });
      loadWorkers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create worker');
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  const handleViewHistory = async (workerId, pageNum = 1, dateFilter = historyDate) => {
    try {
      setIsHistoryLoading(true);
      setActiveHistoryWorkerId(workerId);
      setHistoryPage(pageNum);
      const res = await api.get(`/workers/${workerId}/history`, {
        params: { page: pageNum, limit: 30, date: dateFilter || undefined }
      });
      setSelectedWorkerHistory(res.data.data);
      setHistoryModalOpen(true);
    } catch (err) {
      alert('Failed to load worker history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="mobile-flex-wrap">
        <div>
          <h2>Worker Master Directory</h2>
          <p className="text-muted">Global registry of site workers, skilled labour, and contractors</p>
        </div>

        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>Add New Worker</Button>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by worker name or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-only-table">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Skill</th>
                  <th>Phone</th>
                  <th>Worker Type</th>
                  <th>Daily Rate (₹)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '36px', textAlign: 'center' }}>
                      <LoadingSpinner text="Fetching worker directory..." />
                    </td>
                  </tr>
                ) : workers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94A3B8' }}>No workers found in directory.</td></tr>
                ) : (
                  workers.map(w => (
                    <tr key={w._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px' }}>
                            {w.name.charAt(0)}
                          </div>
                          <strong>{w.name}</strong>
                        </div>
                      </td>
                      <td><span className="badge badge-active">{w.skill || 'General'}</span></td>
                      <td>{w.phone || '—'}</td>
                      <td><span style={{ textTransform: 'capitalize' }}>{w.workerType.replace('_', ' ')}</span></td>
                      <td style={{ fontWeight: 600 }}>₹{w.dailyRate} / day</td>
                      <td>
                        <Button size="sm" variant="outline" icon={History} onClick={() => handleViewHistory(w._id)}>History</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View (No Horizontal Scroll) */}
        <div className="mobile-only-card-list">
          {isLoading ? (
            <div style={{ padding: '36px 0', textAlign: 'center' }}>
              <LoadingSpinner text="Fetching worker directory..." />
            </div>
          ) : workers.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px 0', fontSize: '13px' }}>
              No workers found in directory.
            </div>
          ) : (
            workers.map(w => (
              <div key={w._id} className="mobile-data-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      color: 'var(--color-brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      flexShrink: 0
                    }}>
                      {w.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>{w.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'capitalize' }}>
                        {w.workerType ? w.workerType.replace('_', ' ') : 'Worker'}
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-active" style={{ fontSize: '11px', padding: '3px 8px' }}>
                    {w.skill || 'General'}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  margin: '8px 0',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                    <Phone size={13} color="#64748B" />
                    <span>{w.phone || 'No phone'}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>
                    ₹{w.dailyRate} <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>/ day</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button size="sm" variant="outline" icon={History} onClick={() => handleViewHistory(w._id)}>
                    View History
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar (Max 30 items) */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <span>
              Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} workers, max 30 per page)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="pagination-btn"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <button
                type="button"
                className="pagination-btn"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Worker Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Worker to Master" footer={<Button onClick={handleCreateWorker} isLoading={isSubmittingWorker} loadingText="Saving Worker...">Save Worker</Button>}>
        <form onSubmit={handleCreateWorker} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Worker Full Name *</label>
            <input className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input className="input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="10-digit mobile number" />
          </div>

          <div className="form-group">
            <label>Skill / Trade</label>
            <input className="input" value={formData.skill} onChange={(e) => setFormData({ ...formData, skill: e.target.value })} placeholder="Carpenter, Electrician, Painter, Mason" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Worker Type</label>
              <select className="input" value={formData.workerType} onChange={(e) => setFormData({ ...formData, workerType: e.target.value })}>
                <option value="daily_wage">Daily Wage</option>
                <option value="contract">Contract Worker</option>
                <option value="permanent">Permanent Staff</option>
                <option value="vendor_supplied">Vendor Supplied</option>
              </select>
            </div>

            <div className="form-group">
              <label>Daily Rate (₹)</label>
              <input type="number" className="input" value={formData.dailyRate} onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Worker History Modal (Clean mobile card list, no side scroll, with pagination) */}
      <Modal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={`Worker History: ${selectedWorkerHistory?.worker?.name || ''}`}>
        {selectedWorkerHistory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              fontSize: '12px'
            }}>
              <div><span style={{ color: '#64748B' }}>Skill:</span> <strong style={{ color: '#1E293B', display: 'block' }}>{selectedWorkerHistory.worker?.skill || 'General'}</strong></div>
              <div><span style={{ color: '#64748B' }}>Daily Rate:</span> <strong style={{ color: '#1E293B', display: 'block' }}>₹{selectedWorkerHistory.worker?.dailyRate || 0}</strong></div>
              <div><span style={{ color: '#64748B' }}>Total Days:</span> <strong style={{ color: '#1E293B', display: 'block' }}>{selectedWorkerHistory.totalDays} days</strong></div>
              <div><span style={{ color: '#64748B' }}>Est. Earned:</span> <strong style={{ color: '#059669', display: 'block' }}>₹{selectedWorkerHistory.totalEarned?.toLocaleString('en-IN') || 0}</strong></div>
            </div>

            {/* Date Search Filter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                Project History & Attendance Records
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="date"
                  className="input"
                  style={{ width: '135px', padding: '4px 8px', fontSize: '11px' }}
                  value={historyDate}
                  onChange={(e) => {
                    const d = e.target.value;
                    setHistoryDate(d);
                    if (activeHistoryWorkerId) handleViewHistory(activeHistoryWorkerId, 1, d);
                  }}
                  title="Search by date"
                />
                {historyDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryDate('');
                      if (activeHistoryWorkerId) handleViewHistory(activeHistoryWorkerId, 1, '');
                    }}
                    style={{
                      border: 'none',
                      background: '#F1F5F9',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: '#64748B'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Clean Mobile-Friendly History List (No Horizontal Scroll) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '2px' }}>
              {isHistoryLoading ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <LoadingSpinner text="Fetching attendance history..." />
                </div>
              ) : selectedWorkerHistory.history?.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px 0', fontSize: '13px' }}>
                  No attendance records found{historyDate ? ' for this date' : ''}.
                </div>
              ) : (
                selectedWorkerHistory.history.map((h, i) => (
                  <div
                    key={h._id || i}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>
                        {h.project?.name || 'Assigned Project'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {h.project?.code ? `[${h.project.code}] • ` : ''}{new Date(h.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-active" style={{ fontSize: '10px', padding: '2px 8px' }}>
                        Present
                      </span>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '3px' }}>
                        ₹{selectedWorkerHistory.worker?.dailyRate || 0}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls for Worker History (Max 30 items per page) */}
            {selectedWorkerHistory.pagination && selectedWorkerHistory.pagination.totalPages > 1 && (
              <div className="pagination-bar" style={{ marginTop: '4px', paddingTop: '8px' }}>
                <span>
                  Page <strong>{selectedWorkerHistory.pagination.page}</strong> of <strong>{selectedWorkerHistory.pagination.totalPages}</strong> ({selectedWorkerHistory.pagination.total} records)
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={selectedWorkerHistory.pagination.page <= 1 || isHistoryLoading}
                    onClick={() => handleViewHistory(activeHistoryWorkerId, selectedWorkerHistory.pagination.page - 1, historyDate)}
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={selectedWorkerHistory.pagination.page >= selectedWorkerHistory.pagination.totalPages || isHistoryLoading}
                    onClick={() => handleViewHistory(activeHistoryWorkerId, selectedWorkerHistory.pagination.page + 1, historyDate)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
