# The Interface — Frontend

Daily newsletter feed for **The Interface**: AI × UX · Product · Design.

Built with Next.js 14 (App Router) + Vercel + Google Sheets as the database.

---

## Architecture

```
n8n Workflow 2 → POST /api/newsletter → Google Sheets (newsletter_issues tab)
                                              ↓
                              Next.js page reads Sheets CSV on each visit
                              (cached 5 min via Next.js fetch revalidation)
```

---

## Setup

### 1. Google Sheet

Add a new tab called **`newsletter_issues`** to your existing sheet:
- Column A: `date` (e.g. `2025-01-30`)
- Column B: `json` (the full newsletter JSON as a string)

**Make the sheet public:** Share → Anyone with the link → Viewer

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SHEET_ID` | Your Sheet ID (already set to your sheet) |
| `SHEETS_API_KEY` | Google Cloud API key with Sheets API enabled |
| `WEBHOOK_SECRET` | Any random string (e.g. `openssl rand -hex 32`) |

### 3. Google Cloud API Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **Google Sheets API**
3. Credentials → Create API Key → restrict to Sheets API
4. Paste into `SHEETS_API_KEY`

### 4. Update n8n — POST to Frontend node

In your **Workflow 2/2 Process** in n8n, update the `POST to Frontend` node:
- URL: `https://your-vercel-domain.vercel.app/api/newsletter`
- Add header: `x-webhook-secret: <your WEBHOOK_SECRET value>`

### 5. Deploy to Vercel

```bash
npm install
npx vercel
```

Or connect your GitHub repo in the Vercel dashboard and add the env vars there.

---

## Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

To test with real data, add a row to your sheet manually:
- Column A: `2025-01-30`
- Column B: paste a newsletter JSON string

---

## Adding issues manually (testing)

You can POST directly to the API:

```bash
curl -X POST http://localhost:3000/api/newsletter \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your_secret" \
  -d '{"newsletter": "{\"date\":\"2025-01-30\",\"intro\":\"Test intro.\",\"stories\":[]}"}'
```
# newsletter
