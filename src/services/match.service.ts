import { prisma } from '@/lib/prisma'

const EMOTIONS = [
  'love', 'longing', 'regret', 'sadness',
  'anger', 'forgiveness', 'acceptance', 'healing', 'hope'
]

// Build an emotion vector for a user based on their letters
async function buildEmotionVector(userId: string): Promise<number[]> {
  const letters = await prisma.letter.findMany({
    where: { userId, emotion: { not: null } },
    select: { emotion: true, intensity: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const vector = new Array(EMOTIONS.length).fill(0)

  letters.forEach((letter, index) => {
    const emotionIndex = EMOTIONS.indexOf(letter.emotion || '')
    if (emotionIndex === -1) return
    // Weight recent letters more heavily
    const recencyWeight = Math.exp(-index * 0.1)
    vector[emotionIndex] += (letter.intensity || 0.5) * recencyWeight
  })

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) return vector
  return vector.map(v => v / magnitude)
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0)
  return Math.max(0, Math.min(1, dot))
}

export async function findMatches(userId: string) {
  const userVector = await buildEmotionVector(userId)

  // Check if user has any emotional data
  const hasData = userVector.some(v => v > 0)
  if (!hasData) return []

  // Get all other users who have written letters with emotions
  const otherUsers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      letters: {
        some: { emotion: { not: null } }
      }
    },
    select: { id: true, anonymousName: true },
    take: 100,
  })

  const similarities: {
    userId: string
    anonymousName: string | null
    similarity: number
  }[] = []

  for (const other of otherUsers) {
    const otherVector = await buildEmotionVector(other.id)
    const similarity = cosineSimilarity(userVector, otherVector)
    if (similarity > 0.3) {
      similarities.push({
        userId: other.id,
        anonymousName: other.anonymousName,
        similarity,
      })
    }
  }

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)
}

export async function getOrCreateMatch(
  requesterId: string,
  receiverId: string,
  similarity: number
) {
  const existing = await prisma.match.findFirst({
    where: {
      OR: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ]
    }
  })

  if (existing) return existing

  return prisma.match.create({
    data: {
      requesterId,
      receiverId,
      similarity,
      status: 'PENDING',
    }
  })
}