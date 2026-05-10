import { NextResponse } from 'next/server'

import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

interface MembersBody {
  userId?: string
  username?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!UUID_RE.test(params.id)) {
      return NextResponse.json({ error: 'Invalid room request' }, { status: 400 })
    }

    let body: MembersBody
    try {
      body = (await request.json()) as MembersBody
    } catch {
      return NextResponse.json({ error: 'Invalid room request' }, { status: 400 })
    }

    if (!body.userId || !UUID_RE.test(body.userId) || !body.username?.trim()) {
      return NextResponse.json({ error: 'Invalid room request' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const [{ data: user }, { data: requesterMember }] = await Promise.all([
      supabase
        .from('users')
        .select('id, username')
        .eq('id', body.userId)
        .eq('username', body.username.trim())
        .maybeSingle(),
      supabase
        .from('room_members')
        .select('id')
        .eq('room_id', params.id)
        .eq('user_id', body.userId)
        .maybeSingle(),
    ])

    if (!user || !requesterMember) {
      return NextResponse.json({ error: 'Unable to load room members' }, { status: 403 })
    }

    const [{ data: members, error: membersError }, { data: adminData }, { data: bans }] = await Promise.all([
      supabase
        .from('room_members')
        .select('id, room_id, user_id, joined_at, user:users(id, username, avatar_color, last_seen)')
        .eq('room_id', params.id),
      supabase
        .from('room_admins')
        .select('id')
        .eq('room_id', params.id)
        .eq('user_id', body.userId)
        .maybeSingle(),
      supabase
        .from('room_bans')
        .select('user_id')
        .eq('room_id', params.id),
    ])

    if (membersError) {
      console.error('Room members route error:', membersError)
      return NextResponse.json({ error: 'Unable to load room members' }, { status: 500 })
    }

    return NextResponse.json({
      members: members ?? [],
      isAdmin: Boolean(adminData),
      bannedUsers: (bans ?? []).map((ban: any) => ban.user_id),
    })
  } catch (error) {
    console.error('Room members route failure:', error)
    return NextResponse.json({ error: 'Unable to load room members' }, { status: 500 })
  }
}
