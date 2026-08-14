// US#2 Task 2.3 — A6 PDF voucher generation (client-side, jsPDF + QR from booking_code).
import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface VoucherData {
  bookingCode: string;
  spaName: string;
  service: string;
  therapist: string;
  dateTimeLabel: string;
  guestName: string;
  totalLabel: string;
  provinceNote: string;
}

export async function generateVoucherPdf(v: VoucherData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a6" }); // 105 × 148 mm
  const w = 105;

  // Background
  doc.setFillColor(250, 247, 242);
  doc.rect(0, 0, w, 148, "F");

  // Header band
  doc.setFillColor(31, 61, 43); // forest
  doc.rect(0, 0, w, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("🏔️ " + v.spaName, 8, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Guest voucher — show at reception (offline OK)", 8, 20);

  // Booking code + QR
  const qr = await QRCode.toDataURL(v.bookingCode, { width: 320, margin: 1, color: { dark: "#1f3d2b", light: "#ffffff" } });
  doc.addImage(qr, "PNG", w - 38, 32, 30, 30);

  doc.setTextColor(31, 61, 43);
  doc.setFontSize(9);
  doc.text("BOOKING CODE", 8, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(v.bookingCode, 8, 42);
  doc.setFont("helvetica", "normal");

  // Details
  const rows: [string, string][] = [
    ["Service", v.service],
    ["Therapist", v.therapist],
    ["Date & time", v.dateTimeLabel],
    ["Guest", v.guestName],
    ["Total paid", v.totalLabel],
  ];
  let y = 70;
  doc.setFontSize(9);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), 8, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 61, 43);
    doc.text(value, 8, y + 5);
    y += 13;
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(v.provinceNote, 8, 140);

  doc.save(`voucher-${v.bookingCode}.pdf`);
}
