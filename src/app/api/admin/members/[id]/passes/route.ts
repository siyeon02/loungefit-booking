import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { totalSessions, expiresAt } = await req.json();
  const sessions = Number(totalSessions);
  if (!sessions || sessions <= 0) {
    return NextResponse.json({ error: "totalSessions는 1 이상이어야 합니다." }, { status: 400 });
  }

  const pass = await prisma.pass.create({
    data: {
      memberId: params.id,
      totalSessions: sessions,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  return NextResponse.json({ pass });
}
