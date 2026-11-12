'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}

export default function MapPicker({
  initialLat = 15.4633,
  initialLng = 45.3256,
  onLocationChange,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    let mounted = true;

    (async () => {
      try {
        const L = (await import('leaflet')).default;

        if (!document.querySelector('link[data-leaflet]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.setAttribute('data-leaflet', 'true');
          document.head.appendChild(link);
        }

        if (!mounted || !mapRef.current) return;

        const map = L.map(mapRef.current, {
          center: [initialLat, initialLng],
          zoom: 15,
          zoomControl: true,
        });
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OSM',
          maxZoom: 19,
        }).addTo(map);

        const icon = L.divIcon({
          html: `<div style="width:40px;height:40px;background:#e11d48;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(225,29,72,0.5);display:flex;align-items:center;justify-content:center;"><div style="width:12px;height:12px;background:white;border-radius:50%;transform:rotate(45deg);"></div></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        const marker = L.marker([initialLat, initialLng], { icon, draggable: true }).addTo(map);
        markerRef.current = marker;

        onLocationChange(initialLat, initialLng);

        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const addr = await reverseGeocode(pos.lat, pos.lng);
          onLocationChange(pos.lat, pos.lng, addr);
        });

        map.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          const addr = await reverseGeocode(lat, lng);
          onLocationChange(lat, lng, addr);
        });

        setReady(true);
      } catch (e) {
        console.error('[Map] Failed:', e);
      }
    })();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[var(--bg-border)]">
      <div ref={mapRef} style={{ height: '300px', width: '100%', background: '#1a1a1a' }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-red)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-muted)]">جاري تحميل الخريطة...</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3">
        <button
          type="button"
          onClick={async () => {
            if (!navigator.geolocation) {
              alert('الجهاز لا يدعم تحديد الموقع');
              return;
            }
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const { latitude, longitude } = pos.coords;
                if (mapInstanceRef.current && markerRef.current) {
                  mapInstanceRef.current.setView([latitude, longitude], 17);
                  markerRef.current.setLatLng([latitude, longitude]);
                  const addr = await reverseGeocode(latitude, longitude);
                  onLocationChange(latitude, longitude, addr);
                }
              },
              (err) => alert('فشل الحصول على موقعك: ' + err.message),
              { enableHighAccuracy: true, timeout: 10000 },
            );
          }}
          className="w-full bg-[var(--bg-card)] text-white text-sm font-bold py-2.5 px-4 rounded-xl border border-[var(--bg-border)] shadow-lg"
        >
          📍 استخدم موقعي الحالي
        </button>
      </div>
    </div>
  );
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
      { headers: { 'User-Agent': 'ABSHER-BI/1.0' } },
    );
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}
