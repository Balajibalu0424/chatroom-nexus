import { NextResponse } from 'next/server'

import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { Message, Room } from '@/lib/types'

export const runtime = 'nodejs'

interface ListRoomsBody {
  userId?: string
  username?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ListRoomsBody
    if (!body.userId || !UUID_RE.test(body.userId) || !body.username?.trim()) {
      return NextResponse.json({ error: 'Invalid room list request' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', body.userId)
      .eq('username', body.username.trim())
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unable to load rooms' }, { status: 403 })
    }

    const { data: memberships, error: membershipError } = await supabase
      .from('room_members')
      .select('room_id')
      .eq('user_id', body.userId)

    if (membershipError) {
      console.error('Room list membership error:', membershipError)
      return NextResponse.json({ error: 'Unable to load rooms' }, { status: 500 })
    }

    const roomIds = Array.from(new Set((memberships ?? []).map((membership: any) => membership.room_id).filter(Boolean)))
    if (roomIds.length === 0) {
      return NextResponse.json({ rooms: [] })
    }

    const [{ data: rooms, error: roomsError }, { data: latestMessages }, { data: memberRows }] = await Promise.all([
      supabase
        .from('rooms')
        .select('id, name, description, code, created_by, is_locked, created_at, last_message_at')
        .in('id', roomIds),
      supabase
        .from('messages')
        .select('id, room_id, user_id, content, type, file_url, file_name, reply_to, created_at, updated_at, is_deleted')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(Math.max(roomIds.length * 5, 50)),
      supabase
        .from('room_members')
        .select('room_id')
        .in('room_id', roomIds),
    ])

    if (roomsError) {
      console.error('Room list rooms error:', roomsError)
      return NextResponse.json({ error: 'Unable to load rooms' }, { status: 500 })
    }

    const latestByRoom = new Map<string, Message>()
    for (const message of latestMessages ?? []) {
      if (!latestByRoom.has((message as any).room_id)) {
        latestByRoom.set((message as any).room_id, message as Message)
      }
    }

    const memberCounts = new Map<string, number>()
    for (const row of memberRows ?? []) {
      const roomId = (row as any).room_id
      memberCounts.set(roomId, (memberCounts.get(roomId) ?? 0) + 1)
    }

    const loadedRooms = ((rooms ?? []) as Room[])
      .map((room) => ({
        ...room,
        last_message: latestByRoom.get(room.id),
        member_count: memberCounts.get(room.id) ?? 0,
      }))
      .sort((a, b) => {
        const aTime = a.last_message_at || a.last_message?.created_at || a.created_at
        const bTime = b.last_message_at || b.last_message?.created_at || b.created_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

    return NextResponse.json({ rooms: loadedRooms })
  } catch (error) {
    console.error('Room list route error:', error)
    return NextResponse.json({ error: 'Unable to load rooms' }, { status: 500 })
  }
}
