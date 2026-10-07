'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  type: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15)
      setNotifications((data || []) as Notification[])
    }
    load()

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 15))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative w-12 h-12 rounded-2xl bg-white hover:bg-gray-50 flex items-center justify-center text-xl transition shadow-soft border border-gray-100">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-16 left-0 w-96 bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-black text-gray-900">الإشعارات</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🔕</div>
                  <p className="text-sm text-gray-500 font-semibold">لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center text-xl flex-shrink-0">
                        {notif.type === 'order' ? '📦' : '🔔'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                          {new Date(notif.created_at).toLocaleString('ar-YE')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
