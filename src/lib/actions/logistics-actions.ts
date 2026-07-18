"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") throw new Error("Admin access required.");
  return session;
}

export async function createTrip(formData: FormData) {
  const session = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  if (!title || !destination) return;

  await prisma.trip.create({
    data: { title, destination, startDate, endDate, createdById: session.user.id },
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}

export async function addDeadline(tripId: string, formData: FormData) {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const dueDate = new Date(String(formData.get("dueDate")));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!label) return;

  const count = await prisma.logisticsDeadline.count({ where: { tripId } });
  await prisma.logisticsDeadline.create({
    data: { tripId, label, category, dueDate, notes, sortOrder: count },
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}

export async function addItineraryItem(tripId: string, formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const date = new Date(String(formData.get("date")));
  const time = String(formData.get("time") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!title) return;

  const count = await prisma.itineraryItem.count({ where: { tripId } });
  await prisma.itineraryItem.create({
    data: { tripId, title, date, time, location, notes, sortOrder: count },
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}

export async function addPracticeSession(tripId: string, formData: FormData) {
  await requireAdmin();
  const date = new Date(String(formData.get("date")));
  const time = String(formData.get("time") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!time || !location) return;

  const count = await prisma.practiceSession.count({ where: { tripId } });
  await prisma.practiceSession.create({
    data: { tripId, date, time, location, notes, sortOrder: count },
  });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}

export async function deleteDeadline(id: string) {
  await requireAdmin();
  await prisma.logisticsDeadline.delete({ where: { id } });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}
export async function deleteItineraryItem(id: string) {
  await requireAdmin();
  await prisma.itineraryItem.delete({ where: { id } });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}
export async function deletePracticeSession(id: string) {
  await requireAdmin();
  await prisma.practiceSession.delete({ where: { id } });
  revalidatePath("/admin/logistics");
  revalidatePath("/logistics");
}
