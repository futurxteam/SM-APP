import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Activity, Search, Filter, Calendar, User, Building2, Eye, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedModule, setSelectedModule] = useState('');

  const [selectedLogDetail, setSelectedLogDetail] = useState(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadActivityLogs();
  }, [selectedUser, selectedProject, selectedModule]);

  const loadFilterOptions = async () => {
    try {
      const [uRes, pRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/projects'),
      ]);
      setUsers(uRes.data.data);
      setProjects(pRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadActivityLogs = async () => {
    setIsLoading(true);
    try {
      let query = '/admin/activity-log?limit=50';
      if (selectedUser) query += `&user=${selectedUser}`;
      if (selectedProject) query += `&project=${selectedProject}`;
      if (selectedModule) query += `&module=${selectedModule}`;

      const res = await api.get(query);
      setLogs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const moduleBadges = {
    auth: 'active',
    attendance: 'upcoming',
    petty_cash: 'on_hold',
    purchases: 'completed',
    materials: 'active',
    execution: 'upcoming',
    closure: 'completed',
    schedule: 'active',
    user_mgmt: 'rejected'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Global Transaction & Activity Feed</h2>
          <p className="text-muted">Live company-wide audit log of all user actions, transactions, and site updates</p>
        </div>

        <Button icon={RefreshCw} variant="outline" onClick={loadActivityLogs}>Refresh Feed</Button>
      </div>

      <Card>
        {/* Multi-Filter Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Filter by User</label>
            <select className="input" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">All Users</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Filter by Project</label>
            <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name} [{p.code}]</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Filter by Module</label>
            <select className="input" value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
              <option value="">All Modules</option>
              <option value="attendance">Attendance</option>
              <option value="petty_cash">Petty Cash</option>
              <option value="purchases">Direct Purchases</option>
              <option value="materials">Materials</option>
              <option value="execution">Execution</option>
              <option value="closure">Closure</option>
              <option value="schedule">Schedule</option>
              <option value="user_mgmt">User Management</option>
            </select>
          </div>
        </div>

        {/* Activity Feed Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp (IST)</th>
                <th>User & Role</th>
                <th>Project</th>
                <th>Module</th>
                <th>Action & Description</th>
                <th>Amount (₹)</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px', textAlign: 'center' }}>
                    <LoadingSpinner text="Fetching site activity feed..." />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94A3B8' }}>No activity records found matching filters.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {dayjs(log.timestamp).format('DD MMM YYYY, hh:mm A')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.userName || log.user?.name || 'System'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                        {(log.userRole || log.user?.role || '').replace('_', ' ')}
                      </div>
                    </td>
                    <td>
                      {log.projectName || log.project?.name ? (
                        <span><strong>{log.projectName || log.project?.name}</strong></span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <Badge variant={moduleBadges[log.module] || 'active'}>
                        {log.module.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td>{log.description}</td>
                    <td style={{ fontWeight: 600, color: log.amount ? 'var(--color-brand)' : 'inherit' }}>
                      {log.amount ? `₹${log.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <Button size="sm" variant="outline" icon={Eye} onClick={() => setSelectedLogDetail(log)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Detail Drawer Modal */}
      <Modal isOpen={Boolean(selectedLogDetail)} onClose={() => setSelectedLogDetail(null)} title="Activity Log Metadata">
        {selectedLogDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div><strong>Timestamp:</strong> {dayjs(selectedLogDetail.timestamp).format('DD MMMM YYYY, hh:mm:ss A IST')}</div>
            <div><strong>Performed By:</strong> {selectedLogDetail.userName} ({selectedLogDetail.userRole})</div>
            <div><strong>Project:</strong> {selectedLogDetail.projectName || 'N/A'}</div>
            <div><strong>Module:</strong> {selectedLogDetail.module}</div>
            <div><strong>Action Type:</strong> {selectedLogDetail.actionType}</div>
            <div><strong>IP Address:</strong> {selectedLogDetail.ipAddress || 'Internal'}</div>
            <div><strong>Description:</strong> {selectedLogDetail.description}</div>
            {selectedLogDetail.metadata && (
              <div>
                <strong>Metadata Object:</strong>
                <pre style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '4px', marginTop: '6px', fontSize: '12px' }}>
                  {JSON.stringify(selectedLogDetail.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
