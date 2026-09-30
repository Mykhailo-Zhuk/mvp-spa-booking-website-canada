"use client";

// US#4 (Софія) — admin dashboard: burning slots, one-click flash sale with slider,
// delivery stats, active promos with live countdown, and available services management.
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { t, tri, type Locale } from "@/lib/i18n";
import { cad } from "@/lib/format";
import ChangePasswordCard from "./change-password-card";
import AdminScheduleManager from "./admin-schedule-manager";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  province: string;
  totalBookingsCount: number;
  createdAt: string;
}

interface HotSlot {
  id: string; startTime: string; startLabel: string; dayLabel: string; weekday: number; hour: number;
  fillRate: number; price: number; originalPrice: number | null; isFlashSale: boolean;
  service: { name: string; icon: string }; therapist: { name: string; avatarEmoji: string };
}
interface ActivePromo { id: string; discountPercent: number; originalPrice: number; discountedPrice: number; endTime: string; service: string }
interface Stats {
  revenue_today_label: string; flash_revenue_today: number; active_promos: ActivePromo[];
  delivery: { push_delivered: number; sms_delivered: number; total: number };
}
interface DeliveryRes { targeted: number; push_delivered: number; sms_delivered: number; failed: number }

export interface AdminService {
  id: string;
  slug: string;
  category: string;
  nameEn: string;
  nameFr: string;
  nameUk: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionUk: string;
  basePrice: number;
  durationMin: number;
  icon: string;
  openSlotsCount: number;
  totalSlotsCount: number;
  bookingsCount: number;
  faqsCount: number;
  guestGuideStepsCount: number;
}

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATIONS = [1, 2, 4, 8];
const COMMON_CATEGORIES = ["massage", "ritual", "facial", "package"];
const COMMON_ICONS = ["💆", "🪨", "🌿", "💪", "🌸", "🔥", "✨", "🧖", "🧘", "🍃"];

export default function AdminDashboard({ locale }: { locale: Locale }) {
  const [tab, setTab] = useState<"promos" | "services" | "schedule" | "settings">("promos");
  const [preselectedScheduleServiceId, setPreselectedScheduleServiceId] = useState<string>("");
  const [hot, setHot] = useState<HotSlot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [services, setServices] = useState<AdminService[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);
  const [newClientPassword, setNewClientPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalSlot, setModalSlot] = useState<HotSlot | null>(null);
  const [percent, setPercent] = useState(20);
  const [hours, setHours] = useState(2);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [now, setNow] = useState(0);

  // Services filtering & edit state
  const [serviceSearch, setServiceSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedLangs, setExpandedLangs] = useState<Record<string, boolean>>({});
  const [editingService, setEditingService] = useState<AdminService | null>(null);
  const [isNewService, setIsNewService] = useState(false);
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [serviceForm, setServiceForm] = useState({
    slug: "",
    category: "massage",
    icon: "💆",
    basePrice: 100,
    durationMin: 60,
    nameEn: "",
    nameFr: "",
    nameUk: "",
    descriptionEn: "",
    descriptionFr: "",
    descriptionUk: "",
  });

  const loadData = () =>
    Promise.all([
      fetch("/api/admin/hot-slots").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/services").then((r) => r.json()),
    ]).then(([h, s, srv]) => {
      setHot(h.hot_slots ?? []);
      setStats(s);
      setServices(srv.services ?? []);
    });

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then(() => { if (!cancelled) setLoading(false); })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = () => loadData().catch(() => {});

  const loadUsers = () => {
    setLoadingUsers(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => {
    if (tab === "settings") {
      loadUsers();
    }
  }, [tab]);

  const handleResetClientPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newClientPassword.trim()) return;

    setResetBusy(true);
    setResetError(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: resettingUser.id,
          newPassword: newClientPassword.trim(),
        }),
      });
      const data = await res.json();
      setResetBusy(false);

      if (res.ok) {
        setToast(`✅ Password updated for ${resettingUser.name}`);
        setTimeout(() => setToast(""), 4000);
        setResettingUser(null);
        setNewClientPassword("");
      } else {
        setResetError(data.error ?? "Failed to update password");
      }
    } catch {
      setResetBusy(false);
      setResetError("Network error. Please try again.");
    }
  };

  const ignite = async () => {
    if (!modalSlot) return;
    setBusy(true);
    const res = await fetch("/api/admin/create-flash-sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: modalSlot.id, discountPercent: percent, durationHours: hours }),
    });
    const data = await res.json();
    setBusy(false);
    setModalSlot(null);
    if (res.ok) {
      const d: DeliveryRes = data.notification_delivery ?? {};
      setToast(
        `✅ Flash sale live: ${cad(data.discounted_price)} (was ${cad(data.original_price)}). ` +
        `Push: ${d.push_delivered ?? 0}, SMS: ${d.sms_delivered ?? 0}, targeted: ${d.targeted ?? 0}`
      );
      refresh();
    } else {
      setToast(`❌ ${data.error ?? "Failed"}`);
    }
    setTimeout(() => setToast(""), 6000);
  };

  const openEditModal = (service: AdminService) => {
    setIsNewService(false);
    setEditingService(service);
    setServiceError("");
    setServiceForm({
      slug: service.slug,
      category: service.category,
      icon: service.icon,
      basePrice: service.basePrice,
      durationMin: service.durationMin,
      nameEn: service.nameEn,
      nameFr: service.nameFr,
      nameUk: service.nameUk,
      descriptionEn: service.descriptionEn,
      descriptionFr: service.descriptionFr,
      descriptionUk: service.descriptionUk,
    });
  };

  const openCreateModal = () => {
    setIsNewService(true);
    setEditingService(null);
    setServiceError("");
    setServiceForm({
      slug: "",
      category: "massage",
      icon: "💆",
      basePrice: 100,
      durationMin: 60,
      nameEn: "",
      nameFr: "",
      nameUk: "",
      descriptionEn: "",
      descriptionFr: "",
      descriptionUk: "",
    });
  };

  const closeServiceModal = () => {
    setEditingService(null);
    setIsNewService(false);
    setServiceError("");
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceError("");

    if (!serviceForm.nameEn.trim()) {
      setServiceError(locale === "uk" ? "Вкажіть назву англійською" : locale === "fr" ? "Veuillez indiquer le nom en anglais" : "English name is required");
      return;
    }
    if (serviceForm.basePrice <= 0) {
      setServiceError(locale === "uk" ? "Ціна має бути більшою за 0" : locale === "fr" ? "Le prix doit être supérieur à 0" : "Price must be > 0");
      return;
    }
    if (serviceForm.durationMin <= 0) {
      setServiceError(locale === "uk" ? "Тривалість має бути більшою за 0" : locale === "fr" ? "La durée doit être supérieure à 0" : "Duration must be > 0");
      return;
    }

    setServiceBusy(true);
    try {
      const isEdit = !isNewService && editingService;
      const url = isEdit ? `/api/admin/services/${editingService.id}` : "/api/admin/services";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm),
      });
      const data = await res.json();
      setServiceBusy(false);

      if (res.ok) {
        closeServiceModal();
        setToast(isEdit ? `✅ ${t(locale, "admin.serviceUpdated")}` : `✅ ${t(locale, "admin.serviceCreated")}`);
        setTimeout(() => setToast(""), 5000);
        refresh();
      } else {
        setServiceError(data.error ?? "Failed to save service");
      }
    } catch {
      setServiceBusy(false);
      setServiceError("Network error. Please try again.");
    }
  };

  const toggleLangExpand = (id: string) => {
    setExpandedLangs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesCategory = categoryFilter === "all" || s.category.toLowerCase() === categoryFilter.toLowerCase();
      if (!matchesCategory) return false;
      if (!serviceSearch.trim()) return true;
      const q = serviceSearch.toLowerCase();
      return (
        s.nameEn.toLowerCase().includes(q) ||
        s.nameFr.toLowerCase().includes(q) ||
        s.nameUk.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.descriptionEn.toLowerCase().includes(q)
      );
    });
  }, [services, categoryFilter, serviceSearch]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [services]);

  const newPrice = modalSlot ? Math.round((modalSlot.price * (1 - percent / 100)) * 100) / 100 : 0;
  const risk = modalSlot ? modalSlot.price - newPrice : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">👑 {t(locale, "admin.title")}</h1>
          <p className="text-sm text-forest/60">Sofia Dubois · Rocky Mountain Serenity, Banff</p>
        </div>
      </div>

      {/* Widget cards (mobile-first dashboard) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setTab("promos")}
          className={`rounded-2xl border p-3 text-center transition ${
            tab === "promos" ? "border-ember bg-ember/5 ring-2 ring-ember/20" : "border-sand bg-white hover:border-pine/30"
          }`}
        >
          <div className="text-2xl font-bold text-ember">{hot.length}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest/50">🔥 {t(locale, "admin.hotSlots")}</div>
        </button>
        <button
          type="button"
          onClick={() => setTab("promos")}
          className={`rounded-2xl border p-3 text-center transition ${
            tab === "promos" ? "border-pine bg-pine/5 ring-2 ring-pine/20" : "border-sand bg-white hover:border-pine/30"
          }`}
        >
          <div className="text-2xl font-bold text-pine">{stats?.active_promos.length ?? "…"}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest/50">⚡ {t(locale, "admin.activePromos")}</div>
        </button>
        <button
          type="button"
          onClick={() => setTab("services")}
          className={`rounded-2xl border p-3 text-center transition ${
            tab === "services" ? "border-forest bg-forest/5 ring-2 ring-forest/20" : "border-sand bg-white hover:border-pine/30"
          }`}
        >
          <div className="text-2xl font-bold text-forest">{services.length}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest/50">💆 {t(locale, "admin.servicesCount")}</div>
        </button>
        <div className="rounded-2xl border border-sand bg-white p-3 text-center">
          <div className="text-2xl font-bold text-forest">{stats?.revenue_today_label ?? "…"}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest/50">💰 {t(locale, "admin.revenueToday")}</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-2xl border border-sand bg-sand/30 p-1">
        <button
          type="button"
          onClick={() => setTab("promos")}
          className={`flex-1 rounded-xl py-2.5 text-center text-xs font-bold transition cursor-pointer ${
            tab === "promos" ? "bg-white text-forest shadow-sm" : "text-forest/60 hover:text-forest"
          }`}
        >
          🔥 {t(locale, "admin.tabPromos")} ({hot.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("services")}
          className={`flex-1 rounded-xl py-2.5 text-center text-xs font-bold transition cursor-pointer ${
            tab === "services" ? "bg-white text-forest shadow-sm" : "text-forest/60 hover:text-forest"
          }`}
        >
          💆 {t(locale, "admin.tabServices")} ({services.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setPreselectedScheduleServiceId("");
            setTab("schedule");
          }}
          className={`flex-1 rounded-xl py-2.5 text-center text-xs font-bold transition cursor-pointer ${
            tab === "schedule" ? "bg-white text-forest shadow-sm" : "text-forest/60 hover:text-forest"
          }`}
        >
          🕒 {t(locale, "admin.tabSchedule")}
        </button>
        <button
          type="button"
          onClick={() => setTab("settings")}
          className={`flex-1 rounded-xl py-2.5 text-center text-xs font-bold transition cursor-pointer ${
            tab === "settings" ? "bg-white text-forest shadow-sm" : "text-forest/60 hover:text-forest"
          }`}
        >
          ⚙️ {t(locale, "admin.tabSettings")}
        </button>
      </div>

      {/* TAB 1: PROMOS & HOT SLOTS */}
      {tab === "promos" && (
        <div className="space-y-4">
          {/* Hot slots */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest">{t(locale, "admin.hotSlots")}</h2>
            <p className="mb-2 text-xs text-forest/60">{t(locale, "admin.hotSlotsSub")} {t(locale, "admin.last7")}.</p>

            {loading ? (
              <div className="flex h-32 items-center justify-center text-forest/50"><span className="animate-spin text-2xl">⏳</span></div>
            ) : hot.length === 0 ? (
              <div className="rounded-2xl border border-sand bg-white px-4 py-8 text-center text-sm text-forest/60">{t(locale, "admin.noHot")}</div>
            ) : (
              <div className="space-y-2">
                {hot.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-2xl border-l-4 border-[#FF4444] bg-white p-3">
                    <span className="text-2xl">{s.therapist.avatarEmoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-forest">
                        {WEEKDAYS_EN[s.weekday]} {s.dayLabel.slice(5)} · {s.startLabel}
                      </div>
                      <div className="truncate text-xs text-forest/60">
                        {s.service.icon} {s.service.name} · {s.therapist.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#FF4444]">{t(locale, "admin.fillRate")}: {Math.round(s.fillRate * 100)}%</span>
                        {s.isFlashSale && s.originalPrice && (
                          <span className="text-xs text-ember">🔥 {cad(s.originalPrice)} → {cad(s.price)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { setModalSlot(s); setPercent(20); setHours(2); }}
                      className="h-11 shrink-0 rounded-full bg-ember px-4 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      🔥 {t(locale, "admin.flash")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active promos with countdown */}
          {stats && stats.active_promos.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-forest">⚡ {t(locale, "admin.activePromos")}</h2>
              <div className="space-y-2">
                {stats.active_promos.map((p) => {
                  const leftMs = new Date(p.endTime).getTime() - now;
                  const left = leftMs > 0 ? `${Math.floor(leftMs / 60000)}m` : t(locale, "admin.deactivated");
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-2xl border border-gold bg-gold/10 px-4 py-3 text-sm">
                      <span className="font-semibold text-forest">{p.service} · −{p.discountPercent}%</span>
                      <span className="text-xs font-bold text-ember">{cad(p.originalPrice)} → {cad(p.discountedPrice)}</span>
                      <span className="text-xs text-forest/60">⏱ {left}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Delivery stats */}
          {stats && (
            <section className="rounded-2xl border border-sand bg-white p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-forest">📣 {t(locale, "admin.delivery")}</h2>
              <p className="mt-1 text-sm text-forest/75">
                🔔 Push: <b>{stats.delivery.push_delivered}</b> · 💬 SMS: <b>{stats.delivery.sms_delivered}</b> · 🧾 {t(locale, "admin.delivered")}: <b>{stats.delivery.total}</b>
              </p>
              <p className="mt-1 text-[11px] text-forest/50">
                Demo: Firebase push simulated, Twilio SMS fallback for offline tokens (plan fallback), in-app banners duplicated.
              </p>
            </section>
          )}
        </div>
      )}

      {/* TAB 2: AVAILABLE SERVICES MANAGEMENT */}
      {tab === "services" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-forest">{t(locale, "admin.tabServices")}</h2>
              <p className="text-xs text-forest/60">{t(locale, "admin.servicesSub")}</p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-pine px-4 text-xs font-bold text-white shadow-sm transition hover:bg-forest"
            >
              <span>＋</span> {t(locale, "admin.addService")}
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col gap-2 rounded-2xl border border-sand bg-white p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t(locale, "admin.searchServices")}
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-sand/70 bg-cream/30 px-3 pr-8 text-xs text-forest placeholder:text-forest/40 focus:border-pine focus:outline-none"
              />
              {serviceSearch && (
                <button
                  type="button"
                  onClick={() => setServiceSearch("")}
                  className="absolute right-2 top-2.5 text-xs text-forest/40 hover:text-forest"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  categoryFilter === "all" ? "bg-forest text-cream" : "bg-sand/40 text-forest/70 hover:bg-sand"
                }`}
              >
                {t(locale, "admin.allCategories")}
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                    categoryFilter === cat ? "bg-forest text-cream" : "bg-sand/40 text-forest/70 hover:bg-sand"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Services List */}
          {loading ? (
            <div className="flex h-32 items-center justify-center text-forest/50"><span className="animate-spin text-2xl">⏳</span></div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-sand bg-white px-4 py-8 text-center text-sm text-forest/60">
              {serviceSearch || categoryFilter !== "all" ? "No services match your search filter." : "No services found."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredServices.map((s) => {
                const isExpanded = !!expandedLangs[s.id];
                const localizedName = tri(s.nameEn, s.nameFr, s.nameUk, locale);
                const localizedDesc = tri(s.descriptionEn, s.descriptionFr, s.descriptionUk, locale);

                return (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between rounded-2xl border border-sand bg-white p-4 shadow-xs transition hover:border-pine/40"
                  >
                    <div>
                      {/* Top bar with icon, title, category & open slots badge */}
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sand/40 text-2xl">
                          {s.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-bold text-forest">{localizedName}</h3>
                            <span className="rounded-md bg-sand/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-forest/70">
                              {s.category}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-pine">{cad(s.basePrice)}</span>
                            <span className="text-forest/40">·</span>
                            <span className="text-forest/70">{s.durationMin} {t(locale, "common.min")}</span>
                            <span className="text-forest/40">·</span>
                            {s.openSlotsCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {s.openSlotsCount} {t(locale, "admin.openSlots")}
                              </span>
                            ) : (
                              <span className="rounded-full bg-sand/50 px-2 py-0.5 text-[11px] text-forest/50">
                                {t(locale, "admin.noOpenSlots")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="mt-3 text-xs leading-relaxed text-forest/75 line-clamp-2">
                        {localizedDesc || <span className="italic text-forest/40">No description provided</span>}
                      </p>

                      {/* Trilingual Preview Drawer */}
                      {isExpanded && (
                        <div className="mt-3 space-y-1.5 rounded-xl border border-sand/60 bg-cream/40 p-2.5 text-[11px]">
                          <div>
                            <span className="font-semibold text-forest/60">🇬🇧 EN: </span>
                            <span className="font-medium text-forest">{s.nameEn}</span>
                            <span className="block text-forest/70">{s.descriptionEn}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-forest/60">🇫🇷 FR: </span>
                            <span className="font-medium text-forest">{s.nameFr}</span>
                            <span className="block text-forest/70">{s.descriptionFr}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-forest/60">🇺🇦 UK: </span>
                            <span className="font-medium text-forest">{s.nameUk}</span>
                            <span className="block text-forest/70">{s.descriptionUk}</span>
                          </div>
                        </div>
                      )}

                      {/* Stats pill */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-forest/60">
                        <span>🧾 {s.bookingsCount} {t(locale, "admin.totalBookings")} · ❓ {s.faqsCount} FAQs</span>
                        <button
                          type="button"
                          onClick={() => toggleLangExpand(s.id)}
                          className="font-medium text-pine hover:underline"
                        >
                          {isExpanded ? `▲ ${t(locale, "admin.hideTranslations")}` : `🌐 ${t(locale, "admin.showTranslations")}`}
                        </button>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 flex items-center gap-2 border-t border-sand/50 pt-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-forest px-3 text-xs font-bold text-cream transition hover:bg-pine cursor-pointer"
                      >
                        ✏️ {t(locale, "admin.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreselectedScheduleServiceId(s.id);
                          setTab("schedule");
                        }}
                        className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-pine/30 bg-pine/10 px-3 text-xs font-bold text-pine transition hover:bg-pine hover:text-white cursor-pointer"
                      >
                        🕒 {t(locale, "admin.manageTimes")}
                      </button>
                      <Link
                        href={`/${locale}/services/${s.slug}`}
                        target="_blank"
                        className="flex h-9 items-center justify-center rounded-xl border border-sand bg-cream/40 px-3 text-xs font-semibold text-forest transition hover:bg-sand/40"
                      >
                        👁️ {t(locale, "admin.viewOnSite")}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SERVICE TIMES & SCHEDULE */}
      {tab === "schedule" && (
        <AdminScheduleManager
          locale={locale}
          preselectedServiceId={preselectedScheduleServiceId}
        />
      )}

      {/* TAB 4: SETTINGS & PASSWORDS */}
      {tab === "settings" && (
        <div className="space-y-6">
          {/* Admin's Own Password */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest mb-2">
              👑 {t(locale, "admin.settingsTitle")}
            </h2>
            <div className="max-w-md">
              <ChangePasswordCard locale={locale} title={t(locale, "admin.changeOwnPassword")} />
            </div>
          </div>

          {/* Client Accounts & Passwords Management */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-forest">
                  👥 {t(locale, "admin.clientPasswords")}
                </h2>
                <p className="text-xs text-forest/60">
                  Manage client accounts and reset customer passwords directly from the admin panel.
                </p>
              </div>
              <button
                type="button"
                onClick={loadUsers}
                disabled={loadingUsers}
                className="text-xs font-semibold text-pine hover:underline cursor-pointer"
              >
                {loadingUsers ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex h-32 items-center justify-center text-forest/50">
                <span className="animate-spin text-2xl">⏳</span>
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-2xl border border-sand bg-white p-6 text-center text-xs text-forest/50">
                No users found.
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-2 rounded-2xl border border-sand bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand text-lg">
                        {u.isAdmin ? "👑" : "👤"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-forest">{u.name}</span>
                          {u.isAdmin && (
                            <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-bold text-cream">
                              OWNER/ADMIN
                            </span>
                          )}
                          {!u.isAdmin && (
                            <span className="rounded-full bg-sand/60 px-2 py-0.5 text-[10px] font-semibold text-forest/70">
                              CLIENT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-forest/50 truncate">
                          {u.email} · {u.totalBookingsCount} bookings · {u.province}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setResettingUser(u);
                          setNewClientPassword("");
                          setResetError(null);
                        }}
                        className="flex h-9 items-center rounded-xl bg-forest px-3 text-xs font-bold text-cream transition hover:bg-pine cursor-pointer"
                      >
                        🔑 {t(locale, "admin.resetClientPassword")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Reset Client Password Modal */}
      {resettingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setResettingUser(null)}
        >
          <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sand/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-forest">
                  🔑 Reset Password
                </h3>
                <p className="text-xs text-forest/60">
                  {resettingUser.name} ({resettingUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="text-forest/40 hover:text-forest text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetClientPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-forest/70">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-1 h-10 w-full rounded-xl border border-sand bg-cream/40 px-3 text-sm text-forest outline-none transition focus:border-pine focus:bg-white"
                />
              </div>

              {resetError && (
                <div className="rounded-xl bg-red-50 p-2.5 text-xs font-medium text-red-700">
                  ⚠️ {resetError}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="h-11 flex-1 rounded-xl border border-sand bg-cream text-sm font-semibold text-forest transition hover:bg-sand/40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="h-11 flex-1 rounded-xl bg-forest text-sm font-bold text-cream transition hover:bg-pine disabled:opacity-50 cursor-pointer"
                >
                  {resetBusy ? "Saving…" : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flash-sale modal (existing feature) */}
      {modalSlot && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setModalSlot(null)}>
          <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-forest">🔥 {t(locale, "admin.flashModal")}</h2>
            <p className="mt-1 text-sm text-forest/60">
              {WEEKDAYS_EN[modalSlot.weekday]} {modalSlot.dayLabel.slice(5)} · {modalSlot.startLabel} — {modalSlot.service.name} ({cad(modalSlot.price)})
            </p>

            <div className="mt-4">
              <div className="flex justify-between text-sm font-semibold">
                <span>{t(locale, "admin.discount")}: {percent}%</span>
                <span className="text-ember">{t(locale, "admin.newPrice")}: {cad(newPrice)}</span>
              </div>
              <input
                type="range" min={5} max={50} step={5} value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-sand accent-ember"
              />
              <div className="mt-1 flex justify-between text-[10px] text-forest/50"><span>5%</span><span>50%</span></div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold">{t(locale, "admin.duration")}</div>
              <div className="mt-2 flex gap-2">
                {DURATIONS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHours(h)}
                    className={`h-10 flex-1 rounded-full text-sm font-semibold ${hours === h ? "bg-pine text-white" : "bg-sand text-forest"}`}
                  >
                    {h} {t(locale, "admin.hours")}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-cream px-3 py-2 text-xs text-forest/70">
              ⚠️ {t(locale, "admin.risk")}: <b className="text-ember">{cad(risk)}</b> · {t(locale, "admin.perSlot")} — high probability of filling
            </div>

            <button
              onClick={ignite}
              disabled={busy}
              className="mt-4 flex h-13 min-h-12 w-full items-center justify-center rounded-full bg-ember text-base font-bold text-white disabled:opacity-60"
            >
              {busy ? "⏳ Sending…" : `🔥 ${t(locale, "admin.activate")} −${percent}%`}
            </button>
          </div>
        </div>
      )}

      {/* Edit / Create Service Modal */}
      {(editingService || isNewService) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={closeServiceModal}>
          <div className="absolute inset-0 bg-forest/50 backdrop-blur-sm" />
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <div>
                <h2 className="text-lg font-bold text-forest">
                  {isNewService ? `✨ ${t(locale, "admin.addService")}` : `✏️ ${t(locale, "admin.editService")}`}
                </h2>
                {!isNewService && editingService && (
                  <p className="text-xs text-forest/60">ID: {editingService.id} · slug: {editingService.slug}</p>
                )}
              </div>
              <button
                type="button"
                onClick={closeServiceModal}
                className="grid h-8 w-8 place-items-center rounded-full bg-sand/50 text-forest transition hover:bg-sand"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="mt-4 space-y-4">
              {serviceError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  ⚠️ {serviceError}
                </div>
              )}

              {/* Icon & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-forest">{t(locale, "admin.icon")}</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={serviceForm.icon}
                      onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })}
                      className="h-10 w-16 rounded-xl border border-sand bg-cream/20 text-center text-xl focus:border-pine focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COMMON_ICONS.slice(0, 5).map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setServiceForm({ ...serviceForm, icon: ic })}
                          className="h-7 w-7 rounded-md bg-sand/30 text-sm hover:bg-sand"
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-forest">{t(locale, "admin.category")}</label>
                  <input
                    type="text"
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs focus:border-pine focus:outline-none"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Price & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-forest">{t(locale, "admin.basePrice")}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={serviceForm.basePrice}
                    onChange={(e) => setServiceForm({ ...serviceForm, basePrice: parseFloat(e.target.value) || 0 })}
                    className="mt-1 h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs font-bold text-pine focus:border-pine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-forest">{t(locale, "admin.durationMin")}</label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    required
                    value={serviceForm.durationMin}
                    onChange={(e) => setServiceForm({ ...serviceForm, durationMin: parseInt(e.target.value) || 0 })}
                    className="mt-1 h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs font-bold text-forest focus:border-pine focus:outline-none"
                  />
                </div>
              </div>

              {/* Trilingual Names */}
              <div className="space-y-2 rounded-2xl border border-sand/70 bg-cream/20 p-3">
                <div className="text-xs font-bold text-forest">🌐 Titles / Titles multilingues</div>
                <div>
                  <label className="text-[11px] font-semibold text-forest/70">🇬🇧 {t(locale, "admin.nameEn")} *</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.nameEn}
                    onChange={(e) => setServiceForm({ ...serviceForm, nameEn: e.target.value })}
                    className="mt-0.5 h-9 w-full rounded-lg border border-sand bg-white px-3 text-xs focus:border-pine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-forest/70">🇫🇷 {t(locale, "admin.nameFr")}</label>
                  <input
                    type="text"
                    value={serviceForm.nameFr}
                    onChange={(e) => setServiceForm({ ...serviceForm, nameFr: e.target.value })}
                    className="mt-0.5 h-9 w-full rounded-lg border border-sand bg-white px-3 text-xs focus:border-pine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-forest/70">🇺🇦 {t(locale, "admin.nameUk")}</label>
                  <input
                    type="text"
                    value={serviceForm.nameUk}
                    onChange={(e) => setServiceForm({ ...serviceForm, nameUk: e.target.value })}
                    className="mt-0.5 h-9 w-full rounded-lg border border-sand bg-white px-3 text-xs focus:border-pine focus:outline-none"
                  />
                </div>
              </div>

              {/* Trilingual Descriptions */}
              <div className="space-y-2 rounded-2xl border border-sand/70 bg-cream/20 p-3">
                <div className="text-xs font-bold text-forest">📝 Descriptions / Descriptions multilingues</div>
                <div>
                  <label className="text-[11px] font-semibold text-forest/70">🇬🇧 {t(locale, "admin.descEn")}</label>
                  <textarea
                    rows={2}
                    value={serviceForm.descriptionEn}
                    onChange={(e) => setServiceForm({ ...serviceForm, descriptionEn: e.target.value })}
                    className="mt-0.5 w-full rounded-lg border border-sand bg-white p-2 text-xs focus:border-pine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-forest/70">🇫🇷 {t(locale, "admin.descFr")}</label>
                  <textarea
                    rows={2}
                    value={serviceForm.descriptionFr}
                    onChange={(e) => setServiceForm({ ...serviceForm, descriptionFr: e.target.value })}
                    className="mt-0.5 w-full rounded-lg border border-sand bg-white p-2 text-xs focus:border-pine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-forest/70">🇺🇦 {t(locale, "admin.descUk")}</label>
                  <textarea
                    rows={2}
                    value={serviceForm.descriptionUk}
                    onChange={(e) => setServiceForm({ ...serviceForm, descriptionUk: e.target.value })}
                    className="mt-0.5 w-full rounded-lg border border-sand bg-white p-2 text-xs focus:border-pine focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="rounded-xl border border-sand/60 bg-white p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-forest/50">{t(locale, "admin.preview")}</div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-2xl">{serviceForm.icon || "💆"}</span>
                  <div>
                    <div className="text-xs font-bold text-forest">
                      {tri(serviceForm.nameEn || "Treatment Name", serviceForm.nameFr, serviceForm.nameUk, locale)}
                    </div>
                    <div className="text-[11px] text-forest/60">
                      {serviceForm.durationMin} min · <span className="font-semibold text-pine">{cad(serviceForm.basePrice)}</span> · <span className="capitalize">{serviceForm.category}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeServiceModal}
                  className="flex h-11 flex-1 items-center justify-center rounded-full border border-sand bg-sand/30 text-xs font-bold text-forest transition hover:bg-sand/60"
                >
                  {t(locale, "common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={serviceBusy}
                  className="flex h-11 flex-1 items-center justify-center rounded-full bg-pine text-xs font-bold text-white shadow-sm transition hover:bg-forest disabled:opacity-60"
                >
                  {serviceBusy ? t(locale, "admin.saving") : t(locale, "admin.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl bg-forest px-4 py-3 text-center text-sm font-semibold text-cream shadow-xl md:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}
