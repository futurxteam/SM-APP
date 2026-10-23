import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import TrackingMap from './TrackingMap';
import ProjectCoordinateModal from './ProjectCoordinateModal';
import ExportReportModal from '../common/ExportReportModal';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
  MapPin, Calendar, Clock, Navigation, Download,
  CheckCircle2, AlertTriangle, XCircle, Settings,
  ExternalLink, User, ShieldCheck, RefreshCw, FileSpreadsheet
} from 'lucide-react';

export default function LocationTrackingTab({ projectId, project, onProjectUpdated }) {
  const { isSuperAdmin, isProjectManager, isSiteSupervisor } = useAuthStore();
  const canManageCoords = isSuperAdmin() || isProjectManager() || isSiteSupervisor();

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoordModalOpen, setIsCoordModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    loadLocationLogs();
    const handleUpdate = () => loadLocationLogs();
    window.addEventListener('hygge:location-updated', handleUpdate);
    return () => window.removeEventListener('hygge:location-updated', handleUpdate);
  }, [projectId, selectedDate]);

  const loadLocationLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/location/project/${projectId}/logs?date=${selectedDate}`);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load project location logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open(`/api/location/project/${projectId}/export?date=${selectedDate}`, '_blank');
  };

  const siteCoordinates = data?.project?.coordinates || project?.coordinates;
  const checkpoints = data?.checkpoints || {};
  const stats = data?.stats || {};
  const supervisor = data?.project?.assignedSupervisor || project?.assignedSupervisor;

  const slotsList = [
    { key: '9am', label: '9:00 AM Check-in', timeLabel: '09:00 AM', color: '#0284C7' },
    { key: '12pm', label: '12:00 PM Check-in', timeLabel: '12:00 PM', color: '#059669' },
    { key: '3pm', label: '3:00 PM Check-in', timeLabel: '03:00 PM', color: '#D97706' },
    { key: '6pm', label: '6:00 PM Check-in', timeLabel: '06:00 PM', color: '#7C3AED' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header with Date Filter & Action Buttons */}
      <Card>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} color="var(--color-brand)" />
              Supervisor Location & Geofence Tracking
            </h2>
            <p className="text-muted" style={{ marginTop: '2px' }}>
              3-Hour site checkpoint monitoring (9 AM, 12 PM, 3 PM, 6 PM) with deviation meters/km off project site.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
            {/* Date Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${selectedDate === dayjs().format('YYYY-MM-DD') ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}
              >
                Today
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedDate === dayjs().subtract(1, 'day').format('YYYY-MM-DD') ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedDate(dayjs().subtract(1, 'day').format('YYYY-MM-DD'))}
              >
                Yesterday
              </button>
              <input
                type="date"
                className="input"
                style={{ padding: '5px 10px', fontSize: '13px', width: '145px' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
              {canManageCoords && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Settings}
                  onClick={() => setIsCoordModalOpen(true)}
                >
                  {siteCoordinates?.latitude ? 'Edit Coordinates' : 'Set Coordinates'}
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={() => setIsExportModalOpen(true)}
              >
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Site Geofence Summary & KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
        {/* Project Site Coordinates Card */}
        <Card style={{ borderLeft: '4px solid var(--color-brand)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
              Project Site Geofence
            </span>
            {siteCoordinates?.latitude ? (
              <span style={{
                backgroundColor: '#ECFDF5',
                color: '#059669',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                CONFIGURED
              </span>
            ) : (
              <span style={{
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                NOT CONFIGURED
              </span>
            )}
          </div>

          <div style={{ marginTop: '8px' }}>
            {siteCoordinates?.latitude ? (
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>
                  {siteCoordinates.latitude.toFixed(6)}, {siteCoordinates.longitude.toFixed(6)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Perimeter Radius: <strong>{siteCoordinates.radiusMeters || 200} meters</strong>
                </div>
                {siteCoordinates.address && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {siteCoordinates.address}
                  </div>
                )}
                <a
                  href={`https://www.google.com/maps?q=${siteCoordinates.latitude},${siteCoordinates.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-brand)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '6px',
                  }}
                >
                  <ExternalLink size={12} /> View Center Pin in Google Maps
                </a>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#DC2626', marginTop: '6px' }}>
                Site center coordinates not configured. Click "Set Site Coordinates" to add latitude & longitude.
              </div>
            )}
          </div>
        </Card>

        {/* Assigned Supervisor(s) */}
        <Card>
          <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            Assigned Site Supervisor(s)
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {(data?.project?.assignedSupervisors?.length > 0
              ? data.project.assignedSupervisors
              : (supervisor ? [supervisor] : [])
            ).map((s, idx) => (
              <div key={s._id || idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: 'var(--color-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0
                }}>
                  {s?.name ? s.name.charAt(0).toUpperCase() : <User size={16} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{s?.name || 'Unassigned'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {s?.phone || s?.email || 'No contact provided'}
                  </div>
                </div>
              </div>
            ))}
            {(!data?.project?.assignedSupervisors?.length && !supervisor) && (
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>Unassigned</div>
            )}
          </div>
        </Card>

        {/* Compliance Rate */}
        <Card>
          <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            Site Presence Compliance ({selectedDate})
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <div style={{
              fontSize: '26px',
              fontWeight: 700,
              color: stats.complianceRate >= 75 ? '#059669' : stats.complianceRate >= 50 ? '#D97706' : '#DC2626',
            }}>
              {stats.complianceRate || 0}%
            </div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              ({stats.onSiteCount || 0} / {stats.trackedCount || 0} on site)
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {stats.trackedCount || 0} of 4 scheduled checkpoints recorded
          </div>
        </Card>
      </div>

      {/* 3. Side-by-Side 4 Scheduled Checkpoints (9 AM, 12 PM, 3 PM, 6 PM) + Login */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', margin: 0 }}>3-Hour Checkpoint Deviation Reports</h3>
            <span className="text-muted" style={{ fontSize: '12px' }}>
              Comparing supervisor's GPS coordinates against project perimeter
            </span>
          </div>
        </div>

        <div className="responsive-checkpoint-grid">
          {slotsList.map(({ key, label, timeLabel, color }) => {
            const slotDetail = (data?.checkpointDetails && data.checkpointDetails[key]) || {};
            const log = checkpoints[key];
            const entries = slotDetail.entries || [];
            const hasEntries = entries.length > 0;
            const hasAtLeastOneOnSite = slotDetail.hasAtLeastOneOnSite || (log && log.status === 'on_site');
            const bothOnSite = slotDetail.bothOnSite;
            const missedByBoth = slotDetail.missedByBoth;
            const anotherSiteCount = slotDetail.anotherSiteCount || 0;
            const isRecorded = hasAtLeastOneOnSite || entries.some(e => e.status !== 'not_submitted') || !!log;

            const isSlotMissed = () => {
              const isSelectedDateToday = selectedDate === dayjs().format('YYYY-MM-DD');
              const isSelectedDatePast = dayjs(selectedDate).isBefore(dayjs().format('YYYY-MM-DD'), 'day');
              if (isSelectedDatePast) return true;
              if (!isSelectedDateToday) return false;

              const hour = dayjs().hour();
              const cutoffs = { '9am': 12, '12pm': 15, '3pm': 18, '6pm': 21 };
              return hour >= (cutoffs[key] || 24);
            };

            const missed = !hasAtLeastOneOnSite && isSlotMissed();

            return (
              <Card
                key={key}
                style={{
                  borderTop: `4px solid ${color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  minWidth: 0,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color }}>{label}</span>
                    {hasAtLeastOneOnSite ? (
                      bothOnSite ? (
                        <span style={{
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}>
                          🟢 BOTH ON SITE
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}>
                          🟢 ON SITE COVERED
                        </span>
                      )
                    ) : missed ? (
                      anotherSiteCount > 0 ? (
                        <span style={{
                          backgroundColor: '#FFFBEB',
                          color: '#D97706',
                          border: '1px solid #FDE68A',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}>
                          ⚠️ ANOTHER SITE DECLARED
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}>
                          {missedByBoth ? '❌ MISSED BY BOTH' : '❌ NOT SUBMITTED'}
                        </span>
                      )
                    ) : (
                      <span style={{
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}>
                        ⏱️ DUE / UPCOMING
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Target Window: {timeLabel}
                  </div>

                  {/* Multi-Supervisor Breakdown */}
                  {/* Multi-Supervisor Breakdown: Admin only sees each interval and which supervisor marked for it and his location */}
                  {(() => {
                    const markedEntries = (entries || []).filter(e => e.status !== 'not_submitted');

                    if (markedEntries.length > 0) {
                      return (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {markedEntries.map((entry, idx) => {
                            const isSupOnSite = entry.status === 'on_site';
                            const isAnotherSite = entry.status === 'another_site';
                            const isNearSite = entry.status === 'near_site';
                            const isOffSite = entry.status === 'off_site';

                            return (
                              <div
                                key={entry.supervisor?._id || idx}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  border: isSupOnSite
                                    ? '1.5px solid #BBF7D0'
                                    : isAnotherSite
                                    ? '1.5px solid #BFDBFE'
                                    : isNearSite
                                    ? '1.5px solid #FDE68A'
                                    : '1.5px solid #FECACA',
                                  backgroundColor: isSupOnSite
                                    ? '#F0FDF4'
                                    : isAnotherSite
                                    ? '#EFF6FF'
                                    : isNearSite
                                    ? '#FFFBEB'
                                    : '#FEF2F2',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '50%',
                                      backgroundColor: isSupOnSite ? '#10B981' : isAnotherSite ? '#2563EB' : '#D97706',
                                      color: '#FFFFFF',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      {entry.supervisor?.name?.charAt(0) || 'S'}
                                    </div>
                                    <strong style={{ fontSize: '13px', color: '#1E293B' }}>{entry.supervisor?.name}</strong>
                                  </div>

                                  {isSupOnSite && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>
                                      🟢 ON SITE
                                    </span>
                                  )}
                                  {isAnotherSite && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '4px' }}>
                                      🏢 ANOTHER SITE
                                    </span>
                                  )}
                                  {isNearSite && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '4px' }}>
                                      🟡 NEAR SITE
                                    </span>
                                  )}
                                  {isOffSite && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 8px', borderRadius: '4px' }}>
                                      🔴 OFF SITE
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontSize: '11px', marginTop: '6px', color: '#475569' }}>
                                  {isAnotherSite ? (
                                    <div style={{ color: '#1E40AF', fontWeight: 600 }}>
                                      Another site: <strong>{entry.siteName}</strong> {entry.siteCode ? `[${entry.siteCode}]` : ''} {entry.timeRecorded ? `(${dayjs(entry.timeRecorded).format('hh:mm A')})` : ''}
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                      <span>{entry.deviationFormatted} {entry.timeRecorded ? `(${dayjs(entry.timeRecorded).format('hh:mm A')})` : ''}</span>
                                      {entry.latitude && (
                                        <a
                                          href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ color: 'var(--color-brand)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                        >
                                          <ExternalLink size={11} /> Map
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    if (isRecorded) {
                      return (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: log.status === 'on_site' ? '#F0FDF4' : '#FEF2F2',
                            border: `1.5px solid ${log.status === 'on_site' ? '#BBF7D0' : '#FECACA'}`,
                          }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: log.status === 'on_site' ? '#15803D' : '#B91C1C' }}>
                              {log.supervisor?.name || 'Supervisor'}: {log.deviationFormatted}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Logged: {dayjs(log.timeRecorded).format('hh:mm A')}</span>
                              {log.latitude && (
                                <a
                                  href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: 'var(--color-brand)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                >
                                  <ExternalLink size={11} /> Map
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: missed ? '#FEF2F2' : '#F8FAFC',
                        border: `1px dashed ${missed ? '#FECACA' : '#CBD5E1'}`,
                        fontSize: '11px',
                        color: missed ? '#DC2626' : '#64748B',
                        textAlign: 'center',
                      }}>
                        {missed ? '❌ No check-in recorded for this interval' : '⏱️ Waiting for check-in submission'}
                      </div>
                    );
                  })()}

                  {/* Summary Alert when missed */}
                  {missed && !hasAtLeastOneOnSite && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#991B1B',
                      fontSize: '11px',
                    }}>
                      {missedByBoth ? (
                        <span><strong>Missed by both supervisors:</strong> Physical presence on site was not submitted in the {timeLabel} window.</span>
                      ) : anotherSiteCount > 0 ? (
                        <span><strong>No supervisor on site:</strong> Marked on another site, but no supervisor verified physical presence on this site.</span>
                      ) : (
                        <span><strong>Not Submitted:</strong> Checkpoint not recorded within {timeLabel} window.</span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Map */}
      <Card>
        <div className="map-header-container" style={{ marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', margin: 0 }}>Site Perimeter & Movement Map</h3>
            <p className="text-muted" style={{ fontSize: '13px', marginTop: '2px', marginBottom: 0 }}>
              Visual geofence circle (blue perimeter) and supervisor checkpoint pins for {selectedDate}.
            </p>
          </div>

          <div className="map-legend-bar">
            <div className="map-legend-pill">
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#1E3A5F', flexShrink: 0 }} />
              <span>Project Site</span>
            </div>
            <div className="map-legend-pill">
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284C7', flexShrink: 0 }} />
              <span>9 AM</span>
            </div>
            <div className="map-legend-pill">
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#059669', flexShrink: 0 }} />
              <span>12 PM</span>
            </div>
            <div className="map-legend-pill">
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D97706', flexShrink: 0 }} />
              <span>3 PM</span>
            </div>
            <div className="map-legend-pill">
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#7C3AED', flexShrink: 0 }} />
              <span>6 PM</span>
            </div>
          </div>
        </div>

        <TrackingMap
          siteCoordinates={siteCoordinates}
          checkpoints={checkpoints}
          height="380px"
        />
      </Card>

      {/* 5. Detailed Attendance & Location Audit Table */}
      <Card>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', margin: 0 }}>Complete Location Audit Log</h3>
            <span className="text-muted" style={{ fontSize: '12px' }}>Logs for {selectedDate}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadLocationLogs}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {(!data?.allLogs || data.allLogs.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No supervisor location check-ins recorded on {selectedDate}.
          </div>
        ) : (
          <>
            <div className="table-scroll-hint">← Scroll horizontally to view full audit logs →</div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time Recorded</th>
                    <th>Slot</th>
                    <th>Supervisor</th>
                    <th>Coordinates</th>
                    <th>Distance</th>
                    <th>Deviation Report</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allLogs.map((log) => (
                    <tr key={log._id}>
                      <td>{dayjs(log.timeRecorded).format('hh:mm A')}</td>
                      <td>
                        <strong style={{ textTransform: 'uppercase', color: 'var(--color-brand)' }}>
                          {log.slot}
                        </strong>
                      </td>
                      <td>{log.supervisor?.name || 'Supervisor'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {log.distanceFromSiteMeters != null ? `${log.distanceFromSiteMeters} m` : 'N/A'}
                      </td>
                      <td style={{
                        fontWeight: 600,
                        color: log.status === 'on_site' ? '#059669' : '#DC2626',
                        whiteSpace: 'nowrap',
                      }}>
                        {log.deviationFormatted}
                      </td>
                      <td>
                        {log.status === 'on_site' ? (
                          <span style={{
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                          }}>
                            ON SITE
                          </span>
                        ) : log.status === 'near_site' ? (
                          <span style={{
                            backgroundColor: '#FFFBEB',
                            color: '#D97706',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                          }}>
                            NEAR SITE
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                          }}>
                            OFF SITE
                          </span>
                        )}
                      </td>
                      <td>
                        <a
                          href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline"
                          style={{ padding: '3px 8px', fontSize: '12px' }}
                        >
                          <ExternalLink size={12} /> Map
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Site Coordinates Edit Modal */}
      {isCoordModalOpen && (
        <ProjectCoordinateModal
          isOpen={isCoordModalOpen}
          onClose={() => setIsCoordModalOpen(false)}
          project={project}
          onSaved={(newCoords) => {
            loadLocationLogs();
            if (onProjectUpdated) onProjectUpdated();
          }}
        />
      )}

      {/* Supervisor Geo Attendance Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Supervisor Geo-Attendance Report"
        reportType="geo-attendance"
        projectId={projectId}
        projectCode={project?.code}
        defaultSupervisorId={supervisor?._id || 'all'}
      />
    </div>
  );
}
