"use client";

import { useEffect, useState, useMemo } from "react";
import { t, tri, type Locale } from "@/lib/i18n";
import { cad, isoDay, addDays } from "@/lib/format";

interface AdminSlot {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceIcon: string;
  serviceSlug: string;
  durationMin: number;
  therapistId: string;
  therapistName: string;
  therapistAvatar: string;
  therapistGender: string;
  startTime: string;
  endTime: string;
  startLabel: string;
  endLabel: string;
  dateStr: string;
  isBooked: boolean;
  price: number;
  isFlashSale: boolean;
}

interface TherapistOption {
  id: string;
  name: string;
  gender: string;
  avatarEmoji: string;
}

interface ServiceOption {
  id: string;
  nameEn: string;
  nameFr: string;
  nameUk: string;
  slug: string;
  icon: string;
  basePrice: number;
  durationMin: number;
}

interface AdminScheduleManagerProps {
  locale: Locale;
  preselectedServiceId?: string;
}

export default function AdminScheduleManager({
  locale,
  preselectedServiceId,
}: AdminScheduleManagerProps) {
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [serviceId, setServiceId] = useState<string>(preselectedServiceId || "all");
  const [therapistId, setTherapistId] = useState<string>("all");
  const [date, setDate] = useState<string>(isoDay(new Date()));
  const [hideUnavailable, setHideUnavailable] = useState<boolean>(true); // default true

  // Modal state
  const [editingSlot, setEditingSlot] = useState<AdminSlot | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("10:00");
  const [formServiceId, setFormServiceId] = useState("");
  const [formTherapistId, setFormTherapistId] = useState("");
  const [formPrice, setFormPrice] = useState(100);
  const [formIsBooked, setFormIsBooked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const quickDates = useMemo(() => [
    { label: locale === "uk" ? "Сьогодні" : locale === "fr" ? "Aujourd'hui" : "Today", val: isoDay(new Date()) },
    { label: locale === "uk" ? "Завтра" : locale === "fr" ? "Demain" : "Tomorrow", val: isoDay(addDays(new Date(), 1)) },
    { label: locale === "uk" ? "+2 дні" : locale === "fr" ? "+2 jours" : "+2 days", val: isoDay(addDays(new Date(), 2)) },
    { label: locale === "uk" ? "+3 дні" : locale === "fr" ? "+3 jours" : "+3 days", val: isoDay(addDays(new Date(), 3)) },
  ], [locale]);

  const loadSlots = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (serviceId !== "all") q.set("serviceId", serviceId);
    if (therapistId !== "all") q.set("therapistId", therapistId);
    if (date) q.set("date", date);
    if (hideUnavailable) q.set("hideUnavailable", "true");

    fetch(`/api/admin/slots?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots ?? []);
        if (d.therapists) setTherapists(d.therapists);
        if (d.services) setServices(d.services);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSlots();
  }, [serviceId, therapistId, date, hideUnavailable]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleToggleAvailability = async (slot: AdminSlot) => {
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBooked: !slot.isBooked }),
      });
      if (res.ok) {
        showToastMsg(
          slot.isBooked
            ? `🟢 ${t(locale, "admin.statusAvailable")}`
            : `🔴 ${t(locale, "admin.statusUnavailable")}`
        );
        loadSlots();
      }
    } catch {
      showToastMsg("❌ Error updating slot");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm(t(locale, "admin.confirmDeleteSlot"))) return;
    try {
      const res = await fetch(`/api/admin/slots/${slotId}`, { method: "DELETE" });
      if (res.ok) {
        showToastMsg(`🗑️ ${t(locale, "admin.slotDeleted")}`);
        loadSlots();
      }
    } catch {
      showToastMsg("❌ Error deleting slot");
    }
  };

  const openEditModal = (slot: AdminSlot) => {
    setEditingSlot(slot);
    setIsNew(false);
    setError("");
    setFormDate(slot.dateStr);
    const timeMatch = slot.startTime.match(/T(\d{2}:\d{2})/);
    setFormTime(timeMatch ? timeMatch[1] : "10:00");
    setFormServiceId(slot.serviceId);
    setFormTherapistId(slot.therapistId);
    setFormPrice(slot.price);
    setFormIsBooked(slot.isBooked);
  };

  const openCreateModal = () => {
    setEditingSlot(null);
    setIsNew(true);
    setError("");
    setFormDate(date || isoDay(new Date()));
    setFormTime("11:00");
    const chosenSvc = services.find((s) => s.id === (serviceId !== "all" ? serviceId : services[0]?.id)) || services[0];
    setFormServiceId(chosenSvc?.id || "");
    const chosenTh = therapists.find((th) => th.id === (therapistId !== "all" ? therapistId : therapists[0]?.id)) || therapists[0];
    setFormTherapistId(chosenTh?.id || "");
    setFormPrice(chosenSvc?.basePrice || 100);
    setFormIsBooked(false);
  };

  const closeModal = () => {
    setEditingSlot(null);
    setIsNew(false);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formDate || !formTime) {
      setError(locale === "uk" ? "Вкажіть дату та час" : "Date and time are required");
      return;
    }
    if (!formServiceId || !formTherapistId) {
      setError(locale === "uk" ? "Оберіть послугу та майстра" : "Service and therapist are required");
      return;
    }

    setBusy(true);
    try {
      const url = isNew ? "/api/admin/slots" : `/api/admin/slots/${editingSlot!.id}`;
      const method = isNew ? "POST" : "PATCH";
      const payload: Record<string, unknown> = {
        date: formDate,
        time: formTime,
        serviceId: formServiceId,
        therapistId: formTherapistId,
        price: formPrice,
        isBooked: formIsBooked,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setBusy(false);

      if (res.ok) {
        showToastMsg(isNew ? `✅ ${t(locale, "admin.slotCreated")}` : `✅ ${t(locale, "admin.slotUpdated")}`);
        closeModal();
        loadSlots();
      } else {
        setError(data.error || "Failed to save slot");
      }
    } catch {
      setBusy(false);
      setError("Network error. Please try again.");
    }
  };

  const selectedServiceObj = services.find((s) => s.id === formServiceId);
  const selectedTherapistObj = therapists.find((th) => th.id === formTherapistId);

  return (
    <div className="space-y-4">
      {/* Top Header & Add Slot button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-forest">
            🕒 {t(locale, "admin.tabSchedule")}
          </h2>
          <p className="text-xs text-forest/60">
            {locale === "uk"
              ? "Керуйте часом початку процедур, редагуйте слоти та приховуйте зайняті"
              : locale === "fr"
              ? "Gérez les heures des soins, modifiez les créneaux et masquez les indisponibles"
              : "Change available service times, update therapist schedules, and hide unavailable slots"}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-pine px-4 text-xs font-bold text-white shadow-sm transition hover:bg-forest cursor-pointer"
        >
          <span>＋</span> {t(locale, "admin.addTime")}
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-sand bg-white p-3.5 space-y-3">
        {/* Quick Date Chips + Custom Date Input */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-forest mr-1">📅 {t(locale, "admin.slotDate")}:</span>
          {quickDates.map((qd) => (
            <button
              key={qd.val}
              type="button"
              onClick={() => setDate(qd.val)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                date === qd.val ? "bg-forest text-cream shadow-xs" : "bg-sand/40 text-forest/70 hover:bg-sand"
              }`}
            >
              {qd.label} ({qd.val.slice(5)})
            </button>
          ))}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-lg border border-sand bg-cream/30 px-2 text-xs font-medium text-forest focus:border-pine focus:outline-none cursor-pointer"
          />
        </div>

        {/* Dropdowns + "Hide Unavailable" Toggle */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-1 border-t border-sand/40">
          <div className="flex flex-wrap items-center gap-2">
            {/* Service filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-forest/60">💆:</span>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="h-9 rounded-xl border border-sand bg-cream/30 px-2.5 text-xs font-medium text-forest focus:border-pine focus:outline-none cursor-pointer"
              >
                <option value="all">
                  {locale === "uk" ? "Усі послуги" : locale === "fr" ? "Tous les soins" : "All Services"}
                </option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {tri(s.nameEn, s.nameFr, s.nameUk, locale)}
                  </option>
                ))}
              </select>
            </div>

            {/* Therapist filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-forest/60">👤:</span>
              <select
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                className="h-9 rounded-xl border border-sand bg-cream/30 px-2.5 text-xs font-medium text-forest focus:border-pine focus:outline-none cursor-pointer"
              >
                <option value="all">
                  {locale === "uk" ? "Усі майстри" : locale === "fr" ? "Tous les thérapeutes" : "All Therapists"}
                </option>
                {therapists.map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.avatarEmoji} {th.name} ({th.gender === "female" ? "♀" : "♂"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hide unavailable toggle switch */}
          <div className="flex items-center gap-2 self-start sm:self-auto pt-1 sm:pt-0">
            <button
              type="button"
              role="switch"
              aria-checked={hideUnavailable}
              onClick={() => setHideUnavailable(!hideUnavailable)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                hideUnavailable
                  ? "border-pine bg-pine/10 text-pine ring-1 ring-pine/20"
                  : "border-sand bg-sand/30 text-forest/70 hover:bg-sand/50"
              }`}
            >
              <span className={`relative h-4 w-8 rounded-full transition ${hideUnavailable ? "bg-pine" : "bg-sand"}`}>
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
                    hideUnavailable ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
              <span>
                {hideUnavailable ? `✓ ${t(locale, "admin.hideUnavailable")}` : t(locale, "admin.showAll")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Slots List */}
      {loading ? (
        <div className="flex h-36 items-center justify-center text-forest/50">
          <span className="animate-spin text-2xl">⏳</span>
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-2xl border border-sand bg-white p-8 text-center text-xs text-forest/50">
          <p className="font-semibold text-sm text-forest/70">
            {locale === "uk" ? "Не знайдено слотів для обраних фільтрів" : "No service times found for selected filters"}
          </p>
          <p className="mt-1">
            {hideUnavailable
              ? (locale === "uk" ? "Спробуйте вимкнути 'Приховати недоступні' або обрати іншу дату" : "Try unchecking 'Hide unavailable' or choosing another date")
              : (locale === "uk" ? "Ви можете додати новий час за допомогою кнопки '＋ Додати час послуги'" : "You can add a new service slot with '＋ Add Service Time'")}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-3 inline-flex items-center rounded-full bg-sand/60 px-4 py-2 text-xs font-bold text-forest transition hover:bg-sand cursor-pointer"
          >
            ＋ {t(locale, "admin.addTime")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-forest/50 px-1">
            <span>
              {slots.length} {locale === "uk" ? "слотів знайдено" : "slots found"}
              {hideUnavailable && ` (${t(locale, "admin.availableOnly")})`}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {slots.map((s) => (
              <div
                key={s.id}
                className={`flex flex-col justify-between rounded-2xl border p-3.5 transition shadow-xs ${
                  s.isBooked
                    ? "border-sand/70 bg-cream/20 opacity-80"
                    : "border-sand bg-white hover:border-pine/40"
                }`}
              >
                <div>
                  {/* Header: Service, Time & Availability Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sand/40 text-xl">
                        {s.serviceIcon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-forest truncate">{s.serviceName}</div>
                        <div className="text-xs font-semibold text-pine">
                          {s.startLabel} – {s.endLabel}
                          <span className="text-[11px] font-normal text-forest/50 ml-1">
                            ({s.durationMin} {t(locale, "common.min")})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(s)}
                      title={locale === "uk" ? "Натисніть для зміни статусу" : "Click to toggle availability"}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                        s.isBooked
                          ? "bg-sand/70 text-forest/70 hover:bg-forest hover:text-cream"
                          : "bg-pine/15 text-pine ring-1 ring-pine/20 hover:bg-pine hover:text-white"
                      }`}
                    >
                      {s.isBooked ? `🔴 ${t(locale, "catalog.booked")}` : `🟢 ${t(locale, "catalog.available")}`}
                    </button>
                  </div>

                  {/* Details: Therapist & Price */}
                  <div className="mt-3 flex items-center justify-between border-t border-sand/40 pt-2 text-xs">
                    <div className="flex items-center gap-1.5 text-forest/70">
                      <span>{s.therapistAvatar}</span>
                      <span className="font-medium truncate">{s.therapistName}</span>
                    </div>
                    <div className="font-bold text-forest">
                      {cad(s.price)}
                    </div>
                  </div>
                </div>

                {/* Actions: Change Time / Delete */}
                <div className="mt-3 flex items-center gap-2 border-t border-sand/40 pt-2.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(s)}
                    className="flex h-8 flex-1 items-center justify-center gap-1 rounded-xl bg-forest px-3 text-xs font-bold text-cream transition hover:bg-pine cursor-pointer"
                  >
                    ✏️ {t(locale, "admin.changeTime")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(s)}
                    className={`flex h-8 items-center justify-center rounded-xl border px-2.5 text-xs font-semibold transition cursor-pointer ${
                      s.isBooked
                        ? "border-sand bg-white text-forest hover:bg-sand/30"
                        : "border-sand bg-white text-forest/70 hover:bg-sand/30"
                    }`}
                  >
                    {s.isBooked ? "🟢 Make Available" : "🔴 Make Unavailable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(s.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-sand bg-white text-forest/50 transition hover:bg-ember/10 hover:text-ember cursor-pointer"
                    title={t(locale, "admin.deleteSlot")}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit / Create Slot Modal */}
      {(editingSlot || isNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <h3 className="text-base font-bold text-forest">
                {isNew ? `＋ ${t(locale, "admin.addTime")}` : `✏️ ${t(locale, "admin.changeTime")}`}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-full bg-sand/40 text-xs text-forest/70 hover:bg-sand cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-ember/30 bg-ember/10 p-3 text-xs font-semibold text-ember">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* Service Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-forest/60 mb-1">
                  💆 {t(locale, "admin.slotService")}
                </label>
                <select
                  value={formServiceId}
                  onChange={(e) => {
                    setFormServiceId(e.target.value);
                    const s = services.find((svc) => svc.id === e.target.value);
                    if (s) setFormPrice(s.basePrice);
                  }}
                  className="h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs font-medium text-forest focus:border-pine focus:outline-none cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {tri(s.nameEn, s.nameFr, s.nameUk, locale)} ({s.durationMin} min · {cad(s.basePrice)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Therapist Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-forest/60 mb-1">
                  👤 {t(locale, "admin.slotTherapist")}
                </label>
                <select
                  value={formTherapistId}
                  onChange={(e) => setFormTherapistId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs font-medium text-forest focus:border-pine focus:outline-none cursor-pointer"
                >
                  {therapists.map((th) => (
                    <option key={th.id} value={th.id}>
                      {th.avatarEmoji} {th.name} ({th.gender === "female" ? "Woman" : "Man"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Start Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-forest/60 mb-1">
                    📅 {t(locale, "admin.slotDate")}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs font-medium text-forest focus:border-pine focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-forest/60 mb-1">
                    🕒 {t(locale, "admin.slotTime")}
                  </label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs font-medium text-forest focus:border-pine focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Price & Availability */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-forest/60 mb-1">
                    💰 {t(locale, "admin.slotPrice")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs font-medium text-forest focus:border-pine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-forest/60 mb-1">
                    🔒 {t(locale, "admin.slotStatus")}
                  </label>
                  <select
                    value={formIsBooked ? "booked" : "available"}
                    onChange={(e) => setFormIsBooked(e.target.value === "booked")}
                    className="h-10 w-full rounded-xl border border-sand bg-cream/20 px-3 text-xs font-medium text-forest focus:border-pine focus:outline-none cursor-pointer"
                  >
                    <option value="available">🟢 Available</option>
                    <option value="booked">🔴 Unavailable</option>
                  </select>
                </div>
              </div>

              {/* Live Preview of Changes */}
              <div className="rounded-xl border border-sand/70 bg-cream/30 p-3 text-xs space-y-1">
                <div className="font-bold text-forest flex items-center gap-2">
                  <span>{selectedServiceObj?.icon || "💆"}</span>
                  <span>{selectedServiceObj?.nameEn}</span>
                  <span className="text-pine ml-auto">{cad(formPrice)}</span>
                </div>
                <div className="text-forest/60">
                  {selectedTherapistObj?.avatarEmoji} {selectedTherapistObj?.name} · {formDate} at {formTime}
                </div>
                <div className="text-[11px] font-semibold text-pine">
                  {formIsBooked ? "🔴 Slot will be marked as Unavailable / Booked" : "🟢 Slot will be live & bookable by customers"}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-11 flex-1 items-center justify-center rounded-full border border-sand bg-sand/30 text-xs font-bold text-forest transition hover:bg-sand/60 cursor-pointer"
                >
                  {t(locale, "common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-11 flex-1 items-center justify-center rounded-full bg-pine text-xs font-bold text-white shadow-sm transition hover:bg-forest disabled:opacity-60 cursor-pointer"
                >
                  {busy ? t(locale, "admin.saving") : t(locale, "admin.save")}
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
