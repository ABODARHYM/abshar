export type OrderStatus = 'pending' | 'accepted' | 'heading_to_pickup' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled'
export type OrderType = 'food' | 'documents' | 'parcels' | 'custom'
export interface Order {
  id: string; order_number: string; customer_id: string; driver_id: string | null
  order_type: OrderType; status: OrderStatus
  pickup_address: string; dropoff_address: string
  total_price: number; distance_km: number | null
  payment_method: string; created_at: string
}
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار', accepted: 'تم القبول', heading_to_pickup: 'في الطريق للاستلام',
  picked_up: 'تم الاستلام', on_the_way: 'في الطريق', delivered: 'تم التسليم', cancelled: 'ملغي',
}
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  food: 'طعام', documents: 'وثائق', parcels: 'طرود', custom: 'مخصص',
}
