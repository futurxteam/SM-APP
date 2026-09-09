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
import { Plus, Building2, Calendar, MapPin, ArrowRight, User, Navigation } from 'lucide-react';

export default function ProjectList() {
  const { projects, fetchProjects, isLoading } = useProjectStore();
  const { isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();
  
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {projects.map((p) => (
            <Card key={p._id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'box-shadow 0.2s ease' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand)', letterSpacing: '0.05em' }}>{p.code}</span>
                  <Badge variant={p.status}>{p.status.replace('_', ' ')}</Badge>
                </div>

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
              <label>Project Manager</label>
              <select className="input" value={formData.assignedManager} onChange={(e) => setFormData({ ...formData, assignedManager: e.target.value })}>
                <option value="">Unassigned</option>
                {projectManagers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>

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
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      pos => {
                        setFormData(prev => ({
                          ...prev,
                          coordinates: {
                            ...prev.coordinates,
                            latitude: Number(pos.coords.latitude.toFixed(6)),
                            longitude: Number(pos.coords.longitude.toFixed(6)),
                          }
                        }));
                      },
                      err => alert(`GPS error: ${err.message}`)
                    );
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
