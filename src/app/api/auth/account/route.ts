import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, destroySession } from "@/lib/auth";

// Permanently delete the signed-in user's account. Sessions, folders, and
// schedules are removed automatically via onDelete: Cascade in the schema.
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  await prisma.user.delete({ where: { id: user.id } });
  await destroySession(); // clear the session cookie
  return NextResponse.json({ ok: true });
}
