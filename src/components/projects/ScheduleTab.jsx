import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Check, Clock3, Edit3, Plus, Send, Trash2, X } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import Modal from '../ui/Modal';

const statuses = ['not_started', 'in_progress', 'completed', 'delayed', 'on_hold'];
const statusLabel = (value) => (value || 'not_started').replaceAll('_', ' ');
const badgeVariant = (status) => ({ completed: 'completed', in_progress: 'active', delayed: 'on_hold', on_hold: 'on_hold', not_started: 'upcoming' }[status] || 'upcoming');
const emptyActivity = { title: '', description: '', plannedStartDate: '', plannedEndDate: '', confirmedStatus: 'not_started' };

export default function ScheduleTab({ projectId }) {
  const { isSuperAdmin, isSiteSupervisor } = useAuthStore();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityModal, setActivityModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyActivity);
  const [proposalActivity, setProposalActivity] = useState(null);
  const [proposal, setProposal] = useState({ supervisorStatus: 'in_progress', supervisorComment: '' });
  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSchedule = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/projects/${projectId}/schedule`);
      setActivities(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load the schedule.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSchedule(); }, [projectId]);

  const timeline = useMemo(() => {
    if (!activities.length) return null;
    const starts = activities.map(a => dayjs(a.plannedStartDate).startOf('day').valueOf());
    const ends = activities.map(a => dayjs(a.plannedEndDate).endOf('day').valueOf());
    const start = Math.min(...starts); const end = Math.max(...ends); const span = Math.max(end - start, 86400000);
    return { start, span };
  }, [activities]);

  const openCreate = () => { setEditing(null); setForm(emptyActivity); setActivityModal(true); };
  const openEdit = (activity) => {
    setEditing(activity);
    setForm({ title: activity.title, description: activity.description || '', plannedStartDate: dayjs(activity.plannedStartDate).format('YYYY-MM-DD'), plannedEndDate: dayjs(activity.plannedEndDate).format('YYYY-MM-DD'), confirmedStatus: activity.confirmedStatus });
    setActivityModal(true);
  };
  const submitActivity = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/schedule/${editing._id}`, form);
      else await api.post(`/projects/${projectId}/schedule`, form);
      setActivityModal(false); await loadSchedule();
    } catch (err) { alert(err.response?.data?.message || 'Unable to save activity.'); }
    finally { setSaving(false); }
  };
  const removeActivity = async (activity) => {
    if (!window.confirm(`Delete “${activity.title}”? This cannot be undone.`)) return;
    try { await api.delete(`/schedule/${activity._id}`); await loadSchedule(); }
    catch (err) { alert(err.response?.data?.message || 'Unable to delete activity.'); }
  };
  const setAdminStatus = async (activity, confirmedStatus) => {
    try { await api.put(`/schedule/${activity._id}/status`, { confirmedStatus }); await loadSchedule(); }
    catch (err) { alert(err.response?.data?.message || 'Unable to update status.'); }
  };
  const submitProposal = async (event) => {
    event.preventDefault(); setSaving(true);
    try { await api.post(`/schedule/${proposalActivity._id}/status-proposal`, proposal); setProposalActivity(null); await loadSchedule(); }
    catch (err) { alert(err.response?.data?.message || 'Unable to submit proposal.'); }
    finally { setSaving(false); }
  };
  const approve = async (activity) => {
    try { await api.post(`/schedule/${activity._id}/approve`); await loadSchedule(); }
    catch (err) { alert(err.response?.data?.message || 'Unable to approve proposal.'); }
  };
  const reject = async (event) => {
    event.preventDefault(); setSaving(true);
    try { await api.post(`/schedule/${rejecting._id}/reject`, { rejectionReason }); setRejecting(null); setRejectionReason(''); await loadSchedule(); }
    catch (err) { alert(err.response?.data?.message || 'Unable to reject proposal.'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner text="Loading project schedule..." style={{ padding: '40px' }} />;

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <Card>
      <div className="mobile-flex-wrap" style={{ marginBottom: activities.length ? '18px' : 0 }}>
        <div><h3>Project Schedule</h3><p className="text-muted" style={{ marginTop: '4px' }}>Planned timeline and confirmed activity progress.</p></div>
        {isSuperAdmin() && <Button icon={Plus} onClick={openCreate}>Add Activity</Button>}
      </div>
      {error && <div style={{ color: '#B91C1C', marginTop: '12px' }}>{error}</div>}
      {!activities.length && !error && <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No schedule activities have been added yet.</div>}
      {timeline && <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ minWidth: '620px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <div style={{ marginLeft: '180px', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '8px' }}><span>{dayjs(timeline.start).format('DD MMM')}</span><span>{dayjs(timeline.start + timeline.span / 2).format('DD MMM')}</span><span>{dayjs(timeline.start + timeline.span).format('DD MMM')}</span></div>
          {activities.map(activity => {
            const left = ((dayjs(activity.plannedStartDate).valueOf() - timeline.start) / timeline.span) * 100;
            const width = Math.max(((dayjs(activity.plannedEndDate).endOf('day').valueOf() - dayjs(activity.plannedStartDate).startOf('day').valueOf()) / timeline.span) * 100, 2);
            return <div key={activity._id} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '10px', alignItems: 'center', marginBottom: '12px' }}><strong style={{ fontSize: '13px' }}>{activity.title}</strong><div style={{ height: '24px', background: '#F1F5F9', borderRadius: '4px', position: 'relative' }}><div title={`${dayjs(activity.plannedStartDate).format('DD MMM YYYY')} – ${dayjs(activity.plannedEndDate).format('DD MMM YYYY')}`} style={{ position: 'absolute', left: `${Math.max(left, 0)}%`, width: `${Math.min(width, 100 - left)}%`, minWidth: '12px', height: '100%', borderRadius: '4px', background: activity.confirmedStatus === 'completed' ? '#16A34A' : activity.confirmedStatus === 'delayed' ? '#DC2626' : '#2563EB' }} /></div></div>;
          })}
        </div>
      </div>}
    </Card>

    {isSuperAdmin() && activities.some(a => a.approvalStatus === 'pending') && <Card><h3 style={{ marginBottom: '14px' }}>Pending Supervisor Requests</h3><div style={{ display: 'grid', gap: '12px' }}>{activities.filter(a => a.approvalStatus === 'pending').map(activity => <div key={activity._id} style={{ border: '1px solid #FCD34D', background: '#FFFBEB', borderRadius: '8px', padding: '14px' }}><strong>{activity.title}</strong><p style={{ fontSize: '13px', margin: '8px 0' }}>Current: <strong>{statusLabel(activity.confirmedStatus)}</strong> → Requested: <strong>{statusLabel(activity.supervisorStatus)}</strong></p><p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>{activity.supervisorComment || 'No comment provided.'}</p><div style={{ display: 'flex', gap: '8px' }}><Button size="sm" icon={Check} onClick={() => approve(activity)}>Accept</Button><Button size="sm" variant="secondary" icon={X} onClick={() => setRejecting(activity)}>Reject</Button></div></div>)}</div></Card>}

    <div style={{ display: 'grid', gap: '14px' }}>{activities.map(activity => <Card key={activity._id}><div className="mobile-flex-wrap"><div><h3>{activity.title}</h3><p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>{dayjs(activity.plannedStartDate).format('DD MMM YYYY')} → {dayjs(activity.plannedEndDate).format('DD MMM YYYY')}</p></div><Badge variant={badgeVariant(activity.confirmedStatus)}>{statusLabel(activity.confirmedStatus)}</Badge></div>{activity.description && <p style={{ margin: '14px 0', fontSize: '14px' }}>{activity.description}</p>}
      {activity.approvalStatus === 'pending' && <div style={{ padding: '10px', background: '#FFFBEB', borderRadius: '6px', fontSize: '13px' }}>Supervisor proposal pending: <strong>{statusLabel(activity.supervisorStatus)}</strong>{activity.supervisorComment ? ` — ${activity.supervisorComment}` : ''}</div>}
      {activity.approvalStatus === 'rejected' && <div style={{ padding: '10px', background: '#FEF2F2', borderRadius: '6px', fontSize: '13px', marginTop: '12px' }}>Last proposal rejected: {activity.rejectionReason}</div>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>{isSuperAdmin() && <><Button size="sm" variant="outline" icon={Edit3} onClick={() => openEdit(activity)}>Edit Timeline</Button><select className="input" style={{ width: 'auto', padding: '6px 8px', fontSize: '12px' }} value={activity.confirmedStatus} onChange={e => setAdminStatus(activity, e.target.value)}>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><Button size="sm" variant="secondary" icon={Trash2} onClick={() => removeActivity(activity)}>Delete</Button></>}{isSiteSupervisor() && activity.approvalStatus !== 'pending' && <Button size="sm" icon={Send} onClick={() => { setProposalActivity(activity); setProposal({ supervisorStatus: activity.confirmedStatus, supervisorComment: '' }); }}>Propose Status</Button>}</div>
    </Card>)}</div>

    <Modal isOpen={activityModal} onClose={() => setActivityModal(false)} title={editing ? 'Edit Schedule Activity' : 'Add Schedule Activity'} footer={<Button onClick={submitActivity} disabled={saving}>{saving ? 'Saving…' : 'Save Activity'}</Button>}><form onSubmit={submitActivity} style={{ display: 'grid', gap: '12px' }}><div className="form-group"><label>Activity title *</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div><div className="form-group"><label>Description</label><textarea className="input" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div className="responsive-grid-2col" style={{ gap: '12px' }}><div className="form-group"><label>Planned start *</label><input type="date" className="input" value={form.plannedStartDate} onChange={e => setForm({ ...form, plannedStartDate: e.target.value })} required /></div><div className="form-group"><label>Planned end *</label><input type="date" className="input" value={form.plannedEndDate} onChange={e => setForm({ ...form, plannedEndDate: e.target.value })} required /></div></div>{!editing && <div className="form-group"><label>Confirmed status</label><select className="input" value={form.confirmedStatus} onChange={e => setForm({ ...form, confirmedStatus: e.target.value })}>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>}</form></Modal>
    <Modal isOpen={!!proposalActivity} onClose={() => setProposalActivity(null)} title={`Propose Status: ${proposalActivity?.title || ''}`} footer={<Button icon={Send} onClick={submitProposal} disabled={saving}>{saving ? 'Submitting…' : 'Submit for Approval'}</Button>}><form onSubmit={submitProposal} style={{ display: 'grid', gap: '12px' }}><div className="form-group"><label>Requested status</label><select className="input" value={proposal.supervisorStatus} onChange={e => setProposal({ ...proposal, supervisorStatus: e.target.value })}>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div><div className="form-group"><label>Site update / comment</label><textarea className="input" rows="4" value={proposal.supervisorComment} onChange={e => setProposal({ ...proposal, supervisorComment: e.target.value })} placeholder="Explain the progress at site." /></div><p className="text-muted" style={{ fontSize: '12px' }}>Your proposal will not change the confirmed schedule until Super Admin approves it.</p></form></Modal>
    <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title={`Reject Proposal: ${rejecting?.title || ''}`} footer={<Button variant="secondary" onClick={reject} disabled={saving}>{saving ? 'Rejecting…' : 'Reject Proposal'}</Button>}><form onSubmit={reject}><div className="form-group"><label>Reason for rejection *</label><textarea className="input" rows="4" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} required /></div></form></Modal>
  </div>;
}
