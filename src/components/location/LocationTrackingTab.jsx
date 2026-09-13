import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import TrackingMap from './TrackingMap';
import ProjectCoordinateModal from './ProjectCoordinateModal';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
  MapPin, Calendar, Clock, Navigation, Download,
  CheckCircle2, AlertTriangle, XCircle, Settings,
  ExternalLink, User, ShieldCheck, RefreshCw
} from 'lucide-react';

export default function LocationTrackingTab({ projectId, project, onProjectUpdated }) {
  const { isSuperAdmin, isProjectManager, isSiteSupervisor } = useAuthStore();
  const canManageCoords = isSuperAdmin() || isProjectManager() || isSiteSupervisor();

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoordModalOpen, setIsCoordModalOpen] = useState(false);

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
                onClick={handleExportCSV}
              >
                Export CSV
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

        {/* Assigned Supervisor */}
        <Card>
          <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            Assigned Site Supervisor
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              color: 'var(--color-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}>
              {supervisor?.name ? supervisor.name.charAt(0).toUpperCase() : <User size={20} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{supervisor?.name || 'Unassigned'}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {supervisor?.phone || supervisor?.email || 'No contact provided'}
              </div>
            </div>
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
            const log = checkpoints[key];
            const isRecorded = !!log;

            const isSlotMissed = () => {
              const isSelectedDateToday = selectedDate === dayjs().format('YYYY-MM-DD');
              const isSelectedDatePast = dayjs(selectedDate).isBefore(dayjs().format('YYYY-MM-DD'), 'day');
              if (isSelectedDatePast) return true;
              if (!isSelectedDateToday) return false;

              const hour = dayjs().hour();
              const cutoffs = { '9am': 12, '12pm': 15, '3pm': 18, '6pm': 21 };
              return hour >= (cutoffs[key] || 24);
            };

            const missed = !isRecorded && isSlotMissed();

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
                    {isRecorded ? (
                      log.status === 'on_site' ? (
                        <span style={{
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}>
                          🟢 ON SITE
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
                          🟡 NEAR SITE
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
                          🔴 OFF SITE
                        </span>
                      )
                    ) : missed ? (
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
                        ❌ NOT SUBMITTED
                      </span>
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

                  {missed && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#991B1B',
                      fontSize: '11px',
                    }}>
                      <strong>Not Submitted:</strong> Supervisor did not record coordinates within the {timeLabel} window. Expired and cannot be back-submitted.
                    </div>
                  )}

                  {isRecorded ? (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Deviation Box */}
                      <div style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: log.status === 'on_site' ? '#F0FDF4' : log.status === 'near_site' ? '#FFFBEB' : '#FEF2F2',
                        border: `1px solid ${log.status === 'on_site' ? '#BBF7D0' : log.status === 'near_site' ? '#FDE68A' : '#FECACA'}`,
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                          Deviation Report:
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: log.status === 'on_site' ? '#15803D' : log.status === 'near_site' ? '#B45309' : '#B91C1C',
                          marginTop: '2px',
                        }}>
                          {log.deviationFormatted}
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                          <strong>Recorded:</strong> {dayjs(log.timeRecorded).format('hh:mm A')}
                        </div>
                        <div>
                          <strong>Coordinates:</strong> {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                        </div>
                        <div>
                          <strong>Distance:</strong> {log.distanceFromSiteMeters != null ? `${log.distanceFromSiteMeters}m from site center` : 'N/A'}
                        </div>
                        {log.accuracy && (
                          <div className="text-muted">
                            GPS Accuracy: ±{Math.round(log.accuracy)}m
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '16px',
                      padding: '14px',
                      textAlign: 'center',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px dashed var(--color-border)',
                      color: 'var(--color-text-muted)',
                      fontSize: '13px',
                    }}>
                      Check-in not yet recorded for this slot
                    </div>
                  )}
                </div>

                {isRecorded && (
                  <a
                    href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-brand)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <ExternalLink size={12} /> Open in Google Maps
                  </a>
                )}
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
    </div>
  );
}
