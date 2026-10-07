export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'heading_to_pickup'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'

export type OrderType = 'food' | 'documents' | 'parcels' | 'custom'

export type PaymentMethod = 'cash' | 'card' | 'wallet'

export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface Location {
  lat: number
  lng: number
  address: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  driver_id: string | null
  order_type: OrderType
  status: OrderStatus
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dropoff_address: string
  dropoff_lat: number
  dropoff_lng: number
  weight_kg: number | null
  notes: string | null
  image_url: string | null
  distance_km: number | null
  base_fare: number
  distance_fare: number
  total_price: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  created_at: string
  updated_at: string
  delivered_at: string | null
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  accepted: 'تم القبول',
  heading_to_pickup: 'في الطريق للاستلام',
  picked_up: 'تم الاستلام',
  on_the_way: 'في الطريق للتسليم',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  food: 'طعام',
  documents: 'وثائق',
  parcels: 'طرود',
  custom: 'مخصص',
}

export const ORDER_TYPE_ICONS: Record<OrderType, string> = {
  food: '🍔',
  documents: '📄',
  parcels: '📦',
  custom: '✏️',
}
