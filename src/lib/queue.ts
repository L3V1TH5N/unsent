import { prisma } from '@/lib/prisma'
import { analyzeLetter } from '@/services/emotion.service'
import { updateGardenForLetter } from '@/services/garden.service'

const MAX_ATTEMPTS = 3

export async function enqueueAnalysis(letterId: string) {
  await prisma.analysisJob.create({ data: { letterId } })
}

export async function processNextJob() {
  const job = await prisma.analysisJob.findFirst({
    where: {
      status: 'PENDING',
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
    },
    orderBy: { createdAt: 'asc' },
  })
  if (!job) return null

  const processing = await prisma.analysisJob.update({
    where: { id: job.id },
    data: { status: 'PROCESSING', attempts: { increment: 1 }, startedAt: new Date() },
  })

  const letter = await prisma.letter.findUnique({
    where: { id: processing.letterId },
    select: { id: true, content: true, userId: true },
  })

  if (!letter) {
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', lastError: 'Letter not found', finishedAt: new Date() },
    })
    return { jobId: job.id, result: 'failed' }
  }

  try {
    const emotion = await analyzeLetter(letter.content)

    await prisma.letter.update({
      where: { id: letter.id },
      data: {
        emotion: emotion.emotion,
        intensity: emotion.intensity,
        category: emotion.category,
        status: 'ANALYZED',
      },
    })

    await updateGardenForLetter(letter.userId, letter.id, emotion)

    await prisma.analysisJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', finishedAt: new Date() },
    })

    return { jobId: job.id, result: 'completed' }
  } catch (err) {
    const attempts = processing.attempts

    if (attempts >= MAX_ATTEMPTS) {
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', lastError: String(err), finishedAt: new Date() },
      })
      // mark letter as failed so frontend can surface it
      await prisma.letter.update({ where: { id: letter.id }, data: { status: 'FAILED' } })
      return { jobId: job.id, result: 'failed' }
    }

    // reschedule with exponential backoff (minutes)
    const backoffMinutes = Math.pow(2, attempts)
    const scheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000)

    await prisma.analysisJob.update({
      where: { id: job.id },
      data: { status: 'PENDING', scheduledAt, lastError: String(err) },
    })

    return { jobId: job.id, result: 'retry_scheduled', scheduledAt }
  }
}

export async function processPendingJobs(limit = 5) {
  const results = []
  for (let i = 0; i < limit; i++) {
    const res = await processNextJob()
    if (!res) break
    results.push(res)
  }
  return results
}
