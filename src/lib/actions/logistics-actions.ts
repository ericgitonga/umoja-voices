"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { DEADLINE_CATEGORIES } from "@/lib/constants";
import { clip, oneOf } from "@/lib/validation";
import { logActivity } from "@/lib/activity-log";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Admin access required.");
  return session;
}

export async function createTrip(formData: FormData) {
  const session = await requireAdmin();
  const title = clip(String(formData.get("title") ?? "").trim(), "title");
  const destination = clip(String(formData.get("destination") ?? "").trim(), "label");
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  if (!title || !destination) return;

  await prisma.trip.create({
    data: { title, destination, startDate, endDate, createdById: session.user.id },
  });
  await logActivity(`${session.user.name} <${session.user.email}>`, "trip_create", title, {
    type: "Trip",
    label: title,
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}

export async function addDeadline(tripId: string, formData: FormData) {
  const session = await requireAdmin();
  const label = clip(String(formData.get("label") ?? "").trim(), "label");
  const category = oneOf(String(formData.get("category") ?? ""), DEADLINE_CATEGORIES, "other");
  const dueDate = new Date(String(formData.get("dueDate")));
  const notes = clip(String(formData.get("notes") ?? "").trim(), "notes") || null;
  if (!label) return;

  const count = await prisma.logisticsDeadline.count({ where: { tripId } });
  await prisma.logisticsDeadline.create({
    data: { tripId, label, category, dueDate, notes, sortOrder: count },
  });
  await logActivity(`${session.user.name} <${session.user.email}>`, "logistics_deadline_create", label, {
    type: "LogisticsDeadline",
    label,
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}

export async function addItineraryItem(tripId: string, formData: FormData) {
  const session = await requireAdmin();
  const title = clip(String(formData.get("title") ?? "").trim(), "title");
  const date = new Date(String(formData.get("date")));
  const time = clip(String(formData.get("time") ?? "").trim(), "label") || null;
  const location = clip(String(formData.get("location") ?? "").trim(), "label") || null;
  const notes = clip(String(formData.get("notes") ?? "").trim(), "notes") || null;
  if (!title) return;

  const count = await prisma.itineraryItem.count({ where: { tripId } });
  await prisma.itineraryItem.create({
    data: { tripId, title, date, time, location, notes, sortOrder: count },
  });
  await logActivity(`${session.user.name} <${session.user.email}>`, "itinerary_item_create", title, {
    type: "ItineraryItem",
    label: title,
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}

export async function addPracticeSession(tripId: string, formData: FormData) {
  const session = await requireAdmin();
  const date = new Date(String(formData.get("date")));
  const time = clip(String(formData.get("time") ?? "").trim(), "label");
  const location = clip(String(formData.get("location") ?? "").trim(), "label");
  const notes = clip(String(formData.get("notes") ?? "").trim(), "notes") || null;
  if (!time || !location) return;

  const count = await prisma.practiceSession.count({ where: { tripId } });
  await prisma.practiceSession.create({
    data: { tripId, date, time, location, notes, sortOrder: count },
  });
  const label = `${location} — ${time}`;
  await logActivity(`${session.user.name} <${session.user.email}>`, "practice_session_create", label, {
    type: "PracticeSession",
    label,
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}

export async function deleteDeadline(id: string) {
  const session = await requireAdmin();
  const deadline = await prisma.logisticsDeadline.delete({ where: { id } });
  await logActivity(`${session.user.name} <${session.user.email}>`, "logistics_deadline_delete", deadline.label, {
    type: "LogisticsDeadline",
    label: deadline.label,
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}
export async function deleteItineraryItem(id: string) {
  const session = await requireAdmin();
  const item = await prisma.itineraryItem.delete({ where: { id } });
  await logActivity(`${session.user.name} <${session.user.email}>`, "itinerary_item_delete", item.title, {
    type: "ItineraryItem",
    label: item.title,
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}
export async function deletePracticeSession(id: string) {
  const session = await requireAdmin();
  const practiceSession = await prisma.practiceSession.delete({ where: { id } });
  const label = `${practiceSession.location} — ${practiceSession.time}`;
  await logActivity(`${session.user.name} <${session.user.email}>`, "practice_session_delete", label, {
    type: "PracticeSession",
    label,
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}
