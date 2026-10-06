import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import { getCurrentPosition } from '../../services/geolocationService';
import Button from '../ui/Button';
import { 
  MapPin, Navigation, AlertTriangle, CheckCircle2, 
  Clock, ShieldAlert, RefreshCw, Layers, ShieldCheck,
  Building2, Crosshair, XCircle, X
} from 'lucide-react';

const DAILY_CHECKPOINTS = [
  { slot: '9am', label: '09:00 AM', name: 'Morning Check-in' },
  { slot: '12pm', label: '12:00 PM', name: 'Mid-Day Check-in' },
  { slot: '3pm', label: '03:00 PM', name: 'Afternoon Check-in' },
  { slot: '6pm', label: '06:00 PM', name: 'Evening Check-in' },
];

export const openLocationDeclaration = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hygge:open-location-declaration'));
  }
};

export default function SupervisorLocationBanner() {
  const { user, isSiteSupervisor } = useAuthStore();

  const [pendingState, setPendingState] = useState({
    pending: false,
    pendingCount: 0,
    pendingProjects: [],
    pendingSlot: null,
    slotLabel: '',
    currentSlot: null,
    missedSlots: [],
    recordedSlots: [],
    siteCoordinatesMissing: false,
    project: null,
    availableProjects: [],
  });

  const [isModalDismissed, setIsModalDismissed] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  // Mandatory site coordinate setup state
  const [siteSetupForm, setSiteSetupForm] = useState({
    latitude: '',
    longitude: '',
    radiusMeters: 200,
    address: '',
  });
  const [isSettingSiteCoords, setIsSettingSiteCoords] = useState(false);

  const checkPendingLocation = useCallback(async (targetProjectId) => {
    if (!isSiteSupervisor()) return;

    try {
      const params = {};
      if (targetProjectId) {
        params.projectId = targetProjectId;
      }
      const res = await api.get('/location/pending-checkin', { params });
      const data = res.data;
      if (data.success) {
        if (!data.project) {
          setPendingState({
            pending: false,
            pendingCount: 0,
            pendingProjects: [],
            pendingSlot: null,
            slotLabel: '',
            currentSlot: null,
            missedSlots: [],
            recordedSlots: [],
            siteCoordinatesMissing: false,
            project: null,
            availableProjects: data.availableProjects || [],
          });
          setIsManualOpen(false);
          setError(null);
          setGpsStatus('');
          return;
        }

        const localHour = new Date().getHours();
        const localCurrentSlot =
          localHour < 12 ? '9am' :
          localHour < 15 ? '12pm' :
          localHour < 18 ? '3pm' : '6pm';

        const slotCutoffs = { '9am': 12, '12pm': 15, '3pm': 18, '6pm': 21 };
        const allSlots = ['9am', '12pm', '3pm', '6pm'];

        const recordedSlots = data.project?.recordedSlots || data.recordedSlots || [];

        const localMissedSlots = allSlots.filter((s) => {
          const cutoff = slotCutoffs[s];
          return localHour >= cutoff && !recordedSlots.includes(s);
        });

        const isCurrentSlotPending = !recordedSlots.includes(localCurrentSlot);

        const slotLabels = {
          '9am': 'Morning (9AM) Slot – Location Declaration',
          '12pm': 'Mid-Day (12PM) Slot – Location Declaration',
          '3pm': 'Afternoon (3PM) Slot – Location Declaration',
          '6pm': 'Evening (6PM) Slot – Location Declaration',
        };

        // Check if project scheduled time period has finished (past endDate)
        const isPeriodFinished = data.project?.endDate && new Date() > new Date(new Date(data.project.endDate).setHours(23, 59, 59, 999));

        const isTargetPending = isPeriodFinished
          ? false
          : (data.project?.siteCoordinatesMissing
              ? true
              : (data.project?.pending !== undefined ? data.project.pending : isCurrentSlotPending));

        const validAvailableProjects = (data.availableProjects || data.projects || []).filter(p => {
          if (!p.endDate) return true;
          return new Date() <= new Date(new Date(p.endDate).setHours(23, 59, 59, 999));
        });

        const validPendingProjects = (data.pendingProjects || (isTargetPending ? [data.project] : [])).filter(p => {
          if (!p.endDate) return true;
          return new Date() <= new Date(new Date(p.endDate).setHours(23, 59, 59, 999));
        });

        setPendingState({
          pending: validPendingProjects.length > 0,
          pendingCount: validPendingProjects.length,
          pendingProjects: validPendingProjects,
          pendingSlot: isTargetPending ? localCurrentSlot : null,
          slotLabel: slotLabels[localCurrentSlot] || data.project?.slotLabel || data.slotLabel || '',
          currentSlot: localCurrentSlot,
          missedSlots: localMissedSlots,
          recordedSlots,
          siteCoordinatesMissing: isPeriodFinished ? false : !!data.project?.siteCoordinatesMissing,
          project: data.project || null,
          availableProjects: validAvailableProjects,
        });

        if (isCurrentSlotPending && !isPeriodFinished) {
          setSelectedSlot(localCurrentSlot);
        }

        if (data.project?.siteCoordinatesMissing && data.project) {
          setSiteSetupForm((prev) => ({
            ...prev,
            address: data.project.name || '',
          }));
        }
      }
    } catch (err) {
      console.warn('Location pending check error', err);
    }
  }, [isSiteSupervisor]);

  useEffect(() => {
    if (!isSiteSupervisor()) return;

    checkPendingLocation();

    // Re-check periodically every 60 seconds
    const interval = setInterval(() => checkPendingLocation(pendingState.project?._id), 60000);
    const handleFocus = () => checkPendingLocation(pendingState.project?._id);

    const handleManualOpen = (e) => {
      setIsModalDismissed(false);
      setIsManualOpen(true);
      const targetId = e?.detail?.projectId || pendingState.project?._id;
      checkPendingLocation(targetId);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('hygge:open-location-declaration', handleManualOpen);
    window.addEventListener('hygge:open-location-modal', handleManualOpen);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('hygge:open-location-declaration', handleManualOpen);
      window.removeEventListener('hygge:open-location-modal', handleManualOpen);
    };
  }, [isSiteSupervisor, checkPendingLocation, pendingState.project?._id]);

  const getCurrentSlotKey = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '9am';
    if (hour < 15) return '12pm';
    if (hour < 18) return '3pm';
    return '6pm';
  };

  const isCurrentSlotStillSubmittable = () => {
    const hour = new Date().getHours();
    if (hour < 9 || hour >= 20) return false;

    const currentSlot = getCurrentSlotKey();
    const isRecorded = pendingState.recordedSlots?.includes(currentSlot);
    if (isRecorded) return false;

    const slotWindow = { '9am': [9, 12], '12pm': [12, 15], '3pm': [15, 18], '6pm': [18, 20] };
    const [start, end] = slotWindow[currentSlot] || [0, 0];
    return hour >= start && hour < end;
  };

  const getSlotState = (slotKey) => {
    const isRecorded = pendingState.recordedSlots?.includes(slotKey);
    if (isRecorded) return { status: 'completed', label: 'COMPLETED', desc: 'Verified on site' };

    const currentHour = new Date().getHours();
    const cutoffs = { '9am': 12, '12pm': 15, '3pm': 18, '6pm': 21 };
    const starts = { '9am': 8, '12pm': 12, '3pm': 15, '6pm': 18 };

    const cutoff = cutoffs[slotKey] || 24;
    const start = starts[slotKey] || 0;

    if (currentHour >= cutoff) {
      return { status: 'missed', label: 'NOT SUBMITTED', desc: 'Window Expired • Submission closed' };
    }
    if (currentHour >= start && currentHour < cutoff) {
      return { status: 'ready', label: 'ACTIVE NOW', desc: 'Current Check-in Window • Submit GPS' };
    }
    return { status: 'upcoming', label: 'UPCOMING', desc: `Scheduled at ${DAILY_CHECKPOINTS.find(c => c.slot === slotKey)?.label || slotKey}` };
  };

  // Transmit Supervisor Coordinates
  const handleTransmitCoordinates = async () => {
    setIsTransmitting(true);
    setError(null);
    setSuccessResult(null);
    setGpsStatus('Requesting precise GPS coordinates from device sensor...');

    const targetSlot = getCurrentSlotKey();

    if (!pendingState.project?._id) {
      setError('No active project is selected.');
      setIsTransmitting(false);
      setGpsStatus('');
      return;
    }

    try {
      const pos = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });

      const { latitude, longitude, accuracy } = pos;
      setGpsStatus(`GPS signal locked (Accuracy: ±${Math.round(accuracy || 0)}m). Submitting to server...`);

      const res = await api.post('/location/checkin', {
        projectId: pendingState.project._id,
        latitude,
        longitude,
        accuracy,
        slot: targetSlot,
        deviceInfo: `${navigator.platform || 'Device'} - ${(navigator.userAgent || '').slice(0, 80)}`,
      });

      setIsTransmitting(false);
      setGpsStatus('');
      setSuccessResult(res.data.data);

      setPendingState((prev) => ({
        ...prev,
        pending: false,
        pendingSlot: null,
        recordedSlots: [...(prev.recordedSlots || []).filter(s => s !== targetSlot), targetSlot],
      }));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hygge:location-updated', { detail: { slot: targetSlot } }));
      }

      // After 2 seconds of showing confirmation, refresh status for parallel projects
      setTimeout(() => {
        setSuccessResult(null);
        setIsManualOpen(false);
        checkPendingLocation();
      }, 2000);
    } catch (err) {
      setIsTransmitting(false);
      setGpsStatus('');
      setError(err.response?.data?.message || err.message || 'Failed to submit coordinates to server.');
    }
  };

  // Mandatory Initial Site Coordinates Setup by Supervisor
  const handleSetSiteCoordinates = async (e) => {
    e.preventDefault();
    if (!siteSetupForm.latitude || !siteSetupForm.longitude) {
      setError('Please capture or enter valid site latitude and longitude.');
      return;
    }

    setIsSettingSiteCoords(true);
    setError(null);

    try {
      await api.put(`/location/project/${pendingState.project._id}/coordinates`, {
        latitude: Number(siteSetupForm.latitude),
        longitude: Number(siteSetupForm.longitude),
        radiusMeters: Number(siteSetupForm.radiusMeters) || 200,
        address: siteSetupForm.address,
      });

      setIsSettingSiteCoords(false);
      checkPendingLocation(pendingState.project._id);
    } catch (err) {
      setIsSettingSiteCoords(false);
      setError(err.response?.data?.message || 'Failed to save site coordinates.');
    }
  };

  const handleCaptureCurrentGPSAsSite = async () => {
    setGpsStatus('Capturing current GPS for site center...');
    setError(null);
    try {
      const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      setSiteSetupForm((prev) => ({
        ...prev,
        latitude: Number(pos.latitude.toFixed(6)),
        longitude: Number(pos.longitude.toFixed(6)),
      }));
      setGpsStatus('');
    } catch (err) {
      setGpsStatus('');
      setError(err.message || 'GPS capture error');
    }
  };

  if (!isSiteSupervisor()) {
    return null;
  }

  // The modal overlay is visible if it hasn't been dismissed AND check-in is pending or manual open or success
  const isModalVisible = !isModalDismissed && (pendingState.pending || isManualOpen || successResult);

  const showFloatingButton =
    !isModalVisible &&
    !!pendingState.project?._id &&
    isCurrentSlotStillSubmittable();

  const floatingQuickButton = showFloatingButton && (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 85,
      }}
      className="supervisor-floating-checkin"
    >
      <button
        type="button"
        onClick={() => {
          setIsModalDismissed(false);
          setIsManualOpen(true);
          checkPendingLocation(pendingState.project?._id);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          padding: '10px 16px',
          borderRadius: '9999px',
          border: 'none',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
          fontWeight: 700,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <MapPin size={16} />
        <span>Declare Site Location</span>
      </button>
    </div>
  );

  return (
    <>
      {/* ── TOP PERSISTENT NOTIFICATION STRIP: ALWAYS VISIBLE AT TOP OF EVERY PAGE WHEN NOT FILLED ── */}
      {pendingState.pending && (
        <div style={{
          backgroundColor: '#FFFBEB',
          borderBottom: '1px solid #FCD34D',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          color: '#92400E',
          position: 'sticky',
          top: 0,
          zIndex: 89,
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <ShieldAlert size={18} color="#D97706" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
              <span style={{ fontWeight: 700, color: '#B45309' }}>
                Site Location Check-in Not Filled:
              </span>{' '}
              <span>
                {(pendingState.pendingProjects?.length > 0
                  ? pendingState.pendingProjects
                  : [pendingState.project]
                ).filter(Boolean).map(p => `${p.name}${p.code ? ` (${p.code})` : ''}`).join(', ')}
              </span>
            </div>

            <span style={{
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              NOT FILLED
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                const targetId = pendingState.pendingProjects?.[0]?._id || pendingState.project?._id;
                setIsModalDismissed(false);
                setIsManualOpen(true);
                checkPendingLocation(targetId);
              }}
              className="btn btn-sm"
              style={{
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <MapPin size={13} />
              <span>Check-in Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {floatingQuickButton}

      {/* ── MODAL OVERLAY: FULL POPUP (NOW ALWAYS CLOSABLE) ── */}
      {isModalVisible && (
        <div className="supervisor-location-overlay" style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflowY: 'auto'
        }}>
          <div className="location-modal-card" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            maxWidth: '540px',
            width: '100%',
            padding: '24px',
            textAlign: 'center',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Close Button: Always available so user is never trapped */}
            <button
              type="button"
              onClick={() => {
                setIsModalDismissed(true);
                setIsManualOpen(false);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
                transition: 'background 0.15s ease'
              }}
              aria-label="Close"
              title="Close modal (notification remains at top of page)"
            >
              <X size={18} />
            </button>

            {successResult ? (
              /* CASE 1: SUCCESS CONFIRMATION */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: '#D1FAE5',
                  border: '3px solid #10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
                  animation: 'scaleUpCard 0.3s ease'
                }}>
                  <CheckCircle2 size={40} />
                </div>

                <div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    {(successResult.slot || 'Check-in').toUpperCase()} Verified
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Location Check-in Recorded!
                  </h2>
                  <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
                    {successResult.deviationFormatted || 'On-site presence confirmed.'}
                  </p>
                  {successResult.distanceFromSiteMeters != null && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#334155',
                      marginTop: '8px'
                    }}>
                      <Crosshair size={14} color="#2563EB" />
                      <span>Distance: <strong>{Math.round(successResult.distanceFromSiteMeters)}m</strong> from site center</span>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#64748B',
                  marginTop: '12px'
                }}>
                  <RefreshCw size={14} className="spin-icon" />
                  <span>Updating site compliance...</span>
                </div>
              </div>
            ) : pendingState.siteCoordinatesMissing ? (
              /* CASE 2: MANDATORY INITIAL SITE COORDINATE CONFIGURATION */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                  boxShadow: '0 8px 20px rgba(220, 38, 38, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  margin: '0 auto'
                }}>
                  <ShieldAlert size={34} />
                </div>

                <div>
                  <div style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}>
                    Initial Site Setup
                  </div>
                  <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Set Project Site Coordinates
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', lineHeight: '1.4' }}>
                    Project <strong>{pendingState.project?.name}</strong> has no site coordinates defined. Please configure coordinates to enable geofence check-ins.
                  </p>
                </div>

                {error && (
                  <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    textAlign: 'left'
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {gpsStatus && (
                  <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>
                    {gpsStatus}
                  </div>
                )}

                <form onSubmit={handleSetSiteCoordinates} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Navigation}
                      onClick={handleCaptureCurrentGPSAsSite}
                      style={{ width: '100%' }}
                    >
                      Capture Current Device GPS
                    </Button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Site Latitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 12.971598"
                        className="form-control"
                        style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                        value={siteSetupForm.latitude}
                        onChange={(e) => setSiteSetupForm({ ...siteSetupForm, latitude: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Site Longitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 77.594566"
                        className="form-control"
                        style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                        value={siteSetupForm.longitude}
                        onChange={(e) => setSiteSetupForm({ ...siteSetupForm, longitude: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Geofence Radius (Meters)</label>
                    <input
                      type="number"
                      placeholder="200"
                      className="form-control"
                      style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                      value={siteSetupForm.radiusMeters}
                      onChange={(e) => setSiteSetupForm({ ...siteSetupForm, radiusMeters: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSettingSiteCoords}
                    style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                  >
                    {isSettingSiteCoords ? 'Saving Site Coordinates...' : 'Save Coordinates'}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setIsModalDismissed(true);
                    setIsManualOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '6px',
                    textDecoration: 'underline'
                  }}
                >
                  Dismiss for now (shown as not filled at top of page)
                </button>
              </div>
            ) : (
              /* CASE 3: SCHEDULED / ON-DEMAND LOCATION CHECK-IN */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  margin: '0 auto'
                }}>
                  <MapPin size={34} />
                </div>

                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    color: '#92400E',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    <Clock size={12} />
                    <span>{pendingState.slotLabel || 'Site Supervisor Location Declaration'}</span>
                  </div>

                  <h2 style={{ fontSize: '21px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                    {pendingState.pending ? 'Supervisor Location Required' : 'Declare Site Location'}
                  </h2>

                  <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', lineHeight: '1.5' }}>
                    Submit your real-time GPS location to verify physical presence at your active project site.
                  </p>
                </div>

                {/* ── PARALLEL ACTIVE SITES SELECTOR (IF MULTIPLE ACTIVE PROJECTS ASSIGNED) ── */}
                {pendingState.availableProjects && pendingState.availableProjects.length > 1 && (
                  <div style={{
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Active Projects Assigned in Parallel:
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {pendingState.availableProjects.map((p) => {
                        const isSelected = pendingState.project?._id === p._id;
                        return (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() => checkPendingLocation(p._id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1',
                              backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                              color: isSelected ? '#1D4ED8' : '#334155',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Building2 size={13} color={isSelected ? '#2563EB' : '#64748B'} />
                            <span>{p.code ? `[${p.code}] ` : ''}{p.name}</span>
                            {p.pending ? (
                              <span style={{
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '10px'
                              }}>
                                Not Filled
                              </span>
                            ) : (
                              <span style={{
                                backgroundColor: '#ECFDF5',
                                color: '#059669',
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '10px'
                              }}>
                                ✓ Done
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Currently Selected Project Badge */}
                <div style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>
                      Selected Site
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                      {pendingState.project?.name || 'Active Project Site'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    padding: '4px 10px',
                    borderRadius: '4px'
                  }}>
                    {pendingState.project?.code || 'SITE'}
                  </div>
                </div>

                {/* 4-Checkpoint Daily Compliance Schedule */}
                <div style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px',
                  textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Daily Checkpoint Schedule
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                      4 Mandatory Intervals
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {DAILY_CHECKPOINTS.map((item) => {
                      const slotInfo = getSlotState(item.slot);
                      const currentActiveKey = getCurrentSlotKey();
                      const isCurrentActive = currentActiveKey === item.slot;

                      let badgeColor = '#64748B';
                      let badgeBg = '#F1F5F9';
                      let icon = <Clock size={15} color="#94A3B8" />;
                      let borderStyle = '1px solid #E2E8F0';
                      let bgStyle = '#F8FAFC';
                      let cursorStyle = 'default';

                      if (slotInfo.status === 'completed') {
                        badgeColor = '#047857';
                        badgeBg = '#ECFDF5';
                        borderStyle = '1px solid #BBF7D0';
                        bgStyle = '#F0FDF4';
                        icon = <CheckCircle2 size={15} color="#059669" />;
                      } else if (slotInfo.status === 'missed') {
                        badgeColor = '#B91C1C';
                        badgeBg = '#FEE2E2';
                        borderStyle = '1px solid #FECACA';
                        bgStyle = '#FFF5F5';
                        cursorStyle = 'not-allowed';
                        icon = <XCircle size={15} color="#DC2626" />;
                      } else if (slotInfo.status === 'ready' || isCurrentActive) {
                        badgeColor = '#1D4ED8';
                        badgeBg = '#EFF6FF';
                        borderStyle = '2px solid #3B82F6';
                        bgStyle = '#F0F9FF';
                        cursorStyle = 'pointer';
                        icon = <Navigation size={15} color="#2563EB" />;
                      } else {
                        cursorStyle = 'not-allowed';
                      }

                      return (
                        <div
                          key={item.slot}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: bgStyle,
                            border: borderStyle,
                            boxShadow: (slotInfo.status === 'ready' || isCurrentActive) ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
                            cursor: cursorStyle,
                            transition: 'all 0.15s ease',
                            opacity: slotInfo.status === 'missed' ? 0.9 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {icon}
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: (slotInfo.status === 'ready' || isCurrentActive) ? 700 : 600, color: '#1E293B' }}>
                                {item.label} <span style={{ fontWeight: 400, color: '#64748B', fontSize: '12px' }}>— {item.name}</span>
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: slotInfo.status === 'missed' ? '#DC2626' : (slotInfo.status === 'completed' ? '#059669' : ((slotInfo.status === 'ready' || isCurrentActive) ? '#2563EB' : '#64748B')),
                                fontWeight: (slotInfo.status === 'missed' || slotInfo.status === 'ready' || isCurrentActive) ? 600 : 400
                              }}>
                                {slotInfo.desc}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${slotInfo.status === 'completed' ? '#A7F3D0' : (slotInfo.status === 'missed' ? '#FCA5A5' : (slotInfo.status === 'ready' ? '#BFDBFE' : 'transparent'))}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {slotInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {pendingState.missedSlots?.length > 0 && (() => {
                    const currentKey = getCurrentSlotKey();
                    const currentSlotObj = DAILY_CHECKPOINTS.find(c => c.slot === currentKey);
                    const missedLabels = pendingState.missedSlots
                      .map(s => DAILY_CHECKPOINTS.find(c => c.slot === s)?.label || s)
                      .join(', ');
                    return (
                      <div style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        fontSize: '11px',
                        color: '#991B1B',
                        lineHeight: '1.4'
                      }}>
                        ⚠️ <strong>Notice:</strong> Past checkpoint(s) [{missedLabels}] cannot be back-submitted. Only the current <strong>{currentSlotObj?.label || currentKey}</strong> check-in window can be submitted.
                      </div>
                    );
                  })()}
                </div>

                {/* Error Message */}
                {error && (
                  <div style={{
                    width: '100%',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    textAlign: 'left'
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Live GPS Lock Status */}
                {gpsStatus && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#2563EB',
                    fontWeight: 600,
                    backgroundColor: '#EFF6FF',
                    padding: '6px 14px',
                    borderRadius: '9999px'
                  }}>
                    <RefreshCw size={13} className="spin-icon" />
                    <span>{gpsStatus}</span>
                  </div>
                )}

                {/* Transmit CTA Button */}
                {(() => {
                  const currentActiveKey = getCurrentSlotKey();
                  const activeState = getSlotState(currentActiveKey);
                  const isCompleted = activeState.status === 'completed';
                  const isMissed = activeState.status === 'missed';
                  const activeSlotObj = DAILY_CHECKPOINTS.find(c => c.slot === currentActiveKey);

                  return (
                    <div style={{ width: '100%', marginTop: '4px' }}>
                      <Button
                        type="button"
                        variant={isCompleted ? 'secondary' : 'primary'}
                        icon={isCompleted ? CheckCircle2 : Navigation}
                        onClick={handleTransmitCoordinates}
                        disabled={isTransmitting || isCompleted || isMissed}
                        style={{
                          width: '100%',
                          padding: '12px 20px',
                          fontSize: '14px',
                          fontWeight: 700,
                          backgroundColor: isCompleted ? '#F1F5F9' : '#2563EB',
                          borderColor: isCompleted ? '#E2E8F0' : '#1D4ED8',
                          color: isCompleted ? '#475569' : '#FFFFFF',
                          boxShadow: isCompleted ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        {isTransmitting
                          ? 'Acquiring GPS Signal...'
                          : isCompleted
                          ? `✓ ${activeSlotObj?.label} Check-in Already Completed`
                          : isMissed
                          ? 'Check-in Windows Closed for Today'
                          : `Transmit GPS for ${pendingState.project?.name || 'Site'}`}
                      </Button>

                      {error && (
                        <button
                          type="button"
                          onClick={handleTransmitCoordinates}
                          className="btn btn-outline btn-sm"
                          style={{ width: '100%', marginTop: '8px', fontSize: '12px' }}
                        >
                          <RefreshCw size={12} /> Try Again
                        </button>
                      )}
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    setIsModalDismissed(true);
                    setIsManualOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '4px',
                    textDecoration: 'underline'
                  }}
                >
                  Dismiss for now (shown as not filled at top of page)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
