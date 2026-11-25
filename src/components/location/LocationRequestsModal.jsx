import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  MapPin, CheckCircle2, XCircle, ExternalLink, Clock, ArrowRight, AlertTriangle
} from 'lucide-react';

export default function LocationRequestsModal({ isOpen, onClose, onUpdated }) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [remarksMap, setRemarksMap] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);

  const loadPendingRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/location/coordinate-requests', { params: { status: 'pending' } });
      setRequests(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load location update requests.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadPendingRequests();
    }
  }, [isOpen, loadPendingRequests]);

  const handleAction = async (requestId, decision) => {
    setProcessingId(requestId);
    setError(null);
    try {
      await api.patch(`/location/coordinate-requests/${requestId}/${decision}`, {
        reviewRemarks: (remarksMap[requestId] || '').trim(),
      });
      await loadPendingRequests();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${decision} request.`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pending Location Update Requests"
      maxWidth="640px"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Approving a request grants the supervisor a <strong>24-hour window</strong> to update the project&apos;s site coordinates. If unused within 24 hours, permission expires automatically.
        </p>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#DC2626',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner text="Loading pending location requests..." style={{ padding: '24px' }} />
        ) : requests.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '28px 16px',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px dashed #CBD5E1',
            color: '#64748B',
            fontSize: '13px',
          }}>
            <CheckCircle2 size={28} color="#16A34A" style={{ marginBottom: '8px' }} />
            <div>No pending location update requests.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map((req) => {
              const proj = req.project || {};
              const coords = proj.coordinates;
              const isBusy = processingId === req._id;

              return (
                <div
                  key={req._id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderLeft: '4px solid #F59E0B',
                    borderRadius: '10px',
                    padding: '14px',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
                        {proj.name || 'Project'}{' '}
                        {proj.code && <span style={{ color: 'var(--color-brand)', fontSize: '12px' }}>({proj.code})</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>Requested by <strong>{req.requestedBy?.name || 'Supervisor'}</strong></span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={12} /> {dayjs(req.createdAt).format('DD MMM YYYY, hh:mm A')}
                        </span>
                      </div>
                    </div>

                    {proj._id && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/projects/${proj._id}`);
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>Open Project</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>

                  {coords?.latitude != null && (
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#059669" />
                        Current: <strong style={{ fontFamily: 'monospace' }}>{Number(coords.latitude).toFixed(5)}, {Number(coords.longitude).toFixed(5)}</strong> ({coords.radiusMeters || 200}m)
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--color-brand)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <ExternalLink size={11} /> Map
                      </a>
                    </div>
                  )}

                  <div style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: '#78350F',
                  }}>
                    <strong>Reason:</strong> {req.reason}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Optional admin remarks or rejection reason..."
                      value={remarksMap[req._id] || ''}
                      onChange={(e) => setRemarksMap((prev) => ({ ...prev, [req._id]: e.target.value }))}
                      disabled={isBusy}
                      style={{ flex: '1 1 200px', fontSize: '12px', padding: '6px 10px' }}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={CheckCircle2}
                      disabled={isBusy}
                      onClick={() => handleAction(req._id, 'approve')}
                      style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                    >
                      {isBusy ? 'Saving...' : 'Approve (24h)'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={XCircle}
                      disabled={isBusy}
                      onClick={() => handleAction(req._id, 'reject')}
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
      </div>
    </Modal>
  );
}
