import { NextResponse } from 'next/server'
import { notifyCallersOfNewLead } from '@/lib/notify-lead'

// Notify all active callers that a new lead/prospect has landed.
export async function POST(req: Request) {
  const { leadName, leadId } = await req.json().catch(() => ({}))
  try {
    const result = await notifyCallersOfNewLead(leadName, leadId)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
