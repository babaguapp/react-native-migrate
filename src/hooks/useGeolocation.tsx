import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoRequest?: boolean;
}

const STORAGE_KEY = 'user_location';
const LOCATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

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
    loading: false,
    permissionDenied: false,
  });

  const isNative = Capacitor.isNativePlatform();

  // Load cached location on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { latitude, longitude, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < LOCATION_EXPIRY_MS) {
          setState(prev => ({
            ...prev,
            latitude,
            longitude,
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load cached location:', e);
    }
  }, []);

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
          error: 'Dostęp do lokalizacji został zablokowany',
          loading: false,
          permissionDenied: true,
        }));
        return;
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy,
        timeout,
        maximumAge,
      });

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

      setState({
        latitude,
        longitude,
        error: null,
        loading: false,
        permissionDenied: false,
      });
    } catch (error: any) {
      console.error('Native geolocation error:', error);
      let errorMessage = 'Nie udało się pobrać lokalizacji';
      let permissionDenied = false;

      if (error?.message?.includes('denied') || error?.message?.includes('permission')) {
        errorMessage = 'Dostęp do lokalizacji został zablokowany';
        permissionDenied = true;
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

        setState({
          latitude,
          longitude,
          error: null,
          loading: false,
          permissionDenied: false,
        });
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
    if (autoRequest && !state.latitude && !state.longitude) {
      requestLocation();
    }
  }, [autoRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      latitude: null,
      longitude: null,
      error: null,
      loading: false,
      permissionDenied: false,
    });
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

    setState({
      latitude,
      longitude,
      error: null,
      loading: false,
      permissionDenied: false,
    });
  }, []);

  return {
    ...state,
    isNative,
    requestLocation,
    clearLocation,
    setManualLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}