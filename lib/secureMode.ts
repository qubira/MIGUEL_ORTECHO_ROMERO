import crypto from "crypto";

export const SECURE_MODE_COOKIE = "secure_mode";
const TTL_MS = 15 * 60 * 1000; // 15 minutos

function getSecret() {
  return process.env.NEXTAUTH_SECRET || "dev-secret";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSecureModeToken(userId: string) {
  const expires = Date.now() + TTL_MS;
  const payload = `${userId}.${expires}`;
  const value = `${payload}.${sign(payload)}`;
  return { value, maxAge: Math.floor(TTL_MS / 1000) };
}

export function verifySecureModeToken(token: string | undefined, userId: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenUserId, expiresStr, sig] = parts;
  if (tokenUserId !== userId) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  const expected = sign(`${tokenUserId}.${expiresStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
