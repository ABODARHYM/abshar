import type { OrderType } from '../types/order'

/**
 * حساب المسافة بين نقطتين بالكيلومتر (Haversine)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // نصف قطر الأرض بالكم
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

/**
 * حساب سعر الطلب
 */
export interface PriceResult {
  distanceKm: number
  baseFare: number
  distanceFare: number
  totalPrice: number
}

const BASE_FARES: Record<OrderType, number> = {
  food: 500,
  documents: 300,
  parcels: 400,
  custom: 600,
}

const PRICE_PER_KM: Record<OrderType, number> = {
  food: 200,
  documents: 150,
  parcels: 180,
  custom: 250,
}

const MIN_FARE = 500

export function calculatePrice(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  orderType: OrderType
): PriceResult {
  const distanceKm = calculateDistance(lat1, lng1, lat2, lng2)
  const baseFare = BASE_FARES[orderType]
  const distanceFare = Math.round(distanceKm * PRICE_PER_KM[orderType])
  const totalPrice = Math.max(baseFare + distanceFare, MIN_FARE)

  return {
    distanceKm,
    baseFare,
    distanceFare,
    totalPrice,
  }
}

/**
 * تنسيق السعر بالعملة
 */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ar-YE')} ر.ي`
}
