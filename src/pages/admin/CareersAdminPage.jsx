import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  Briefcase,
  Users,
  Activity,
  Plus,
  Search,
  Download,
  ExternalLink,
  Eye,
  Trash2,
  Edit,
  FileText,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Building2,
  RefreshCw,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

const DEPARTMENT_OPTIONS = [
  'Architecture',
  'Interior Design',
  'Project Management',
  'Site Supervision',
  'Civil Engineering',
  '3D Visualization',
  'Structural Engineering',
  'Estimation & Accounts',
  'Marketing & Client Relations',
  'Human Resources',
  'General Operations'
];

const JOB_TYPE_OPTIONS = [
  { value: 'full-time', label: 'Full Time' },
  { value: 'part-time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' }
];

export default function CareersAdminPage() {
  // Main Tab State
  const [activeSection, setActiveSection] = useState('jobs'); // 'jobs' | 'applications' | 'enquiries'

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // ── 1. Jobs State ──
  const [jobs, setJobs] = useState([]);
  const [jobStats, setJobStats] = useState({ total: 0, published: 0, draft: 0, closed: 0 });
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobDeptFilter, setJobDeptFilter] = useState('all');
  
  // Job Create / Edit Modal
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [jobFormData, setJobFormData] = useState({
    title: '',
    department: 'Architecture',
    location: 'Kozhikode, Kerala',
    type: 'full-time',
    experience: '2-4 years',
    salary: '',
    vacancies: 1,
    deadline: '',
    status: 'published',
    description: '',
    requirements: '',
    responsibilities: ''
  });

  // ── 2. Applications State ──
  const [applications, setApplications] = useState([]);
  const [appStats, setAppStats] = useState({ total: 0, new: 0, reviewing: 0, shortlisted: 0, hired: 0, rejected: 0 });
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [appJobFilter, setAppJobFilter] = useState('all');
  
  // Application View / Notes Modal
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [appNotesInput, setAppNotesInput] = useState('');
  const [isSavingAppNotes, setIsSavingAppNotes] = useState(false);

  // ── 3. Enquiries State ──
  const [enquiries, setEnquiries] = useState([]);
  const [enquiryStats, setEnquiryStats] = useState({ total: 0, new: 0, contacted: 0, in_progress: 0, closed: 0 });
  const [enquirySearch, setEnquirySearch] = useState('');
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [enquiryNotesInput, setEnquiryNotesInput] = useState('');
  const [isSavingEnquiryNotes, setIsSavingEnquiryNotes] = useState(false);

  // Initial Data Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await Promise.allSettled([
        loadJobsData(),
        loadApplicationsData(),
        loadEnquiriesData()
      ]);
    } catch (err) {
      console.error('Error loading careers data:', err);
      setErrorMessage('Could not load some careers resources. Please check your backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Data Fetching Methods ──
  const loadJobsData = async () => {
    try {
      const res = await api.get('/jobs/admin/all');
      if (res.data?.success) {
        const list = res.data.data || [];
        setJobs(list);
        
        // Calculate stats
        const stats = {
          total: list.length,
          published: list.filter(j => j.status === 'published').length,
          draft: list.filter(j => j.status === 'draft').length,
          closed: list.filter(j => j.status === 'closed').length
        };
        setJobStats(stats);
      }
    } catch (err) {
      console.warn('Jobs admin endpoint error:', err.response?.status);
    }
  };

  const loadApplicationsData = async () => {
    try {
      const res = await api.get('/applications/admin', { params: { limit: 100 } });
      if (res.data?.success) {
        const list = res.data.data || [];
        setApplications(list);

        const stats = {
          total: list.length,
          new: list.filter(a => a.status === 'new').length,
          reviewing: list.filter(a => a.status === 'reviewing').length,
          shortlisted: list.filter(a => a.status === 'shortlisted').length,
          hired: list.filter(a => a.status === 'hired').length,
          rejected: list.filter(a => a.status === 'rejected').length
        };
        setAppStats(stats);
      }
    } catch (err) {
      console.warn('Applications admin endpoint error:', err.response?.status);
    }
  };

  const loadEnquiriesData = async () => {
    try {
      const res = await api.get('/enquiries/admin', { params: { limit: 100 } });
      if (res.data?.success) {
        const list = res.data.data || [];
        setEnquiries(list);

        const stats = {
          total: list.length,
          new: list.filter(e => e.status === 'new').length,
          contacted: list.filter(e => e.status === 'contacted').length,
          in_progress: list.filter(e => e.status === 'in_progress').length,
          closed: list.filter(e => e.status === 'closed').length
        };
        setEnquiryStats(stats);
      }
    } catch (err) {
      console.warn('Enquiries admin endpoint error:', err.response?.status);
    }
  };

  // ── Job Operations ──
  const handleOpenCreateJob = () => {
    setEditingJobId(null);
    setJobFormData({
      title: '',
      department: 'Architecture',
      location: 'Kozhikode, Kerala',
      type: 'full-time',
      experience: '2-4 years',
      salary: '',
      vacancies: 1,
      deadline: '',
      status: 'published',
      description: '',
      requirements: '',
      responsibilities: ''
    });
    setIsJobModalOpen(true);
  };

  const handleOpenEditJob = (job) => {
    setEditingJobId(job._id);
    setJobFormData({
      title: job.title || '',
      department: job.department || 'Architecture',
      location: job.location || 'Kozhikode, Kerala',
      type: job.type || 'full-time',
      experience: job.experience || '',
      salary: job.salary || '',
      vacancies: job.vacancies || 1,
      deadline: job.deadline ? job.deadline.split('T')[0] : '',
      status: job.status || 'published',
      description: job.description || '',
      requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : (job.requirements || ''),
      responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : (job.responsibilities || '')
    });
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!jobFormData.title.trim()) {
      alert('Please enter a job title');
      return;
    }

    setIsSavingJob(true);
    try {
      const payload = {
        ...jobFormData,
        vacancies: Number(jobFormData.vacancies) || 1,
        requirements: jobFormData.requirements
          .split('\n')
          .map(r => r.trim())
          .filter(Boolean),
        responsibilities: jobFormData.responsibilities
          .split('\n')
          .map(r => r.trim())
          .filter(Boolean)
      };

      if (editingJobId) {
        await api.put(`/jobs/${editingJobId}`, payload);
      } else {
        await api.post('/jobs', payload);
      }

      setIsJobModalOpen(false);
      await loadJobsData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save job opening');
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleToggleJobStatus = async (job, newStatus) => {
    try {
      await api.patch(`/jobs/${job._id}/status`, { status: newStatus });
      await loadJobsData();
    } catch (err) {
      console.error(err);
      alert('Failed to update job status');
    }
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${job.title}"?`)) return;
    try {
      await api.delete(`/jobs/${job._id}`);
      await loadJobsData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete job opening');
    }
  };

  // ── Application Operations ──
  const handleUpdateAppStatus = async (appId, newStatus) => {
    try {
      await api.patch(`/applications/admin/${appId}/status`, { status: newStatus });
      await loadApplicationsData();
      if (selectedApp && selectedApp._id === appId) {
        setSelectedApp(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update application status');
    }
  };

  const handleOpenAppDetails = (app) => {
    setSelectedApp(app);
    setAppNotesInput(app.notes || '');
    setIsAppModalOpen(true);
  };

  const handleSaveAppNotes = async () => {
    if (!selectedApp) return;
    setIsSavingAppNotes(true);
    try {
      await api.patch(`/applications/admin/${selectedApp._id}/notes`, { notes: appNotesInput });
      setSelectedApp(prev => ({ ...prev, notes: appNotesInput }));
      await loadApplicationsData();
      alert('Notes saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save notes');
    } finally {
      setIsSavingAppNotes(false);
    }
  };

  // ── Enquiry Operations ──
  const handleUpdateEnquiryStatus = async (enquiryId, newStatus) => {
    try {
      await api.patch(`/enquiries/admin/${enquiryId}/status`, { status: newStatus });
      await loadEnquiriesData();
      if (selectedEnquiry && selectedEnquiry._id === enquiryId) {
        setSelectedEnquiry(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update enquiry status');
    }
  };

  const handleOpenEnquiryModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setEnquiryNotesInput(enquiry.adminNotes || '');
    setIsEnquiryModalOpen(true);
  };

  const handleSaveEnquiryNotes = async () => {
    if (!selectedEnquiry) return;
    setIsSavingEnquiryNotes(true);
    try {
      await api.patch(`/enquiries/admin/${selectedEnquiry._id}/notes`, { adminNotes: enquiryNotesInput });
      setSelectedEnquiry(prev => ({ ...prev, adminNotes: enquiryNotesInput }));
      await loadEnquiriesData();
      alert('Enquiry notes updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update notes');
    } finally {
      setIsSavingEnquiryNotes(false);
    }
  };

  // ── Filters ──
  const filteredJobs = jobs.filter(j => {
    const matchesSearch = !jobSearch || 
      j.title?.toLowerCase().includes(jobSearch.toLowerCase()) || 
      j.department?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.location?.toLowerCase().includes(jobSearch.toLowerCase());
    const matchesStatus = jobStatusFilter === 'all' || j.status === jobStatusFilter;
    const matchesDept = jobDeptFilter === 'all' || j.department === jobDeptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const filteredApplications = applications.filter(a => {
    const matchesSearch = !appSearch ||
      a.fullName?.toLowerCase().includes(appSearch.toLowerCase()) ||
      a.email?.toLowerCase().includes(appSearch.toLowerCase()) ||
      a.phone?.toLowerCase().includes(appSearch.toLowerCase());
    const matchesStatus = appStatusFilter === 'all' || a.status === appStatusFilter;
    const matchesJob = appJobFilter === 'all' || (a.job && (a.job._id === appJobFilter || a.job === appJobFilter));
    return matchesSearch && matchesStatus && matchesJob;
  });

  const filteredEnquiries = enquiries.filter(e => {
    const matchesSearch = !enquirySearch ||
      e.name?.toLowerCase().includes(enquirySearch.toLowerCase()) ||
      e.email?.toLowerCase().includes(enquirySearch.toLowerCase()) ||
      e.phone?.toLowerCase().includes(enquirySearch.toLowerCase()) ||
      e.message?.toLowerCase().includes(enquirySearch.toLowerCase());
    const matchesStatus = enquiryStatusFilter === 'all' || e.status === enquiryStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Badge Status Helpers
  const getJobStatusBadge = (status) => {
    switch (status) {
      case 'published': return <span style={{ padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>Live / Published</span>;
      case 'draft': return <span style={{ padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Draft</span>;
      case 'closed': return <span style={{ padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>Closed</span>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getAppStatusBadge = (status) => {
    switch (status) {
      case 'new': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>New</span>;
      case 'reviewing': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Reviewing</span>;
      case 'shortlisted': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>Shortlisted</span>;
      case 'hired': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>Hired</span>;
      case 'rejected': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>Rejected</span>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getEnquiryStatusBadge = (status) => {
    switch (status) {
      case 'new': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>New</span>;
      case 'contacted': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Contacted</span>;
      case 'in_progress': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>In Progress</span>;
      case 'closed': return <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>Closed</span>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Top Admin Portal Tabs Bar (Beside Users & Activity Feed) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#FFFFFF',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-xs)'
      }}>
        <NavLink
          to="/admin/users"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
            backgroundColor: isActive ? 'var(--color-brand)' : 'transparent',
            transition: 'all 0.15s ease'
          })}
        >
          <Users size={16} />
          <span>User Accounts</span>
        </NavLink>

        <NavLink
          to="/admin/careers"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
            backgroundColor: isActive ? 'var(--color-brand)' : 'transparent',
            transition: 'all 0.15s ease'
          })}
        >
          <Briefcase size={16} />
          <span>Careers & Recruitment</span>
        </NavLink>

        <NavLink
          to="/admin/activity-log"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
            backgroundColor: isActive ? 'var(--color-brand)' : 'transparent',
            transition: 'all 0.15s ease'
          })}
        >
          <Activity size={16} />
          <span>Activity Feed</span>
        </NavLink>
      </div>

      {/* ── Page Header & Action Buttons ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={26} color="var(--color-brand)" />
            Careers & Recruitment Portal
          </h2>
          <p className="text-muted" style={{ marginTop: '2px', fontSize: '13px' }}>
            Manage job vacancies, track candidate resumes & applications, and review website enquiries
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="outline" icon={RefreshCw} onClick={loadAllData} disabled={isLoading}>
            Refresh
          </Button>
          {activeSection === 'jobs' && (
            <Button icon={Plus} onClick={handleOpenCreateJob}>
              Post New Job
            </Button>
          )}
        </div>
      </div>

      {/* ── Module Sub-Tabs (Jobs / Applications / Enquiries) ── */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--color-border)',
        gap: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveSection('jobs')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 4px 12px',
            fontSize: '14px',
            fontWeight: activeSection === 'jobs' ? 700 : 500,
            color: activeSection === 'jobs' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            borderBottom: activeSection === 'jobs' ? '3px solid var(--color-brand)' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <Briefcase size={17} />
          <span>Job Openings</span>
          <span style={{
            backgroundColor: activeSection === 'jobs' ? '#EFF6FF' : '#F1F5F9',
            color: activeSection === 'jobs' ? 'var(--color-brand)' : '#64748B',
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: '999px',
            fontWeight: 700
          }}>
            {jobStats.published} live
          </span>
        </button>

        <button
          onClick={() => setActiveSection('applications')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 4px 12px',
            fontSize: '14px',
            fontWeight: activeSection === 'applications' ? 700 : 500,
            color: activeSection === 'applications' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            borderBottom: activeSection === 'applications' ? '3px solid var(--color-brand)' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <FileText size={17} />
          <span>Candidate Applications</span>
          <span style={{
            backgroundColor: activeSection === 'applications' ? '#EFF6FF' : '#F1F5F9',
            color: activeSection === 'applications' ? 'var(--color-brand)' : '#64748B',
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: '999px',
            fontWeight: 700
          }}>
            {applications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('enquiries')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 4px 12px',
            fontSize: '14px',
            fontWeight: activeSection === 'enquiries' ? 700 : 500,
            color: activeSection === 'enquiries' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            borderBottom: activeSection === 'enquiries' ? '3px solid var(--color-brand)' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <MessageSquare size={17} />
          <span>Project & Contact Enquiries</span>
          <span style={{
            backgroundColor: activeSection === 'enquiries' ? '#EFF6FF' : '#F1F5F9',
            color: activeSection === 'enquiries' ? 'var(--color-brand)' : '#64748B',
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: '999px',
            fontWeight: 700
          }}>
            {enquiryStats.new} new
          </span>
        </button>
      </div>

      {errorMessage && (
        <div style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          padding: '12px 16px',
          borderRadius: '8px',
          color: '#92400E',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: JOB OPENINGS & VACANCIES
         ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            <Card style={{ padding: '14px 16px' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Total Openings</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                {jobStats.total}
              </div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #059669' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Live on Website</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                {jobStats.published}
              </div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #D97706' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Draft Positions</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>
                {jobStats.draft}
              </div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #64748B' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Closed Positions</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#64748B', marginTop: '4px' }}>
                {jobStats.closed}
              </div>
            </Card>
          </div>

          <Card>
            {/* Filter Bar */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <input
                  className="input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search job title, department, location..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                />
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              </div>

              <select
                className="input"
                style={{ width: 'auto', minWidth: '150px' }}
                value={jobDeptFilter}
                onChange={(e) => setJobDeptFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                className="input"
                style={{ width: 'auto', minWidth: '140px' }}
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="published">Live / Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-only-table">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Job Title & Details</th>
                      <th>Department</th>
                      <th>Type & Exp</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '36px', textAlign: 'center' }}>
                          <LoadingSpinner text="Fetching job postings..." />
                        </td>
                      </tr>
                    ) : filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#94A3B8', padding: '32px' }}>
                          No job postings found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map(job => (
                        <tr key={job._id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                              {job.title}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                              <span>{job.vacancies || 1} vacancy</span>
                              {job.salary && <span>• {job.salary}</span>}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', fontWeight: 500, backgroundColor: '#EFF6FF', color: 'var(--color-brand)', padding: '2px 8px', borderRadius: '4px' }}>
                              {job.department}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px', textTransform: 'capitalize' }}>{job.type}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{job.experience || 'Experience unspecified'}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} color="var(--color-text-muted)" />
                              {job.location}
                            </div>
                          </td>
                          <td>
                            {getJobStatusBadge(job.status)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <select
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--color-border)',
                                  width: 'auto'
                                }}
                                value={job.status}
                                onChange={(e) => handleToggleJobStatus(job, e.target.value)}
                              >
                                <option value="published">Publish</option>
                                <option value="draft">Draft</option>
                                <option value="closed">Close</option>
                              </select>

                              <Button size="sm" variant="outline" icon={Edit} onClick={() => handleOpenEditJob(job)} />
                              <Button size="sm" variant="danger" icon={Trash2} onClick={() => handleDeleteJob(job)} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-only-card-list">
              {isLoading ? (
                <div style={{ padding: '36px 0', textAlign: 'center' }}>
                  <LoadingSpinner text="Fetching job openings..." />
                </div>
              ) : filteredJobs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px 0', fontSize: '13px' }}>
                  No job openings found.
                </div>
              ) : (
                filteredJobs.map(job => (
                  <div key={job._id} style={{
                    padding: '14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    backgroundColor: '#FFFFFF'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{job.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-brand)', fontWeight: 500, marginTop: '2px' }}>
                          {job.department} • {job.location}
                        </div>
                      </div>
                      {getJobStatusBadge(job.status)}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', display: 'flex', gap: '10px' }}>
                      <span>Type: <strong style={{ textTransform: 'capitalize' }}>{job.type}</strong></span>
                      <span>Exp: <strong>{job.experience || 'N/A'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                      <select
                        style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', width: 'auto' }}
                        value={job.status}
                        onChange={(e) => handleToggleJobStatus(job, e.target.value)}
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="closed">Closed</option>
                      </select>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button size="sm" variant="outline" icon={Edit} onClick={() => handleOpenEditJob(job)}>Edit</Button>
                        <Button size="sm" variant="danger" icon={Trash2} onClick={() => handleDeleteJob(job)} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: CANDIDATE APPLICATIONS & RESUME PIPELINE
         ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Applications Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px'
          }}>
            <Card style={{ padding: '14px 16px' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Total Applicants</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{appStats.total}</div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #2563EB' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>New Candidates</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>{appStats.new}</div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #7E22CE' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Shortlisted</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#7E22CE', marginTop: '4px' }}>{appStats.shortlisted}</div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #059669' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Hired</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{appStats.hired}</div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #DC2626' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Rejected</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>{appStats.rejected}</div>
            </Card>
          </div>

          <Card>
            {/* Filter Bar */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <input
                  className="input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search applicant name, email, phone..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                />
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              </div>

              <select
                className="input"
                style={{ width: 'auto', minWidth: '160px' }}
                value={appJobFilter}
                onChange={(e) => setAppJobFilter(e.target.value)}
              >
                <option value="all">All Jobs Applied</option>
                {jobs.map(j => (
                  <option key={j._id} value={j._id}>{j.title}</option>
                ))}
              </select>

              <select
                className="input"
                style={{ width: 'auto', minWidth: '140px' }}
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
              >
                <option value="all">All Pipeline Stages</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-only-table">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Applied Position</th>
                      <th>Experience / Portfolio</th>
                      <th>Resume</th>
                      <th>Status</th>
                      <th>Recruiter Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '36px', textAlign: 'center' }}>
                          <LoadingSpinner text="Fetching applicant pool..." />
                        </td>
                      </tr>
                    ) : filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#94A3B8', padding: '32px' }}>
                          No candidate applications found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredApplications.map(app => (
                        <tr key={app._id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{app.fullName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                              {app.email} • {app.phone}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                              {app.job?.title || 'General Application'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {app.job?.department || 'Design & Engineering'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px' }}>{app.experience || 'Not specified'}</div>
                            {app.portfolioUrl && (
                              <a
                                href={app.portfolioUrl.startsWith('http') ? app.portfolioUrl : `https://${app.portfolioUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '11px', color: 'var(--color-brand)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
                              >
                                Portfolio / Link <ExternalLink size={10} />
                              </a>
                            )}
                          </td>
                          <td>
                            {app.resume?.url ? (
                              <a
                                href={app.resume.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '5px 10px',
                                  backgroundColor: '#EFF6FF',
                                  color: 'var(--color-brand)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  border: '1px solid #BFDBFE'
                                }}
                              >
                                <FileText size={14} />
                                View Resume
                              </a>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No resume attached</span>
                            )}
                          </td>
                          <td>
                            {getAppStatusBadge(app.status)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <select
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--color-border)',
                                  width: 'auto'
                                }}
                                value={app.status}
                                onChange={(e) => handleUpdateAppStatus(app._id, e.target.value)}
                              >
                                <option value="new">New</option>
                                <option value="reviewing">Reviewing</option>
                                <option value="shortlisted">Shortlist</option>
                                <option value="hired">Hired</option>
                                <option value="rejected">Reject</option>
                              </select>

                              <Button size="sm" variant="outline" icon={Eye} onClick={() => handleOpenAppDetails(app)}>
                                Details
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

            {/* Mobile Cards View */}
            <div className="mobile-only-card-list">
              {isLoading ? (
                <div style={{ padding: '36px 0', textAlign: 'center' }}>
                  <LoadingSpinner text="Fetching applicants..." />
                </div>
              ) : filteredApplications.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px 0', fontSize: '13px' }}>
                  No applications found.
                </div>
              ) : (
                filteredApplications.map(app => (
                  <div key={app._id} style={{
                    padding: '14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    backgroundColor: '#FFFFFF'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{app.fullName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {app.email} • {app.phone}
                        </div>
                      </div>
                      {getAppStatusBadge(app.status)}
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                      Applied: <strong>{app.job?.title || 'General Position'}</strong> ({app.experience || 'Exp N/A'})
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                      {app.resume?.url ? (
                        <a
                          href={app.resume.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-brand)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none'
                          }}
                        >
                          <FileText size={14} /> Resume PDF
                        </a>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>No resume</span>
                      )}

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          style={{ fontSize: '11px', padding: '4px 6px', borderRadius: '4px', width: 'auto' }}
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app._id, e.target.value)}
                        >
                          <option value="new">New</option>
                          <option value="reviewing">Review</option>
                          <option value="shortlisted">Shortlist</option>
                          <option value="hired">Hired</option>
                          <option value="rejected">Reject</option>
                        </select>
                        <Button size="sm" variant="outline" onClick={() => handleOpenAppDetails(app)}>Notes</Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 3: PROJECT & CLIENT ENQUIRIES
         ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'enquiries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Enquiry Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            <Card style={{ padding: '14px 16px' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Total Inquiries</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{enquiryStats.total}</div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #2563EB' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>New Requests</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>{enquiryStats.new}</div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #D97706' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Contacted</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>{enquiryStats.contacted}</div>
            </Card>
            <Card style={{ padding: '14px 16px', borderLeft: '4px solid #059669' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>In Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{enquiryStats.in_progress}</div>
            </Card>
          </div>

          <Card>
            {/* Filter Bar */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
                <input
                  className="input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search client name, email, phone, message..."
                  value={enquirySearch}
                  onChange={(e) => setEnquirySearch(e.target.value)}
                />
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              </div>

              <select
                className="input"
                style={{ width: 'auto', minWidth: '150px' }}
                value={enquiryStatusFilter}
                onChange={(e) => setEnquiryStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Desktop Table */}
            <div className="desktop-only-table">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Project Type & Budget</th>
                      <th>Message Snippet</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '36px', textAlign: 'center' }}>
                          <LoadingSpinner text="Fetching enquiries..." />
                        </td>
                      </tr>
                    ) : filteredEnquiries.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#94A3B8', padding: '32px' }}>
                          No enquiries found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredEnquiries.map(enq => (
                        <tr key={enq._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{enq.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                              {enq.email} • {enq.phone}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                              {enq.projectType || enq.service || 'Architecture & Design'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {enq.budget ? `Budget: ${enq.budget}` : 'Budget not stated'}
                            </div>
                          </td>
                          <td style={{ maxWidth: '300px' }}>
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--color-text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {enq.message}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                              {enq.createdAt ? new Date(enq.createdAt).toLocaleDateString() : 'Recent'}
                            </div>
                          </td>
                          <td>
                            {getEnquiryStatusBadge(enq.status)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <select
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--color-border)',
                                  width: 'auto'
                                }}
                                value={enq.status}
                                onChange={(e) => handleUpdateEnquiryStatus(enq._id, e.target.value)}
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="in_progress">In Progress</option>
                                <option value="closed">Closed</option>
                              </select>

                              <Button size="sm" variant="outline" icon={Eye} onClick={() => handleOpenEnquiryModal(enq)} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-only-card-list">
              {isLoading ? (
                <div style={{ padding: '36px 0', textAlign: 'center' }}>
                  <LoadingSpinner text="Fetching enquiries..." />
                </div>
              ) : filteredEnquiries.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px 0', fontSize: '13px' }}>
                  No enquiries found.
                </div>
              ) : (
                filteredEnquiries.map(enq => (
                  <div key={enq._id} style={{
                    padding: '14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    backgroundColor: '#FFFFFF'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{enq.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {enq.email} • {enq.phone}
                        </div>
                      </div>
                      {getEnquiryStatusBadge(enq.status)}
                    </div>

                    <div style={{ margin: '8px 0', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                      <strong>{enq.projectType || 'Project Inquiry'}:</strong> {enq.message}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                      <select
                        style={{ fontSize: '11px', padding: '4px 6px', borderRadius: '4px', width: 'auto' }}
                        value={enq.status}
                        onChange={(e) => handleUpdateEnquiryStatus(enq._id, e.target.value)}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                      </select>

                      <Button size="sm" variant="outline" onClick={() => handleOpenEnquiryModal(enq)}>View Full</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: POST OR EDIT JOB VACANCY
         ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        title={editingJobId ? 'Edit Job Opening' : 'Post New Job Vacancy'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setIsJobModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveJob} disabled={isSavingJob}>
              {isSavingJob ? 'Saving...' : editingJobId ? 'Save Changes' : 'Publish Opening'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveJob} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Job Title *</label>
            <input
              className="input"
              required
              placeholder="e.g. Senior Interior Architect / Site Supervisor"
              value={jobFormData.title}
              onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Department</label>
              <select
                className="input"
                value={jobFormData.department}
                onChange={(e) => setJobFormData({ ...jobFormData, department: e.target.value })}
              >
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Employment Type</label>
              <select
                className="input"
                value={jobFormData.type}
                onChange={(e) => setJobFormData({ ...jobFormData, type: e.target.value })}
              >
                {JOB_TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Location</label>
              <input
                className="input"
                placeholder="e.g. Kozhikode, Bangalore, Hybrid"
                value={jobFormData.location}
                onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Experience Required</label>
              <input
                className="input"
                placeholder="e.g. 2-5 years in Interior Architecture"
                value={jobFormData.experience}
                onChange={(e) => setJobFormData({ ...jobFormData, experience: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Salary (Optional)</label>
              <input
                className="input"
                placeholder="e.g. ₹35,000 - ₹50,000"
                value={jobFormData.salary}
                onChange={(e) => setJobFormData({ ...jobFormData, salary: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Vacancies</label>
              <input
                className="input"
                type="number"
                min="1"
                value={jobFormData.vacancies}
                onChange={(e) => setJobFormData({ ...jobFormData, vacancies: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                className="input"
                value={jobFormData.status}
                onChange={(e) => setJobFormData({ ...jobFormData, status: e.target.value })}
              >
                <option value="published">Live / Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Job Description</label>
            <textarea
              className="input"
              rows="3"
              placeholder="Describe the role, team, and impact..."
              value={jobFormData.description}
              onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Key Requirements (One per line)</label>
            <textarea
              className="input"
              rows="3"
              placeholder="AutoCAD & SketchUp proficiency&#10;B.Arch or Interior Design degree&#10;On-site vendor handling experience"
              value={jobFormData.requirements}
              onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Key Responsibilities (One per line)</label>
            <textarea
              className="input"
              rows="3"
              placeholder="Develop 2D working drawings and 3D elevations&#10;Coordinate with project managers and site supervisors"
              value={jobFormData.responsibilities}
              onChange={(e) => setJobFormData({ ...jobFormData, responsibilities: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: CANDIDATE APPLICATION DETAILS & NOTES
         ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        title="Candidate Application & Recruiter Notes"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setIsAppModalOpen(false)}>Close</Button>
            <Button onClick={handleSaveAppNotes} disabled={isSavingAppNotes}>
              {isSavingAppNotes ? 'Saving Notes...' : 'Save Recruiter Notes'}
            </Button>
          </div>
        }
      >
        {selectedApp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px' }}>{selectedApp.fullName}</h4>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {selectedApp.email} • {selectedApp.phone}
                </div>
              </div>
              <div>{getAppStatusBadge(selectedApp.status)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span className="text-muted">Applied Position:</span>
                <div style={{ fontWeight: 600 }}>{selectedApp.job?.title || 'General Position'}</div>
              </div>
              <div>
                <span className="text-muted">Experience Level:</span>
                <div style={{ fontWeight: 600 }}>{selectedApp.experience || 'Not specified'}</div>
              </div>
            </div>

            {selectedApp.portfolioUrl && (
              <div style={{ fontSize: '13px' }}>
                <span className="text-muted">Portfolio / Web Link:</span>
                <div>
                  <a
                    href={selectedApp.portfolioUrl.startsWith('http') ? selectedApp.portfolioUrl : `https://${selectedApp.portfolioUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--color-brand)', fontWeight: 500 }}
                  >
                    {selectedApp.portfolioUrl}
                  </a>
                </div>
              </div>
            )}

            {selectedApp.coverLetter && (
              <div style={{ fontSize: '13px' }}>
                <span className="text-muted">Cover Letter / Note:</span>
                <div style={{
                  backgroundColor: '#F8FAFC',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  marginTop: '4px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-line'
                }}>
                  {selectedApp.coverLetter}
                </div>
              </div>
            )}

            {/* Resume Access */}
            <div style={{
              padding: '12px',
              backgroundColor: '#EFF6FF',
              borderRadius: '6px',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={22} color="var(--color-brand)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E3A8A' }}>Candidate Resume / CV</div>
                  <div style={{ fontSize: '11px', color: '#3B82F6' }}>
                    {selectedApp.resume?.filename || 'Resume document attached'}
                  </div>
                </div>
              </div>

              {selectedApp.resume?.url ? (
                <a
                  href={selectedApp.resume.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    backgroundColor: 'var(--color-brand)',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download size={14} /> Open Resume
                </a>
              ) : (
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>No URL</span>
              )}
            </div>

            {/* Stage Selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Update Candidate Pipeline Stage</label>
              <select
                className="input"
                value={selectedApp.status}
                onChange={(e) => handleUpdateAppStatus(selectedApp._id, e.target.value)}
              >
                <option value="new">New Candidate</option>
                <option value="reviewing">Under Review</option>
                <option value="shortlisted">Shortlisted for Interview</option>
                <option value="hired">Hired / Selected</option>
                <option value="rejected">Rejected / Unsuitable</option>
              </select>
            </div>

            {/* Recruiter Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Internal Recruiter & Interview Notes</label>
              <textarea
                className="input"
                rows="4"
                placeholder="Add notes on interview performance, portfolio rating, compensation discussion, etc..."
                value={appNotesInput}
                onChange={(e) => setAppNotesInput(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ENQUIRY DETAILS & NOTES
         ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        title="Website Project Enquiry"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setIsEnquiryModalOpen(false)}>Close</Button>
            <Button onClick={handleSaveEnquiryNotes} disabled={isSavingEnquiryNotes}>
              {isSavingEnquiryNotes ? 'Saving...' : 'Update Notes'}
            </Button>
          </div>
        }
      >
        {selectedEnquiry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)'
            }}>
              <div>
                <h4 style={{ margin: 0 }}>{selectedEnquiry.name}</h4>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {selectedEnquiry.email} • {selectedEnquiry.phone}
                </div>
              </div>
              <div>{getEnquiryStatusBadge(selectedEnquiry.status)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span className="text-muted">Service / Type:</span>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {selectedEnquiry.projectType || selectedEnquiry.service || 'Architecture'}
                </div>
              </div>
              <div>
                <span className="text-muted">Budget / Scope:</span>
                <div style={{ fontWeight: 600 }}>{selectedEnquiry.budget || 'Not specified'}</div>
              </div>
            </div>

            <div>
              <span className="text-muted" style={{ fontSize: '12px' }}>Client Message:</span>
              <div style={{
                backgroundColor: '#F8FAFC',
                padding: '12px',
                borderRadius: '6px',
                marginTop: '4px',
                fontSize: '13px',
                lineHeight: '1.5',
                whiteSpace: 'pre-line',
                border: '1px solid var(--color-border)'
              }}>
                {selectedEnquiry.message}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Update Enquiry Status</label>
              <select
                className="input"
                value={selectedEnquiry.status}
                onChange={(e) => handleUpdateEnquiryStatus(selectedEnquiry._id, e.target.value)}
              >
                <option value="new">New</option>
                <option value="contacted">Client Contacted</option>
                <option value="in_progress">Consultation In Progress</option>
                <option value="closed">Closed / Converted</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Internal Follow-up Notes</label>
              <textarea
                className="input"
                rows="3"
                placeholder="Notes on client callback, meeting scheduled, quotation sent, etc..."
                value={enquiryNotesInput}
                onChange={(e) => setEnquiryNotesInput(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
