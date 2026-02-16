import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get('eventId')
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: lineup } = await supabase
    .from('lineup')
    .select('candidate_id')
    .eq('live_event_id', eventId)

  const checkedInIds = (lineup || []).map((l) => l.candidate_id)

  return NextResponse.json({ checkedInIds })
}
