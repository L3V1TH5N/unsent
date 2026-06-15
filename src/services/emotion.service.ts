import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export type EmotionResult = {
  emotion: string
  intensity: number
  category: string
  seedTheme: string
}

export async function analyzeLetter(content: string): Promise<EmotionResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Analyze the emotion in this letter and respond with ONLY a JSON object, no other text.

Letter: "${content}"

Respond with exactly this JSON structure:
{
  "emotion": "one of: love, longing, regret, sadness, anger, forgiveness, acceptance, healing, hope",
  "intensity": 0.0 to 1.0,
  "category": "one of: past_relationship, grief, self_reflection, family, friendship, healing",
  "seedTheme": "a 2-4 word poetic theme name for the emotional journey, e.g. 'Letting Go', 'Missing Someone', 'Finding Peace'"
}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as EmotionResult
}