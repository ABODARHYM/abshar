'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
const icon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })
const redIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })
interface MapProps { pickup?: [number, number] | null; dropoff?: [number, number] | null; height?: string }
export default function Map({ pickup, dropoff, height = '300px' }: MapProps) {
  const center: [number, number] = pickup || [15.3694, 44.191]
  return (
    <div style={{ height, width: '100%', borderRadius: '1rem', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {pickup && <Marker position={pickup} icon={icon}><Popup>📍 الاستلام</Popup></Marker>}
        {dropoff && <Marker position={dropoff} icon={redIcon}><Popup>🎯 التسليم</Popup></Marker>}
      </MapContainer>
    </div>
  )
}
