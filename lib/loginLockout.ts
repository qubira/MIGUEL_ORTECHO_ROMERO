import { prisma } from "@/lib/prisma";

const WINDOW_MS = 5 * 60 * 1000; // ventana de intentos: 5 minutos
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30 * 60 * 1000; // duración del bloqueo: 30 minutos

export function minutesRemaining(until: Date) {
  return Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
}

// Cuenta un intento fallido dentro de una ventana deslizante de 5 minutos;
// al llegar a 5 fallos en esa ventana, bloquea la cuenta 30 minutos y
// reinicia el contador para que, pasado el bloqueo, el ciclo empiece de cero.
export async function registerFailedLogin(user: {
  id: string;
  failedLoginAttempts: number;
  firstFailedLoginAt: Date | null;
}): Promise<Date | null> {
  const now = new Date();
  const withinWindow =
    !!user.firstFailedLoginAt &&
    now.getTime() - user.firstFailedLoginAt.getTime() < WINDOW_MS;

  const attempts = withinWindow ? user.failedLoginAttempts + 1 : 1;
  const firstFailedLoginAt = withinWindow ? user.firstFailedLoginAt : now;

  if (attempts >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCK_MS);
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, firstFailedLoginAt: null, lockedUntil },
    });
    return lockedUntil;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: attempts, firstFailedLoginAt },
  });
  return null;
}

export async function clearLoginFailures(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, firstFailedLoginAt: null, lockedUntil: null },
  });
}
