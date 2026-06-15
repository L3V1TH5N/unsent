import { NextResponse } from 'next/server'
import { processPendingJobs } from '@/lib/queue'

// Trigger processing of pending analysis jobs.
// Production: protect this endpoint with `JOB_SECRET` env var and a scheduled call.
export async function GET(req: Request) {
  const secret = process.env.JOB_SECRET
  const header = req.headers.get('x-job-secret')

  if (secret && header !== secret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await processPendingJobs(5)
  return NextResponse.json({ processed: results.length, results })
}
