'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', vehicle: 'motorcycle', plate: '', license: '' })
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formatted = form.phone.startsWith('+') ? form.phone : '+967' + form.phone.replace(/^0/, '')
    localStorage.setItem('driver_phone', formatted)
    localStorage.setItem('driver_id', 'driver-' + formatted.replace('+', ''))
    localStorage.setItem('driver_name', form.name)
    localStorage.setItem('driver_vehicle', form.vehicle)
    localStorage.setItem('driver_plate', form.plate)
    localStorage.setItem('driver_license', form.license)
    localStorage.setItem('driver_logged_in', 'true')
    localStorage.setItem('driver_online', 'false')
    localStorage.setItem('driver_wallet', '0')
    router.push('/dashboard')
  }
  const vehicles = [
    { value: 'motorcycle', label: 'دراجة نارية', icon: '🏍️' },
    { value: 'car', label: 'سيارة', icon: '🚗' },
    { value: 'van', label: 'فان', icon: '🚐' },
    { value: 'truck', label: 'شاحنة', icon: '🚚' },
  ]
  return (
    <main className="min-h-screen relative overflow-hidden bg-white p-6" dir="rtl">
      <div className="absolute top-[-15%] left-[-15%] w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-30" />
      <div className="relative w-full max-w-md mx-auto pt-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-4xl bg-gradient-primary flex items-center justify-center shadow-primary"><span className="text-white text-5xl">🛵</span></div>
          <h1 className="text-3xl font-black text-gray-900">حساب مندوب جديد</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="block text-sm font-bold text-gray-700 mb-3">👤 الاسم</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={3} className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" /></div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">📱 رقم الجوال</label>
            <div className="flex bg-gray-50 rounded-3xl p-2 border-2 border-transparent focus-within:border-primary-300" dir="ltr">
              <span className="inline-flex items-center px-4 text-primary-600 font-black text-lg">+967</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="7XX XXX XXX" required className="flex-1 px-4 py-4 bg-transparent focus:outline-none text-lg font-bold" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">🚗 نوع المركبة</label>
            <div className="grid grid-cols-2 gap-3">
              {vehicles.map((v) => (
                <button key={v.value} type="button" onClick={() => setForm({ ...form, vehicle: v.value })} className={`p-4 rounded-3xl border-2 transition-all duration-300 ${form.vehicle === v.value ? 'bg-gradient-primary text-white border-transparent shadow-primary scale-105' : 'bg-white border-gray-100'}`}>
                  <div className="text-3xl mb-1">{v.icon}</div>
                  <p className="font-black text-sm">{v.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div><label className="block text-sm font-bold text-gray-700 mb-3">🔢 رقم اللوحة</label><input type="text" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} required className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-3">📄 رقم الرخصة</label><input type="text" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} required className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" /></div>
          <button type="submit" disabled={form.phone.length < 9 || form.name.length < 3} className="w-full py-5 bg-gradient-primary text-white rounded-3xl font-black text-lg shadow-primary hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">✨ إنشاء الحساب</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-8 font-semibold">لديك حساب؟ <a href="/login" className="text-primary-600 font-black">تسجيل الدخول</a></p>
      </div>
    </main>
  )
}
