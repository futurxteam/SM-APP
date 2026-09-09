import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import Button from '../ui/Button';
import { 
  MapPin, Navigation, AlertTriangle, CheckCircle2, 
  Clock, ShieldAlert, RefreshCw, Layers, ShieldCheck,
  Building2, Crosshair, XCircle
} from 'lucide-react';

const DAILY_CHECKPOINTS = [
  { slot: '9am', label: '09:00 AM', name: 'Morning Check-in' },
  { slot: '12pm', label: '12:00 PM', name: 'Mid-Day Check-in' },
  { slot: '3pm', label: '03:00 PM', name: 'Afternoon Check-in' },
  { slot: '6pm', label: '06:00 PM', name: 'Evening Check-in' },
];

export default function SupervisorLocationBanner() {
  const { user, isSiteSupervisor } = useAuthStore();

  const [pendingState, setPendingState] = useState({
    pending: false,
    pendingSlot: null,
    slotLabel: '',
    currentSlot: null,
    missedSlots: [],
    recordedSlots: [],
    siteCoordinatesMissing: false,
    project: null,
  });

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

  const checkPendingLocation = useCallback(async () => {
    // Only site supervisors are tracked
    if (!isSiteSupervisor()) return;

    try {
      const res = await api.get('/location/pending-checkin');
      const data = res.data;
      if (data.success) {
        setPendingState({
          pending: !!data.pending,
          pendingSlot: data.pendingSlot || null,
          slotLabel: data.slotLabel || '',
          currentSlot: data.currentSlot || null,
          missedSlots: data.missedSlots || [],
          recordedSlots: data.recordedSlots || [],
          siteCoordinatesMissing: !!data.siteCoordinatesMissing,
          project: data.project || null,
        });

        if (data.siteCoordinatesMissing && data.project) {
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

    // Re-check periodically every 60 seconds (to catch slot transitions at 9am, 12pm, 3pm, 6pm)
    const interval = setInterval(checkPendingLocation, 60000);
    window.addEventListener('focus', checkPendingLocation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkPendingLocation);
    };
  }, [isSiteSupervisor, checkPendingLocation]);

  // Transmit Supervisor Coordinates
  const handleTransmitCoordinates = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device browser.');
      return;
    }

    setIsTransmitting(true);
    setError(null);
    setSuccessResult(null);
    setGpsStatus('Requesting precise GPS coordinates from device sensor...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsStatus(`GPS signal locked (Accuracy: ±${Math.round(accuracy)}m). Submitting to server...`);

        try {
          const res = await api.post('/location/checkin', {
            projectId: pendingState.project?._id,
            latitude,
            longitude,
            accuracy,
            slot: pendingState.pendingSlot,
            deviceInfo: `${navigator.platform} - ${navigator.userAgent.slice(0, 80)}`,
          });

          setIsTransmitting(false);
          setGpsStatus('');
          setSuccessResult(res.data.data);

          // After 2.5 seconds of showing verified confirmation, clear and un-blur the screen
          setTimeout(() => {
            setSuccessResult(null);
            checkPendingLocation();
          }, 2500);
        } catch (err) {
          setIsTransmitting(false);
          setGpsStatus('');
          setError(err.response?.data?.message || 'Failed to submit coordinates to server.');
        }
      },
      (geoErr) => {
        setIsTransmitting(false);
        setGpsStatus('');
        let msg = 'Unable to acquire location.';
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser or device settings and click Try Again.';
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          msg = 'Location signal is unavailable. Please ensure device GPS is turned on and try again.';
        } else if (geoErr.code === geoErr.TIMEOUT) {
          msg = 'Location request timed out. Please click Try Again.';
        }
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
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
      checkPendingLocation();
    } catch (err) {
      setIsSettingSiteCoords(false);
      setError(err.response?.data?.message || 'Failed to save site coordinates.');
    }
  };

  const handleCaptureCurrentGPSAsSite = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported.');
      return;
    }
    setGpsStatus('Capturing current GPS for site center...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSiteSetupForm((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setGpsStatus('');
      },
      (err) => {
        setGpsStatus('');
        setError(`GPS capture error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Only render for Site Supervisors when pending or success screen is showing
  if (!isSiteSupervisor() || (!pendingState.pending && !successResult)) {
    return null;
  }

  return (
    <div 
      className="supervisor-location-overlay"
      onClick={(e) => e.stopPropagation()}
      aria-modal="true"
      role="dialog"
    >
      <div className="location-modal-card">
        {/* CASE 1: SUCCESS VERIFIED CONFIRMATION SCREEN */}
        {successResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
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
              <span>Unlocking supervisor dashboard and site tools...</span>
            </div>
          </div>
        ) : pendingState.siteCoordinatesMissing ? (
          /* CASE 2: MANDATORY INITIAL SITE COORDINATE CONFIGURATION */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="radar-beacon" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)', boxShadow: '0 8px 20px rgba(220, 38, 38, 0.35)' }}>
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
                Mandatory Initial Site Setup
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Set Project Site Coordinates
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', lineHeight: '1.4' }}>
                Project <strong>{pendingState.project?.name}</strong> has no site coordinates defined. As the Site Supervisor, you must initialize the physical location coordinates to establish the geofence perimeter.
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
                {isSettingSiteCoords ? 'Saving Site Coordinates...' : 'Save & Enable Check-in'}
              </Button>
            </form>
          </div>
        ) : (
          /* CASE 3: SCHEDULED LOCATION CHECK-IN (9 AM, 12 PM, 3 PM, 6 PM) */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {/* Animated Radar Beacon */}
            <div className="radar-beacon">
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
                <span>{pendingState.slotLabel || 'Mandatory Site Check-in'}</span>
              </div>

              <h2 style={{ fontSize: '21px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                Supervisor Location Required
              </h2>

              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', lineHeight: '1.5' }}>
                Please submit your real-time site location. All supervisor dashboard and management actions are paused until your on-site presence is confirmed for this checkpoint.
              </p>
            </div>

            {/* Project Site Details Badge */}
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
                  Assigned Project
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                  {pendingState.project?.name || 'Assigned Site'}
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

            {/* 4-Checkpoint Daily Compliance Breakdown */}
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
                  const isRecorded = pendingState.recordedSlots?.includes(item.slot);
                  const isMissed = pendingState.missedSlots?.includes(item.slot);
                  const isCurrent = pendingState.pendingSlot === item.slot;

                  let badgeColor = '#64748B';
                  let badgeBg = '#F1F5F9';
                  let badgeText = 'Upcoming';
                  let statusDesc = `Scheduled at ${item.label}`;
                  let icon = <Clock size={15} color="#94A3B8" />;

                  if (isRecorded) {
                    badgeColor = '#047857';
                    badgeBg = '#ECFDF5';
                    badgeText = 'Completed';
                    statusDesc = 'Verified on site';
                    icon = <CheckCircle2 size={15} color="#059669" />;
                  } else if (isMissed) {
                    badgeColor = '#B91C1C';
                    badgeBg = '#FEE2E2';
                    badgeText = 'Missed';
                    statusDesc = 'Expired • Cannot be submitted';
                    icon = <XCircle size={15} color="#DC2626" />;
                  } else if (isCurrent) {
                    badgeColor = '#1D4ED8';
                    badgeBg = '#EFF6FF';
                    badgeText = 'Due Now';
                    statusDesc = 'Latest active • Ready to transmit';
                    icon = <Navigation size={15} color="#2563EB" />;
                  }

                  return (
                    <div
                      key={item.slot}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: isCurrent ? '#F0F9FF' : (isMissed ? '#FFF5F5' : '#F8FAFC'),
                        border: isCurrent ? '1.5px solid #93C5FD' : (isMissed ? '1px solid #FECACA' : '1px solid #F1F5F9'),
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {icon}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: isCurrent ? 700 : 600, color: '#1E293B' }}>
                            {item.label} <span style={{ fontWeight: 400, color: '#64748B', fontSize: '12px' }}>— {item.name}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: isMissed ? '#DC2626' : (isCurrent ? '#2563EB' : '#64748B'), fontWeight: isMissed ? 600 : 400 }}>
                            {statusDesc}
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
                        border: `1px solid ${isCurrent ? '#BFDBFE' : (isMissed ? '#FCA5A5' : 'transparent')}`,
                      }}>
                        {badgeText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {pendingState.missedSlots?.length > 0 && (
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
                  ⚠️ <strong>Compliance Notice:</strong> {pendingState.missedSlots.length} checkpoint(s) were missed. Missed checkpoints cannot be back-submitted and are permanently logged as Missed. Only the latest active checkpoint ({pendingState.pendingSlot?.toUpperCase()}) can be submitted.
                </div>
              )}
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
            <div style={{ width: '100%', marginTop: '4px' }}>
              <Button
                type="button"
                variant="primary"
                icon={Navigation}
                onClick={handleTransmitCoordinates}
                disabled={isTransmitting}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 700,
                  backgroundColor: '#2563EB',
                  borderColor: '#1D4ED8',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isTransmitting ? 'Acquiring GPS Signal...' : 'Transmit Current GPS Coordinates'}
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

            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              Requires browser location permission • Accuracy tested within ±50m
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
