import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

// Change the signed-in user's password (verify current, then set new).
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { current, next } = (await req.json().catch(() => ({}))) as {
    current?: string;
    next?: string;
  };
  if (!next || next.length < 1) {
    return NextResponse.json({ error: "New password required." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const ok = await verifyPassword(current ?? "", user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 },
    );
  }
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next) },
  });
  return NextResponse.json({ ok: true });
}
