'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../supabase/client'
import type { Order, OrderType, PaymentMethod } from '../types/order'

export interface CreateOrderInput {
  order_type: OrderType
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dropoff_address: string
  dropoff_lat: number
  dropoff_lng: number
  weight_kg?: number
  notes?: string
  distance_km: number
  base_fare: number
  distance_fare: number
  total_price: number
  payment_method: PaymentMethod
}

export async function createOrder(
  customerId: string,
  input: CreateOrderInput
): Promise<Order> {
  const supabase = createClient()

  const userId = typeof window !== 'undefined'
    ? localStorage.getItem('abshar_user_id')
    : null

  const finalCustomerId = userId || customerId
  const orderNumber = 'ABS-' + Date.now().toString().slice(-8)

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: finalCustomerId,
      ...input,
      status: 'pending',
      payment_status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data as Order
}

export async function getUserOrders(customerId: string): Promise<Order[]> {
  const supabase = createClient()

  const userId = typeof window !== 'undefined'
    ? localStorage.getItem('abshar_user_id')
    : null

  const finalCustomerId = userId || customerId

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', finalCustomerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Order[]
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error) return null
  return data as Order
}

export function useOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return

    const supabase = createClient()

    getOrderById(orderId)
      .then((data) => {
        setOrder(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(payload.new as Order)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  return { order, loading, error }
}
