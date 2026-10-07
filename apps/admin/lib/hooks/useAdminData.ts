'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../supabase/client'
import type { Order } from '../types/order'

export interface Stats {
  totalOrders: number
  activeOrders: number
  deliveredOrders: number
  totalRevenue: number
  totalDrivers: number
  totalCustomers: number
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    totalDrivers: 0,
    totalCustomers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      try {
        const [ordersRes, driversRes, customersRes] = await Promise.all([
          supabase.from('orders').select('*'),
          supabase.from('drivers').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
        ])

        const allOrders = (ordersRes.data || []) as Order[]
        setStats({
          totalOrders: allOrders.length,
          activeOrders: allOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length,
          deliveredOrders: allOrders.filter((o) => o.status === 'delivered').length,
          totalRevenue: allOrders
            .filter((o) => o.status === 'delivered')
            .reduce((s, o) => s + Number(o.total_price), 0),
          totalDrivers: driversRes.count || 0,
          totalCustomers: customersRes.count || 0,
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { stats, loading }
}

export function useAllOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      setOrders((data || []) as Order[])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { orders, loading }
}

export function useAllDrivers() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false })
      setDrivers(data || [])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('admin-drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { drivers, loading }
}

export function useAllCustomers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
      setCustomers(data || [])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('admin-customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { customers, loading }
}
