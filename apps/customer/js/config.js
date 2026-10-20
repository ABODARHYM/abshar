/* ============================================================
   ABSHER BI — config.js
   الإعدادات العامة + مفاتيح التخزين
   ============================================================ */
const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

const STORAGE = {
  accessToken:  'absher_access_token',
  refreshToken: 'absher_refresh_token',
  user:         'absher_user',
  cart:         'absher_cart',
};

/* رسائل الأخطاء العربية الموحّدة */
const ERROR_MESSAGES = {
  UNAUTHORIZED:      'انتهت الجلسة، يرجى تسجيل الدخول مجددًا',
  FORBIDDEN:         'ليس لديك صلاحية لهذا الإجراء',
  NOT_FOUND:         'العنصر غير موجود',
  VALIDATION_FAILED: 'تحقق من البيانات المدخلة',
  CONFLICT:          'البيانات متعارضة مع سجل موجود',
  TOO_MANY_REQUESTS: 'محاولات كثيرة، حاول بعد قليل',
  INTERNAL_ERROR:    'حدث خطأ في الخادم',
  SERVICE_UNAVAILABLE: 'الخدمة غير متاحة حاليًا',
  NETWORK_ERROR:     'تعذر الاتصال بالخادم',
};
