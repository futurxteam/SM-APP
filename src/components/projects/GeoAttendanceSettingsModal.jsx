import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import api from '../../services/api';
import {
  MapPin, ShieldCheck, ShieldAlert, CheckCircle2,
  XCircle, User, Users, AlertTriangle, RefreshCw, Info
} from 'lucide-react';

export default function GeoAttendanceSettingsModal({ isOpen, onClose, project, onProjectUpdated }) {
  const [enabled, setEnabled] = useState(true);
  const [disabledSupervisors, setDisabledSupervisors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Extract all supervisors assigned to this project
  const supervisors = useMemo(() => {
    const map = new Map();
    if (Array.isArray(project?.assignedSupervisors)) {
      project.assignedSupervisors.forEach((s) => {
        if (s && (s._id || s.id)) {
          map.set(String(s._id || s.id), s);
        }
      });
    }
    if (project?.assignedSupervisor && (project.assignedSupervisor._id || project.assignedSupervisor.id)) {
      map.set(String(project.assignedSupervisor._id || project.assignedSupervisor.id), project.assignedSupervisor);
    }
    return Array.from(map.values());
  }, [project]);

  useEffect(() => {
    if (project) {
      setEnabled(project.geoAttendance?.enabled ?? true);
      const disabledList = (project.geoAttendance?.disabledSupervisors || []).map((s) =>
        String(s?._id || s.id || s)
      );
      setDisabledSupervisors(disabledList);
      setError(null);
      setSuccessMsg(null);
    }
  }, [project, isOpen]);

  if (!project) return null;

  const handleToggleSupervisor = (supId) => {
    const idStr = String(supId);
    setDisabledSupervisors((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  const handleEnableAll = () => {
    setDisabledSupervisors([]);
  };

  const handleDisableAll = () => {
    const allIds = supervisors.map((s) => String(s._id || s.id));
    setDisabledSupervisors(allIds);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.patch(`/projects/${project._id}/geo-attendance`, {
        enabled,
        disabledSupervisors,
      });

      if (res.data?.success) {
        setSuccessMsg('Settings saved successfully!');
        if (onProjectUpdated) {
          onProjectUpdated(res.data.data);
        }
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update geo-attendance settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSupervisorsCount = supervisors.filter(
    (s) => !disabledSupervisors.includes(String(s._id || s.id))
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supervisor Geo-Attendance Settings"
      maxWidth="560px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} className="spin-icon" /> Saving...
              </span>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Project Context Header */}
        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600 }}>
              Project Target
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-brand)', marginTop: '2px' }}>
              {project.name} <span style={{ color: '#64748B', fontWeight: 500 }}>({project.code})</span>
            </div>
          </div>
          <Badge variant={enabled ? 'active' : 'on_hold'}>
            {enabled ? 'GEO ACTIVE' : 'GEO PAUSED'}
          </Badge>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#15803D',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Master Toggle Card */}
        <div style={{
          border: `1.5px solid ${enabled ? '#86EFAC' : '#CBD5E1'}`,
          backgroundColor: enabled ? '#F0FDF4' : '#F8FAFC',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          transition: 'all 0.2s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: enabled ? '#DCFCE7' : '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: enabled ? '#16A34A' : '#64748B',
                flexShrink: 0,
              }}>
                {enabled ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  Enable Geo-Attendance for this Project
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', lineHeight: 1.4 }}>
                  Master switch for 4-checkpoint site location verification (9 AM, 12 PM, 3 PM, 6 PM).
                </div>
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: enabled ? '#16A34A' : '#CBD5E1',
                borderRadius: '26px',
                transition: '0.2s',
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '20px',
                  width: '20px',
                  left: enabled ? '24px' : '4px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </span>
            </label>
          </div>

          {!enabled && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#FEF3C7',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#92400E',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>Geo-attendance is globally <strong>DISABLED</strong> for all supervisors on this project. Location checkpoints will not be prompted or required.</span>
            </div>
          )}
        </div>

        {/* Assigned Supervisors Section */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--color-brand)" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Assigned Site Supervisors ({supervisors.length})
              </span>
              {enabled && supervisors.length > 0 && (
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  ({activeSupervisorsCount} Active, {supervisors.length - activeSupervisorsCount} Exempted)
                </span>
              )}
            </div>

            {enabled && supervisors.length > 1 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleEnableAll}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={handleDisableAll}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
                >
                  Disable All
                </button>
              </div>
            )}
          </div>

          {supervisors.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed #CBD5E1',
              color: '#64748B',
              fontSize: '13px'
            }}>
              <User size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div>No site supervisors are currently assigned to this project.</div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#94A3B8' }}>
                Assign supervisors by clicking <strong>Edit Project</strong> on the top bar.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {supervisors.map((s) => {
                const sId = String(s._id || s.id);
                const isExempted = disabledSupervisors.includes(sId);
                const isSupervisorActive = enabled && !isExempted;

                return (
                  <div
                    key={sId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: isSupervisorActive ? '#FFFFFF' : '#F8FAFC',
                      border: `1px solid ${isSupervisorActive ? '#E2E8F0' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      opacity: enabled ? 1 : 0.6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isSupervisorActive ? 'rgba(30, 58, 95, 0.1)' : '#E2E8F0',
                        color: isSupervisorActive ? 'var(--color-brand)' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0
                      }}>
                        {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {s.phone || s.email || 'Site Supervisor'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: !enabled
                          ? '#F1F5F9'
                          : isSupervisorActive ? '#DCFCE7' : '#FEF3C7',
                        color: !enabled
                          ? '#94A3B8'
                          : isSupervisorActive ? '#15803D' : '#B45309',
                      }}>
                        {!enabled
                          ? 'PAUSED'
                          : isSupervisorActive ? 'REQUIRED' : 'EXEMPTED'}
                      </span>

                      {/* Individual Toggle Switch */}
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '40px',
                        height: '22px',
                        cursor: enabled ? 'pointer' : 'not-allowed',
                        opacity: enabled ? 1 : 0.5,
                      }}>
                        <input
                          type="checkbox"
                          disabled={!enabled}
                          checked={isSupervisorActive}
                          onChange={() => handleToggleSupervisor(sId)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: enabled ? 'pointer' : 'not-allowed',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: isSupervisorActive ? '#16A34A' : '#CBD5E1',
                          borderRadius: '22px',
                          transition: '0.2s',
                        }}>
                          <span style={{
                            position: 'absolute',
                            height: '16px',
                            width: '16px',
                            left: isSupervisorActive ? '21px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }} />
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info Notice */}
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#1E40AF',
          display: 'flex',
          gap: '8px',
          lineHeight: 1.4
        }}>
          <MapPin size={16} color="#2563EB" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            Exempted supervisors will not be prompted for GPS site check-in banners or marked with missed compliance records for this project.
          </div>
        </div>
      </div>
    </Modal>
  );
}

