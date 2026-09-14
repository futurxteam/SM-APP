import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import api from '../../services/api';
import { getCurrentPosition } from '../../services/geolocationService';
import { Plus, Building2, Calendar, MapPin, ArrowRight, User, Navigation, CheckCircle2, MoreVertical, PauseCircle, PlayCircle, Trash2, AlertTriangle } from 'lucide-react';

const scheduleBadgeVariant = (status) => ({
  completed: 'completed', in_progress: 'active', delayed: 'on_hold', on_hold: 'on_hold', not_started: 'upcoming'
}[status] || 'upcoming');

const scheduleLabel = (status) => (status || 'not_started').replaceAll('_', ' ');

export default function ProjectList() {
  const { projects, fetchProjects, isLoading } = useProjectStore();
  const { isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();
  
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    clientName: '',
    location: '',
    description: '',
    status: 'upcoming',
    startDate: '',
    endDate: '',
    assignedManager: '',
    assignedSupervisor: '',
    coordinates: {
      latitude: '',
      longitude: '',
      radiusMeters: 200,
    }
  });

  useEffect(() => {
    fetchProjects(filter);
    if (isSuperAdmin()) {
      api.get('/admin/users').then(res => setUsers(res.data.data)).catch(() => {});
    }
  }, [filter]);

  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleToggleHold = async (project, e) => {
    if (e) e.stopPropagation();
    const isHold = project.status === 'on_hold';
    const actionText = isHold 
      ? `resume project "${project.name}" to Ongoing`
      : `put project "${project.name}" ON HOLD? This will lock all site operations for supervisors`;
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) {
      setActiveMenuId(null);
      return;
    }
    try {
      await api.put(`/projects/${project._id}/hold`);
      setActiveMenuId(null);
      fetchProjects(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update project hold status');
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/projects', formData);
      setIsModalOpen(false);
      fetchProjects(filter);
      setFormData({
        name: '', code: '', clientName: '', location: '',
        description: '', status: 'upcoming', startDate: '', endDate: '',
        assignedManager: '', assignedSupervisor: '',
        coordinates: { latitude: '', longitude: '', radiusMeters: 200 },
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create project');
    }
  };

  const projectManagers = users.filter(u => u.role === 'project_manager');
  const siteSupervisors = users.filter(u => u.role === 'site_supervisor');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Create Button */}
      <div className="mobile-flex-wrap">
        <div>
          <h2>Projects</h2>
          <p className="text-muted">Manage site attendance, petty cash, materials, execution & closure</p>
        </div>

        {isSuperAdmin() && (
          <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
            Create New Project
          </Button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="tabs-header">
        <button className={`tab-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>All Projects</button>
        <button className={`tab-btn ${filter === 'ongoing' || filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('ongoing')}>Ongoing</button>
        <button className={`tab-btn ${filter === 'upcoming' ? 'active' : ''}`} onClick={() => setFilter('upcoming')}>Upcoming</button>
        <button className={`tab-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        <button className={`tab-btn ${filter === 'on_hold' ? 'active' : ''}`} onClick={() => setFilter('on_hold')}>On Hold</button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <LoadingSpinner text="Fetching company projects..." style={{ padding: '48px' }} />
      ) : projects.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <Building2 size={40} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h3>No Projects Found</h3>
          <p className="text-muted" style={{ marginTop: '4px' }}>There are no projects matching the selected filter.</p>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '16px'
        }}>
          {projects.map((p) => (
            <Card key={p._id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'box-shadow 0.2s ease', position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand)', letterSpacing: '0.05em' }}>{p.code}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <Badge variant={p.status}>{p.status.replace('_', ' ')}</Badge>
                    {isSuperAdmin() && (
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === p._id ? null : p._id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B',
                          }}
                          title="Admin Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === p._id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              marginTop: '4px',
                              width: '180px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '6px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                              border: '1px solid var(--color-border)',
                              zIndex: 50,
                              padding: '4px 0',
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleToggleHold(p, e)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: p.status === 'on_hold' ? '#16A34A' : '#D97706',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {p.status === 'on_hold' ? (
                                <>
                                  <PlayCircle size={14} />
                                  <span>Resume Project</span>
                                </>
                              ) : (
                                <>
                                  <PauseCircle size={14} />
                                  <span>Put on Hold</span>
                                </>
                              )}
                            </button>

                            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} />

                            <div
                              title="Project deletion is currently disabled."
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#94A3B8',
                                cursor: 'not-allowed',
                                userSelect: 'none',
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete (Disabled)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {p.status === 'on_hold' && (
                  <div style={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={13} /> PROJECT ON HOLD — Operations locked
                  </div>
                )}

                <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>{p.name}</h3>

                {p.clientName && (
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Building2 size={14} />
                    <span>Client: {p.clientName}</span>
                  </div>
                )}

                {p.location && (
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <MapPin size={14} />
                    <span>{p.location}</span>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                  <Calendar size={14} />
                  <span>{p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A'} → {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'} ({p.durationDays || 0}d)</span>
                </div>
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border)', display: 'grid', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--color-text-secondary)', marginBottom: '5px' }}>CURRENT STAGE</div>
                    {p.scheduleSummary?.currentStage ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.scheduleSummary.currentStage.title}</span>
                        <Badge variant={scheduleBadgeVariant(p.scheduleSummary.currentStage.status)}>{scheduleLabel(p.scheduleSummary.currentStage.status)}</Badge>
                      </div>
                    ) : <span className="text-muted" style={{ fontSize: '13px' }}>No schedule activities</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--color-text-secondary)' }}>SITE EXECUTION</span>
                    <Badge variant={p.executionSummary?.status === 'ready' ? 'completed' : 'upcoming'}>{p.executionSummary?.status === 'ready' ? 'Ready' : 'In Progress'}</Badge>
                  </div>
                  {p.closureSummary?.completed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803D', fontWeight: 700, fontSize: '13px' }}>
                      <CheckCircle2 size={16} /> Project Completed
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  <User size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {p.assignedSupervisor?.name ? `Sup: ${p.assignedSupervisor.name}` : 'No Supervisor'}
                </div>

                <Button size="sm" variant="outline" icon={ArrowRight} onClick={() => navigate(`/projects/${p._id}`)}>
                  Manage Site
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateProject}>Create Project</Button>
          </>
        }
      >
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Project Name *</label>
            <input className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Villa Renovation" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Project Code *</label>
              <input className="input" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="HYGGE-001" required />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Client Name</label>
            <input className="input" value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} placeholder="Client / Owner Name" />
          </div>

          <div className="form-group">
            <label>Site Location</label>
            <input className="input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City / Address" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" className="input" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input type="date" className="input" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
           

            <div className="form-group">
              <label>Site Supervisor</label>
              <select className="input" value={formData.assignedSupervisor} onChange={(e) => setFormData({ ...formData, assignedSupervisor: e.target.value })}>
                <option value="">Unassigned</option>
                {siteSupervisors.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Site Coordinates & Geofence (Optional during project creation) */}
          <div style={{
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                Site Coordinates & Geofence (Optional)
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={async () => {
                  try {
                    const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
                    setFormData(prev => ({
                      ...prev,
                      coordinates: {
                        ...prev.coordinates,
                        latitude: Number(pos.latitude.toFixed(6)),
                        longitude: Number(pos.longitude.toFixed(6)),
                      }
                    }));
                  } catch (err) {
                    alert(`GPS error: ${err.message || err}`);
                  }
                }}
              >
                <Navigation size={12} /> Detect My GPS
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '8px' }}>
              <input
                type="number"
                step="any"
                className="input"
                placeholder="Latitude (e.g. 12.9715)"
                value={formData.coordinates.latitude}
                onChange={(e) => setFormData({
                  ...formData,
                  coordinates: { ...formData.coordinates, latitude: e.target.value }
                })}
              />
              <input
                type="number"
                step="any"
                className="input"
                placeholder="Longitude (e.g. 77.5945)"
                value={formData.coordinates.longitude}
                onChange={(e) => setFormData({
                  ...formData,
                  coordinates: { ...formData.coordinates, longitude: e.target.value }
                })}
              />
              <input
                type="number"
                className="input"
                placeholder="Radius (m)"
                title="Geofence radius in meters"
                value={formData.coordinates.radiusMeters}
                onChange={(e) => setFormData({
                  ...formData,
                  coordinates: { ...formData.coordinates, radiusMeters: e.target.value }
                })}
              />
            </div>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Can also be configured by Admin or initialized by Supervisor on site.
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
