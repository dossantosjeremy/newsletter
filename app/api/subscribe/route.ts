import { NextRequest, NextResponse } from 'next/server'

const SHEET_ID  = process.env.NEXT_PUBLIC_SHEET_ID!
const API_KEY   = process.env.SHEETS_API_KEY!
const SHEET_TAB = 'subscribers'

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

    const subscribedAt = new Date().toISOString()

    const appendUrl =
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/` +
      `${encodeURIComponent(SHEET_TAB)}:append?valueInputOption=RAW&key=${API_KEY}`

    const sheetsRes = await fetch(appendUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ values: [[email, subscribedAt, 'website']] }),
    })

    if (!sheetsRes.ok) {
      console.error('Sheets append error:', await sheetsRes.text())
      return NextResponse.json(
        { error: 'Could not save your subscription — please try again' },
        { status: 500 }
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
