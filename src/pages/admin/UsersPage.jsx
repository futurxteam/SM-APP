import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ExportReportModal from '../../components/common/ExportReportModal';
import { Plus, Users, Shield, Key, Building2, CheckSquare, XSquare, Search, Download } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '', email: '', password: '', role: 'site_supervisor', phone: ''
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    loadUsersAndProjects();
  }, [search, page]);

  const loadUsersAndProjects = async () => {
    setIsLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([
        api.get('/admin/users', { params: { search: search.trim(), page, limit: 30 } }),
        api.get('/projects'),
      ]);
      setUsers(uRes.data.data || []);
      setProjects(pRes.data.data || []);
      if (uRes.data.pagination) {
        setPagination(uRes.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (isCreatingUser) return;
    try {
      setIsCreatingUser(true);
      await api.post('/admin/users', newUserForm);
      setIsCreateModalOpen(false);
      setNewUserForm({ name: '', email: '', password: '', role: 'site_supervisor', phone: '' });
      loadUsersAndProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleOpenAssignModal = (user) => {
    setSelectedUserForAssign(user);
    setAssignedProjectIds(user.assignedProjects?.map(p => p._id || p) || []);
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (isSavingAssignments) return;
    try {
      setIsSavingAssignments(true);
      await api.put(`/admin/users/${selectedUserForAssign._id}/assign-projects`, {
        projectIds: assignedProjectIds
      });
      setIsAssignModalOpen(false);
      loadUsersAndProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign projects');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  const handleToggleProjectCheck = (projId) => {
    if (assignedProjectIds.includes(projId)) {
      setAssignedProjectIds(assignedProjectIds.filter(id => id !== projId));
    } else {
      setAssignedProjectIds([...assignedProjectIds, projId]);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (isResettingPassword) return;
    try {
      setIsResettingPassword(true);
      await api.put(`/admin/users/${selectedUserForPassword._id}/reset-password`, {
        newPassword: newPasswordInput
      });
      setIsPasswordModalOpen(false);
      setNewPasswordInput('');
      alert('Password reset successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/admin/users/${user._id}`, { isActive: !user.isActive });
      loadUsersAndProjects();
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const roleBadgeVariants = {
    super_admin: 'completed',
    project_manager: 'active',
    site_supervisor: 'upcoming',
    accounts: 'on_hold'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>User Accounts & Project Assignment</h2>
          <p className="text-muted">Manage company staff accounts and assign project access</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="outline" icon={Download} onClick={() => setIsExportModalOpen(true)}>Export Directory</Button>
          <Button icon={Plus} onClick={() => setIsCreateModalOpen(true)}>Create New Account</Button>
        </div>
      </div>

      <Card>
        {/* Search Users by Name */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search users by name or email..."
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
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Assigned Projects</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '36px', textAlign: 'center' }}>
                      <LoadingSpinner text="Fetching company user accounts..." />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94A3B8' }}>No user accounts found.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{u.email} {u.phone ? `• ${u.phone}` : ''}</div>
                      </td>
                      <td>
                        <Badge variant={roleBadgeVariants[u.role] || 'active'}>
                          {u.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        {!u.assignedProjects || u.assignedProjects.length === 0 ? (
                          <span className="text-muted" style={{ fontStyle: 'italic' }}>No projects assigned</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {u.assignedProjects.map(p => (
                              <span key={p._id || p} style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#EFF6FF', color: 'var(--color-brand)', borderRadius: '4px', fontWeight: 500 }}>
                                {p.name || 'Project'}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge variant={u.isActive ? 'active' : 'rejected'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Button size="sm" variant="outline" onClick={() => handleOpenAssignModal(u)}>Assign Projects</Button>
                          <Button size="sm" variant="secondary" icon={Key} onClick={() => { setSelectedUserForPassword(u); setIsPasswordModalOpen(true); }}>Password</Button>
                          <Button size="sm" variant={u.isActive ? 'danger' : 'secondary'} onClick={() => handleToggleActive(u)}>
                            {u.isActive ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List View (No Horizontal Scroll) */}
        <div className="mobile-only-card-list">
          {isLoading ? (
            <div style={{ padding: '36px 0', textAlign: 'center' }}>
              <LoadingSpinner text="Fetching company user accounts..." />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px 0', fontSize: '13px' }}>
              No user accounts found.
            </div>
          ) : (
            users.map(u => (
              <div key={u._id} className="mobile-data-card" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', wordBreak: 'break-word' }}>
                      {u.email} {u.phone ? `• ${u.phone}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <Badge variant={roleBadgeVariants[u.role] || 'active'}>
                      {u.role.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant={u.isActive ? 'active' : 'rejected'} style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {/* Assigned Projects */}
                <div style={{ margin: '8px 0', fontSize: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                    Assigned Projects:
                  </div>
                  {!u.assignedProjects || u.assignedProjects.length === 0 ? (
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>None</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {u.assignedProjects.map(p => (
                        <span key={p._id || p} style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#EFF6FF', color: 'var(--color-brand)', borderRadius: '12px', fontWeight: 500 }}>
                          {p.name || 'Project'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons: 3-column grid, no overflow or squishing */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #F1F5F9'
                }}>
                  <Button size="sm" variant="outline" style={{ width: '100%', padding: '6px 2px', fontSize: '12px', justifyContent: 'center' }} onClick={() => handleOpenAssignModal(u)}>Assign</Button>
                  <Button size="sm" variant="secondary" icon={Key} style={{ width: '100%', padding: '6px 2px', fontSize: '12px', justifyContent: 'center' }} onClick={() => { setSelectedUserForPassword(u); setIsPasswordModalOpen(true); }}>Password</Button>
                  <Button size="sm" variant={u.isActive ? 'danger' : 'secondary'} style={{ width: '100%', padding: '6px 2px', fontSize: '12px', justifyContent: 'center' }} onClick={() => handleToggleActive(u)}>
                    {u.isActive ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar for Users (Max 30 per page) */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <span>
              Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} users, max 30 per page)
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

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Account" footer={<Button onClick={handleCreateUser} isLoading={isCreatingUser} loadingText="Creating Account...">Create User Account</Button>}>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Full Name *</label>
            <input className="input" value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} placeholder="e.g. Rahul Sharma" required />
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input type="email" className="input" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} placeholder="rahul@hyggedesigns.com" required />
          </div>

          <div className="form-group">
            <label>Initial Password *</label>
            <input type="password" className="input" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} placeholder="••••••••" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Role *</label>
              <select className="input" value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}>
                <option value="site_supervisor">Site Supervisor</option>
                
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input className="input" value={newUserForm.phone} onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })} placeholder="9876543210" />
            </div>
          </div>
        </form>
      </Modal>

      {/* Assign Projects Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign Projects: ${selectedUserForAssign?.name}`} footer={<Button onClick={handleSaveAssignments} isLoading={isSavingAssignments} loadingText="Saving Assignments...">Save Project Assignments</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p className="text-muted">Select projects this user can access on their dashboard:</p>
          {projects.map(p => (
            <label key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={assignedProjectIds.includes(p._id)}
                onChange={() => handleToggleProjectCheck(p._id)}
              />
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>[{p.code}]</span>
            </label>
          ))}
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title={`Reset Password: ${selectedUserForPassword?.name}`} footer={<Button onClick={handleResetPassword} isLoading={isResettingPassword} loadingText="Resetting...">Reset Password</Button>}>
        <form onSubmit={handleResetPassword} className="form-group">
          <label>New Password *</label>
          <input type="password" className="input" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} placeholder="Minimum 6 characters" required />
        </form>
      </Modal>

      {/* Export Users Directory Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Users & Staff Directory"
        reportType="users"
      />
    </div>
  );
}
