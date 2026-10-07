'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', vehicle: 'motorcycle', plate: '', license: '' })
  const [loading, setLoading] = useState(false)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
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
    <main className="min-h-screen bg-white p-6" dir="rtl">
      <div className="w-full max-w-md mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-600 flex items-center justify-center"><span className="text-white text-3xl">🛵</span></div>
          <h1 className="text-2xl font-bold text-gray-900">حساب مندوب جديد</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
            <div className="flex" dir="ltr">
              <span className="inline-flex items-center px-4 rounded-l-2xl border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-600 font-medium">+967</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="7XX XXX XXX" required className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-r-2xl focus:border-primary-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع المركبة</label>
            <div className="grid grid-cols-2 gap-3">
              {vehicles.map((v) => (
                <button key={v.value} type="button" onClick={() => setForm({ ...form, vehicle: v.value })} className={`p-4 rounded-2xl border-2 transition ${form.vehicle === v.value ? 'bg-primary-50 border-primary-500' : 'bg-white border-gray-200'}`}>
                  <div className="text-3xl mb-1">{v.icon}</div>
                  <p className="font-semibold text-sm">{v.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم اللوحة</label>
            <input type="text" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم الرخصة</label>
            <input type="text" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" />
          </div>
          <button type="submit" disabled={loading || form.phone.length < 9 || form.name.length < 3} className="w-full py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition disabled:opacity-50">{loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">لديك حساب؟ <a href="/login" className="text-primary-600 font-semibold">تسجيل الدخول</a></p>
      </div>
    </main>
  )
}
