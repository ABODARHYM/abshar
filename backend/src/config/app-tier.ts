/**
 * مستوى النظام. المرجع الوحيد هو الـ Backend (متغير البيئة APP_TIER).
 * التطبيقات قد تعرض/تخفي واجهات حسب الـ Tier، لكن الحماية الفعلية تتم هنا فقط.
 */
export enum AppTier {
  Free = 'FREE',
  Pro = 'PRO',
}

export enum NodeEnv {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}
