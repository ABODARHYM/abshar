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
    <main className="min-h-screen bg-gray-50 pb-32 flex flex-col relative" dir="rtl">
      <header className="bg-white/80 backdrop-blur-xl p-6 shadow-soft sticky top-0 z-50 rounded-b-4xl border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-xl font-black">→</button>
          <div className="flex-1"><h1 className="font-black text-gray-900">💬 الدعم الفني</h1><p className="text-xs text-green-600 font-bold flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> متصل</p></div>
        </div>
      </header>
      <section className="flex-1 p-6 space-y-3 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
            <div className={`max-w-xs px-5 py-3 rounded-3xl font-semibold ${msg.from === 'user' ? 'bg-gradient-primary text-white rounded-tr-sm shadow-primary' : 'bg-white text-gray-800 shadow-soft rounded-tl-sm border border-gray-100'}`}><p className="text-sm">{msg.text}</p></div>
          </div>
        ))}
        {loading && <div className="flex justify-end"><div className="bg-white px-5 py-3 rounded-3xl shadow-soft border border-gray-100"><div className="flex gap-1"><span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span><span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span></div></div></div>}
      </section>
      <form onSubmit={handleSend} className="p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100">
        <div className="flex gap-3">
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1 px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" />
          <button type="submit" disabled={!message.trim()} className="w-14 h-14 rounded-3xl bg-gradient-primary text-white flex items-center justify-center hover:scale-105 transition-all duration-300 disabled:opacity-50 shadow-primary text-xl">➤</button>
        </div>
      </form>
      <BottomNav />
    </main>
  )
}
