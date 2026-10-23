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
          '9am': 'Morning (9 AM) Slot',
          '12pm': 'Mid-Day (12 PM) Slot',
          '3pm': 'Afternoon (3 PM) Slot',
          '6pm': 'Evening (6 PM) Slot',
        };

        // Check if project scheduled time period has finished (past endDate)
        const isPeriodFinished = data.project?.endDate && new Date() > new Date(new Date(data.project.endDate).setHours(23, 59, 59, 999));

        // If supervisor already marked attendance at ANY project for this slot, they are done for this interval!
        const isDoneForInterval = Boolean(data.isDoneForInterval || data.markedOnAnotherSite);
        const isOverallPending = isPeriodFinished
          ? false
          : (!isDoneForInterval && (data.pending !== undefined ? data.pending : isCurrentSlotPending));

        const validAvailableProjects = (data.availableProjects || data.projects || []).filter(p => {
          if (!p.endDate) return true;
          return new Date() <= new Date(new Date(p.endDate).setHours(23, 59, 59, 999));
        });

        const validPendingProjects = isOverallPending
          ? (data.pendingProjects || [data.project]).filter(p => {
            if (!p.endDate) return true;
            return new Date() <= new Date(new Date(p.endDate).setHours(23, 59, 59, 999));
          })
          : [];

        const chosenProject = (data.hasAtLeastOneOnSiteAlready && validPendingProjects.length > 0)
          ? (validPendingProjects.find(p => !p.coveredByCoSupervisor) || validPendingProjects[0])
          : (data.project || validAvailableProjects[0] || null);

        setPendingState({
          pending: isOverallPending && validPendingProjects.length > 0,
          pendingCount: isOverallPending ? validPendingProjects.length : 0,
          pendingProjects: validPendingProjects,
          pendingSlot: isOverallPending ? localCurrentSlot : null,
          slotLabel: slotLabels[localCurrentSlot] || chosenProject?.slotLabel || data.slotLabel || '',
          currentSlot: localCurrentSlot,
          missedSlots: localMissedSlots,
          recordedSlots,
          siteCoordinatesMissing: isPeriodFinished ? false : !!chosenProject?.siteCoordinatesMissing,
          project: chosenProject,
          availableProjects: validAvailableProjects,
          coveredByCoSupervisor: chosenProject?.coveredByCoSupervisor || null,
          hasAtLeastOneOnSiteAlready: Boolean(chosenProject?.coveredByCoSupervisor),
          onSiteSupervisorName: chosenProject?.coveredByCoSupervisor || null,
          markedOnAnotherSite: data.markedOnAnotherSite || null,
          isDoneForInterval,
        });

        if (isCurrentSlotPending && !isPeriodFinished && isOverallPending) {
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

  const [isSubmittingAnotherSite, setIsSubmittingAnotherSite] = useState(false);

  // Skip is validated by the server: it registers only if another site was already marked for this slot
  const handleDeclareAnotherSite = async () => {
    if (!pendingState.project?._id) return;
    setIsSubmittingAnotherSite(true);
    setError(null);
    try {
      const res = await api.post('/location/declare-another-site', {
        projectId: pendingState.project._id,
      });
      const payload = res?.data || res;
      if (payload?.registered) {
        setIsModalDismissed(true);
        setIsManualOpen(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hygge:location-updated'));
        }
        await checkPendingLocation();
      } else {
        setError(payload?.message || 'Skip not registered. This site stays pending.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not record skip.');
    } finally {
      setIsSubmittingAnotherSite(false);
    }
  };

  if (!isSiteSupervisor()) {
    return null;
  }

  // The modal overlay is visible if it hasn't been dismissed AND check-in is pending or manual open or success
  const isModalVisible = !isModalDismissed && (pendingState.pending || isManualOpen || successResult);

  const showFloatingButton =
    !isModalVisible &&
    pendingState.pending &&
    (!!pendingState.project?._id || (pendingState.availableProjects && pendingState.availableProjects.length > 0));

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
      {/* ── TOP NOTIFICATION: MODERN FLOATING PILL ── */}
      {pendingState.pending && (
        <div style={{
          position: 'sticky',
          top: '12px',
          zIndex: 89,
          padding: '0 16px',
          pointerEvents: 'none',
          marginBottom: '10px'
        }}>
          <div style={{
            pointerEvents: 'auto',
            maxWidth: '820px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #FDE68A',
            borderRadius: '16px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 8px 24px -4px rgba(217, 119, 6, 0.12), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minWidth: '240px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
                flexShrink: 0
              }}>
                <ShieldAlert size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                    Site Location Check-in Required
                  </span>
                  <span style={{
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    NOT FILLED
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {(pendingState.pendingProjects?.length > 0
                    ? pendingState.pendingProjects
                    : [pendingState.project]
                  ).filter(Boolean).map(p => `${p.name}${p.code ? ` (${p.code})` : ''}`).join(', ')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={() => {
                  const targetId = pendingState.pendingProjects?.[0]?._id || pendingState.project?._id;
                  setIsModalDismissed(false);
                  setIsManualOpen(true);
                  checkPendingLocation(targetId);
                }}
                style={{
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <MapPin size={13} />
                <span>Check-in Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {floatingQuickButton}

      {/* ── MODAL OVERLAY: MODERN TEMPLATE DESIGN ── */}
      {isModalVisible && (
        <div className="supervisor-location-overlay" style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflowY: 'auto'
        }}>
          <div className="location-modal-card" style={{
            maxHeight: '92vh',
            overflowY: 'auto',
          }}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsModalDismissed(true);
                setIsManualOpen(false);
              }}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
                transition: 'all 0.15s ease'
              }}
              aria-label="Close"
              title="Close modal (notification remains at top of page)"
            >
              <X size={16} />
            </button>

            {successResult ? (
              /* CASE 1: SUCCESS CONFIRMATION */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0', textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: '#ECFDF5',
                  border: '2px solid #10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)',
                  animation: 'scaleUpCard 0.3s ease'
                }}>
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <div style={{
                    display: 'inline-block',
                    padding: '3px 12px',
                    borderRadius: '9999px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
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
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '12px',
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
                  marginTop: '8px'
                }}>
                  <RefreshCw size={13} className="spin-icon" />
                  <span>Updating site compliance...</span>
                </div>
              </div>
            ) : pendingState.siteCoordinatesMissing ? (
              /* CASE 2: MANDATORY INITIAL SITE COORDINATE CONFIGURATION (TEMPLATE STYLE) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header: Centered with Generous Spacing */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  paddingTop: '8px',
                  paddingBottom: '12px',
                  gap: '12px',
                  width: '100%',
                }}>
                  {/* Centered Icon Container */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '18px',
                    backgroundColor: '#FEF2F2',
                    border: '1.5px solid #FECACA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#DC2626',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.12)',
                  }}>
                    <ShieldAlert size={28} />
                  </div>

                  {/* Centered Single-Line Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 16px',
                    borderRadius: '9999px',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2',
                  }}>
                    Initial Setup Required
                  </div>

                  {/* Centered Title & Subtitle */}
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 6px 0',
                      letterSpacing: '-0.3px',
                      lineHeight: '1.25'
                    }}>
                      Set Project Site Coordinates
                    </h2>
                    <p style={{
                      fontSize: '13px',
                      color: '#64748B',
                      margin: 0,
                      lineHeight: '1.45',
                      maxWidth: '380px'
                    }}>
                      {pendingState.project?.name}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="template-helper-text error" style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '12px'
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {gpsStatus && (
                  <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={13} className="spin-icon" />
                    <span>{gpsStatus}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCaptureCurrentGPSAsSite}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '42px',
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1E293B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Navigation size={15} color="#2563EB" />
                  <span>Capture Device Current GPS</span>
                </button>

                <form onSubmit={handleSetSiteCoordinates} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Latitude Input - Template Styled */}
                  <div className="template-input-group">
                    <label className="template-input-label">
                      <span>Site Latitude</span>
                    </label>
                    <div className="template-input-box">
                      <span className="template-input-icon"><MapPin size={16} /></span>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 12.971598"
                        className="template-input-control"
                        value={siteSetupForm.latitude}
                        onChange={(e) => setSiteSetupForm({ ...siteSetupForm, latitude: e.target.value })}
                        required
                      />
                    </div>
                    <div className="template-helper-text">Decimal latitude coordinate of project center.</div>
                  </div>

                  {/* Longitude Input - Template Styled */}
                  <div className="template-input-group">
                    <label className="template-input-label">
                      <span>Site Longitude</span>
                    </label>
                    <div className="template-input-box">
                      <span className="template-input-icon"><Navigation size={16} /></span>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 77.594566"
                        className="template-input-control"
                        value={siteSetupForm.longitude}
                        onChange={(e) => setSiteSetupForm({ ...siteSetupForm, longitude: e.target.value })}
                        required
                      />
                    </div>
                    <div className="template-helper-text">Decimal longitude coordinate of project center.</div>
                  </div>

                  {/* Stepper Radius Input - Matching Template */}
                  <div className="template-input-group">
                    <label className="template-input-label">
                      <span>Perimeter Radius (Meters)</span>
                    </label>
                    <div className="template-input-box">
                      <span className="template-input-icon"><Crosshair size={16} /></span>
                      <input
                        type="number"
                        placeholder="200"
                        className="template-input-control"
                        value={siteSetupForm.radiusMeters}
                        onChange={(e) => setSiteSetupForm({ ...siteSetupForm, radiusMeters: Number(e.target.value) || 0 })}
                        required
                      />
                      <div className="template-stepper-controls">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => setSiteSetupForm(prev => ({
                            ...prev,
                            radiusMeters: Math.max(50, (Number(prev.radiusMeters) || 200) - 50)
                          }))}
                          title="Decrease radius by 50m"
                        >
                          −
                        </button>
                        <div className="stepper-divider" />
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => setSiteSetupForm(prev => ({
                            ...prev,
                            radiusMeters: Math.min(2000, (Number(prev.radiusMeters) || 200) + 50)
                          }))}
                          title="Increase radius by 50m"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="template-helper-text">Allowed geofence perimeter distance from center (default 200m).</div>
                  </div>

                  {/* Address Input - Template Styled */}
                  <div className="template-input-group">
                    <label className="template-input-label">
                      <span>Site Address / Landmark</span>
                    </label>
                    <div className="template-input-box">
                      <span className="template-input-icon"><Building2 size={16} /></span>
                      <input
                        type="text"
                        placeholder="e.g. Whitefield Main Road, Bangalore"
                        className="template-input-control"
                        value={siteSetupForm.address}
                        onChange={(e) => setSiteSetupForm({ ...siteSetupForm, address: e.target.value })}
                      />
                    </div>
                    <div className="template-helper-text">Helpful location reference for site audit logs.</div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSettingSiteCoords}
                    style={{
                      height: '48px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '14px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: isSettingSiteCoords ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                      marginTop: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSettingSiteCoords ? 'Saving Site Coordinates...' : 'Save Site Coordinates'}
                  </button>
                </form>

                <div style={{ textAlign: 'center' }}>
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
                      textDecoration: 'underline'
                    }}
                  >
                    Dismiss for now (shown as not filled at top of page)
                  </button>
                </div>
              </div>
            ) : (
              /* CASE 3: SCHEDULED / ON-DEMAND LOCATION DECLARATION (TEMPLATE STYLE) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header: Centered with Generous Spacing */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  paddingTop: '8px',
                  paddingBottom: '12px',
                  gap: '12px',
                  width: '100%',
                }}>
                  {/* Centered Icon Container */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '18px',
                    backgroundColor: '#EFF6FF',
                    border: '1.5px solid #DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.12)',
                  }}>
                    <MapPin size={28} />
                  </div>

                  {/* Centered Single-Line Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '5px 16px',
                    borderRadius: '9999px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    color: '#92400E',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2',
                  }}>
                    <Clock size={12} />
                    <span>{pendingState.slotLabel || 'Site Location Check-in'}</span>
                  </div>

                  {/* Centered Title & Subtitle */}
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 6px 0',
                      letterSpacing: '-0.3px',
                      lineHeight: '1.25',
                    }}>
                      {pendingState.pending ? 'Location Check-in Required' : 'Declare Site Location'}
                    </h2>
                    <p style={{
                      fontSize: '13px',
                      color: '#64748B',
                      margin: 0,
                      lineHeight: '1.45',
                      maxWidth: '380px',
                    }}>
                      Submit your real-time GPS coordinates to verify physical attendance.
                    </p>
                  </div>
                </div>

                {/* 1. Project Site Selector Field - Template Style */}
                <div className="template-input-group">
                  <label className="template-input-label">
                    <span>Active Project Site</span>
                  </label>
                  <div className="template-input-box">
                    <span className="template-input-icon"><Building2 size={16} /></span>
                    {pendingState.availableProjects && pendingState.availableProjects.length > 1 ? (
                      <select
                        className="template-input-control"
                        value={pendingState.project?._id || ''}
                        onChange={(e) => checkPendingLocation(e.target.value)}
                        style={{ cursor: 'pointer', fontWeight: 600 }}
                      >
                        {pendingState.availableProjects.map((p) => {
                          const labelSuffix = p.coveredBySupervisorName
                            ? `— ✓ Marked by ${p.coveredBySupervisorName}`
                            : p.pending
                            ? '— ⚠️ Check-in Due'
                            : '— ✓ Recorded';
                          return (
                            <option key={p._id} value={p._id}>
                              {p.code ? `[${p.code}] ` : ''}{p.name} {labelSuffix}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="template-input-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{pendingState.project?.name || 'Active Project Site'}</span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {pendingState.project?.code || 'SITE'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="template-helper-text">
                    {pendingState.availableProjects && pendingState.availableProjects.length > 1
                      ? 'In another project site today? Switch project to declare presence there.'
                      : 'Physical presence will be verified against this site\'s geofence center.'}
                  </div>
                </div>

                {/* 2. Co-Supervisor Status Card - Template Helper Box Style */}
                {pendingState.coveredByCoSupervisor ? (
                  <div style={{
                    backgroundColor: '#F0FDF4',
                    border: '1.5px solid #A7F3D0',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: '#065F46' }}>
                      <strong style={{ display: 'block', fontWeight: 700 }}>Site Presence Covered</strong>
                      <span>Co-supervisor <strong>{pendingState.coveredByCoSupervisor}</strong> verified on-site presence.</span>
                    </div>
                  </div>
                ) : pendingState.markedOnAnotherSite ? (
                  <div style={{
                    backgroundColor: '#EFF6FF',
                    border: '1.5px solid #BFDBFE',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Building2 size={18} color="#2563EB" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                      <strong style={{ display: 'block', fontWeight: 700 }}>Declared on Another Site</strong>
                      <span>You recorded check-in at <strong>{pendingState.markedOnAnotherSite.projectName}</strong> ({pendingState.markedOnAnotherSite.projectCode}).</span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#FFFBEB',
                    border: '1.5px solid #FDE68A',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: '#92400E' }}>
                      <strong style={{ display: 'block', fontWeight: 700 }}>At Least One Supervisor Required</strong>
                      <span>On-site presence has not been verified yet. Please submit your GPS attendance.</span>
                    </div>
                  </div>
                )}

                {/* 3. Checkpoints Schedule - Template Input List Style */}
                <div className="template-input-group">
                  <label className="template-input-label">
                    <span>Daily Checkpoints (4 Intervals)</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {DAILY_CHECKPOINTS.map((item) => {
                      const slotInfo = getSlotState(item.slot);
                      const currentActiveKey = getCurrentSlotKey();
                      const isCurrentActive = currentActiveKey === item.slot;

                      let badgeColor = '#64748B';
                      let badgeBg = '#F1F5F9';
                      let icon = <Clock size={15} color="#94A3B8" />;
                      let cardClass = 'template-slot-card';

                      if (slotInfo.status === 'completed') {
                        badgeColor = '#047857';
                        badgeBg = '#ECFDF5';
                        cardClass += ' completed';
                        icon = <CheckCircle2 size={15} color="#059669" />;
                      } else if (slotInfo.status === 'missed') {
                        badgeColor = '#B91C1C';
                        badgeBg = '#FEE2E2';
                        cardClass += ' missed';
                        icon = <XCircle size={15} color="#DC2626" />;
                      } else if (slotInfo.status === 'ready' || isCurrentActive) {
                        badgeColor = '#1D4ED8';
                        badgeBg = '#EFF6FF';
                        cardClass += ' active';
                        icon = <Navigation size={15} color="#2563EB" />;
                      }

                      return (
                        <div key={item.slot} className={cardClass}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {icon}
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: (slotInfo.status === 'ready' || isCurrentActive) ? 700 : 600, color: '#1E293B' }}>
                                {item.label} <span style={{ fontWeight: 400, color: '#64748B', fontSize: '12px' }}>• {item.name}</span>
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
                            borderRadius: '9999px',
                            fontSize: '10px',
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
                  <div className="template-helper-text">
                    Check-in window is open for the current checkpoint interval. Expired checkpoints cannot be back-submitted.
                  </div>
                </div>

                {/* Error Box */}
                {error && (
                  <div className="template-helper-text error" style={{
                    backgroundColor: '#FEF2F2',
                    border: '1.5px solid #FECACA',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '12px'
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Live GPS Lock Indicator */}
                {gpsStatus && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#2563EB',
                    fontWeight: 600,
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    padding: '8px 14px',
                    borderRadius: '12px'
                  }}>
                    <RefreshCw size={13} className="spin-icon" />
                    <span>{gpsStatus}</span>
                  </div>
                )}

                {/* CTA Transmit Button */}
                {(() => {
                  const currentActiveKey = getCurrentSlotKey();
                  const activeState = getSlotState(currentActiveKey);
                  const isCompleted = activeState.status === 'completed';
                  const isMissed = activeState.status === 'missed';
                  const activeSlotObj = DAILY_CHECKPOINTS.find(c => c.slot === currentActiveKey);

                  return (
                    <div style={{ width: '100%', marginTop: '2px' }}>
                      <button
                        type="button"
                        onClick={handleTransmitCoordinates}
                        disabled={isTransmitting || isCompleted || isMissed}
                        style={{
                          width: '100%',
                          height: '48px',
                          fontSize: '14px',
                          fontWeight: 700,
                          backgroundColor: isCompleted ? '#F1F5F9' : '#2563EB',
                          border: `1.5px solid ${isCompleted ? '#CBD5E1' : '#1D4ED8'}`,
                          color: isCompleted ? '#475569' : '#FFFFFF',
                          borderRadius: '14px',
                          boxShadow: isCompleted ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: (isTransmitting || isCompleted || isMissed) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isTransmitting ? (
                          <>
                            <RefreshCw size={15} className="spin-icon" />
                            <span>Acquiring Device GPS...</span>
                          </>
                        ) : isCompleted ? (
                          <>
                            <CheckCircle2 size={16} color="#059669" />
                            <span>✓ {activeSlotObj?.label} Check-in Completed</span>
                          </>
                        ) : isMissed ? (
                          <span>Check-in Window Closed for Today</span>
                        ) : (
                          <>
                            <Navigation size={16} />
                            <span>Transmit GPS for {pendingState.project?.name || 'Site'}</span>
                          </>
                        )}
                      </button>

                      {/* Skip: does NOT register anything - supervisor stays pending until GPS is submitted */}
                      {!isCompleted && !isMissed && (
                        <button
                          type="button"
                          onClick={handleDeclareAnotherSite}
                          disabled={isTransmitting || isSubmittingAnotherSite}
                          style={{
                            width: '100%',
                            marginTop: '8px',
                            height: '42px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: '12px',
                            backgroundColor: '#F8FAFC',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: (isTransmitting || isSubmittingAnotherSite) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Building2 size={15} color="#64748B" />
                          <span>{isSubmittingAnotherSite ? 'Checking...' : 'Working on Another Site / Skip'}</span>
                        </button>
                      )}

                      {error && (
                        <button
                          type="button"
                          onClick={handleTransmitCoordinates}
                          style={{
                            width: '100%',
                            marginTop: '8px',
                            height: '36px',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: '10px',
                            backgroundColor: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#1E293B',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <RefreshCw size={12} /> Try Again
                        </button>
                      )}
                    </div>
                  );
                })()}

                <div style={{ textAlign: 'center' }}>
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
                      textDecoration: 'underline'
                    }}
                  >
                    Dismiss for now (shown as not filled at top of page)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
