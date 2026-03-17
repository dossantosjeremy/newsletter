import { NextRequest, NextResponse } from 'next/server'

// Forwards the subscription to the n8n workflow which handles
// validation and Google Sheets append via its own OAuth credentials.
// Required env var: N8N_SUBSCRIBE_WEBHOOK
// Value: https://jeremyds.app.n8n.cloud/webhook/subscribe

const WEBHOOK_URL = process.env.N8N_SUBSCRIBE_WEBHOOK!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string }
    const email = (body.email ?? '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    const n8nRes = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })

    const data = await n8nRes.json() as { success?: boolean; error?: string }

    if (!n8nRes.ok || !data.success) {
      return NextResponse.json(
        { error: data.error ?? 'Could not save your subscription — please try again' },
        { status: n8nRes.status || 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Subscribe route error:', err)
    return NextResponse.json(
      { error: 'Server error — please try again later' },
      { status: 500 }
    )
  }
}
