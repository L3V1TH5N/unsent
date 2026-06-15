import { prisma } from '@/lib/prisma'
import { Stage } from '../generated/prisma'
import type { EmotionResult } from './emotion.service'

const STAGE_THRESHOLDS = {
  SEED: 0,
  SPROUT: 3,
  HEALING: 7,
  BLOOMED: 12,
  STRONG: 20,
}

function getStageForCount(count: number): Stage {
  if (count >= STAGE_THRESHOLDS.STRONG) return Stage.STRONG
  if (count >= STAGE_THRESHOLDS.BLOOMED) return Stage.BLOOMED
  if (count >= STAGE_THRESHOLDS.HEALING) return Stage.HEALING
  if (count >= STAGE_THRESHOLDS.SPROUT) return Stage.SPROUT
  return Stage.SEED
}

export async function updateGardenForLetter(
  userId: string,
  letterId: string,
  emotion: EmotionResult
) {
  // Find existing seed with same theme or category
  const existingSeed = await prisma.seed.findFirst({
    where: {
      userId,
      theme: emotion.seedTheme,
    },
  })

  if (existingSeed) {
    const newCount = existingSeed.letterCount + 1
    const newStage = getStageForCount(newCount)
    const isNewBloom = newStage === Stage.BLOOMED && existingSeed.stage !== Stage.BLOOMED

    const updated = await prisma.seed.update({
      where: { id: existingSeed.id },
      data: {
        letterCount: newCount,
        stage: newStage,
        lastActivity: new Date(),
        bloomedAt: isNewBloom ? new Date() : existingSeed.bloomedAt,
      },
    })

    await prisma.letter.update({
      where: { id: letterId },
      data: { seedId: updated.id },
    })

    return updated
  } else {
    // Create new seed
    const seed = await prisma.seed.create({
      data: {
        userId,
        theme: emotion.seedTheme,
        stage: Stage.SEED,
        letterCount: 1,
        lastActivity: new Date(),
      },
    })

    await prisma.letter.update({
      where: { id: letterId },
      data: { seedId: seed.id },
    })

    return seed
  }
}