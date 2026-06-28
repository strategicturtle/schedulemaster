import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  const name = (username || "").trim();
  const user = name
    ? await prisma.user.findUnique({ where: { username: name } })
    : null;

  // Always run the verify path to avoid leaking which usernames exist.
  const ok =
    user && password
      ? await verifyPassword(password, user.passwordHash)
      : false;

  if (!user || !ok) {
    return NextResponse.json(
      { error: "Wrong username or password." },
      { status: 401 },
    );
  }

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, username: user.username } });
}
