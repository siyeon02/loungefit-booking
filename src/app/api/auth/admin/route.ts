import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, createAdminSessionToken, getAdminCookieName } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const token = createAdminSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getAdminCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
