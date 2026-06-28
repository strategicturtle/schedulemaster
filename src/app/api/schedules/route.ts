import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { defaultTitle, generateWeek, type SurveyAnswers } from "@/lib/schedule";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const schedules = await prisma.schedule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ schedules });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { answers } = (await req.json().catch(() => ({}))) as {
    answers?: SurveyAnswers;
  };
  if (!answers) {
    return NextResponse.json({ error: "Missing survey answers." }, { status: 400 });
  }

  const schedule = await prisma.schedule.create({
    data: {
      userId: user.id,
      title: defaultTitle(answers),
      answers,
      blocks: generateWeek(answers),
      folderId: null,
    },
  });
  return NextResponse.json({ schedule });
}
