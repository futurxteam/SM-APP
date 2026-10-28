import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  FolderKanban,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Edit,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  Star,
  MapPin,
  Calendar,
  Building,
  Upload,
  X,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

const CATEGORY_OPTIONS = ['All', 'Retail', 'Showroom', 'Office', 'Commercial', 'Residential', 'Other'];

export default function PortfolioAdminPage() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, featured: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'published' | 'draft'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Retail',
    alt: '',
    summary: '',
    scope: [],
    description: '',
    client: '',
    location: '',
    year: new Date().getFullYear().toString(),
    isFeatured: false,
    isPublished: true,
    order: 0,
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [scopeInput, setScopeInput] = useState('');

  // Initial load
  useEffect(() => {
    loadProjects();
    loadStats();
  }, [selectedCategory, selectedStatus]);

  const loadStats = async () => {
    try {
      const res = await api.get('/portfolio/admin/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load portfolio stats:', err);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/portfolio/admin/all', { params });
      if (res.data?.success) {
        setProjects(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects();
    loadStats();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProjects();
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({
      title: '',
      category: 'Retail',
      alt: '',
      summary: '',
      scope: [],
      description: '',
      client: '',
      location: '',
      year: new Date().getFullYear().toString(),
      isFeatured: false,
      isPublished: true,
      order: 0,
      imageUrl: '',
    });
    setImageFile(null);
    setImagePreview('');
    setScopeInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setFormData({
      title: project.title || '',
      category: project.category || 'Retail',
      alt: project.alt || '',
      summary: project.summary || '',
      scope: Array.isArray(project.scope) ? project.scope : [],
      description: project.description || '',
      client: project.client || '',
      location: project.location || '',
      year: project.year || '',
      isFeatured: !!project.isFeatured,
      isPublished: project.isPublished !== false,
      order: project.order || 0,
      imageUrl: project.image || '',
    });
    setImageFile(null);
    setImagePreview(project.image || '');
    setScopeInput('');
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddScopeTag = () => {
    const trimmed = scopeInput.trim();
    if (trimmed && !formData.scope.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, scope: [...prev.scope, trimmed] }));
      setScopeInput('');
    }
  };

  const handleRemoveScopeTag = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      scope: prev.scope.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter a project title.');
      return;
    }
    if (!imageFile && !formData.imageUrl && !imagePreview) {
      alert('Please upload a cover image or enter an image URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('category', formData.category);
      data.append('alt', formData.alt.trim() || formData.title.trim());
      data.append('summary', formData.summary.trim());
      data.append('description', formData.description.trim());
      data.append('client', formData.client.trim());
      data.append('location', formData.location.trim());
      data.append('year', formData.year.trim());
      data.append('isFeatured', formData.isFeatured);
      data.append('isPublished', formData.isPublished);
      data.append('order', formData.order);
      data.append('scope', JSON.stringify(formData.scope));

      if (imageFile) {
        data.append('image', imageFile);
      } else if (formData.imageUrl) {
        data.append('imageUrl', formData.imageUrl.trim());
      }

      if (editingProject) {
        await api.put(`/portfolio/${editingProject._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/portfolio', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setIsModalOpen(false);
      loadProjects();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save project. Please check the fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (project) => {
    try {
      const newStatus = !project.isPublished;
      await api.patch(`/portfolio/${project._id}/publish`, { isPublished: newStatus });
      setProjects((prev) =>
        prev.map((p) => (p._id === project._id ? { ...p, isPublished: newStatus } : p))
      );
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update publish status.');
    }
  };

  const handleToggleFeatured = async (project) => {
    try {
      const newFeatured = !project.isFeatured;
      await api.patch(`/portfolio/${project._id}/featured`, { isFeatured: newFeatured });
      setProjects((prev) =>
        prev.map((p) => (p._id === project._id ? { ...p, isFeatured: newFeatured } : p))
      );
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update featured status.');
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/portfolio/${projectToDelete._id}`);
      setDeleteModalOpen(false);
      setProjectToDelete(null);
      loadProjects();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div className="mobile-flex-wrap" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderKanban size={24} color="var(--color-brand)" />
            <h2 style={{ margin: 0 }}>Website Portfolio CMS</h2>
          </div>
          <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
            Manage commercial interiors, showrooms, retail projects, and hero imagery displayed on the Hygge Designs website.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Add New Project</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="kpi-grid-4">
        <Card className="kpi-compact-card">
          <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>TOTAL PROJECTS</div>
          <div className="kpi-val" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-brand)', marginTop: '4px' }}>
            {stats.total}
          </div>
        </Card>

        <Card className="kpi-compact-card">
          <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>LIVE ON WEBSITE</div>
          <div className="kpi-val" style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {stats.published}
          </div>
        </Card>

        <Card className="kpi-compact-card">
          <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>DRAFTS / HIDDEN</div>
          <div className="kpi-val" style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>
            {stats.drafts}
          </div>
        </Card>

        <Card className="kpi-compact-card">
          <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>FEATURED ON HOME</div>
          <div className="kpi-val" style={{ fontSize: '24px', fontWeight: 700, color: '#7C3AED', marginTop: '4px' }}>
            {stats.featured} ⭐
          </div>
        </Card>
      </div>

      {/* Controls & Filter Bar */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search & Status toggles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px', maxWidth: '480px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search project by title, summary, client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <Button type="submit" variant="secondary" size="sm">Search</Button>
            </form>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748B', marginRight: '4px' }}>Status:</span>
              <button
                type="button"
                className={`btn btn-sm ${selectedStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedStatus('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedStatus === 'published' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedStatus('published')}
              >
                Published
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedStatus === 'draft' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedStatus('draft')}
              >
                Drafts
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', marginRight: '4px' }}>Category:</span>
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: selectedCategory === cat ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === cat ? 'var(--color-brand)' : '#F1F5F9',
                  color: selectedCategory === cat ? '#FFF' : '#475569',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Projects Grid */}
      {loading ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <LoadingSpinner size="lg" text="Loading website projects..." />
        </Card>
      ) : projects.length === 0 ? (
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <FolderKanban size={48} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px 0', color: '#334155' }}>No projects found</h3>
          <p className="text-muted" style={{ margin: '0 0 16px 0', fontSize: '13px' }}>
            {search || selectedCategory !== 'All' || selectedStatus !== 'all'
              ? 'No projects match your current filters. Try resetting the filters or add a new project.'
              : 'Start by adding your first project to publish on the Hygge Designs portfolio!'}
          </p>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus size={16} /> Add First Project
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {projects.map((proj) => (
            <Card
              key={proj._id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: 0,
                border: proj.isFeatured ? '2px solid #C4B5FD' : '1px solid var(--color-border)',
                position: 'relative',
              }}
            >
              {/* Image Thumbnail */}
              <div style={{ position: 'relative', width: '100%', height: '190px', backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                {proj.image ? (
                  <img
                    src={proj.image}
                    alt={proj.alt || proj.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                    <ImageIcon size={36} />
                  </div>
                )}

                {/* Badges on Image */}
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(0,0,0,0.75)',
                      color: '#FFF',
                    }}
                  >
                    {proj.category}
                  </span>
                  {proj.isFeatured && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#7C3AED',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Star size={11} fill="#FFF" /> Featured
                    </span>
                  )}
                </div>

                {/* Publish Indicator Badge */}
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: proj.isPublished ? '#10B981' : '#F59E0B',
                      color: '#FFF',
                    }}
                  >
                    {proj.isPublished ? '● Live' : '○ Draft'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>
                    {proj.title}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>slug: <code>{proj.slug}</code></span>
                    {proj.year && <span>• {proj.year}</span>}
                    {proj.client && <span>• {proj.client}</span>}
                  </div>
                </div>

                {proj.summary && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {proj.summary}
                  </p>
                )}

                {/* Scope Pills */}
                {Array.isArray(proj.scope) && proj.scope.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                    {proj.scope.slice(0, 3).map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          padding: '2px 7px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '4px',
                          color: '#475569',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                    {proj.scope.length > 3 && (
                      <span style={{ fontSize: '11px', color: '#94A3B8', alignSelf: 'center' }}>
                        +{proj.scope.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom Card Controls */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      title={proj.isPublished ? 'Unpublish from website' : 'Publish to website'}
                      style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleTogglePublish(proj)}
                    >
                      {proj.isPublished ? <EyeOff size={13} color="#D97706" /> : <Eye size={13} color="#059669" />}
                      <span>{proj.isPublished ? 'Unpublish' : 'Publish'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      title={proj.isFeatured ? 'Remove from Homepage' : 'Feature on Homepage'}
                      style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleToggleFeatured(proj)}
                    >
                      <Star size={13} fill={proj.isFeatured ? '#7C3AED' : 'none'} color={proj.isFeatured ? '#7C3AED' : '#64748B'} />
                      <span>{proj.isFeatured ? 'Unfeature' : 'Feature'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '4px 8px' }}
                      title="Edit Project"
                      onClick={() => openEditModal(proj)}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ padding: '4px 8px', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none' }}
                      title="Delete Project"
                      onClick={() => {
                        setProjectToDelete(proj);
                        setDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT PROJECT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingProject ? 'Edit Website Project' : 'Add New Website Project'}
        maxWidth="720px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Project Title *</label>
              <input
                type="text"
                className="input"
                required
                placeholder="e.g. Minimalist Apparel Store"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Category *</label>
              <select
                className="input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORY_OPTIONS.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cover Image Upload & Cloudinary */}
          <div>
            <label className="label">Cover Image (Cloudinary) *</label>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              {/* Preview Thumbnail */}
              <div
                style={{
                  width: '140px',
                  height: '100px',
                  borderRadius: '6px',
                  border: '1px dashed #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '11px', padding: '6px' }}>
                    <Upload size={20} style={{ margin: '0 auto 4px' }} />
                    No image
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="file"
                  id="portfolio-image-upload"
                  accept="image/png, image/jpeg, image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById('portfolio-image-upload')?.click()}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Upload size={14} />
                  <span>Choose Image File...</span>
                </Button>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  Supports JPG, PNG, WEBP (Max 5MB). Image is optimized and delivered via Cloudinary CDN.
                </div>

                {/* Alternative Image URL input */}
                <input
                  type="text"
                  className="input"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                  placeholder="Or paste an existing image URL (/images/... or https://...)"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    if (!imageFile && e.target.value) {
                      setImagePreview(e.target.value);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Alt text */}
          <div>
            <label className="label">Image Alt Description</label>
            <input
              type="text"
              className="input"
              placeholder="Descriptive text for accessibility (e.g. Apparel store with oak shelving and travertine plinth)"
              value={formData.alt}
              onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
            />
          </div>

          {/* Client, Location, Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Client Brand (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Jockey, Lenskart"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Location (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Bangalore, Mumbai"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Year / Period</label>
              <input
                type="text"
                className="input"
                placeholder="2025"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="label">Short Lead Summary *</label>
            <textarea
              className="input"
              rows={2}
              required
              placeholder="A brief 1-2 sentence overview shown in the project card and header..."
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            />
          </div>

          {/* Scope of Work Pills Input */}
          <div>
            <label className="label">Scope of Work Items</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                className="input"
                placeholder="e.g. Bespoke metal rails, Plaster wall finishes..."
                value={scopeInput}
                onChange={(e) => setScopeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddScopeTag();
                  }
                }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddScopeTag}>
                Add Item
              </Button>
            </div>

            {/* Scope Tags Display */}
            {formData.scope.length > 0 ? (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {formData.scope.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      fontSize: '12px',
                      color: '#1E40AF',
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveScopeTag(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <X size={13} color="#1E40AF" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                No scope items added yet. Add key deliverables (e.g., Joinery, Lighting coordination, Wall panelling).
              </span>
            )}
          </div>

          {/* Detailed Description */}
          <div>
            <label className="label">Full Project Overview / Description</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Detailed architectural narrative of the space, design intent, materiality, lighting, and execution details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Switches / Checkboxes */}
          <div style={{ display: 'flex', gap: '24px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              />
              <span>Publish Immediately (Make visible on website)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              />
              <span>Feature on Website Homepage ⭐</span>
            </label>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" inline />
                  <span>{editingProject ? 'Updating Project...' : 'Creating Project...'}</span>
                </>
              ) : (
                <span>{editingProject ? 'Save Changes' : 'Publish Project'}</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Delete Website Project"
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertCircle size={28} color="#DC2626" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>
                Are you sure you want to delete this project?
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                "{projectToDelete?.title}" will be permanently removed from the website portfolio and its image deleted from Cloudinary storage.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{ backgroundColor: '#DC2626', color: '#FFF' }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
