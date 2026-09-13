/** Format minutes as compact duration, e.g. `2h 30m`, `45m`, `3h`. */
export function formatDurationMinutes(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) {
    return '—';
  }

  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes === 0) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Parse duration strings like `2h 30m`, `1.5h`, `90m`, `2:30`.
 * Returns null when empty/invalid.
 */
export function parseDurationToMinutes(input: string | null | undefined): number | null {
  const raw = input?.trim().toLowerCase() ?? '';
  if (!raw) {
    return null;
  }

  if (/^\d+:\d{1,2}$/.test(raw)) {
    const [h, m] = raw.split(':').map((part) => Number(part));
    if (!Number.isFinite(h) || !Number.isFinite(m) || m >= 60) {
      return null;
    }
    return Math.round(h * 60 + m);
  }

  const hourMatch = raw.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = raw.match(/(\d+(?:\.\d+)?)\s*m/);
  if (hourMatch || minMatch) {
    const hours = hourMatch ? Number(hourMatch[1]) : 0;
    const mins = minMatch ? Number(minMatch[1]) : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) {
      return null;
    }
    return Math.round(hours * 60 + mins);
  }

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours < 0) {
      return null;
    }
    return Math.round(hours * 60);
  }

  return null;
}

export function progressPercent(spentMinutes: number, originalEstimateMinutes: number | null | undefined): number {
  if (!originalEstimateMinutes || originalEstimateMinutes <= 0) {
    return spentMinutes > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((spentMinutes / originalEstimateMinutes) * 100));
}

export function isOverEstimate(
  spentMinutes: number,
  originalEstimateMinutes: number | null | undefined,
): boolean {
  return !!originalEstimateMinutes && originalEstimateMinutes > 0 && spentMinutes > originalEstimateMinutes;
}

/** Local calendar date `yyyy-MM-dd`. */
export function toDateInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local time `HH:mm`. */
export function toTimeInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function splitIsoToDateAndTime(iso?: string | null): { date: string; time: string } | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return {
    date: toDateInputValue(date),
    time: toTimeInputValue(date),
  };
}

/** Combine date (`yyyy-MM-dd`) + time (`HH:mm`) into an ISO UTC string. */
export function combineDateAndTimeToIso(dateValue: string, timeValue: string): string | null {
  const date = dateValue.trim();
  const time = timeValue.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const [hours, minutes] = time.split(':').map((part) => Number(part));
  if (
    !Number.isFinite(hours)
    || !Number.isFinite(minutes)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
  ) {
    return null;
  }

  const local = new Date(`${date}T${time}:00`);
  if (Number.isNaN(local.getTime())) {
    return null;
  }
  return local.toISOString();
}

export function defaultWorkLogParts(pageOpenedDate = new Date()): {
  date: string;
  startTime: string;
  endTime: string;
} {
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  return {
    date: toDateInputValue(pageOpenedDate),
    startTime: toTimeInputValue(start),
    endTime: toTimeInputValue(end),
  };
}

export function minutesBetweenDateAndTimes(
  dateValue: string,
  startTime: string,
  endTime: string,
): number | null {
  const startIso = combineDateAndTimeToIso(dateValue, startTime);
  const endIso = combineDateAndTimeToIso(dateValue, endTime);
  if (!startIso || !endIso) {
    return null;
  }
  const minutes = Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  return minutes > 0 ? minutes : null;
}

