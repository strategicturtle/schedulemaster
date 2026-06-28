import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { SurveyAnswers } from "@/lib/schedule";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const patch = (await req.json().catch(() => ({}))) as {
    title?: string;
    folderId?: string | null;
    answers?: SurveyAnswers;
  };

  const owned = await prisma.schedule.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const schedule = await prisma.schedule.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.folderId !== undefined ? { folderId: patch.folderId } : {}),
      ...(patch.answers !== undefined ? { answers: patch.answers } : {}),
    },
  });
  return NextResponse.json({ schedule });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const { count } = await prisma.schedule.deleteMany({
    where: { id, userId: user.id },
  });
  if (count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
