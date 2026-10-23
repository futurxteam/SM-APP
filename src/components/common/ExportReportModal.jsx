import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  Download, 
  Loader2, 
  Check, 
  User, 
  Building2, 
  Filter 
} from 'lucide-react';
import Modal from '../ui/Modal';
import { downloadExportFile } from '../../utils/exportUtils';
import api from '../../services/api';
import dayjs from 'dayjs';

export default function ExportReportModal({
  isOpen,
  onClose,
  title = 'Generate Report',
  reportType = 'pettycash', // 'pettycash' | 'attendance' | 'purchases' | 'materials' | 'workers' | 'users' | 'geo-attendance'
  projectId = '',
  projectCode = '',
  supervisors = [],
  projects = [],
  defaultSupervisorId = 'all',
  defaultProjectId = 'all'
}) {
  const [format, setFormat] = useState('excel'); // 'excel' | 'pdf'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'this_month' | 'custom'
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedSupervisor, setSelectedSupervisor] = useState(defaultSupervisorId || 'all');
  const [selectedProject, setSelectedProject] = useState(projectId || defaultProjectId || 'all');
  const [isDownloading, setIsDownloading] = useState(false);

  const [availableSupervisors, setAvailableSupervisors] = useState(supervisors || []);
  const [availableProjects, setAvailableProjects] = useState(projects || []);

  useEffect(() => {
    if (isOpen) {
      if (defaultSupervisorId) setSelectedSupervisor(defaultSupervisorId);
      if (projectId) setSelectedProject(projectId);
      else if (defaultProjectId) setSelectedProject(defaultProjectId);

      if (reportType === 'geo-attendance') {
        if (!supervisors || supervisors.length === 0) {
          api.get('/admin/users')
            .then(res => {
              const allUsers = res.data?.data || [];
              const sups = allUsers.filter(u => u.role === 'site_supervisor' || u.role === 'project_manager' || u.role === 'super_admin');
              setAvailableSupervisors(sups.length > 0 ? sups : allUsers);
            })
            .catch(() => {
              // fallback: get from projects
              api.get('/projects').then(pRes => {
                const projs = pRes.data?.data || [];
                const sups = [];
                projs.forEach(p => {
                  if (p.assignedSupervisor && !sups.some(s => s._id === p.assignedSupervisor._id)) {
                    sups.push(p.assignedSupervisor);
                  }
                });
                setAvailableSupervisors(sups);
              }).catch(() => {});
            });
        } else {
          setAvailableSupervisors(supervisors);
        }

        if (!projects || projects.length === 0) {
          api.get('/projects').then(res => {
            setAvailableProjects(res.data?.data || []);
          }).catch(() => {});
        } else {
          setAvailableProjects(projects);
        }
      }
    }
  }, [isOpen, defaultSupervisorId, projectId, defaultProjectId, reportType, supervisors, projects]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      // 1. Determine Endpoint path
      let baseEndpoint = '';
      let filePrefix = '';

      switch (reportType) {
        case 'pettycash':
          baseEndpoint = `/exports/pettycash/${projectId}/${format}`;
          filePrefix = `PettyCash_${projectCode || projectId}`;
          break;
        case 'attendance':
          baseEndpoint = `/exports/attendance/${projectId}/${format}`;
          filePrefix = `Attendance_${projectCode || projectId}`;
          break;
        case 'purchases':
          baseEndpoint = `/exports/purchases/${projectId}/${format}`;
          filePrefix = `Purchases_${projectCode || projectId}`;
          break;
        case 'materials':
          baseEndpoint = `/exports/materials/${projectId}/${format}`;
          filePrefix = `Materials_${projectCode || projectId}`;
          break;
        case 'workers':
          baseEndpoint = `/exports/workers/${format}`;
          filePrefix = `Workers_Directory`;
          break;
        case 'users':
          baseEndpoint = `/exports/users/${format}`;
          filePrefix = `Users_Directory`;
          break;
        case 'geo-attendance':
          baseEndpoint = `/exports/geo-attendance/${format}`;
          const supName = availableSupervisors.find(s => s._id === selectedSupervisor)?.name || (selectedSupervisor === 'all' ? 'All_Supervisors' : 'Supervisor');
          filePrefix = `Supervisor_GeoAttendance_${supName.replace(/\s+/g, '_')}`;
          break;
        default:
          baseEndpoint = `/exports/pettycash/${projectId}/${format}`;
          filePrefix = `Report_${projectCode || 'export'}`;
      }

      // 2. Build Query Parameters
      const queryParams = new URLSearchParams();

      if (dateFilter === 'custom') {
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
      } else if (dateFilter !== 'all') {
        queryParams.append('range', dateFilter);
      }

      if (reportType === 'geo-attendance') {
        if (selectedSupervisor) queryParams.append('supervisorId', selectedSupervisor);
        const projIdToUse = projectId || selectedProject;
        if (projIdToUse) queryParams.append('projectId', projIdToUse);
      }

      const queryString = queryParams.toString();
      const finalUrl = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint;

      // 3. Construct File Name
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const rangeTag = dateFilter === 'custom' 
        ? `${startDate}_to_${endDate}` 
        : dateFilter === 'all' 
          ? 'Entire_History' 
          : dateFilter;
      const fileName = `${filePrefix}_${rangeTag}.${ext}`;

      const mimeType = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      await downloadExportFile(finalUrl, fileName, mimeType);
      onClose();
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Format Selector */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
            Choose File Format
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            <button
              type="button"
              onClick={() => setFormat('excel')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 8px',
                borderRadius: '8px',
                border: format === 'excel' ? '2px solid #10B981' : '1px solid var(--color-border)',
                background: format === 'excel' ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-bg-card)',
                color: format === 'excel' ? '#047857' : 'var(--color-text-primary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minWidth: 0,
                boxSizing: 'border-box'
              }}
            >
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: format === 'excel' ? '#10B981' : 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: format === 'excel' ? '#fff' : '#10B981',
                flexShrink: 0
              }}>
                <FileSpreadsheet size={15} />
              </div>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Excel (.xlsx)
              </span>
              {format === 'excel' && <Check size={14} color="#10B981" style={{ flexShrink: 0, marginLeft: 'auto' }} />}
            </button>

            <button
              type="button"
              onClick={() => setFormat('pdf')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 8px',
                borderRadius: '8px',
                border: format === 'pdf' ? '2px solid #EF4444' : '1px solid var(--color-border)',
                background: format === 'pdf' ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-bg-card)',
                color: format === 'pdf' ? '#B91C1C' : 'var(--color-text-primary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minWidth: 0,
                boxSizing: 'border-box'
              }}
            >
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: format === 'pdf' ? '#EF4444' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: format === 'pdf' ? '#fff' : '#EF4444',
                flexShrink: 0
              }}>
                <FileText size={15} />
              </div>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                PDF (.pdf)
              </span>
              {format === 'pdf' && <Check size={14} color="#EF4444" style={{ flexShrink: 0, marginLeft: 'auto' }} />}
            </button>
          </div>
        </div>

        {/* Geo Attendance Specific Selectors */}
        {reportType === 'geo-attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--color-bg-secondary)', padding: '10px', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={13} /> Supervisor Scope
              </label>
              <select
                className="form-control"
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '13px', padding: '7px 8px', borderRadius: '6px' }}
              >
                <option value="all">🌐 All Supervisors</option>
                {availableSupervisors.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.phone || s.email || 'Supervisor'})</option>
                ))}
              </select>
            </div>

            {!projectId && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Building2 size={13} /> Project Scope
                </label>
                <select
                  className="form-control"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '13px', padding: '7px 8px', borderRadius: '6px' }}
                >
                  <option value="all">🏢 All Projects</option>
                  {availableProjects.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Date Filter Selection */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
            Date Filter
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {[
              { id: 'all', label: 'Entire History' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Dates' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDateFilter(opt.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '16px',
                  border: dateFilter === opt.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: dateFilter === opt.id ? 'var(--color-primary)' : 'var(--color-bg-card)',
                  color: dateFilter === opt.id ? '#ffffff' : 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  fontWeight: dateFilter === opt.id ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {dateFilter === 'custom' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px dashed var(--color-border)',
              boxSizing: 'border-box',
              width: '100%',
              overflow: 'hidden'
            }}>
              <div style={{ minWidth: 0 }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '3px', letterSpacing: '0.5px' }}>
                  FROM DATE
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '12px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '3px', letterSpacing: '0.5px' }}>
                  TO DATE
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '12px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', width: '100%', boxSizing: 'border-box' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDownloading}
            style={{ flex: 1, padding: '10px 8px', fontSize: '13px', minWidth: 0 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              flex: 2,
              padding: '10px 8px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: format === 'excel' ? '#10B981' : '#EF4444',
              borderColor: format === 'excel' ? '#10B981' : '#EF4444',
              minWidth: 0,
              whiteSpace: 'nowrap'
            }}
          >
            {isDownloading ? (
              <>
                <Loader2 size={15} className="spin" /> Generating...
              </>
            ) : (
              <>
                <Download size={15} /> Download {format === 'excel' ? 'Excel' : 'PDF'}
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}
