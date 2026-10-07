export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-white" dir="rtl">
      <div className="absolute inset-0 bg-gradient-soft" />
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-300 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-30" />
      <div className="relative min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md w-full animate-slide-up">
          <div className="w-28 h-28 mx-auto mb-8 rounded-4xl bg-gradient-primary flex items-center justify-center shadow-primary">
            <span className="text-white text-6xl font-black">أ</span>
          </div>
          <h1 className="text-4xl font-black mb-3 bg-gradient-primary bg-clip-text text-transparent">أبشر بي</h1>
          <p className="text-gray-500 mb-10 text-lg font-semibold">توصيل سريع وآمن داخل المدينة</p>
          <div className="space-y-4">
            <a href="/login" className="block w-full py-5 bg-gradient-primary text-white rounded-3xl font-black text-lg shadow-primary hover:scale-[1.02] transition-all duration-300">🚀 تسجيل الدخول</a>
            <a href="/register" className="block w-full py-5 bg-white text-primary-600 border-2 border-primary-200 rounded-3xl font-black text-lg hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 shadow-soft">✨ إنشاء حساب جديد</a>
          </div>
          <p className="text-xs text-gray-400 mt-12 font-semibold">© 2026 أسرار الرقمية</p>
        </div>
      </div>
    </main>
  )
}
