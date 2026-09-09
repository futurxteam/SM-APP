import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper to create colored custom circle markers
function createCustomPin(color, label) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        font-weight: 700;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        transform: translate(-50%, -50%);
      ">
        <span>📍</span> ${label}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export default function TrackingMap({ siteCoordinates, checkpoints = {}, height = '420px' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous map if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const validPoints = [];

    // Check if site coordinates exist
    const hasSiteCoords =
      siteCoordinates &&
      siteCoordinates.latitude != null &&
      siteCoordinates.longitude != null;

    const defaultLat = hasSiteCoords ? Number(siteCoordinates.latitude) : 20.5937;
    const defaultLng = hasSiteCoords ? Number(siteCoordinates.longitude) : 78.9629;
    const defaultZoom = hasSiteCoords ? 15 : 5;

    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], defaultZoom);
    mapInstanceRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // 1. Draw Project Site Pin and Geofence Circle
    if (hasSiteCoords) {
      const siteLat = Number(siteCoordinates.latitude);
      const siteLng = Number(siteCoordinates.longitude);
      const radius = Number(siteCoordinates.radiusMeters) || 200;

      validPoints.push([siteLat, siteLng]);

      // Geofence Circle (translucent blue area)
      const circle = L.circle([siteLat, siteLng], {
        color: '#2563EB',
        fillColor: '#3B82F6',
        fillOpacity: 0.15,
        weight: 2,
        radius: radius,
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="color: #2563EB; font-size: 14px;">🏢 Project Site Center</strong><br/>
          <strong>Geofence Radius:</strong> ${radius} meters<br/>
          <strong>Latitude:</strong> ${siteLat}<br/>
          <strong>Longitude:</strong> ${siteLng}<br/>
          <a href="https://www.google.com/maps?q=${siteLat},${siteLng}" target="_blank" rel="noreferrer" style="color: #2563EB; font-weight: 600; text-decoration: underline; display: inline-block; margin-top: 4px;">Open in Google Maps</a>
        </div>
      `);

      // Site Center Marker
      const siteMarker = L.marker([siteLat, siteLng], {
        icon: createCustomPin('#1E3A5F', 'Project Site'),
      }).addTo(map);

      siteMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px;">
          <strong style="color: #1E3A5F; font-size: 14px;">🏢 Project Site</strong><br/>
          <strong>Coordinates:</strong> ${siteLat}, ${siteLng}<br/>
          <strong>Geofence:</strong> ${radius}m radius
        </div>
      `);
    }

    // 2. Add Supervisor Checkpoints
    const slotConfigs = [
      { key: '9am', label: '9 AM Check-in', color: '#0284C7' },
      { key: '12pm', label: '12 PM Check-in', color: '#059669' },
      { key: '3pm', label: '3 PM Check-in', color: '#D97706' },
      { key: '6pm', label: '6 PM Check-in', color: '#7C3AED' },
      { key: 'login', label: 'Login Check-in', color: '#4F46E5' },
    ];

    const polylineCoords = [];

    slotConfigs.forEach(({ key, label, color }) => {
      const log = checkpoints[key];
      if (log && log.latitude != null && log.longitude != null) {
        const lat = Number(log.latitude);
        const lng = Number(log.longitude);

        validPoints.push([lat, lng]);
        polylineCoords.push([lat, lng]);

        const marker = L.marker([lat, lng], {
          icon: createCustomPin(color, label),
        }).addTo(map);

        const statusBadge =
          log.status === 'on_site'
            ? '<span style="background: #ECFDF5; color: #059669; padding: 2px 6px; border-radius: 4px; font-weight: 700;">🟢 ON SITE</span>'
            : log.status === 'near_site'
            ? '<span style="background: #FFFBEB; color: #D97706; padding: 2px 6px; border-radius: 4px; font-weight: 700;">🟡 NEAR SITE</span>'
            : '<span style="background: #FEF2F2; color: #DC2626; padding: 2px 6px; border-radius: 4px; font-weight: 700;">🔴 OFF SITE</span>';

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; line-height: 1.5; min-width: 220px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: ${color}; font-size: 14px;">${label}</strong>
              ${statusBadge}
            </div>
            <strong>Time Recorded:</strong> ${new Date(log.timeRecorded).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br/>
            <strong>Deviation:</strong> <span style="font-weight: 600; color: ${log.status === 'on_site' ? '#059669' : '#DC2626'}">${log.deviationFormatted || 'N/A'}</span><br/>
            <strong>Distance:</strong> ${log.distanceFromSiteMeters != null ? `${log.distanceFromSiteMeters}m from site center` : 'N/A'}<br/>
            <strong>Accuracy:</strong> ±${log.accuracy ? Math.round(log.accuracy) : 'N/A'}m<br/>
            <strong>Coordinates:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}<br/>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noreferrer" style="color: #2563EB; font-weight: 600; text-decoration: underline; display: inline-block; margin-top: 6px;">Open in Google Maps</a>
          </div>
        `);
      }
    });

    // 3. Connect supervisor checkpoints with a movement path line
    if (polylineCoords.length > 1) {
      L.polyline(polylineCoords, {
        color: '#6366F1',
        weight: 3,
        opacity: 0.7,
        dashArray: '6, 8',
      }).addTo(map);
    }

    // Auto fit bounds to encompass all pins
    if (validPoints.length > 1) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (validPoints.length === 1) {
      map.setView(validPoints[0], 16);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [siteCoordinates, checkpoints]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: height,
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 1,
      }}
    />
  );
}
