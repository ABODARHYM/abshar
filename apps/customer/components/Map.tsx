'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// إصلاح أيقونات Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface MapProps {
  center?: [number, number]
  pickup?: [number, number] | null
  dropoff?: [number, number] | null
  onPickupChange?: (lat: number, lng: number) => void
  onDropoffChange?: (lat: number, lng: number) => void
  mode?: 'pickup' | 'dropoff' | 'view'
  height?: string
}

function LocationMarker({
  mode,
  onPickupChange,
  onDropoffChange,
}: {
  mode: 'pickup' | 'dropoff'
  onPickupChange?: (lat: number, lng: number) => void
  onDropoffChange?: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (mode === 'pickup' && onPickupChange) {
        onPickupChange(lat, lng)
      } else if (mode === 'dropoff' && onDropoffChange) {
        onDropoffChange(lat, lng)
      }
    },
  })
  return null
}

export default function Map({
  center = [15.3694, 44.191], // صنعاء
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  mode = 'pickup',
  height = '400px',
}: MapProps) {
  return (
    <div style={{ height, width: '100%', borderRadius: '1rem', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pickup && (
          <Marker position={pickup} icon={icon}>
            <Popup>موقع الاستلام</Popup>
          </Marker>
        )}

        {dropoff && (
          <Marker position={dropoff} icon={redIcon}>
            <Popup>موقع التسليم</Popup>
          </Marker>
        )}

        {mode !== 'view' && (
          <LocationMarker
            mode={mode}
            onPickupChange={onPickupChange}
            onDropoffChange={onDropoffChange}
          />
        )}
      </MapContainer>
    </div>
  )
}
