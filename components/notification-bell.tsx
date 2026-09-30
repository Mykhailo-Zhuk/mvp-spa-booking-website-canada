"use client";

// In-app notification bell (plan mobile-first: notifications duplicated in-app because
// many Canadians disable push). Shows in-app notifications for the signed-in user,
// with unread filtering, read status checkboxes, and notification history.
import { useEffect, useState, useRef, useMemo } from "react";
import { t, type Locale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";

interface Notice {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function NotificationBell({ userId, locale }: { userId: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [activeTab, setActiveTab] = useState<"unread" | "history">("unread");
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined" || !userId) return new Set();
    try {
      const stored = localStorage.getItem(`spa_read_notifs_${userId}`);
      if (stored) return new Set(JSON.parse(stored));
    } catch {
      // ignore
    }
    return new Set();
  });
  const ref = useRef<HTMLDivElement>(null);

  // Fetch notifications
  useEffect(() => {
    fetch(`/api/notifications?userId=${userId}&locale=${locale}`)
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []))
      .catch(() => {});
  }, [userId, locale]);

  // Click outside listener
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (ref.current && (path.includes(ref.current) || ref.current.contains(e.target as Node))) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem(`spa_read_notifs_${userId}`, JSON.stringify(Array.from(newSet)));
    } catch {
      // ignore
    }
  };

  const markAsRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(next);
  };

  const markAsUnread = (id: string) => {
    const next = new Set(readIds);
    next.delete(id);
    saveReadIds(next);
  };

  const markAllAsRead = () => {
    const next = new Set(readIds);
    items.forEach((item) => next.add(item.id));
    saveReadIds(next);
  };

  const unreadItems = useMemo(() => items.filter((n) => !readIds.has(n.id)), [items, readIds]);
  const historyItems = useMemo(() => items.filter((n) => readIds.has(n.id)), [items, readIds]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-sand text-xl cursor-pointer transition hover:bg-sand/80"
      >
        🔔
        {unreadItems.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadItems.length}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-12 z-50 w-84 max-w-[92vw] overflow-hidden rounded-2xl border border-sand bg-white shadow-xl"
        >
          {/* Header */}
          <div className="border-b border-sand bg-cream p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-forest">{t(locale, "notif.title")}</h3>
              {activeTab === "unread" && unreadItems.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-pine hover:underline cursor-pointer"
                >
                  ✓ {t(locale, "notif.markAllRead")}
                </button>
              )}
            </div>

            {/* Tabs: Unread vs History */}
            <div className="mt-2.5 flex rounded-xl border border-sand/70 bg-white p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`flex-1 rounded-lg py-1.5 text-center transition cursor-pointer ${
                  activeTab === "unread"
                    ? "bg-sand/60 text-forest shadow-2xs"
                    : "text-forest/60 hover:text-forest"
                }`}
              >
                {t(locale, "notif.unread")} {unreadItems.length > 0 ? `(${unreadItems.length})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex-1 rounded-lg py-1.5 text-center transition cursor-pointer ${
                  activeTab === "history"
                    ? "bg-sand/60 text-forest shadow-2xs"
                    : "text-forest/60 hover:text-forest"
                }`}
              >
                {t(locale, "notif.history")} {historyItems.length > 0 ? `(${historyItems.length})` : ""}
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="max-h-80 overflow-y-auto divide-y divide-sand/40">
            {activeTab === "unread" ? (
              unreadItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-3xl">🎉</div>
                  <p className="mt-1 text-xs font-semibold text-forest/70">{t(locale, "notif.noUnread")}</p>
                  {historyItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("history")}
                      className="mt-3 text-xs font-bold text-pine hover:underline cursor-pointer"
                    >
                      {t(locale, "notif.history")} ({historyItems.length}) →
                    </button>
                  )}
                </div>
              ) : (
                unreadItems.map((n) => (
                  <div key={n.id} className="p-3.5 transition hover:bg-cream/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-ember animate-pulse" />
                          <h4 className="text-xs font-bold text-forest truncate">{n.title}</h4>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-forest/75">{n.body}</p>
                        {n.createdAt && (
                          <span className="mt-1.5 block text-[10px] text-forest/40">
                            {formatDateTime(n.createdAt, locale)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        title={t(locale, "notif.markAsRead")}
                        aria-label={t(locale, "notif.markAsRead")}
                        className="shrink-0 flex items-center gap-1 rounded-lg border border-sand bg-cream/70 px-2 py-1 text-[11px] font-semibold text-forest/80 transition hover:border-pine hover:bg-pine hover:text-white cursor-pointer"
                      >
                        ✓ <span className="hidden sm:inline">{t(locale, "notif.read")}</span>
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : historyItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-3xl">📜</div>
                <p className="mt-1 text-xs font-semibold text-forest/50">{t(locale, "notif.noHistory")}</p>
              </div>
            ) : (
              historyItems.map((n) => (
                <div key={n.id} className="p-3.5 bg-cream/20 transition hover:bg-cream/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 opacity-75">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-pine font-bold">✓</span>
                        <h4 className="text-xs font-semibold text-forest truncate">{n.title}</h4>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-forest/70">{n.body}</p>
                      {n.createdAt && (
                        <span className="mt-1.5 block text-[10px] text-forest/40">
                          {formatDateTime(n.createdAt, locale)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => markAsUnread(n.id)}
                      title={t(locale, "notif.markUnread")}
                      aria-label={t(locale, "notif.markUnread")}
                      className="shrink-0 rounded-lg border border-sand/60 bg-white px-2 py-1 text-[10px] font-medium text-forest/60 transition hover:border-forest/40 hover:text-forest cursor-pointer"
                    >
                      ↩
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
