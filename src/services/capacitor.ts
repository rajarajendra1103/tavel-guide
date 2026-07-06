import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { useState, useEffect } from 'react';

// 1. Camera Capture Receipt/Photo
export const takeReceiptPhoto = async (): Promise<string | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt // Prompts user to select Camera or Photo library
    });
    return image.webPath || null;
  } catch (error) {
    console.error('Capacitor Camera capture failed:', error);
    return null;
  }
};

// 2. Share Itinerary Details Native Dialog
export const shareTravelItinerary = async (
  title: string,
  text: string,
  url?: string
): Promise<boolean> => {
  try {
    const canShare = await Share.canShare();
    if (canShare.value) {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share Itinerary'
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Capacitor Share action failed:', error);
    return false;
  }
};

// 3. Local Notification Schedule Reminder
export const scheduleTravelReminder = async (
  title: string,
  body: string,
  delayInSeconds: number = 3
): Promise<boolean> => {
  try {
    const check = await LocalNotifications.checkPermissions();
    let status = check.display;
    
    if (status !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      status = req.display;
    }

    if (status === 'granted') {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000),
            title,
            body,
            schedule: { at: new Date(Date.now() + delayInSeconds * 1000) }
          }
        ]
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Capacitor Notification scheduling failed:', error);
    return false;
  }
};

// 4. Network Status Monitoring Custom Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
      } catch (err) {
        console.warn('Capacitor Network status failed, defaulting to online:', err);
      }
    };

    checkInitialStatus();

    const networkListener = Network.addListener('networkStatusChange', (status) => {
      setIsOnline(status.connected);
    });

    return () => {
      networkListener.then(l => l.remove());
    };
  }, []);

  return isOnline;
};
