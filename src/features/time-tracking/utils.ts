import type { Timestamp } from "firebase/firestore";

import type { TimeLog } from "./schemas";

/** Teto de 24h por log (SPEC §4.5) — timer esquecido é fechado no limite. */
export const MAX_SHIFT_MS = 24 * 3_600_000;

/** hours = (clockOut − clockIn − break) / 3.6e6; timer aberto conta 0. */
export function timeLogHours(log: Pick<TimeLog, "clockIn" | "clockOut" | "breakMinutes">): number {
  if (!log.clockOut) return 0;
  const ms = log.clockOut.toMillis() - log.clockIn.toMillis() - log.breakMinutes * 60_000;
  return Math.max(0, ms / 3_600_000);
}

/** clockOut válido: depois do clockIn e no máximo clockIn + 24h. */
export function clampClockOut(clockIn: Timestamp, nowMs: number): number {
  const minMs = clockIn.toMillis() + 1_000;
  const maxMs = clockIn.toMillis() + MAX_SHIFT_MS;
  return Math.min(Math.max(nowMs, minMs), maxMs);
}

/** ms decorridos → "H:MM:SS" para o timer ao vivo do /field. */
export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

/** Horas decimais → "4h 30m" para listas de logs. */
export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 60) return `${wholeHours + 1}h 0m`;
  return `${wholeHours}h ${minutes}m`;
}
