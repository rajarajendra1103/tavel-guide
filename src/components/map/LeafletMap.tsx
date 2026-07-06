import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issues in Vite/Webpack bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapMarker {
  lat: number;
  lon: number;
  popupText: string;
  type?: 'current' | 'hotel' | 'restaurant' | 'landmark' | 'transit' | 'other';
}

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routeTo?: [number, number]; // Coordinates to draw a line to from center
  height?: string;
  className?: string;
}

// Haversine formula to compute distance in km
const getHaversineDistance = (coords1: [number, number], coords2: [number, number]) => {
  const R = 6371; // Earth radius in km
  const dLat = ((coords2[0] - coords1[0]) * Math.PI) / 180;
  const dLon = ((coords2[1] - coords1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coords1[0] * Math.PI) / 180) *
      Math.cos((coords2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom = 13,
  markers = [],
  routeTo,
  height = '300px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize the Leaflet map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(center, zoom);

      // Mount OSM Standard Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    } else {
      mapRef.current.setView(center, zoom);
    }

    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;

    // Clear old markers & routing lines
    if (markerGroup) markerGroup.clearLayers();
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Add main center marker
    if (markerGroup) {
      const centerIcon = L.divIcon({
        className: 'custom-center-marker',
        html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker(center, { icon: centerIcon })
        .addTo(markerGroup)
        .bindPopup('Your Current Location');
    }

    // Add other points markers
    markers.forEach((m) => {
      if (!markerGroup) return;

      let markerColor = '#10b981'; // green for landmark
      if (m.type === 'hotel') markerColor = '#8b5cf6'; // purple
      if (m.type === 'restaurant') markerColor = '#f59e0b'; // orange
      if (m.type === 'transit') markerColor = '#ef4444'; // red

      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-3 h-3 bg-[${markerColor}] rounded-full border-2 border-white shadow-md z-10"></div>
          <div class="absolute w-5 h-5 bg-[${markerColor}] rounded-full opacity-40 animate-ping"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-place-marker',
        html: markerHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([m.lat, m.lon], { icon: customIcon })
        .addTo(markerGroup)
        .bindPopup(`<strong>${m.popupText}</strong>`);
    });

    // Draw route polyline if specified
    if (routeTo && markerGroup) {
      const routePoints: [number, number][] = [center, routeTo];
      
      // Draw standard dotted line representing route
      const routeLine = L.polyline(routePoints, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
      }).addTo(map);

      routeLineRef.current = routeLine;

      // Fit bounds to cover both coordinates
      const bounds = L.latLngBounds(routePoints);
      map.fitBounds(bounds, { padding: [40, 40] });

      const dist = getHaversineDistance(center, routeTo);
      
      // Add custom marker at destination with distance
      const routeDestIcon = L.divIcon({
        className: 'custom-route-dest',
        html: `<div class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md whitespace-nowrap">${dist.toFixed(1)} km</div>`,
        iconSize: [50, 16],
        iconAnchor: [25, 20],
      });
      L.marker(routeTo, { icon: routeDestIcon }).addTo(markerGroup);
    }

  }, [center, zoom, markers, routeTo]);

  // Clean up Leaflet instance when element is removed
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden shadow-md border border-slate-200/50 dark:border-slate-800/50 ${className}`}>
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height }}
        className="w-full h-full"
      />
    </div>
  );
};
