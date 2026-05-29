export function normalizeListResponse<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}
