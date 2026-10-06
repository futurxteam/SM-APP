import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { getCurrentPosition } from '../../services/geolocationService';
import { Search, MapPin, Navigation, Compass, Loader2, Check } from 'lucide-react';

// Fix for default Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function InteractiveLocationPicker({
  latitude,
  longitude,
  radiusMeters = 200,
  address = '',
  onChange,
  height = '280px',
  showRadiusSelect = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Default coordinate if none provided (central India / Kerala region default: 10.0261, 76.3125)
  const currentLat = latitude !== '' && latitude != null && !isNaN(Number(latitude))
    ? Number(latitude)
    : null;
  const currentLng = longitude !== '' && longitude != null && !isNaN(Number(longitude))
    ? Number(longitude)
    : null;

  const defaultCenter = [currentLat ?? 10.0261, currentLng ?? 76.3125];

  // Callback to update parent
  const updateLocation = useCallback((lat, lng, newAddress = null) => {
    const formattedLat = Number(Number(lat).toFixed(6));
    const formattedLng = Number(Number(lng).toFixed(6));
    if (onChange) {
      onChange({
        latitude: formattedLat,
        longitude: formattedLng,
        radiusMeters: Number(radiusMeters) || 200,
        address: newAddress !== null ? newAddress : address,
      });
    }
  }, [onChange, radiusMeters, address]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const zoomLevel = currentLat != null ? 15 : 6;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(defaultCenter, zoomLevel);

    mapInstanceRef.current = map;

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Click on map to place/move pin
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      updateLocation(lat, lng);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Marker & Geofence Circle when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentLat != null && currentLng != null) {
      const pos = [currentLat, currentLng];

      // Update or create Marker
      if (markerRef.current) {
        markerRef.current.setLatLng(pos);
      } else {
        const marker = L.marker(pos, {
          draggable: true,
          title: 'Project Site Center (Drag to reposition)',
        }).addTo(map);

        marker.on('dragend', (e) => {
          const latlng = e.target.getLatLng();
          updateLocation(latlng.lat, latlng.lng);
        });

        markerRef.current = marker;
      }

      // Update or create Geofence Circle
      const radius = Number(radiusMeters) || 200;
      if (circleRef.current) {
        circleRef.current.setLatLng(pos);
        circleRef.current.setRadius(radius);
      } else {
        const circle = L.circle(pos, {
          color: '#2563EB',
          fillColor: '#3B82F6',
          fillOpacity: 0.18,
          weight: 2,
          radius: radius,
        }).addTo(map);
        circleRef.current = circle;
      }

      // Auto-invalidate map size when container dimensions settle
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
    }
  }, [currentLat, currentLng, radiusMeters, updateLocation]);

  // Handle Search Input Debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/location/search', { params: { q: searchQuery.trim() } });
        setSearchResults(res.data.results || []);
        setShowResults(true);
      } catch (err) {
        console.error('Location search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select Search Result
  const handleSelectResult = (item) => {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    const placeName = item.name || item.displayName.split(',')[0];

    setSearchQuery(item.displayName);
    setShowResults(false);

    updateLocation(lat, lon, placeName);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16, { animate: true });
    }
  };

  // Detect Device GPS
  const handleUseCurrentGPS = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      const lat = Number(pos.latitude.toFixed(6));
      const lng = Number(pos.longitude.toFixed(6));

      updateLocation(lat, lng);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
      }
    } catch (err) {
      alert(`GPS Error: ${err.message || 'Unable to retrieve current location.'}`);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Search Input Bar & Current GPS Button */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={14}
            color="#64748B"
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Type place or address to search (e.g. Marine Drive Kochi, Dubai Marina)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowResults(true);
            }}
            style={{
              paddingLeft: '32px',
              paddingRight: isSearching ? '32px' : '10px',
              fontSize: '12px',
              height: '34px',
              borderRadius: '6px',
            }}
          />
          {isSearching && (
            <Loader2
              size={14}
              color="#2563EB"
              className="spin-icon"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          )}

          {/* Search Autocomplete Suggestions Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                zIndex: 1000,
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {searchResults.map((item, index) => (
                <div
                  key={`${item.lat}-${item.lon}-${index}`}
                  onClick={() => handleSelectResult(item)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <MapPin size={14} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#1E293B' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.3' }}>
                      {item.displayName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleUseCurrentGPS}
          disabled={isLocating}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            height: '34px',
            padding: '0 12px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
          title="Use device GPS location"
        >
          <Navigation size={13} className={isLocating ? 'spin-icon' : ''} />
          <span>{isLocating ? 'Locating...' : 'My GPS'}</span>
        </button>
      </div>

      {/* Map Container */}
      <div
        style={{
          width: '100%',
          height: height,
          borderRadius: '8px',
          border: '1px solid #CBD5E1',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* Instructions Overlay Banner */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            right: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '11px',
            color: '#334155',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Compass size={13} color="#2563EB" />
            <span>Click map or drag the pin to set center</span>
          </div>

          {currentLat != null && currentLng != null && (
            <div style={{ fontWeight: 700, color: '#1E3A5F', fontFamily: 'monospace' }}>
              📍 {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
