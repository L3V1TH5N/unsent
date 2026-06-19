// src/components/globe/constants.ts
// ── Emotion → color palette, shared by the globe markers and the modal ────
export const EMOTION_COLORS: Record<string, [number, number, number]> = {
  longing:     [196, 137, 122], sadness:     [122, 158, 196],
  regret:      [154, 138, 196], healing:     [122, 170, 122],
  forgiveness: [196, 170, 122], love:        [196, 122, 154],
  hope:        [122, 186, 196], acceptance:  [138, 170, 138],
}

// Letters that haven't been analyzed yet (status !== 'ANALYZED') have no
// emotion, so they render in a neutral "freshly sent" gold rather than
// disappearing or defaulting to an arbitrary emotion color.
export const DEFAULT_LETTER_COLOR: [number, number, number] = [215, 191, 140]

export const RECIPIENT_LABELS: Record<string, string> = {
  someone_loved:   'to someone I loved',
  someone_lost:    'to someone I lost',
  past_self:       'to my past self',
  someone_hurt:    'to someone I hurt',
  someone_forgive: 'to someone I forgive',
  myself:          'to myself',
}

// ── Camera / zoom ───────────────────────────────────────────────────────
export const ZOOM_MIN = 1.55      // closest allowed camera distance
export const ZOOM_MAX = 4.6       // farthest allowed camera distance
export const ZOOM_DEFAULT = 3.8   // farther out so globe appears smaller on first load
export const ZOOM_BUTTON_STEP = 0.82 // multiplicative step for the +/- buttons

// ── Marker picking ──────────────────────────────────────────────────────
export const PICK_RADIUS_PX = 16  // click/tap hit radius, in CSS pixels