interface AttemptRecord {
  count: number
  firstAt: number
  blockedUntil: number | null
}

const attempts = new Map<string, AttemptRecord>()

const MAX_ATTEMPTS = 5
const BLOCK_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const WINDOW_MS = 15 * 60 * 1000 // 15-minute sliding window

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record) return { allowed: true }

  // Reset if window expired
  if (now - record.firstAt > WINDOW_MS) {
    attempts.delete(key)
    return { allowed: true }
  }

  // Check if currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, retryAfterMs: record.blockedUntil - now }
  }

  return { allowed: true }
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: null })
    return
  }

  record.count += 1

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS
  }
}

export function clearAttempts(key: string): void {
  attempts.delete(key)
}

// Periodic cleanup of expired entries (runs every 10 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of attempts) {
      if (now - record.firstAt > WINDOW_MS && (!record.blockedUntil || now > record.blockedUntil)) {
        attempts.delete(key)
      }
    }
  }, 10 * 60 * 1000)
}
