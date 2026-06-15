import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPendingJobs } from '@/lib/queue'

// Protected cron endpoint intended to be called by a scheduler (Vercel Cron, etc.)
// Requires header `x-job-secret: <JOB_SECRET>` when `JOB_SECRET` is set.
export async function GET(req: Request) {
  const secret = process.env.JOB_SECRET
  const header = req.headers.get('x-job-secret')

  if (secret && header !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const LOCK_KEY = 987654321
  let locked = false

  try {
    const res: any = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${LOCK_KEY}) as locked`
    if (Array.isArray(res)) {
      const row = res[0] as any
      const val = row?.locked ?? row?.pg_try_advisory_lock
      locked = !!val
    } else {
      const val = (res as any)?.locked ?? (res as any)?.pg_try_advisory_lock
      locked = !!val
    }
  } catch (err) {
    // If advisory locks are unavailable (non-Postgres), proceed without lock
    locked = true
  }

  if (!locked) {
    return NextResponse.json({ ok: false, message: 'Another worker is running' }, { status: 409 })
  }

  try {
    const results = await processPendingJobs(25)
    return NextResponse.json({ processed: results.length, results })
  } finally {
    try {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(${LOCK_KEY})`
    } catch (e) {
      // ignore unlock failure
    }
  }
}
