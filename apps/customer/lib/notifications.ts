'use client'

import { createClient } from './supabase/client'

export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  type: string = 'general',
  data?: any
) {
  const supabase = createClient()
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body,
    type,
    data: data || {},
    is_read: false,
  })
  if (error) console.error('Notification error:', error)
}

export async function sendOrderNotification(
  customerId: string,
  driverId: string | null,
  orderNumber: string,
  status: string
) {
  const messages: Record<string, string> = {
    accepted: 'تم قبول طلبك وجاري التوجه للاستلام',
    heading_to_pickup: 'المندوب في الطريق لموقع الاستلام',
    picked_up: 'تم استلام طلبك بنجاح',
    on_the_way: 'طلبك في الطريق إليك',
    delivered: 'تم توصيل طلبك بنجاح ✅',
    cancelled: 'تم إلغاء الطلب',
  }

  const message = messages[status] || `تحديث حالة الطلب ${orderNumber}`

  await sendNotification(
    customerId,
    `تحديث الطلب ${orderNumber}`,
    message,
    'order',
    { order_number: orderNumber, status }
  )
}
