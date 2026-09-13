import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

/**
 * Checks and requests location permissions on native devices or web.
 * @returns {Promise<boolean>} True if permission is granted, false otherwise.
 */
export const requestLocationPermission = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        permissions = await Geolocation.requestPermissions();
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          console.warn('Location permission denied on device');
          return false;
        }
      }
      return true;
    }

    // In web browser
    if (navigator?.permissions?.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
          return false;
        }
      } catch (e) {
        // Some browsers don't support geolocation permission query
      }
    }
    return true;
  } catch (err) {
    console.warn('Error checking/requesting location permission:', err);
    return true;
  }
};

/**
 * Gets current device GPS position.
 * @param {Object} options Options for Geolocation
 * @returns {Promise<{ latitude: number, longitude: number, accuracy: number, timestamp: number }>}
 */
export const getCurrentPosition = async (options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }) => {
  const allowed = await requestLocationPermission();
  if (!allowed) {
    throw new Error('Location permission was denied. Please allow location access in your device settings.');
  }

  try {
    const position = await Geolocation.getCurrentPosition(options);
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  } catch (error) {
    // If native failed or web fallback is needed
    if (!Capacitor.isNativePlatform() && navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          }),
          (err) => {
            let msg = 'Unable to acquire location.';
            if (err.code === 1) { // PERMISSION_DENIED
              msg = 'Location permission was denied. Please allow location access in your browser or device settings.';
            } else if (err.code === 2) { // POSITION_UNAVAILABLE
              msg = 'Location signal is unavailable. Please ensure device GPS is turned on.';
            } else if (err.code === 3) { // TIMEOUT
              msg = 'Location request timed out. Please try again.';
            }
            reject(new Error(msg));
          },
          options
        );
      });
    }
    throw error;
  }
};
