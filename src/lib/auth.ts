import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.ADMIN_SESSION_SECRET || "dev-secret-change-me";
const ADMIN_COOKIE = "loungefit_admin_session";
const MEMBER_COOKIE = "loungefit_member_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7일 (회원은 자주 재방문하니 길게)

function sign(payload: string): string {
  const h = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${h}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  if (sig !== expected) return null;
  const [expiresAtStr, ...rest] = payload.split("|");
  const expiresAt = Number(expiresAtStr);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return null;
  return rest.join("|");
}

// ---- 관리자 ----
export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export function createAdminSessionToken(): string {
  const expiresAt = Date.now() + TTL_MS;
  return sign(`${expiresAt}|admin`);
}

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verify(token) !== null;
}

export function getAdminCookieName() {
  return ADMIN_COOKIE;
}

// ---- 회원 (전화번호+이름 본인확인, 비밀번호 없음) ----
export function createMemberSessionToken(memberId: string): string {
  const expiresAt = Date.now() + TTL_MS;
  return sign(`${expiresAt}|${memberId}`);
}

export async function getAuthedMemberId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

export function getMemberCookieName() {
  return MEMBER_COOKIE;
}
