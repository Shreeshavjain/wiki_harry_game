import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-dev-secret";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "0905";
const COOKIE_NAME = "admin_session";

/**
 * Create a signed session token.
 * Simple HMAC-based approach — sufficient for a college event.
 */
function signToken(payload: string): string {
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verify a signed session token.
 */
function verifyToken(token: string): boolean {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;

  const payload = token.substring(0, lastDot);
  const expectedToken = signToken(payload);

  // Timing-safe comparison
  if (token.length !== expectedToken.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
}

/**
 * Check if the provided password matches the admin password.
 */
export function checkAdminPassword(password: string): boolean {
  // Timing-safe comparison to prevent timing attacks
  const expected = Buffer.from(ADMIN_PASSWORD);
  const received = Buffer.from(password);

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(expected, received);
}

/**
 * Create an admin session cookie.
 */
export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const payload = `admin:${Date.now()}`;
  const token = signToken(payload);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours — long enough for a day-long event
  });
}

/**
 * Clear the admin session cookie.
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Check if the current request has a valid admin session.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return false;

  return verifyToken(token);
}
