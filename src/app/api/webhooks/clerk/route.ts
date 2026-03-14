import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Clerk sends user.created / user.updated events.
// We upsert the user's display name + avatar into our profiles table.
// This route is intentionally NOT protected by Clerk auth — it's called
// by Clerk's servers and verified by the svix signature.

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CLERK_WEBHOOK_SECRET not set' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId        = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(secret)

  let event: any
  try {
    event = wh.verify(body, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const { id, first_name, last_name, image_url } = event.data
    const displayName = [first_name, last_name].filter(Boolean).join(' ') || null

    await supabase.from('profiles').upsert(
      {
        user_id:      id,
        display_name: displayName,
        avatar_url:   image_url ?? null,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  }

  return NextResponse.json({ received: true })
}
