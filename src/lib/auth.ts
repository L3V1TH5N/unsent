import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

const adjectives = [
  'quiet', 'gentle', 'calm', 'soft', 'tender', 'still', 'misty', 'amber',
  'silver', 'golden', 'hollow', 'woven', 'faded', 'drifting', 'wandering',
  'lost', 'found', 'broken', 'healing', 'open', 'closed', 'patient', 'raw',
  'deep', 'light', 'pale', 'warm', 'cool', 'frozen', 'thawing',
]

const nouns = [
  'forest', 'river', 'ember', 'echo', 'tide', 'willow', 'petal', 'shore',
  'dawn', 'dusk', 'cloud', 'rain', 'stone', 'leaf', 'branch', 'moon',
  'star', 'field', 'valley', 'mountain', 'flame', 'shadow', 'wave', 'seed',
  'bloom', 'thread', 'mirror', 'lantern', 'window', 'garden',
]

function generateAnonymousName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 900) + 100 // 100–999
  return `${adj}-${noun}-${num}`
}

async function assignAnonymousName(userId: string, maxAttempts = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const name = generateAnonymousName()
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { anonymousName: name },
      })
      return // success
    } catch (err: unknown) {
      // P2002 = Prisma unique constraint violation — name collision, retry
      const isPrismaUniqueError =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      if (!isPrismaUniqueError) throw err
    }
  }
  // Fallback after all retries: timestamp-based name, effectively unique
  await prisma.user.update({
    where: { id: userId },
    data: { anonymousName: `wanderer-${Date.now()}` },
  })
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.anonymousName = user.anonymousName ?? null
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await assignAnonymousName(user.id)
      }
    },
  },
})