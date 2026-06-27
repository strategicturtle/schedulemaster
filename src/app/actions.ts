"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const start = String(formData.get("startTime") ?? "");
  const end = String(formData.get("endTime") ?? "");

  if (!title || !start || !end) return;

  await prisma.event.create({
    data: {
      title,
      location,
      startTime: new Date(start),
      endTime: new Date(end),
    },
  });

  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.event.delete({ where: { id } });
  revalidatePath("/");
}
