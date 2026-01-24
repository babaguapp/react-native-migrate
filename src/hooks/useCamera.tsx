import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

interface CameraState {
  photo: Photo | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

interface UseCameraOptions {
  quality?: number;
  allowEditing?: boolean;
  width?: number;
  height?: number;
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    quality = 90,
    allowEditing = true,
    width = 1024,
    height = 1024,
  } = options;

  const [state, setState] = useState<CameraState>({
    photo: null,
    error: null,
    loading: false,
    permissionDenied: false,
  });

  const isNative = Capacitor.isNativePlatform();

  const checkPermissions = useCallback(async () => {
    if (!isNative) return true;

    try {
      let permStatus = await Camera.checkPermissions();

      if (permStatus.camera === 'prompt' || permStatus.photos === 'prompt') {
        permStatus = await Camera.requestPermissions();
      }

      if (permStatus.camera === 'denied') {
        setState(prev => ({
          ...prev,
          permissionDenied: true,
          error: 'Dostęp do aparatu został zablokowany',
        }));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }, [isNative]);

  const takePhoto = useCallback(async (): Promise<Photo | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        setState(prev => ({ ...prev, loading: false }));
        return null;
      }

      const photo = await Camera.getPhoto({
        quality,
        allowEditing,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width,
        height,
        correctOrientation: true,
      });

      setState({
        photo,
        error: null,
        loading: false,
        permissionDenied: false,
      });

      return photo;
    } catch (error: any) {
      console.error('Error taking photo:', error);
      
      // User cancelled - not an error
      if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
        setState(prev => ({ ...prev, loading: false }));
        return null;
      }

      setState(prev => ({
        ...prev,
        error: 'Nie udało się zrobić zdjęcia',
        loading: false,
      }));
      return null;
    }
  }, [quality, allowEditing, width, height, checkPermissions]);

  const pickFromGallery = useCallback(async (): Promise<Photo | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        setState(prev => ({ ...prev, loading: false }));
        return null;
      }

      const photo = await Camera.getPhoto({
        quality,
        allowEditing,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        width,
        height,
        correctOrientation: true,
      });

      setState({
        photo,
        error: null,
        loading: false,
        permissionDenied: false,
      });

      return photo;
    } catch (error: any) {
      console.error('Error picking photo:', error);
      
      // User cancelled - not an error
      if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
        setState(prev => ({ ...prev, loading: false }));
        return null;
      }

      setState(prev => ({
        ...prev,
        error: 'Nie udało się wybrać zdjęcia',
        loading: false,
      }));
      return null;
    }
  }, [quality, allowEditing, width, height, checkPermissions]);

  const promptPhotoSource = useCallback(async (): Promise<Photo | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        setState(prev => ({ ...prev, loading: false }));
        return null;
      }

      const photo = await Camera.getPhoto({
        quality,
        allowEditing,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt, // Let user choose camera or gallery
        width,
        height,
        correctOrientation: true,
        promptLabelHeader: 'Zdjęcie',
        promptLabelCancel: 'Anuluj',
        promptLabelPhoto: 'Wybierz z galerii',
        promptLabelPicture: 'Zrób zdjęcie',
      });

      setState({
        photo,
        error: null,
        loading: false,
        permissionDenied: false,
      });

      return photo;
    } catch (error: any) {
      console.error('Error getting photo:', error);
      
      // User cancelled - not an error
      if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
        setState(prev => ({ ...prev, loading: false }));
        return null;
      }

      setState(prev => ({
        ...prev,
        error: 'Nie udało się uzyskać zdjęcia',
        loading: false,
      }));
      return null;
    }
  }, [quality, allowEditing, width, height, checkPermissions]);

  // Convert photo to Blob for upload
  const photoToBlob = useCallback(async (photo: Photo): Promise<Blob | null> => {
    try {
      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        return await response.blob();
      }
      return null;
    } catch (error) {
      console.error('Error converting photo to blob:', error);
      return null;
    }
  }, []);

  const clearPhoto = useCallback(() => {
    setState({
      photo: null,
      error: null,
      loading: false,
      permissionDenied: false,
    });
  }, []);

  return {
    ...state,
    isNative,
    takePhoto,
    pickFromGallery,
    promptPhotoSource,
    photoToBlob,
    clearPhoto,
  };
}
