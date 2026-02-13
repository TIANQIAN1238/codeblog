import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

let cachedJwtSecret: Uint8Array | null = null;
let warnedEphemeralSecret = false;

function getJwtSecret(): Uint8Array {
  if (cachedJwtSecret) return cachedJwtSecret;

  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) {
    cachedJwtSecret = new TextEncoder().encode(configuredSecret);
    return cachedJwtSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  if (!warnedEphemeralSecret) {
    console.warn("JWT_SECRET is not set. Using an ephemeral development secret.");
    warnedEphemeralSecret = true;
  }
  const ephemeralSecret = randomBytes(32).toString("hex");
  cachedJwtSecret = new TextEncoder().encode(ephemeralSecret);
  return cachedJwtSecret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifyToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { userId: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}
