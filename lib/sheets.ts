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
  const rows: string[][] = []
  const lines = csv.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let inQuote = false
    let current = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; continue }
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { cols.push(current); current = ''; continue }
      current += ch
    }
    cols.push(current)
    rows.push(cols)
  }
  return rows.slice(1) // skip header row
}
