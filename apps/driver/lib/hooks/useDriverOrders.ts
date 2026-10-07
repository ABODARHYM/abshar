'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../supabase/client'
import type { Order, OrderStatus } from '../types/order'

export async function getAvailableOrders(): Promise<Order[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'pending')
    .is('driver_id', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Order[]
}

export async function getDriverOrders(driverId: string): Promise<Order[]> {
  const supabase = createClient()

  const realDriverId = typeof window !== 'undefined'
    ? localStorage.getItem('driver_id') || driverId
    : driverId

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('driver_id', realDriverId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Order[]
}

export async function acceptOrder(orderId: string, driverId: string) {
  const supabase = createClient()

  const realDriverId = typeof window !== 'undefined'
    ? localStorage.getItem('driver_id') || driverId
    : driverId

  const { error } = await supabase
    .from('orders')
    .update({ driver_id: realDriverId, status: 'accepted' })
    .eq('id', orderId)
  if (error) throw error
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = createClient()
  const update: any = { status }
  if (status === 'delivered') update.delivered_at = new Date().toISOString()
  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
  if (error) throw error
}

export function useAvailableOrders(refreshInterval = 8000) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await getAvailableOrders()
        if (mounted) { setOrders(data); setLoading(false) }
      } catch (err) {
        console.error(err)
        if (mounted) setLoading(false)
      }
    }
    load()
    const timer = setInterval(load, refreshInterval)
    return () => { mounted = false; clearInterval(timer) }
  }, [refreshInterval])

  return { orders, loading }
}
