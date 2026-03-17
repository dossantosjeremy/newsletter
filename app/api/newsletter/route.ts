import { NextRequest, NextResponse } from 'next/server'

// This endpoint receives the daily newsletter POST from n8n
// It appends the issue to your Google Sheet via the Sheets API
// Requires: SHEETS_API_KEY and SHEET_ID env vars

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const newsletter = typeof body.newsletter === 'string'
      ? JSON.parse(body.newsletter)
      : body.newsletter

    if (!newsletter?.date || !newsletter?.stories) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID!
    const API_KEY = process.env.SHEETS_API_KEY!
    const SHEET_TAB = 'newsletter_issues'

    // Append row: [date, json_string]
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}:append?valueInputOption=RAW&key=${API_KEY}`

    const sheetsRes = await fetch(appendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [[newsletter.date, JSON.stringify(newsletter)]]
      })
    })

    if (!sheetsRes.ok) {
      const err = await sheetsRes.text()
      console.error('Sheets append error:', err)
      return NextResponse.json({ error: 'Failed to write to sheet' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, date: newsletter.date })
  } catch (err) {
    console.error('Newsletter API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
