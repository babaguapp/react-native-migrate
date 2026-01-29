import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
  permissionStatus: 'unknown' | 'granted' | 'denied' | 'prompt';
  initialized: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoRequest?: boolean;
}

const STORAGE_KEY = 'user_location';
const LOCATION_EXPIRY_MS_WEB = 30 * 60 * 1000; // 30 minutes for web
// On mobile, location doesn't expire - persists until logout/uninstall

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    autoRequest = false,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true, // Start loading until we check cache/permissions
    permissionDenied: false,
    permissionStatus: 'unknown',
    initialized: false,
  });

  const isNative = Capacitor.isNativePlatform();

  // Check native permission status
  const checkNativePermission = useCallback(async (): Promise<'granted' | 'denied' | 'prompt'> => {
    try {
      const permStatus = await Geolocation.checkPermissions();
      if (permStatus.location === 'granted' || permStatus.coarseLocation === 'granted') {
        return 'granted';
      }
      if (permStatus.location === 'denied' && permStatus.coarseLocation === 'denied') {
        return 'denied';
      }
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }, []);

  // Load cached location and check permissions on mount
  useEffect(() => {
    const initialize = async () => {
      let cachedLat: number | null = null;
      let cachedLon: number | null = null;

      // Load cached location
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const { latitude, longitude, timestamp } = JSON.parse(cached);
          
          // On native: location doesn't expire
          // On web: expires after 30 minutes
          const isValid = isNative || (Date.now() - timestamp < LOCATION_EXPIRY_MS_WEB);
          
          if (isValid && latitude && longitude) {
            cachedLat = latitude;
            cachedLon = longitude;
          }
        }
      } catch (e) {
        console.warn('Failed to load cached location:', e);
      }

      // Check permission status on native
      let permStatus: 'unknown' | 'granted' | 'denied' | 'prompt' = 'unknown';
      if (isNative) {
        permStatus = await checkNativePermission();
      }

      setState(prev => ({
        ...prev,
        latitude: cachedLat,
        longitude: cachedLon,
        loading: false,
        initialized: true,
        permissionStatus: permStatus,
        permissionDenied: permStatus === 'denied',
      }));
    };

    initialize();
  }, [isNative, checkNativePermission]);

  // Native Capacitor geolocation
  const requestNativeLocation = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check permissions first
      let permStatus = await Geolocation.checkPermissions();

      if (permStatus.location === 'prompt' || permStatus.coarseLocation === 'prompt') {
        permStatus = await Geolocation.requestPermissions();
      }

      if (permStatus.location === 'denied' && permStatus.coarseLocation === 'denied') {
        setState(prev => ({
          ...prev,
          error: 'Dostęp do lokalizacji został zablokowany. Włącz go w ustawieniach telefonu.',
          loading: false,
          permissionDenied: true,
          permissionStatus: 'denied',
        }));
        return;
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy,
        timeout,
        maximumAge,
      });

      const { latitude, longitude } = position.coords;

      // Cache location (no expiry on native)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          latitude,
          longitude,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.warn('Failed to cache location:', e);
      }

      setState(prev => ({
        ...prev,
        latitude,
        longitude,
        error: null,
        loading: false,
        permissionDenied: false,
        permissionStatus: 'granted',
      }));
    } catch (error: any) {
      console.error('Native geolocation error:', error);
      let errorMessage = 'Nie udało się pobrać lokalizacji';
      let permissionDenied = false;
      let permStatus: 'granted' | 'denied' | 'prompt' = 'prompt';

      if (error?.message?.includes('denied') || error?.message?.includes('permission')) {
        errorMessage = 'Dostęp do lokalizacji został zablokowany. Włącz go w ustawieniach telefonu.';
        permissionDenied = true;
        permStatus = 'denied';
      } else if (error?.message?.includes('unavailable')) {
        errorMessage = 'Informacja o lokalizacji jest niedostępna';
      } else if (error?.message?.includes('timeout')) {
        errorMessage = 'Upłynął limit czasu pobierania lokalizacji';
      }

      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        permissionDenied,
        permissionStatus: permStatus,
      }));
    }
  }, [enableHighAccuracy, timeout, maximumAge]);

  // Web browser geolocation
  const requestWebLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolokalizacja nie jest wspierana przez tę przeglądarkę',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Cache location
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            latitude,
            longitude,
            timestamp: Date.now(),
          }));
        } catch (e) {
          console.warn('Failed to cache location:', e);
        }

        setState(prev => ({
          ...prev,
          latitude,
          longitude,
          error: null,
          loading: false,
          permissionDenied: false,
          permissionStatus: 'granted',
        }));
      },
      (error) => {
        let errorMessage = 'Nie udało się pobrać lokalizacji';
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Dostęp do lokalizacji został zablokowany';
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informacja o lokalizacji jest niedostępna';
            break;
          case error.TIMEOUT:
            errorMessage = 'Upłynął limit czasu pobierania lokalizacji';
            break;
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionDenied,
          permissionStatus: permissionDenied ? 'denied' : prev.permissionStatus,
        }));
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [enableHighAccuracy, timeout, maximumAge]);

  // Main request function - uses native or web based on platform
  const requestLocation = useCallback(() => {
    if (isNative) {
      requestNativeLocation();
    } else {
      requestWebLocation();
    }
  }, [isNative, requestNativeLocation, requestWebLocation]);

  // Auto-request on mount if enabled
  useEffect(() => {
    if (autoRequest && state.initialized && !state.latitude && !state.longitude) {
      requestLocation();
    }
  }, [autoRequest, state.initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(prev => ({
      ...prev,
      latitude: null,
      longitude: null,
      error: null,
      loading: false,
      permissionDenied: false,
    }));
  }, []);

  const setManualLocation = useCallback((latitude: number, longitude: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        latitude,
        longitude,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('Failed to cache manual location:', e);
    }

    setState(prev => ({
      ...prev,
      latitude,
      longitude,
      error: null,
      loading: false,
      permissionDenied: false,
    }));
  }, []);

  // Determine if we should show location prompt
  // On native: only show if no cached location AND permission is not granted
  // On web: only show once per session (using sessionStorage)
  const shouldShowPrompt = useCallback(() => {
    if (!state.initialized) return false;
    
    // Already have location - don't show
    if (state.latitude !== null && state.longitude !== null) return false;

    if (isNative) {
      // On native: show only if permission is not granted (denied or prompt)
      // If permission is granted but no location, they need to request it
      return state.permissionStatus !== 'granted';
    } else {
      // On web: use sessionStorage to show only once per session
      try {
        return sessionStorage.getItem('location_prompt_shown') !== 'true';
      } catch {
        return true;
      }
    }
  }, [state.initialized, state.latitude, state.longitude, state.permissionStatus, isNative]);

  const markPromptShown = useCallback(() => {
    if (!isNative) {
      try {
        sessionStorage.setItem('location_prompt_shown', 'true');
      } catch {
        // Ignore storage errors
      }
    }
  }, [isNative]);

  // Re-check permission status (useful when user returns from settings)
  const recheckPermission = useCallback(async () => {
    if (isNative) {
      const permStatus = await checkNativePermission();
      setState(prev => ({
        ...prev,
        permissionStatus: permStatus,
        permissionDenied: permStatus === 'denied',
      }));
      return permStatus;
    }
    return 'unknown';
  }, [isNative, checkNativePermission]);

  return {
    ...state,
    isNative,
    requestLocation,
    clearLocation,
    setManualLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
    shouldShowPrompt,
    markPromptShown,
    recheckPermission,
  };
}
