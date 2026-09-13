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
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
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

  useEffect(() => {
    loadWorkers();
  }, [search]);

  const loadWorkers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/workers?search=${search}`);
      setWorkers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    try {
      await api.post('/workers', formData);
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', skill: 'General', workerType: 'daily_wage', dailyRate: 800, vendorName: '' });
      loadWorkers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create worker');
    }
  };

  const handleViewHistory = async (workerId) => {
    try {
      const res = await api.get(`/workers/${workerId}/history`);
      setSelectedWorkerHistory(res.data.data);
      setHistoryModalOpen(true);
    } catch (err) {
      alert('Failed to load worker history');
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
      </Card>

      {/* Add Worker Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Worker to Master" footer={<Button onClick={handleCreateWorker}>Save Worker</Button>}>
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

      {/* Worker History Modal */}
      <Modal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={`Worker History: ${selectedWorkerHistory?.worker?.name || ''}`}>
        {selectedWorkerHistory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
              <div><strong>Skill:</strong> {selectedWorkerHistory.worker.skill}</div>
              <div><strong>Daily Rate:</strong> ₹{selectedWorkerHistory.worker.dailyRate}</div>
              <div><strong>Total Days Worked:</strong> {selectedWorkerHistory.totalDays} days</div>
              <div><strong>Total Estimated Earned:</strong> ₹{selectedWorkerHistory.totalEarned.toLocaleString('en-IN')}</div>
            </div>

            <h4>Project History & Attendance Records</h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedWorkerHistory.history.length === 0 ? (
                    <tr><td colSpan="2" style={{ textAlign: 'center' }}>No attendance history recorded yet.</td></tr>
                  ) : (
                    selectedWorkerHistory.history.map((h, i) => (
                      <tr key={i}>
                        <td>{new Date(h.date).toLocaleDateString()}</td>
                        <td>{h.project?.name} [{h.project?.code}]</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
