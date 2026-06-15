import { prisma } from '@/lib/prisma'
import { Stage } from '../generated/prisma'
import type { EmotionResult } from './emotion.service'

// ─── Stage thresholds ──────────────────────────────────────────────────────
// How many letters are needed to reach each stage
const STAGE_THRESHOLDS: Record<Stage, number> = {
  SEED:    0,
  SPROUT:  3,
  HEALING: 7,
  BLOOMED: 12,
  STRONG:  20,
}

// Ordered so we can walk up from highest → lowest
const STAGES_DESC: Stage[] = ['STRONG', 'BLOOMED', 'HEALING', 'SPROUT', 'SEED']

export function getStageForCount(count: number): Stage {
  for (const stage of STAGES_DESC) {
    if (count >= STAGE_THRESHOLDS[stage]) return stage
  }
  return 'SEED'
}

// Progress within the current stage: 0.0–1.0
export function stageProgress(count: number, stage: Stage): number {
  const current = STAGE_THRESHOLDS[stage]
  const stageIndex = STAGES_DESC.indexOf(stage)

  // Already at max stage
  if (stageIndex === 0) return 1

  const next = STAGE_THRESHOLDS[STAGES_DESC[stageIndex - 1]]
  if (next === current) return 1

  return Math.min((count - current) / (next - current), 1)
}

// ─── Tag overlap: how many tags the letter shares with a seed ─────────────
function tagOverlap(seedTags: string[], letterTags: string[]): number {
  if (!seedTags.length || !letterTags.length) return 0
  const set = new Set(seedTags)
  return letterTags.filter((t) => set.has(t)).length
}

// ─── Main export ───────────────────────────────────────────────────────────
export async function updateGardenForLetter(
  userId: string,
  letterId: string,
  emotion: EmotionResult
) {
  // Normalise theme for comparison (lowercase, trimmed)
  const themeNorm = emotion.seedTheme.toLowerCase().trim()

  // 1️⃣  Exact theme match (case-insensitive)
  let existingSeed = await prisma.seed.findFirst({
    where: {
      userId,
      theme: { equals: emotion.seedTheme, mode: 'insensitive' },
    },
  })

  // 2️⃣  Category match — find the best seed in the same category by tag overlap
  if (!existingSeed) {
    const categorySeeds = await prisma.seed.findMany({
      where: { userId, category: emotion.category },
      orderBy: { lastActivity: 'desc' },
    })

    if (categorySeeds.length > 0) {
      // Pick the seed with the most tag overlap; fall back to most recent
      const scored = categorySeeds.map((s) => ({
        seed: s,
        score: tagOverlap((s.tags ?? []) as string[], emotion.tags),
      }))
      scored.sort((a, b) => b.score - a.score)

      // Only merge if there's meaningful overlap (at least 1 shared tag)
      // or the theme is semantically close (share the first word)
      const best = scored[0]
      const firstWordMatch =
        best.seed.theme.toLowerCase().split(' ')[0] ===
        themeNorm.split(' ')[0]

      if (best.score >= 1 || firstWordMatch) {
        existingSeed = best.seed
      }
    }
  }

  // ─── Update existing seed ────────────────────────────────────────────────
  if (existingSeed) {
    const newCount = existingSeed.letterCount + 1
    const newStage = getStageForCount(newCount)
    const prevStage = existingSeed.stage as Stage
    const isNewBloom =
      newStage === 'BLOOMED' && prevStage !== 'BLOOMED' && prevStage !== 'STRONG'

    // Merge tags (union, keep unique, cap at 8)
    const mergedTags = Array.from(
        new Set([...((existingSeed.tags ?? []) as string[]), ...emotion.tags])
    ).slice(0, 8)

    const updated = await prisma.seed.update({
      where: { id: existingSeed.id },
      data: {
        letterCount: newCount,
        stage: newStage,
        lastActivity: new Date(),
        tags: mergedTags,
        bloomedAt: isNewBloom ? new Date() : existingSeed.bloomedAt,
      },
    })

    await prisma.letter.update({
      where: { id: letterId },
      data: { seedId: updated.id },
    })

    return { seed: updated, isNewSeed: false, isNewBloom, prevStage }
  }

  // ─── Create new seed ─────────────────────────────────────────────────────
  const seed = await prisma.seed.create({
    data: {
      userId,
      theme: emotion.seedTheme,
      category: emotion.category,
      stage: 'SEED',
      letterCount: 1,
      lastActivity: new Date(),
      tags: emotion.tags,
    },
  })

  await prisma.letter.update({
    where: { id: letterId },
    data: { seedId: seed.id },
  })

  return { seed, isNewSeed: true, isNewBloom: false, prevStage: null }
}