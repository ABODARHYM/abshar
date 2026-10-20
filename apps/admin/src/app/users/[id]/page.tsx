'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      const res = await authFetch(`/api/v1/admin/users/${userId}`);
      if (res.ok) setUser(await res.json());
    } catch {}
    setLoading(false);
  };

  const toggleStatus = async () => {
    if (!user || acting) return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`تغيير الحالة إلى ${newStatus}؟`)) return;

    setActing(true);
    try {
      const res = await authFetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await loadUser();
      else alert('فشل التحديث');
    } catch {}
    setActing(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p className="text-6xl mb-4">😕</p>
        <p>المستخدم غير موجود</p>
        <Link href="/users" className="btn btn-primary mt-4">عودة</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-[var(--bg-card)] rounded-xl">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-black">👤 تفاصيل المستخدم</h1>
      </div>

      {/* User card */}
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl font-black text-accent">
            {user.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black">{user.fullName}</h2>
            <p className="text-sm text-muted" dir="ltr">{user.email}</p>
            <p className="text-sm text-muted" dir="ltr">{user.phone}</p>
          </div>
          <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
            {user.status === 'active' ? '✅ نشط' : '❌ موقوف'}
          </span>
        </div>
      </div>

      {/* Roles */}
      <div className="card mb-4">
        <h3 className="font-black mb-3">🔑 الأدوار</h3>
        <div className="flex flex-wrap gap-2">
          {(user.roles || []).map((r: string) => (
            <span key={r} className="badge badge-accent">{r}</span>
          ))}
        </div>
      </div>

      {/* Permissions */}
      {user.permissions && user.permissions.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-black mb-3">🛡️ الصلاحيات ({user.permissions.length})</h3>
          <div className="flex flex-wrap gap-1">
            {user.permissions.map((p: string) => (
              <span key={p} className="badge badge-gray text-[10px]" dir="ltr">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h3 className="font-black mb-3">⚡ إجراءات</h3>
        <button
          onClick={toggleStatus}
          disabled={acting}
          className={`btn btn-full ${user.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
        >
          {acting ? '...' : user.status === 'active' ? '🚫 إيقاف الحساب' : '✅ تفعيل الحساب'}
        </button>
      </div>
    </div>
  );
}
