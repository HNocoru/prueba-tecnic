/** Postgres devuelve `time` como "08:00:00"; la app y los asistentes usan "08:00". */
export function toHourMinute(value: string): string {
  return /^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value) ? value.slice(0, 5) : value;
}
