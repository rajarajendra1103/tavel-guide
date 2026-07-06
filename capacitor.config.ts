import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.antigravity.travelguide',
  appName: 'Travel Guide',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
