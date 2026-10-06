import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../services/api';
import InteractiveLocationPicker from './InteractiveLocationPicker';
import { MapPin, Navigation, Compass, AlertCircle, ExternalLink } from 'lucide-react';

export default function ProjectCoordinateModal({ isOpen, onClose, project, onSaved }) {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    radiusMeters: 200,
    address: '',
  });
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

  const handleLocationPickerChange = ({ latitude, longitude, address, radiusMeters }) => {
    setFormData((prev) => ({
      ...prev,
      latitude,
      longitude,
      address: address || prev.address,
      radiusMeters: radiusMeters || prev.radiusMeters,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      setError('Please select or specify site Latitude and Longitude.');
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
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
          Search location by typing or click/drag the pin on the map to set central site coordinates and geofence boundary perimeter.
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

        {/* Interactive Location Picker Map with Search & Pin */}
        <InteractiveLocationPicker
          latitude={formData.latitude}
          longitude={formData.longitude}
          radiusMeters={formData.radiusMeters}
          address={formData.address}
          onChange={handleLocationPickerChange}
          height="280px"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Latitude <span style={{ color: 'red' }}>*</span></label>
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
            <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Longitude <span style={{ color: 'red' }}>*</span></label>
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
          <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
            Geofence Radius (Meters)
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="20"
              max="5000"
              className="form-input"
              value={formData.radiusMeters}
              onChange={(e) => setFormData({ ...formData, radiusMeters: Number(e.target.value) })}
              style={{ flex: 1 }}
              required
            />
            <button
              type="button"
              className={`btn btn-sm ${Number(formData.radiusMeters) === 100 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormData({ ...formData, radiusMeters: 100 })}
            >
              100m
            </button>
            <button
              type="button"
              className={`btn btn-sm ${Number(formData.radiusMeters) === 200 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormData({ ...formData, radiusMeters: 200 })}
            >
              200m
            </button>
            <button
              type="button"
              className={`btn btn-sm ${Number(formData.radiusMeters) === 500 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormData({ ...formData, radiusMeters: 500 })}
            >
              500m
            </button>
          </div>
          <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
            Supervisors inside this radius are verified as "On Site". Beyond this radius, distance deviation is recorded.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Site Address / Landmark</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Plot 42, Marine Drive, Kochi"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? 'Saving Coordinates...' : 'Save Site Geofence'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
