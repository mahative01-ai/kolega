"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Type ───────────────────────────────────────────────────────────────────

type CalendarEventInput = {
  type: "NATIONAL_HOLIDAY" | "COMPANY_LEAVE" | "REGULAR_OFF_DAY" | "REPLACEMENT_WORKDAY" | "STUDIO_EVENT";
  title: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  studioId?: string | null;
  isReplacementRequired?: boolean;
  replacementDate?: string | null;
  isFinalHoliday?: boolean;
  note?: string | null;
};

const EVENT_TYPES = new Set<CalendarEventInput["type"]>([
  "NATIONAL_HOLIDAY",
  "COMPANY_LEAVE",
  "REGULAR_OFF_DAY",
  "REPLACEMENT_WORKDAY",
  "STUDIO_EVENT",
]);

function parseDate(value: string, fieldName: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} tidak valid.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${fieldName} tidak valid.`);
  }
  return date;
}

async function validateCalendarEventInput(input: CalendarEventInput) {
  if (!input || typeof input !== "object") throw new Error("Data event tidak valid.");
  if (!EVENT_TYPES.has(input.type)) throw new Error("Tipe event tidak valid.");
  if (typeof input.title !== "string") throw new Error("Judul event tidak valid.");
  if (typeof input.startDate !== "string" || typeof input.endDate !== "string") {
    throw new Error("Tanggal event tidak valid.");
  }
  if (input.studioId != null && typeof input.studioId !== "string") {
    throw new Error("Studio tidak valid.");
  }
  if (input.note != null && typeof input.note !== "string") {
    throw new Error("Catatan tidak valid.");
  }
  if (input.note && input.note.trim().length > 500) {
    throw new Error("Catatan maksimal 500 karakter.");
  }
  if (input.isReplacementRequired != null && typeof input.isReplacementRequired !== "boolean") {
    throw new Error("Status hari pengganti tidak valid.");
  }
  if (input.isFinalHoliday != null && typeof input.isFinalHoliday !== "boolean") {
    throw new Error("Status libur final tidak valid.");
  }

  const title = input.title.trim();
  if (!title || title.length > 120) {
    throw new Error("Judul event wajib diisi dan maksimal 120 karakter.");
  }

  const startDate = parseDate(input.startDate, "Tanggal mulai");
  const endDate = parseDate(input.endDate, "Tanggal selesai");
  if (startDate > endDate) throw new Error("Tanggal mulai tidak boleh setelah tanggal selesai.");

  const supportsReplacement = input.type === "COMPANY_LEAVE" || input.type === "REGULAR_OFF_DAY";
  const isReplacementRequired = supportsReplacement && Boolean(input.isReplacementRequired);
  const isFinalHoliday = input.type !== "REPLACEMENT_WORKDAY" && input.type !== "STUDIO_EVENT"
    ? Boolean(input.isFinalHoliday)
    : false;
  if (isReplacementRequired && isFinalHoliday) {
    throw new Error("Libur final tidak dapat memiliki hari kerja pengganti.");
  }

  const replacementDate = isReplacementRequired
    ? parseDate(
        typeof input.replacementDate === "string" ? input.replacementDate : "",
        "Tanggal pengganti"
      )
    : null;
  const studioId = input.type === "NATIONAL_HOLIDAY" ? null : (input.studioId || null);
  if (studioId) {
    const studio = await prisma.studio.findFirst({ where: { id: studioId, isActive: true }, select: { id: true } });
    if (!studio) throw new Error("Studio tidak ditemukan atau sudah tidak aktif.");
  }

  return {
    type: input.type,
    title,
    startDate,
    endDate,
    studioId,
    isReplacementRequired,
    replacementDate,
    isFinalHoliday,
    note: input.note?.trim() || null,
  };
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createCalendarEventAction(input: CalendarEventInput) {
  const user = await requireRole("SUPER_ADMIN");
  const data = await validateCalendarEventInput(input);

  await prisma.calendarEvent.create({
    data: {
      ...data,
      createdById: user.id,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/schedules");
  revalidatePath("/settings");
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateCalendarEventAction(id: string, input: CalendarEventInput) {
  await requireRole("SUPER_ADMIN");
  if (typeof id !== "string" || !id) throw new Error("Event tidak valid.");
  const data = await validateCalendarEventInput(input);

  await prisma.calendarEvent.update({
    where: { id },
    data,
  });

  revalidatePath("/calendar");
  revalidatePath("/schedules");
  revalidatePath("/settings");
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteCalendarEventAction(id: string) {
  await requireRole("SUPER_ADMIN");
  if (typeof id !== "string" || !id) throw new Error("Event tidak valid.");

  await prisma.calendarEvent.delete({ where: { id } });

  revalidatePath("/calendar");
  revalidatePath("/schedules");
  revalidatePath("/settings");
}

// ─── Swap Holiday ────────────────────────────────────────────────────────────

export async function swapHolidayAction(input: {
  studioId: string | null;
  holidayName: string;
  originalDate: string; // "YYYY-MM-DD"
  newDate: string;      // "YYYY-MM-DD"
}) {
  const user = await requireRole("SUPER_ADMIN");
  if (!input || typeof input !== "object") throw new Error("Data penukaran libur tidak valid.");
  if (
    typeof input.holidayName !== "string" ||
    typeof input.originalDate !== "string" ||
    typeof input.newDate !== "string" ||
    (input.studioId != null && typeof input.studioId !== "string")
  ) {
    throw new Error("Data penukaran libur tidak valid.");
  }
  const holidayName = input.holidayName.trim();
  if (!holidayName || holidayName.length > 120) throw new Error("Nama libur wajib diisi dan maksimal 120 karakter.");
  const originalDate = parseDate(input.originalDate, "Tanggal libur asal");
  const newDate = parseDate(input.newDate, "Tanggal libur baru");
  if (originalDate.getTime() === newDate.getTime()) throw new Error("Tanggal asal dan tanggal baru tidak boleh sama.");
  if (input.studioId) {
    const studio = await prisma.studio.findFirst({ where: { id: input.studioId, isActive: true }, select: { id: true } });
    if (!studio) throw new Error("Studio tidak ditemukan atau sudah tidak aktif.");
  }

  await prisma.$transaction([
    prisma.calendarEvent.create({
      data: {
        type: "REPLACEMENT_WORKDAY",
        title: `Kerja Pengganti: ${holidayName}`,
        startDate: originalDate,
        endDate: originalDate,
        studioId: input.studioId || null,
        createdById: user.id,
        note: `Pengalihan hari libur ${holidayName} ke tanggal ${input.newDate}`,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        type: "COMPANY_LEAVE",
        title: `Libur Pengganti: ${holidayName}`,
        startDate: newDate,
        endDate: newDate,
        studioId: input.studioId || null,
        createdById: user.id,
        note: `Pengalihan hari libur ${holidayName} dari tanggal ${input.originalDate}`,
      },
    }),
  ]);

  revalidatePath("/calendar");
  revalidatePath("/schedules");
  revalidatePath("/settings");
}
