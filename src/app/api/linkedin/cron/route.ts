import { NextResponse } from 'next/server'
import { runLinkedInSync } from '@/lib/linkedin'

// Vercel Cron hits this on a schedule (see vercel.json). Vercel automatically
// sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set as an
// env var, which we verify here so the endpoint can't be triggered by anyone else.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization') || ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await runLinkedInSync()
  return NextResponse.json(result, { status: result.error ? 400 : 200 })
}
