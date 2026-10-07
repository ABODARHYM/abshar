export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white" dir="rtl">
      <div className="text-center p-8 max-w-md w-full">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-primary-600 flex items-center justify-center shadow-lg"><span className="text-white text-5xl">🛵</span></div>
        <h1 className="text-3xl font-bold text-primary-900 mb-2">أبشر بي - مندوب</h1>
        <p className="text-gray-600 mb-8">سجّل دخولك وابدأ باستقبال الطلبات</p>
        <div className="space-y-3">
          <a href="/login" className="block w-full py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition">تسجيل الدخول</a>
          <a href="/register" className="block w-full py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-2xl font-semibold hover:bg-primary-50 transition">حساب مندوب جديد</a>
        </div>
      </div>
    </main>
  )
}
