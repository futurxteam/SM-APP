import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  Clock, CheckCircle2, XCircle, Send, ShieldAlert, AlertTriangle, Lock, RefreshCw, Calendar
} from 'lucide-react';

const formatRemainingTime = (ms) => {
  if (!ms || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
};

/**
 * Shared past-date edit-access banner for Attendance & Petty Cash tabs.
 * - Reports unlocked status (canEditDate, unlockedDateSet) back to ProjectDetail via onAccessChange.
 * - For Site Supervisors on past dates (< today): shows 4 clear states:
 *   1) Approved (24h window open + countdown)
 *   2) Pending ("Already Requested — Wait for Admin Response")
 *   3) Rejected (rejection remarks + "Send Request")
 *   4) Default / Expired (locked read-only + "Send Request")
 * - For Super Admins: shows any pending edit requests for this module with inline Approve/Reject.
 */
export default function EditAccessBanner({
  projectId,
  projectStatus,
  module, // 'attendance' | 'petty_cash'
  targetDate, // 'YYYY-MM-DD' or ''
  onSelectDate,
  onAccessChange,
  onApprovedOrUpdated,
}) {
  const { isSuperAdmin, isSiteSupervisor } = useAuthStore();

  const [state, setState] = useState({
    pendingRequest: null,
    pendingRequestsAllDates: [],
    activeApproval: null,
    latestClosedRequest: null,
    canSupervisorEditDate: false,
    remainingMs: 0,
    unlockedDates: [],
  });
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [liveRemainingMs, setLiveRemainingMs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Supervisor request modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Admin inline review
  const [remarksMap, setRemarksMap] = useState({});
  const [reviewingId, setReviewingId] = useState(null);

  const todayStr = dayjs().format('YYYY-MM-DD');
  const isPastDate = Boolean(targetDate && targetDate < todayStr);
  const isFutureDate = Boolean(targetDate && targetDate > todayStr);
  const isProjectLocked = projectStatus === 'completed' || projectStatus === 'on_hold';
  const moduleLabel = module === 'attendance' ? 'Attendance' : 'Petty Cash Expenses';

  const loadEditRequests = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const params = { module };
      if (targetDate) params.targetDate = targetDate;
      const res = await api.get(`/edit-requests/project/${projectId}`, { params });
      const d = res.data?.data;
      if (d) {
        const nextState = {
          pendingRequest: d.pendingRequest || null,
          pendingRequestsAllDates: d.pendingRequestsAllDates || [],
          activeApproval: d.activeApproval || null,
          latestClosedRequest: d.latestClosedRequest || null,
          canSupervisorEditDate: Boolean(d.canSupervisorEditDate),
          remainingMs: d.remainingMs || 0,
          unlockedDates: d.unlockedDates || [],
        };
        setState(nextState);
        if (d.serverTime) {
          setClockOffsetMs(new Date(d.serverTime).getTime() - Date.now());
        }
        setLiveRemainingMs(d.remainingMs || 0);
        if (onAccessChange) {
          onAccessChange({
            canSupervisorEditDate: nextState.canSupervisorEditDate && (nextState.remainingMs > 0),
            unlockedDates: nextState.unlockedDates,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load edit access requests', err);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [projectId, module, targetDate]);

  useEffect(() => {
    setHasLoaded(false);
    loadEditRequests();
  }, [loadEditRequests]);

  useEffect(() => {
    const onRefresh = () => loadEditRequests();
    window.addEventListener('hygge:refresh', onRefresh);
    return () => window.removeEventListener('hygge:refresh', onRefresh);
  }, [loadEditRequests]);

  // Countdown ticker for active 24h approval
  useEffect(() => {
    const expiresAt = state.activeApproval?.expiresAt;
    if (!expiresAt) {
      setLiveRemainingMs(0);
      return;
    }

    const computeRem = () => {
      const serverNow = Date.now() + clockOffsetMs;
      return Math.max(0, new Date(expiresAt).getTime() - serverNow);
    };

    const initial = computeRem();
    setLiveRemainingMs(initial);
    if (initial <= 0) {
      loadEditRequests();
      return;
    }

    const timer = setInterval(() => {
      const rem = computeRem();
      setLiveRemainingMs(rem);
      if (rem <= 0) {
        clearInterval(timer);
        loadEditRequests();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [state.activeApproval?.expiresAt, clockOffsetMs, loadEditRequests]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setSubmitError('Please enter a reason for requesting edit access.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/edit-requests/project/${projectId}`, {
        module,
        targetDate,
        reason: reason.trim(),
      });
      setIsRequestModalOpen(false);
      setReason('');
      await loadEditRequests();
    } catch (err) {
      if (err.response?.status === 409) {
        setIsRequestModalOpen(false);
        await loadEditRequests();
      } else {
        setSubmitError(err.response?.data?.message || 'Failed to submit edit request.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminDecision = async (reqId, decision) => {
    setReviewingId(reqId);
    try {
      await api.patch(`/edit-requests/${reqId}/${decision}`, {
        reviewRemarks: (remarksMap[reqId] || '').trim(),
      });
      setRemarksMap((prev) => {
        const next = { ...prev };
        delete next[reqId];
        return next;
      });
      await loadEditRequests();
      if (onApprovedOrUpdated) onApprovedOrUpdated();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${decision} request.`);
    } finally {
      setReviewingId(null);
    }
  };

  const { pendingRequest, pendingRequestsAllDates, activeApproval, latestClosedRequest, canSupervisorEditDate, unlockedDates } = state;
  const isUnlockedNow = Boolean(canSupervisorEditDate && activeApproval && liveRemainingMs > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Quick-jump pills for supervisor's active unlocked past dates */}
      {isSiteSupervisor() && unlockedDates.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '8px 12px',
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#166534',
        }}>
          <CheckCircle2 size={14} color="#16A34A" />
          <span style={{ fontWeight: 600 }}>Approved Past Dates (24h Window):</span>
          {unlockedDates.map((u) => (
            <button
              key={u.requestId}
              type="button"
              onClick={() => onSelectDate && onSelectDate(u.targetDate)}
              className="btn btn-sm"
              style={{
                backgroundColor: targetDate === u.targetDate ? '#16A34A' : '#FFFFFF',
                color: targetDate === u.targetDate ? '#FFFFFF' : '#15803D',
                border: '1px solid #86EFAC',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <Calendar size={11} /> {dayjs(u.targetDate).format('DD MMM YYYY')} ({formatRemainingTime(u.remainingMs)})
            </button>
          ))}
        </div>
      )}

      {/* SUPERVISOR VIEW FOR SELECTED PAST / FUTURE DATE */}
      {isSiteSupervisor() && isFutureDate && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#991B1B',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Lock size={15} color="#DC2626" />
          <span>Future dates cannot be marked or edited. Please select today or a past date.</span>
        </div>
      )}

      {isSiteSupervisor() && isPastDate && (
        !hasLoaded && isLoading ? (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            fontSize: '12px',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <RefreshCw size={13} className="spin-icon" />
            <span>Checking edit access for {dayjs(targetDate).format('DD MMM YYYY')}...</span>
          </div>
        ) : isUnlockedNow ? (
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#16A34A" />
                Update Window Open for {dayjs(targetDate).format('DD MMM YYYY')} (Approved by Admin)
              </div>
              <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
                <Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                <strong>{formatRemainingTime(liveRemainingMs)}</strong> remaining (expires {dayjs(activeApproval.expiresAt).format('DD MMM, hh:mm A')}). Existing records for this date are unlocked for editing.
              </div>
            </div>
            <span style={{
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              border: '1px solid #86EFAC',
              borderRadius: '9999px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              EDITING UNLOCKED
            </span>
          </div>
        ) : pendingRequest ? (
          <div style={{
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #FDE68A',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            color: '#92400E',
          }}>
            <div style={{ fontSize: '12px', flex: '1 1 240px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#D97706" />
                Already Requested — Wait for Admin Response ({dayjs(targetDate).format('DD MMM YYYY')})
              </div>
              <div style={{ marginTop: '3px' }}>Reason: &ldquo;{pendingRequest.reason}&rdquo;</div>
              <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                Submitted {dayjs(pendingRequest.createdAt).format('DD MMM YYYY, hh:mm A')}. Once approved by Admin, you will get a 24-hour update window for this date.
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
        ) : latestClosedRequest?.status === 'rejected' ? (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div style={{ fontSize: '12px', color: '#991B1B', flex: '1 1 240px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={14} color="#DC2626" />
                Previous Request for {dayjs(targetDate).format('DD MMM YYYY')} Rejected by Admin
              </div>
              {latestClosedRequest.reviewRemarks && (
                <div style={{ marginTop: '2px' }}>Admin remark: &ldquo;{latestClosedRequest.reviewRemarks}&rdquo;</div>
              )}
              <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                Existing records are shown read-only. You can send a new request for Admin approval.
              </div>
            </div>
            {!isProjectLocked && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={Send}
                onClick={() => {
                  setSubmitError(null);
                  setReason('');
                  setIsRequestModalOpen(true);
                }}
              >
                Send Request
              </Button>
            )}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div style={{ fontSize: '12px', color: '#475569', flex: '1 1 240px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} color="#64748B" />
                {dayjs(targetDate).format('DD MMM YYYY')} is Locked (Read-Only)
              </div>
              <div style={{ marginTop: '2px' }}>
                {latestClosedRequest?.status === 'expired'
                  ? 'Previous 24-hour update window expired. Send a new request to mark or edit this date.'
                  : `Today's ${moduleLabel.toLowerCase()} can be edited until 11:59 PM. Past dates require Admin approval (24-hour update window once approved).`}
              </div>
            </div>
            {!isProjectLocked && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={Send}
                onClick={() => {
                  setSubmitError(null);
                  setReason('');
                  setIsRequestModalOpen(true);
                }}
              >
                Send Request
              </Button>
            )}
          </div>
        )
      )}

      {/* SUPER ADMIN INLINE PENDING REQUESTS FOR THIS MODULE */}
      {isSuperAdmin() && pendingRequestsAllDates.length > 0 && (
        <div style={{
          backgroundColor: '#FFFBEB',
          border: '1.5px solid #F59E0B',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} color="#D97706" />
            {pendingRequestsAllDates.length} Pending {moduleLabel} Edit Request(s)
          </div>
          {pendingRequestsAllDates.map((req) => {
            const isBusy = reviewingId === req._id;
            return (
              <div
                key={req._id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FDE68A',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '12px' }}>
                  <span>
                    <strong>{req.requestedBy?.name || 'Supervisor'}</strong> requested edit access for{' '}
                    <strong style={{ color: '#B45309' }}>{dayjs(req.targetDate).format('DD MMM YYYY')}</strong>
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    {dayjs(req.createdAt).format('DD MMM, hh:mm A')}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#334155' }}>
                  <strong>Reason:</strong> {req.reason}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Optional remarks / rejection reason..."
                    value={remarksMap[req._id] || ''}
                    onChange={(e) => setRemarksMap((prev) => ({ ...prev, [req._id]: e.target.value }))}
                    disabled={isBusy}
                    style={{ flex: '1 1 180px', fontSize: '12px', padding: '5px 8px' }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    icon={CheckCircle2}
                    disabled={isBusy}
                    onClick={() => handleAdminDecision(req._id, 'approve')}
                    style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                  >
                    Approve (24h)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    icon={XCircle}
                    disabled={isBusy}
                    onClick={() => handleAdminDecision(req._id, 'reject')}
                    style={{ color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supervisor Request Reason Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => !isSubmitting && setIsRequestModalOpen(false)}
        title={`Request ${moduleLabel} Edit — ${targetDate ? dayjs(targetDate).format('DD MMM YYYY') : ''}`}
        maxWidth="480px"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsRequestModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" variant="primary" icon={Send} onClick={handleSubmitRequest} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Request'}
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
            Once Admin approves your request for <strong>{targetDate ? dayjs(targetDate).format('DD MMM YYYY') : ''}</strong>, an update window will open for <strong>24 hours</strong> allowing you to add or edit {moduleLabel.toLowerCase()} on that date.
          </div>

          {submitError && (
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
              <span>{submitError}</span>
            </div>
          )}

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', display: 'block' }}>
              Reason for Past-Date Edit <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder={
                module === 'attendance'
                  ? 'e.g. Missed adding 2 electricians who worked overtime on this date...'
                  : 'e.g. Receipt for cement unloading was received next morning...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
