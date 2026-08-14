"use client";

// In-app notification bell (plan mobile-first: notifications duplicated in-app because
// many Canadians disable push). Shows demo inapp notifications for the signed-in user.
import { useEffect, useState } from "react";

interface Notice {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);

  useEffect(() => {
    fetch(`/api/notifications?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []))
      .catch(() => {});
  }, [userId]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-sand text-xl"
      >
        🔔
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-sand bg-white shadow-xl">
          <div className="border-b border-sand bg-cream px-4 py-2 text-sm font-semibold text-forest">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <div className="px-4 py-6 text-center text-sm text-forest/50">Nothing yet</div>}
            {items.map((n) => (
              <div key={n.id} className="border-b border-sand/60 px-4 py-3">
                <div className="text-sm font-semibold text-forest">{n.title}</div>
                <div className="text-xs text-forest/60">{n.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
