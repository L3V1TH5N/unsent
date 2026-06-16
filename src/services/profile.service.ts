// FILE: src/services/profile.service.ts
import { prisma } from '@/lib/prisma'
import { Stage } from '@/generated/prisma'

const GROWING_STAGES: Stage[] = [Stage.SEED, Stage.SPROUT, Stage.HEALING]
const HEALED_STAGES: Stage[] = [Stage.BLOOMED, Stage.STRONG]

export type ProfileStats = {
  anonymousName: string | null
  memberSince: Date
  lettersWritten: number
  seedsPlanted: number
  growingJourneys: number
  healedMemories: number
  topEmotions: { emotion: string; count: number }[]
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [user, seedCounts, lettersWritten, emotionGroups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { anonymousName: true, createdAt: true },
    }),
    prisma.seed.groupBy({
      by: ['stage'],
      where: { userId },
      _count: { stage: true },
    }),
    prisma.letter.count({ where: { userId } }),
    prisma.letter.groupBy({
      by: ['emotion'],
      where: { userId, emotion: { not: null } },
      _count: { emotion: true },
      orderBy: { _count: { emotion: 'desc' } },
      take: 3,
    }),
  ])

  let seedsPlanted = 0
  let growingJourneys = 0
  let healedMemories = 0

  for (const row of seedCounts) {
    const count = row._count.stage
    seedsPlanted += count
    if (GROWING_STAGES.includes(row.stage)) growingJourneys += count
    if (HEALED_STAGES.includes(row.stage)) healedMemories += count
  }

  return {
    anonymousName: user?.anonymousName ?? null,
    memberSince: user?.createdAt ?? new Date(),
    lettersWritten,
    seedsPlanted,
    growingJourneys,
    healedMemories,
    topEmotions: emotionGroups
      .filter((g): g is typeof g & { emotion: string } => g.emotion !== null)
      .map((g) => ({ emotion: g.emotion, count: g._count.emotion })),
  }
}