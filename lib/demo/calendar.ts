// Demo-mode Google/Apple Calendar integration (US#1, Task 1.3).
// Production would use Google Calendar API via OAuth 2.0. For the demo we generate a
// standard .ics file the browser can open in Google/Apple Calendar, and mark it "added".

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  bookingCode?: string;
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function buildIcsEvent(ev: CalendarEvent): string {
  const now = new Date();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rocky Mountain Serenity//Spa Booking//EN",
    "BEGIN:VEVENT",
    `UID:${ev.bookingCode ?? `spa-${Date.now()}`}@rockymountain.demo`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(ev.start)}`,
    `DTEND:${icsDate(ev.end)}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
    `DESCRIPTION:${escapeIcs(ev.description)}`,
    `LOCATION:${escapeIcs(ev.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(ev: CalendarEvent): void {
  const blob = new Blob([buildIcsEvent(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.bookingCode ?? "booking"}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
