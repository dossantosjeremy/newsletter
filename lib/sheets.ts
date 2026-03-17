export interface Story {
  title: string
  blurb: string
  url: string
  source: string
  tag: string
  relevance_reason?: string
}

export interface Issue {
  date: string
  intro: string
  synthesised_opener?: string   // ← add this line
  stories: Story[]
}

const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID!
const SHEET_TAB = 'newsletter_issues'

export async function getIssues(): Promise<Issue[]> {
  try {
    // Uses Google Sheets public CSV export — no API key needed if sheet is public
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`
    const res = await fetch(url, { next: { revalidate: 300 } }) // revalidate every 5 min
    if (!res.ok) throw new Error(`Sheets fetch failed: ${res.status}`)
    const csv = await res.text()

    // Parse CSV — each row is: date, json_string
    const rows = parseCSV(csv)
    const issues: Issue[] = []

    for (const row of rows) {
      if (!row[1]) continue
      try {
        const issue = JSON.parse(row[1]) as Issue
        if (issue.date && issue.stories) issues.push(issue)
      } catch {
        // skip malformed rows
      }
    }

    // Newest first
    return issues.sort((a, b) => b.date.localeCompare(a.date))
  } catch (err) {
    console.error('Failed to fetch issues:', err)
    return []
  }
}

function parseCSV(csv: string): string[][] {
  // Character-by-character parser that correctly handles multi-line quoted fields.
  // Splitting by '\n' first (the old approach) broke JSON values that contained
  // newlines inside a quoted cell — this walks the whole string instead.
  const rows: string[][] = []
  let cols: string[] = []
  let current = ''
  let inQuote = false
  let i = 0

  while (i < csv.length) {
    const ch = csv[i]

    if (inQuote) {
      if (ch === '"') {
        // Escaped quote ("") → emit a literal "
        if (csv[i + 1] === '"') { current += '"'; i += 2; continue }
        // Closing quote
        inQuote = false; i++; continue
      }
      current += ch; i++; continue
    }

    // Outside a quoted field
    if (ch === '"') { inQuote = true; i++; continue }
    if (ch === ',') { cols.push(current); current = ''; i++; continue }
    if (ch === '\r') { i++; continue } // skip CR in CRLF
    if (ch === '\n') {
      cols.push(current)
      rows.push(cols)
      cols = []
      current = ''
      i++
      continue
    }
    current += ch; i++
  }

  // Flush the last row if the file doesn't end with a newline
  if (current || cols.length > 0) {
    cols.push(current)
    rows.push(cols)
  }

  return rows.slice(1) // skip header row
}
