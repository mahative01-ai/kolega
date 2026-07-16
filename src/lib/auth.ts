import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "kolega_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [scheme, salt, hash] = storedHash.split(":");

  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const passwordHash = scryptSync(password, salt, 64);
  const storedPasswordHash = Buffer.from(hash, "hex");

  if (passwordHash.length !== storedPasswordHash.length) {
    return false;
  }

  return timingSafeEqual(passwordHash, storedPasswordHash);
}

function createSessionToken(userId: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = `${userId}.${expiresAt}`;

  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [userId, expiresAt, signature] = token.split(".");
  const payload = `${userId}.${expiresAt}`;

  if (!userId || !expiresAt || !signature || signature !== sign(payload)) {
    return null;
  }

  if (Number(expiresAt) < Date.now()) {
    return null;
  }

  return { userId };
}

export async function setSession(userId: string, rememberMe?: boolean) {
  const cookieStore = await cookies();
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 hari vs 24 jam

  cookieStore.set(SESSION_COOKIE, createSessionToken(userId, maxAge), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAge,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: session.userId,
      accountStatus: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      memberStatus: true,
      workDayBalance: true,
      defaultStudioId: true,
      currentMood: true,
      moodNote: true,
      birthDate: true,
      phoneNumber: true,
      address: true,
      defaultStudio: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export function getDashboardPath(role: AppRole) {
  if (role === "SUPER_ADMIN") {
    return "/super-admin";
  }

  if (role === "ADMIN") {
    return "/admin";
  }

  return "/member";
}

export async function requireRole(role: AppRole) {
  const user = await requireUser();

  if (user.role !== role) {
    redirect(getDashboardPath(user.role));
  }

  return user;
}

export async function requireAnyRole(roles: AppRole[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect(getDashboardPath(user.role));
  }

  return user;
}
