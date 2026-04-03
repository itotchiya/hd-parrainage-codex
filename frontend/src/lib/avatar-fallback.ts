import type { CSSProperties } from 'react'

/**
 * Mid/dark saturated hues — white initials stay readable in light and dark UI
 * (avoids very light yellows/cyans where contrast would fail).
 */
export const AVATAR_FALLBACK_BACKGROUND_HEX = [
  '#475569',
  '#4f46e5',
  '#0d9488',
  '#047857',
  '#b45309',
  '#b91c1c',
  '#7e22ce',
  '#c2410c',
  '#be185d',
  '#0e7490',
  '#4338ca',
  '#115e59',
  '#1e40af',
  '#6b21a8',
  '#9a3412',
  '#374151',
] as const

function hashStringToIndex(str: string, modulo: number): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h) % modulo
}

/** Stable color for a user/agent from id (or user_id when present). */
export function avatarSeedForUser(user: { id: string; user_id?: string | null }): string {
  const raw = user.user_id ?? user.id
  return raw && raw.length > 0 ? raw : 'anonymous'
}

export function getAvatarFallbackBackgroundStyle(seed: string): CSSProperties {
  const key = seed.trim().length > 0 ? seed : 'anonymous'
  const idx = hashStringToIndex(key, AVATAR_FALLBACK_BACKGROUND_HEX.length)
  return { backgroundColor: AVATAR_FALLBACK_BACKGROUND_HEX[idx] }
}
