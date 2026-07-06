// Centralized API configuration to handle mobile (Capacitor) vs web environments
const DEFAULT_IP = '192.168.31.210'; // The development PC's Wi-Fi IP address

export const getBackendBaseUrl = (): string => {
  // Support environment variable for production builds
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }

  // Check if user set a custom IP in local storage
  const customIp = localStorage.getItem('BACKEND_SERVER_IP');
  if (customIp) {
    const trimmed = customIp.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `http://${trimmed}:3001`;
  }

  // Heuristic for Vite Dev Server in PC Browser (e.g. localhost:5173)
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' &&
    window.location.port !== ''
  ) {
    return 'http://localhost:3001';
  }

  // Default to development computer IP address
  return `http://${DEFAULT_IP}:3001`;
};

export const getBackendApiUrl = (): string => {
  return `${getBackendBaseUrl()}/api`;
};
