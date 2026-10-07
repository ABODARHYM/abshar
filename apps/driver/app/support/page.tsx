'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
export default function SupportPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{ from: 'user' | 'bot'; text: string }>>([{ from: 'bot', text: 'مرحباً! كيف يمكننا مساعدتك؟' }])
  const [loading, setLoading] = useState(false)
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setMessages((m) => [...m, { from: 'user', text: message }])
    setMessage('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setMessages((m) => [...m, { from: 'bot', text: 'شكراً! سيتواصل فريق الدعم قريباً.' }])
    setLoading(false)
  }
  return (
    <main className="min-h-screen bg-gray-50 pb-24 flex flex-col" dir="rtl">
      <header className="bg-white p-6 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">→</button>
          <div><h1 className="font-bold text-gray-900">الدعم الفني</h1><p className="text-xs text-green-600">متصل</p></div>
        </div>
      </header>
      <section className="flex-1 p-6 space-y-3 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-xs px-4 py-3 rounded-2xl ${msg.from === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'}`}>
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-end"><div className="bg-white px-4 py-3 rounded-2xl shadow-sm"><p className="text-sm text-gray-500">...</p></div></div>}
      </section>
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" />
          <button type="submit" disabled={!message.trim()} className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition disabled:opacity-50">➤</button>
        </div>
      </form>
      <BottomNav />
    </main>
  )
}
