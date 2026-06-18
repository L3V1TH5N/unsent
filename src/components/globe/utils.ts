// src/components/globe/utils.ts
export function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Deterministic pseudo-random in [0,1) from an integer seed — used for
// star field jitter, where we just need stable-looking variety.
export function seed(n: number): number {
  const x = Math.sin(n + 1) * 10000
  return x - Math.floor(x)
}

// ── Deterministic per-letter globe placement ─────────────────────────────
// A message's position on the globe is *derived* from its id rather than
// stored. The same id always hashes to the same lat/lng/size/phase, so a
// letter stays put across reloads, rotation, and zoom — with no database
// migration and no extra column to keep in sync.
function hash32(str: string, salt: number): number {
  let h = (salt ^ str.length) | 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

export interface LetterPlacement {
  lat: number
  lng: number
  size: number
}

export function letterPosition(id: string): LetterPlacement {
  const a = hash32(id, 0x9e3779b9) / 4294967295
  const b = hash32(id, 0x85ebca6b) / 4294967295
  const c = hash32(id, 0xc2b2ae35) / 4294967295
  return {
    // Keep clear of the poles (±90), where points crowd together visually.
    lat: (a * 2 - 1) * 64,
    lng: (b * 2 - 1) * 180,
    size: 0.7 + c * 0.7,
  }
}

// lat/lng → unit sphere XYZ — same convention as the globe geometry, so a
// marker at (lat, lng) sits exactly on the visible surface.
export function ll2xyz(lat: number, lng: number, r = 1): [number, number, number] {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lng + 180) * Math.PI / 180
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ]
}