// FILE: src/app/api/profile/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getProfileStats } from '@/services/profile.service'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getProfileStats(session.user.id)
  return NextResponse.json({ profile })
}