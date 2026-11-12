"use client";

import { useEffect, useState } from "react";

export default function DebugPage() {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const refresh = localStorage.getItem("refreshToken");
    const user = localStorage.getItem("user");

    setData({
      token: token ? token.slice(0, 50) + "..." : "NULL",
      tokenFull: token,
      tokenLen: token?.length || 0,
      refresh: refresh ? refresh.slice(0, 30) + "..." : "NULL",
      user: user || "NULL",
      keys: Object.keys(localStorage),
    });
  }, []);

  const testGet = async () => {
    const t = localStorage.getItem("accessToken");
    if (!t) return alert("NO TOKEN");
    const res = await fetch("/api/v1/store-owner/orders?limit=3", {
      headers: { Authorization: "Bearer " + t },
    });
    const d = await res.json();
    alert("Status: " + res.status + "\n\n" + JSON.stringify(d).slice(0, 300));
  };

  const testAccept = async () => {
    const t = localStorage.getItem("accessToken");
    if (!t) return alert("NO TOKEN");
    const r1 = await fetch("/api/v1/store-owner/orders?limit=3", {
      headers: { Authorization: "Bearer " + t },
    });
    const d1 = await r1.json();
    const order = (d1.items || d1)[0];
    if (!order) return alert("No orders. Status: " + r1.status);

    const r2 = await fetch(
      "/api/v1/store-owner/orders/" + order.id + "/accept",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + t,
        },
        body: JSON.stringify({}),
      }
    );
    const d2 = await r2.json();
    alert(
      "Order: " + order.orderNumber +
      "\nStatus: " + r2.status +
      "\n\n" + JSON.stringify(d2).slice(0, 300)
    );
  };

  const clear = () => {
    localStorage.clear();
    alert("Cleared");
    location.href = "/login";
  };

  return (
    <div className="app-shell bg-[var(--bg-base)] p-6 space-y-4">
      <h1 className="text-2xl font-black">🔍 Debug</h1>

      <div className="card">
        <p className="text-xs text-[var(--text-muted)]">Access Token</p>
        <pre className="text-[10px] break-all" dir="ltr">{data.token}</pre>
        <p className="text-xs">Length: {data.tokenLen}</p>
      </div>

      <div className="card">
        <p className="text-xs text-[var(--text-muted)]">Refresh Token</p>
        <pre className="text-[10px] break-all" dir="ltr">{data.refresh}</pre>
      </div>

      <div className="card">
        <p className="text-xs text-[var(--text-muted)]">User</p>
        <pre className="text-[10px] break-all" dir="ltr">{data.user}</pre>
      </div>

      <div className="card">
        <p className="text-xs text-[var(--text-muted)]">Keys</p>
        <pre className="text-[10px] break-all" dir="ltr">{JSON.stringify(data.keys, null, 2)}</pre>
      </div>

      <button onClick={testGet} className="btn btn-primary btn-full">
        🧪 اختبار GET orders
      </button>

      <button onClick={testAccept} className="btn btn-gold btn-full">
        🧪 اختبار قبول طلب
      </button>

      <button onClick={clear} className="btn btn-ghost btn-full text-red-400">
        🗑️ مسح localStorage
      </button>
    </div>
  );
}
