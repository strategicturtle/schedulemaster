import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Bump and return the global "times the website was entered" counter.
// Public — no auth; called once per page load.
export async function POST() {
  const stat = await prisma.stat.upsert({
    where: { key: "visits" },
    update: { value: { increment: 1 } },
    create: { key: "visits", value: 1 },
  });
  return NextResponse.json({ visits: stat.value });
}
