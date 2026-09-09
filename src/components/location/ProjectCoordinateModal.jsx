import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../services/api';
import { MapPin, Navigation, Compass, AlertCircle, ExternalLink } from 'lucide-react';

export default function ProjectCoordinateModal({ isOpen, onClose, project, onSaved }) {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    radiusMeters: 200,
    address: '',
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project?.coordinates) {
      setFormData({
        latitude: project.coordinates.latitude ?? '',
        longitude: project.coordinates.longitude ?? '',
        radiusMeters: project.coordinates.radiusMeters || 200,
        address: project.coordinates.address || project.location || '',
      });
    } else if (project) {
      setFormData({
        latitude: '',
        longitude: '',
        radiusMeters: 200,
        address: project.location || '',
      });
    }
    setError(null);
  }, [project, isOpen]);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setIsDetecting(false);
      },
      (err) => {
        setIsDetecting(false);
        setError(`Unable to retrieve GPS: ${err.message}. Please verify location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      setError('Latitude and Longitude are mandatory.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await api.put(`/location/project/${project._id}/coordinates`, {
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        radiusMeters: Number(formData.radiusMeters) || 200,
        address: formData.address,
      });

      setIsSaving(false);
      if (onSaved) onSaved(res.data.data);
      onClose();
    } catch (err) {
      setIsSaving(false);
      setError(err.response?.data?.message || 'Failed to update coordinates.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure Project Site Geofence — ${project?.name || ''}`}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p className="text-muted" style={{ fontSize: '13px' }}>
          Set the central GPS coordinates and geofence boundary perimeter for this project. Site supervisors' 9 AM, 12 PM, 3 PM, and 6 PM check-ins are compared against this site center.
        </p>

        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger)',
            borderRadius: '6px',
            color: 'var(--color-danger)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          backgroundColor: '#EFF6FF',
          borderRadius: '6px',
          border: '1px solid #BFDBFE',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E40AF' }}>Currently at the construction site?</div>
            <div style={{ fontSize: '12px', color: '#3B82F6' }}>Auto-fill coordinates using your device GPS</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Navigation}
            onClick={handleDetectGPS}
            disabled={isDetecting}
          >
            {isDetecting ? 'Acquiring GPS...' : 'Use Current GPS'}
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Latitude <span style={{ color: 'red' }}>*</span></label>
            <input
              type="number"
              step="any"
              className="form-input"
              placeholder="e.g. 12.971598"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Longitude <span style={{ color: 'red' }}>*</span></label>
            <input
              type="number"
              step="any"
              className="form-input"
              placeholder="e.g. 77.594562"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>
            Geofence Radius (Meters)
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="20"
              max="5000"
              className="form-input"
              value={formData.radiusMeters}
              onChange={(e) => setFormData({ ...formData, radiusMeters: e.target.value })}
              style={{ flex: 1 }}
              required
            />
            <button
              type="button"
              className={`btn btn-sm ${formData.radiusMeters === 100 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormData({ ...formData, radiusMeters: 100 })}
            >
              100m
            </button>
            <button
              type="button"
              className={`btn btn-sm ${formData.radiusMeters === 200 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormData({ ...formData, radiusMeters: 200 })}
            >
              200m
            </button>
            <button
              type="button"
              className={`btn btn-sm ${formData.radiusMeters === 500 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormData({ ...formData, radiusMeters: 500 })}
            >
              500m
            </button>
          </div>
          <span className="text-muted" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
            Supervisors within this radius are marked as "On Site". Beyond this, distance is reported in meters or km off site.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Site Address / Landmark</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Sector 4, Hygge Residency, Near Lake Road"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        {formData.latitude && formData.longitude && (
          <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ExternalLink size={13} color="var(--color-brand)" />
            <a
              href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}
            >
              Preview coordinates on Google Maps
            </a>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={MapPin} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Site Coordinates'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
