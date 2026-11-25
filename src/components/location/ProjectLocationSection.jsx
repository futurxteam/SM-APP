import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ProjectCoordinateModal from './ProjectCoordinateModal';
import {
  MapPin, ExternalLink, Clock, CheckCircle2, XCircle,
  AlertTriangle, ShieldAlert, Send, Edit3, RefreshCw, History
} from 'lucide-react';

const formatRemainingTime = (ms) => {
  if (!ms || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
};

const statusBadgeStyles = {
  pending: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', label: 'PENDING APPROVAL' },
  approved: { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0', label: 'APPROVED (24H WINDOW)' },
  completed: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'COMPLETED' },
  rejected: { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA', label: 'REJECTED' },
  expired: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'EXPIRED' },
};

export default function ProjectLocationSection({
  project,
  onProjectUpdated,
  adminPanelOnly = false,
  showHistory = false,
}) {
  const { isSuperAdmin, isSiteSupervisor } = useAuthStore();

  const [requestData, setRequestData] = useState({
    requests: [],
    pendingRequest: null,
    activeApproval: null,
    canSupervisorUpdate: false,
    remainingMs: 0,
  });
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [liveRemainingMs, setLiveRemainingMs] = useState(0);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [hasLoadedRequests, setHasLoadedRequests] = useState(false);

  // Supervisor request modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState(null);

  // Supervisor approved coordinate update modal state
  const [isCoordModalOpen, setIsCoordModalOpen] = useState(false);

  // Admin review state
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [historyExpanded, setHistoryExpanded] = useState(showHistory);

  const projectId = project?._id;
  const hasCoords = project?.coordinates?.latitude != null && project?.coordinates?.longitude != null;

  const loadRequests = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingRequests(true);
    try {
      const res = await api.get(`/location/project/${projectId}/coordinate-requests`);
      const d = res.data?.data;
      if (d) {
        setRequestData({
          requests: d.requests || [],
          pendingRequest: d.pendingRequest || null,
          activeApproval: d.activeApproval || null,
          canSupervisorUpdate: Boolean(d.canSupervisorUpdate),
          remainingMs: d.remainingMs || 0,
        });
        if (d.serverTime) {
          setClockOffsetMs(new Date(d.serverTime).getTime() - Date.now());
        }
        setLiveRemainingMs(d.remainingMs || 0);
      }
    } catch (err) {
      console.warn('Failed to load location update requests', err);
    } finally {
      setIsLoadingRequests(false);
      setHasLoadedRequests(true);
    }
  }, [projectId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, project?.coordinates?.setAt]);

  useEffect(() => {
    const onRefresh = () => loadRequests();
    window.addEventListener('hygge:refresh', onRefresh);
    window.addEventListener('hygge:location-updated', onRefresh);
    return () => {
      window.removeEventListener('hygge:refresh', onRefresh);
      window.removeEventListener('hygge:location-updated', onRefresh);
    };
  }, [loadRequests]);

  // Live countdown ticker while an approval window is active
  useEffect(() => {
    const expiresAt = requestData.activeApproval?.expiresAt;
    if (!expiresAt) {
      setLiveRemainingMs(0);
      return;
    }

    const computeRemaining = () => {
      const serverNow = Date.now() + clockOffsetMs;
      return Math.max(0, new Date(expiresAt).getTime() - serverNow);
    };

    const initial = computeRemaining();
    setLiveRemainingMs(initial);
    if (initial <= 0) {
      loadRequests();
      return;
    }

    const timer = setInterval(() => {
      const rem = computeRemaining();
      setLiveRemainingMs(rem);
      if (rem <= 0) {
        clearInterval(timer);
        loadRequests();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [requestData.activeApproval?.expiresAt, clockOffsetMs, loadRequests]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setRequestError('Please enter a reason for updating the project location.');
      return;
    }
    setIsSubmittingRequest(true);
    setRequestError(null);
    try {
      await api.post(`/location/project/${projectId}/coordinate-requests`, {
        reason: requestReason.trim(),
      });
      setIsRequestModalOpen(false);
      setRequestReason('');
      await loadRequests();
    } catch (err) {
      if (err.response?.status === 409) {
        setIsRequestModalOpen(false);
        await loadRequests();
      } else {
        setRequestError(err.response?.data?.message || 'Failed to submit location update request.');
      }
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleAdminReview = async (requestId, decision) => {
    setIsReviewing(true);
    setReviewError(null);
    try {
      await api.patch(`/location/coordinate-requests/${requestId}/${decision}`, {
        reviewRemarks: reviewRemarks.trim(),
      });
      setReviewRemarks('');
      await loadRequests();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setReviewError(err.response?.data?.message || `Failed to ${decision} location update request.`);
    } finally {
      setIsReviewing(false);
    }
  };

  if (!project) return null;

  const { requests, pendingRequest, activeApproval, canSupervisorUpdate } = requestData;
  const isApprovalActive = Boolean(activeApproval && liveRemainingMs > 0);
  const canSupUpdateNow = Boolean(canSupervisorUpdate && isApprovalActive);
  const isProjectLocked = project.status === 'completed' || project.status === 'on_hold';
  const latestClosedRequest = requests.find((r) => ['rejected', 'expired', 'completed'].includes(r.status)) || null;
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  // Admin-only embedded mode (used in LocationTrackingTab)
  if (adminPanelOnly) {
    if (!pendingRequest && !isApprovalActive && pastRequests.length === 0) {
      return null;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isSuperAdmin() && pendingRequest && (
          <div style={{
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #F59E0B',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} color="#D97706" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400E' }}>
                    Pending Location Update Request
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350F', marginTop: '2px' }}>
                    Requested by <strong>{pendingRequest.requestedBy?.name || 'Supervisor'}</strong> on {dayjs(pendingRequest.createdAt).format('DD MMM YYYY, hh:mm A')}
                  </div>
                </div>
              </div>
              <span style={{
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                border: '1px solid #FDE68A',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '9999px',
              }}>
                APPROVAL REQUIRED
              </span>
            </div>

            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              color: '#1E293B',
            }}>
              <strong>Reason:</strong> {pendingRequest.reason}
            </div>

            {reviewError && (
              <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
                {reviewError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="input"
                placeholder="Optional admin remarks or rejection reason..."
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                style={{ flex: '1 1 220px', fontSize: '13px', padding: '7px 10px' }}
                disabled={isReviewing}
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                disabled={isReviewing}
                onClick={() => handleAdminReview(pendingRequest._id, 'approve')}
                style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
              >
                {isReviewing ? 'Processing...' : 'Approve (24h Window)'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={XCircle}
                disabled={isReviewing}
                onClick={() => handleAdminReview(pendingRequest._id, 'reject')}
                style={{ color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
              >
                Reject
              </Button>
            </div>
          </div>
        )}

        {isApprovalActive && (
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            color: '#166534',
            fontSize: '13px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#16A34A" />
              <span>
                <strong>24-Hour Location Update Window Active</strong> for{' '}
                <strong>{activeApproval.requestedBy?.name || 'Supervisor'}</strong> — expires{' '}
                {dayjs(activeApproval.expiresAt).format('DD MMM YYYY, hh:mm A')} ({formatRemainingTime(liveRemainingMs)} left).
              </span>
            </div>
          </div>
        )}

        {pastRequests.length > 0 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
          }}>
            <button
              type="button"
              onClick={() => setHistoryExpanded((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                fontWeight: 700,
                fontSize: '13px',
                color: '#1E293B',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <History size={15} color="var(--color-brand)" />
                Location Update Request History ({pastRequests.length})
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-brand)' }}>
                {historyExpanded ? 'Hide' : 'Show'}
              </span>
            </button>

            {historyExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {pastRequests.slice(0, 8).map((r) => {
                  const st = statusBadgeStyles[r.status] || statusBadgeStyles.expired;
                  return (
                    <div
                      key={r._id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span>
                          <strong>{r.requestedBy?.name || 'Supervisor'}</strong> • {dayjs(r.createdAt).format('DD MMM YYYY, hh:mm A')}
                        </span>
                        <span style={{
                          backgroundColor: st.bg,
                          color: st.color,
                          border: `1px solid ${st.border}`,
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                        }}>
                          {st.label}
                        </span>
                      </div>
                      <div style={{ color: '#475569' }}>Reason: {r.reason}</div>
                      {r.reviewRemarks && (
                        <div style={{ color: '#64748B' }}>Admin note: {r.reviewRemarks}</div>
                      )}
                      {r.status === 'completed' && r.newCoordinates?.latitude != null && (
                        <div style={{ color: '#1D4ED8', fontSize: '11px' }}>
                          Updated to: {Number(r.newCoordinates.latitude).toFixed(5)}, {Number(r.newCoordinates.longitude).toFixed(5)} ({r.newCoordinates.radiusMeters || 200}m) on {dayjs(r.completedAt).format('DD MMM YYYY, hh:mm A')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
      <div style={{
        padding: '14px 16px',
        borderRadius: '10px',
        backgroundColor: hasCoords ? '#F8FAFC' : '#FEF2F2',
        border: `1px solid ${hasCoords ? '#E2E8F0' : '#FECACA'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} color={hasCoords ? '#059669' : '#DC2626'} />
            <strong style={{ fontSize: '14px', color: '#0F172A' }}>Project Site Location & Geofence</strong>
          </div>

          {hasCoords ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
              }}>
                CONFIGURED
              </span>
              <a
                href={`https://www.google.com/maps?q=${project.coordinates.latitude},${project.coordinates.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '12px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ExternalLink size={12} /> View on Map
              </a>
            </div>
          ) : (
            <span style={{
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
            }}>
              NOT CONFIGURED
            </span>
          )}
        </div>

        {/* Location Details */}
        {hasCoords ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#334155' }}>
            <div>
              <strong style={{ color: '#059669', fontFamily: 'monospace' }}>
                {Number(project.coordinates.latitude).toFixed(6)}, {Number(project.coordinates.longitude).toFixed(6)}
              </strong>{' '}
              <span style={{ color: '#64748B' }}>
                ({project.coordinates.radiusMeters || 200}m geofence radius)
              </span>
            </div>
            {(project.coordinates.address || project.location) && (
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <strong>Address:</strong> {project.coordinates.address || project.location}
              </div>
            )}
            {project.coordinates.setAt && (
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Last updated {dayjs(project.coordinates.setAt).format('DD MMM YYYY, hh:mm A')}
                {project.coordinates.setBy?.name ? ` by ${project.coordinates.setBy.name}` : ''}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>
            Site location coordinates are not configured yet. Supervisor will be prompted to set the initial location on login.
          </div>
        )}

        {/* SUPERVISOR CONTROLS (only when location already exists) */}
        {hasCoords && isSiteSupervisor() && (
          <div style={{ paddingTop: '8px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!hasLoadedRequests && isLoadingRequests ? (
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={13} className="spin-icon" />
                <span>Checking location update status...</span>
              </div>
            ) : canSupUpdateNow ? (
              <div style={{
                backgroundColor: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} color="#16A34A" />
                    Location Update Window Open (Approved by Admin)
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
                    <Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                    <strong>{formatRemainingTime(liveRemainingMs)}</strong> remaining to update (expires {dayjs(activeApproval.expiresAt).format('DD MMM, hh:mm A')}).
                  </div>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={Edit3}
                  onClick={() => setIsCoordModalOpen(true)}
                  style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                >
                  Open Update Window
                </Button>
              </div>
            ) : pendingRequest ? (
              <div style={{
                backgroundColor: '#FFFBEB',
                border: '1.5px solid #FDE68A',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#92400E',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 220px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="#D97706" />
                    Already Requested — Wait for Admin Response
                  </div>
                  <div>Reason: &ldquo;{pendingRequest.reason}&rdquo;</div>
                  <div style={{ fontSize: '11px', color: '#B45309' }}>
                    Submitted {dayjs(pendingRequest.createdAt).format('DD MMM YYYY, hh:mm A')}. Once approved, the 24-hour update window will unlock here.
                  </div>
                </div>
                <span style={{
                  backgroundColor: '#FEF3C7',
                  color: '#B45309',
                  border: '1px solid #FCD34D',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  Already Requested
                </span>
              </div>
            ) : isApprovalActive ? (
              <div style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#1E40AF',
              }}>
                A 24-hour location update window is currently active for co-supervisor <strong>{activeApproval.requestedBy?.name || 'Supervisor'}</strong> (expires {dayjs(activeApproval.expiresAt).format('DD MMM, hh:mm A')}).
              </div>
            ) : latestClosedRequest?.status === 'rejected' ? (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}>
                <div style={{ fontSize: '12px', color: '#991B1B', flex: '1 1 220px' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={14} color="#DC2626" />
                    Previous Request Rejected by Admin
                  </div>
                  {latestClosedRequest.reviewRemarks && (
                    <div style={{ marginTop: '2px' }}>Admin remark: &ldquo;{latestClosedRequest.reviewRemarks}&rdquo;</div>
                  )}
                  <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                    You can send a new request for Admin approval.
                  </div>
                </div>
                {!isProjectLocked && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={Send}
                    onClick={() => {
                      setRequestError(null);
                      setRequestReason('');
                      setIsRequestModalOpen(true);
                    }}
                  >
                    Send Request
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#64748B', flex: '1 1 220px' }}>
                  {latestClosedRequest?.status === 'expired' ? (
                    <span style={{ color: '#B45309' }}>
                      Previous 24-hour update window expired without changes. Send a new request to update.
                    </span>
                  ) : (
                    <span>Location changes require Admin approval (24-hour update window once approved).</span>
                  )}
                </div>

                {!isProjectLocked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Send}
                    onClick={() => {
                      setRequestError(null);
                      setRequestReason('');
                      setIsRequestModalOpen(true);
                    }}
                  >
                    Send Request
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUPER ADMIN INLINE APPROVAL PANEL ON OVERVIEW */}
        {isSuperAdmin() && pendingRequest && (
          <div style={{
            marginTop: '4px',
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #F59E0B',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} color="#D97706" />
                Location Update Request Pending ({pendingRequest.requestedBy?.name || 'Supervisor'})
              </div>
              <span style={{ fontSize: '11px', color: '#B45309' }}>
                {dayjs(pendingRequest.createdAt).format('DD MMM YYYY, hh:mm A')}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#1E293B', backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
              <strong>Reason:</strong> {pendingRequest.reason}
            </div>
            {reviewError && <div style={{ fontSize: '12px', color: '#DC2626' }}>{reviewError}</div>}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="input"
                placeholder="Optional remarks / rejection reason..."
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                style={{ flex: '1 1 200px', fontSize: '12px', padding: '6px 10px' }}
                disabled={isReviewing}
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                disabled={isReviewing}
                onClick={() => handleAdminReview(pendingRequest._id, 'approve')}
                style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
              >
                Approve (24h)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={XCircle}
                disabled={isReviewing}
                onClick={() => handleAdminReview(pendingRequest._id, 'reject')}
                style={{ color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
              >
                Reject
              </Button>
            </div>
          </div>
        )}

        {!isSiteSupervisor() && isApprovalActive && (
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Clock size={14} color="#16A34A" />
            <span>
              24h location update window active for <strong>{activeApproval.requestedBy?.name || 'Supervisor'}</strong> — {formatRemainingTime(liveRemainingMs)} remaining.
            </span>
          </div>
        )}
      </div>

      {/* Supervisor Request Reason Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => !isSubmittingRequest && setIsRequestModalOpen(false)}
        title={`Request Location Update — ${project.name}`}
        maxWidth="480px"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={isSubmittingRequest}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitRequest}
              disabled={isSubmittingRequest}
              icon={Send}
            >
              {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '12px',
            color: '#1E40AF',
            lineHeight: 1.45,
          }}>
            Once the Admin approves this request, you will have <strong>24 hours</strong> to update the project site location. If not updated within 24 hours, the permission will expire automatically.
          </div>

          {requestError && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#DC2626',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <AlertTriangle size={14} />
              <span>{requestError}</span>
            </div>
          )}

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', display: 'block' }}>
              Reason for Location Update <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Initial GPS pin was captured near main road instead of actual site entrance..."
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              required
              disabled={isSubmittingRequest}
            />
          </div>
        </form>
      </Modal>

      {/* Supervisor Approved Coordinate Update Modal */}
      {isCoordModalOpen && (
        <ProjectCoordinateModal
          isOpen={isCoordModalOpen}
          onClose={() => setIsCoordModalOpen(false)}
          project={project}
          onSaved={() => {
            loadRequests();
            if (onProjectUpdated) onProjectUpdated();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('hygge:location-updated'));
            }
          }}
        />
      )}
    </div>
  );
}
