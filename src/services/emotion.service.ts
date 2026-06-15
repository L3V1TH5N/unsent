import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export type EmotionCategory =
  | 'past_relationship'
  | 'grief'
  | 'self_reflection'
  | 'family'
  | 'friendship'
  | 'healing'

export type EmotionType =
  | 'love'
  | 'longing'
  | 'regret'
  | 'sadness'
  | 'anger'
  | 'forgiveness'
  | 'acceptance'
  | 'healing'
  | 'hope'

export type EmotionResult = {
  emotion: EmotionType
  intensity: number       // 0.0–1.0
  category: EmotionCategory
  seedTheme: string       // 2–4 word poetic theme, Title Case
  tags: string[]          // 2–4 lowercase keyword tags for fuzzy seed grouping
}

// Valid values the model is allowed to return — used for validation
const VALID_EMOTIONS = new Set<EmotionType>([
  'love', 'longing', 'regret', 'sadness', 'anger',
  'forgiveness', 'acceptance', 'healing', 'hope',
])

const VALID_CATEGORIES = new Set<EmotionCategory>([
  'past_relationship', 'grief', 'self_reflection',
  'family', 'friendship', 'healing',
])

const SYSTEM_PROMPT = `You are an empathetic emotional analyst for a journaling platform called Unsent.
Your job is to read a short personal letter and return a JSON object describing its emotional content.

Rules:
- Respond with ONLY the JSON object — no markdown fences, no explanation, no preamble.
- All fields are required.
- "emotion" must be exactly one of: love, longing, regret, sadness, anger, forgiveness, acceptance, healing, hope
- "intensity" is a float between 0.0 and 1.0 (calibrate carefully: 0.5 is moderate, 0.9 is overwhelming)
- "category" must be exactly one of: past_relationship, grief, self_reflection, family, friendship, healing
- "seedTheme" is a 2–4 word poetic name for the emotional journey in Title Case (e.g. "Letting Go", "Missing Someone", "Finding Peace", "Unfinished Goodbyes")
- "tags" is an array of 2–4 lowercase single-word keywords that capture the emotional texture (e.g. ["waiting", "distance", "silence"])

JSON schema:
{
  "emotion": string,
  "intensity": number,
  "category": string,
  "seedTheme": string,
  "tags": string[]
}`

function validateAndCoerce(raw: unknown): EmotionResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Response is not a JSON object')
  }

  const obj = raw as Record<string, unknown>

  const emotion = VALID_EMOTIONS.has(obj.emotion as EmotionType)
    ? (obj.emotion as EmotionType)
    : 'longing'

  const intensity =
    typeof obj.intensity === 'number' &&
    obj.intensity >= 0 &&
    obj.intensity <= 1
      ? Number(obj.intensity.toFixed(2))
      : 0.5

  const category = VALID_CATEGORIES.has(obj.category as EmotionCategory)
    ? (obj.category as EmotionCategory)
    : 'self_reflection'

  const seedTheme =
    typeof obj.seedTheme === 'string' && obj.seedTheme.trim().length > 0
      ? obj.seedTheme.trim()
      : 'Unspoken Feelings'

  const tags = Array.isArray(obj.tags)
    ? (obj.tags as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toLowerCase().trim())
        .slice(0, 4)
    : []

  return { emotion, intensity, category, seedTheme, tags }
}

export async function analyzeLetter(content: string): Promise<EmotionResult> {
  // Truncate extremely long letters to keep token cost low
  const truncated = content.length > 1200 ? content.slice(0, 1200) + '…' : content

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Letter:\n"${truncated}"`,
      },
    ],
  })

  const block = message.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') {
    throw new Error('No text block in response')
  }

  // Strip any accidental fences the model might add despite instructions
  const clean = block.text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  const parsed = JSON.parse(clean)
  return validateAndCoerce(parsed)
}