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

function parseDate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createCalendarEventAction(input: CalendarEventInput) {
  const user = await requireRole("SUPER_ADMIN");

  await prisma.calendarEvent.create({
    data: {
      type: input.type,
      title: input.title.trim(),
      startDate: parseDate(input.startDate),
      endDate: parseDate(input.endDate),
      studioId: input.type === "NATIONAL_HOLIDAY" ? null : (input.studioId || null),
      isReplacementRequired: input.isReplacementRequired ?? false,
      replacementDate: input.replacementDate ? parseDate(input.replacementDate) : null,
      isFinalHoliday: input.isFinalHoliday ?? false,
      note: input.note?.trim() || null,
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

  await prisma.calendarEvent.update({
    where: { id },
    data: {
      type: input.type,
      title: input.title.trim(),
      startDate: parseDate(input.startDate),
      endDate: parseDate(input.endDate),
      studioId: input.type === "NATIONAL_HOLIDAY" ? null : (input.studioId || null),
      isReplacementRequired: input.isReplacementRequired ?? false,
      replacementDate: input.replacementDate ? parseDate(input.replacementDate) : null,
      isFinalHoliday: input.isFinalHoliday ?? false,
      note: input.note?.trim() || null,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/schedules");
  revalidatePath("/settings");
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteCalendarEventAction(id: string) {
  await requireRole("SUPER_ADMIN");

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

  // Create REPLACEMENT_WORKDAY on originalDate
  await prisma.calendarEvent.create({
    data: {
      type: "REPLACEMENT_WORKDAY",
      title: `Kerja Pengganti: ${input.holidayName.trim()}`,
      startDate: parseDate(input.originalDate),
      endDate: parseDate(input.originalDate),
      studioId: input.studioId || null,
      createdById: user.id,
      note: `Pengalihan hari libur ${input.holidayName} ke tanggal ${input.newDate}`,
    },
  });

  // Create COMPANY_LEAVE on newDate
  await prisma.calendarEvent.create({
    data: {
      type: "COMPANY_LEAVE",
      title: `Libur Pengganti: ${input.holidayName.trim()}`,
      startDate: parseDate(input.newDate),
      endDate: parseDate(input.newDate),
      studioId: input.studioId || null,
      createdById: user.id,
      note: `Pengalihan hari libur ${input.holidayName} dari tanggal ${input.originalDate}`,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/schedules");
  revalidatePath("/settings");
}

