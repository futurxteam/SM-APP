import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  MapPin, Calendar, Wallet, CheckCircle2, XCircle, Clock,
  ArrowRight, RefreshCw, AlertTriangle, ShieldCheck, ExternalLink
} from 'lucide-react';

const formatRemaining = (expiresAt) => {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const totalMin = Math.floor(diff / 60000);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return hrs > 0 ? `${hrs}h ${mins}m left` : `${Math.max(1, mins)}m left`;
};

const statusConfig = {
  pending: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', label: 'PENDING' },
  approved: { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0', label: 'APPROVED (24H ACTIVE)' },
  completed: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'COMPLETED' },
  rejected: { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA', label: 'REJECTED' },
  expired: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'EXPIRED' },
};

const typeMeta = {
  attendance: { label: 'Attendance Edit', color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', Icon: Calendar },
  petty_cash: { label: 'Petty Cash Expense', color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE', Icon: Wallet },
  location: { label: 'Site Location', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', Icon: MapPin },
};

export default function ApprovalRequestsPage() {
  const navigate = useNavigate();

  const [editRequests, setEditRequests] = useState([]);
  const [locationRequests, setLocationRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'attendance' | 'petty_cash' | 'location'
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'closed' | 'all'
  const [remarksMap, setRemarksMap] = useState({});
  const [processingKey, setProcessingKey] = useState(null);
  const [error, setError] = useState(null);

  const loadAllRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [editRes, locRes] = await Promise.all([
        api.get('/edit-requests'),
        api.get('/location/coordinate-requests'),
      ]);
      setEditRequests(editRes.data?.data || []);
      setLocationRequests(locRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load approval requests.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllRequests();
    const onRefresh = () => loadAllRequests();
    window.addEventListener('hygge:refresh', onRefresh);
    return () => window.removeEventListener('hygge:refresh', onRefresh);
  }, [loadAllRequests]);

  const combinedRequests = useMemo(() => {
    const normalizedEdits = editRequests.map((r) => ({
      ...r,
      requestKind: r.module, // 'attendance' | 'petty_cash'
      uniqueKey: `edit:${r._id}`,
    }));
    const normalizedLocs = locationRequests.map((r) => ({
      ...r,
      requestKind: 'location',
      uniqueKey: `loc:${r._id}`,
    }));
    return [...normalizedEdits, ...normalizedLocs].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [editRequests, locationRequests]);

  const pendingCounts = useMemo(() => {
    const counts = { all: 0, attendance: 0, petty_cash: 0, location: 0 };
    combinedRequests.forEach((r) => {
      if (r.status === 'pending') {
        counts.all += 1;
        if (counts[r.requestKind] !== undefined) counts[r.requestKind] += 1;
      }
    });
    return counts;
  }, [combinedRequests]);

  const filteredRequests = useMemo(() => {
    return combinedRequests.filter((r) => {
      if (typeFilter !== 'all' && r.requestKind !== typeFilter) return false;
      if (statusFilter === 'pending') return r.status === 'pending';
      if (statusFilter === 'approved') return r.status === 'approved';
      if (statusFilter === 'rejected') return r.status === 'rejected';
      if (statusFilter === 'closed') return r.status === 'expired' || r.status === 'completed';
      return true;
    });
  }, [combinedRequests, typeFilter, statusFilter]);

  const handleReview = async (item, decision) => {
    setProcessingKey(item.uniqueKey);
    setError(null);
    try {
      const reviewRemarks = (remarksMap[item.uniqueKey] || '').trim();
      const endpoint =
        item.requestKind === 'location'
          ? `/location/coordinate-requests/${item._id}/${decision}`
          : `/edit-requests/${item._id}/${decision}`;

      await api.patch(endpoint, { reviewRemarks });
      setRemarksMap((prev) => {
        const next = { ...prev };
        delete next[item.uniqueKey];
        return next;
      });
      await loadAllRequests();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${decision} request.`);
    } finally {
      setProcessingKey(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="mobile-flex-wrap" style={{ alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <ShieldCheck size={22} color="var(--color-brand)" />
            Supervisor Approval Requests
          </h2>
          <p className="text-muted" style={{ marginTop: '4px', marginBottom: 0 }}>
            Approve or reject past-date Attendance, Petty Cash Expense, and Site Location update requests (24-hour edit window on approval).
          </p>
        </div>

        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={loadAllRequests} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Type Tabs */}
      <div className="tabs-header">
        {[
          { key: 'all', label: 'All Requests' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'petty_cash', label: 'Petty Cash Expenses' },
          { key: 'location', label: 'Site Location' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn ${typeFilter === tab.key ? 'active' : ''}`}
            onClick={() => setTypeFilter(tab.key)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>{tab.label}</span>
            {pendingCounts[tab.key] > 0 && (
              <span style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '9999px',
              }}>
                {pendingCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Status Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved (Active 24h)' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'closed', label: 'Expired / Completed' },
          { key: 'all', label: 'All History' },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            className={`btn btn-sm ${statusFilter === s.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#DC2626',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Request List */}
      {isLoading ? (
        <LoadingSpinner text="Loading supervisor approval requests..." style={{ padding: '48px' }} />
      ) : filteredRequests.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '42px 20px', color: '#64748B' }}>
          <CheckCircle2 size={36} color="#16A34A" style={{ marginBottom: '10px', opacity: 0.85 }} />
          <h3 style={{ margin: '0 0 4px 0', color: '#1E293B' }}>No matching requests</h3>
          <p style={{ fontSize: '13px', margin: 0 }}>
            There are no {statusFilter === 'all' ? '' : `${statusFilter} `}requests in this category.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredRequests.map((item) => {
            const meta = typeMeta[item.requestKind] || typeMeta.attendance;
            const MetaIcon = meta.Icon;
            const st = statusConfig[item.status] || statusConfig.expired;
            const proj = item.project || {};
            const isBusy = processingKey === item.uniqueKey;

            return (
              <Card
                key={item.uniqueKey}
                style={{
                  borderLeft: `4px solid ${item.status === 'pending' ? '#F59E0B' : item.status === 'approved' ? '#16A34A' : meta.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Top Row: Badges + Project + Open link */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: meta.bg,
                        color: meta.color,
                        border: `1px solid ${meta.border}`,
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '9999px',
                      }}>
                        <MetaIcon size={12} />
                        {meta.label}
                      </span>

                      {item.targetDate && (
                        <span style={{
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          border: '1px solid #FDE68A',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '9999px',
                        }}>
                          Date: {dayjs(item.targetDate).format('DD MMM YYYY')}
                        </span>
                      )}

                      <span style={{
                        backgroundColor: st.bg,
                        color: st.color,
                        border: `1px solid ${st.border}`,
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                      }}>
                        {st.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                      {proj.name || 'Project'}{' '}
                      {proj.code && <span style={{ color: 'var(--color-brand)', fontSize: '13px', fontWeight: 600 }}>({proj.code})</span>}
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Requested by <strong>{item.requestedBy?.name || 'Supervisor'}</strong></span>
                      {item.requestedBy?.phone && <span>({item.requestedBy.phone})</span>}
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {dayjs(item.createdAt).format('DD MMM YYYY, hh:mm A')}
                      </span>
                    </div>
                  </div>

                  {proj._id && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      icon={ArrowRight}
                      onClick={() => navigate(`/projects/${proj._id}`)}
                    >
                      Open Project
                    </Button>
                  )}
                </div>

                {/* Location coordinates preview for location requests */}
                {item.requestKind === 'location' && proj.coordinates?.latitude != null && (
                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>
                      Current site pin: <strong style={{ fontFamily: 'monospace' }}>{Number(proj.coordinates.latitude).toFixed(5)}, {Number(proj.coordinates.longitude).toFixed(5)}</strong> ({proj.coordinates.radiusMeters || 200}m)
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${proj.coordinates.latitude},${proj.coordinates.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--color-brand)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      <ExternalLink size={11} /> Map
                    </a>
                  </div>
                )}

                {/* Reason */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#1E293B',
                }}>
                  <strong>Reason:</strong> {item.reason}
                </div>

                {/* Action Row for Pending Requests */}
                {item.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Optional admin remarks or rejection reason..."
                      value={remarksMap[item.uniqueKey] || ''}
                      onChange={(e) => setRemarksMap((prev) => ({ ...prev, [item.uniqueKey]: e.target.value }))}
                      disabled={isBusy}
                      style={{ flex: '1 1 240px', fontSize: '13px', padding: '7px 10px' }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      icon={CheckCircle2}
                      disabled={isBusy}
                      onClick={() => handleReview(item, 'approve')}
                      style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                    >
                      {isBusy ? 'Processing...' : 'Approve (24h Window)'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      icon={XCircle}
                      disabled={isBusy}
                      onClick={() => handleReview(item, 'reject')}
                      style={{ color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      {item.reviewedBy?.name && (
                        <span>
                          Reviewed by <strong>{item.reviewedBy.name}</strong> on {dayjs(item.reviewedAt).format('DD MMM YYYY, hh:mm A')}
                        </span>
                      )}
                      {item.reviewRemarks && (
                        <div style={{ color: '#64748B', marginTop: '2px' }}>Admin remark: &ldquo;{item.reviewRemarks}&rdquo;</div>
                      )}
                    </div>

                    {item.status === 'approved' && item.expiresAt && (
                      <span style={{ color: '#15803D', fontWeight: 700 }}>
                        Window expires {dayjs(item.expiresAt).format('DD MMM, hh:mm A')} ({formatRemaining(item.expiresAt)})
                      </span>
                    )}
                    {item.editCount > 0 && (
                      <span style={{ color: '#1D4ED8', fontWeight: 600 }}>
                        {item.editCount} save{item.editCount === 1 ? '' : 's'} made during window
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
