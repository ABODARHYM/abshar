// Helper بسيط — يمكن استخدامه مستقبلاً
// حالياً نستخدم URL مباشر في الملفات
export const API_BASE = '/api/v1';

export function apiPath(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
