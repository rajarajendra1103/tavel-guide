import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { useTripStore } from '../store/useTripStore';

export const useGeolocation = () => {
  const { currentLocation, setCurrentLocation } = useTripStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const getPosition = async () => {
    setLoading(true);
    try {
      // Check/Request Capacitor GPS permissions
      const permission = await Geolocation.checkPermissions();
      
      let status = permission.location;
      if (status !== 'granted') {
        const request = await Geolocation.requestPermissions();
        status = request.location;
      }

      if (status === 'granted') {
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        setCurrentLocation(coordinates.coords.latitude, coordinates.coords.longitude);
        setError(null);
      } else {
        throw new Error('Location permission denied');
      }
    } catch (err: any) {
      console.warn('Geolocation query failed. Using default mock location (Paris, France).', err);
      // Default to Paris, France if GPS is unavailable
      if (!currentLocation) {
        setCurrentLocation(48.8566, 2.3522);
      }
      setError(err.message || 'Failed to fetch current location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentLocation) {
      getPosition();
    }
  }, []);

  return { 
    location: currentLocation || { lat: 48.8566, lon: 2.3522 }, 
    error, 
    loading, 
    refresh: getPosition 
  };
};
