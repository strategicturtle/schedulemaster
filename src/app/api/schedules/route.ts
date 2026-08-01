import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  defaultTitle,
  generateWeek,
  type SurveyAnswers,
  type Week,
} from "@/lib/schedule";

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

  const { answers, blocks } = (await req.json().catch(() => ({}))) as {
    answers?: SurveyAnswers;
    blocks?: Week; // supplied when duplicating, so edits are copied as-is
  };
  if (!answers) {
    return NextResponse.json({ error: "Missing survey answers." }, { status: 400 });
  }

  // A hand-built schedule starts as an empty week; otherwise ScheduleManager
  // generates it (unless an exact copy of the week was supplied).
  const week: Week = blocks
    ? blocks
    : answers.manual
      ? Array.from({ length: 7 }, () => [])
      : generateWeek(answers);

  const schedule = await prisma.schedule.create({
    data: {
      userId: user.id,
      title: answers.manual ? "My schedule" : defaultTitle(answers),
      answers,
      blocks: week,
      folderId: null,
    },
  });
  return NextResponse.json({ schedule });
}
