import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createMemberSessionToken, getMemberCookieName } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { phone, name } = await req.json();
  if (!phone || !name) {
    return NextResponse.json({ error: "전화번호와 이름을 입력해주세요." }, { status: 400 });
  }
  const normalizedPhone = String(phone).replace(/[^0-9]/g, "");
  const member = await prisma.member.findUnique({ where: { phone: normalizedPhone } });

  if (!member || member.name.trim() !== String(name).trim()) {
    return NextResponse.json(
      { error: "일치하는 회원 정보를 찾을 수 없습니다. 지점에 문의해주세요." },
      { status: 401 }
    );
  }

  const token = createMemberSessionToken(member.id);
  const res = NextResponse.json({ ok: true, member: { id: member.id, name: member.name } });
  res.cookies.set(getMemberCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
