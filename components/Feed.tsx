'use client'

import { useState, useEffect, useRef } from 'react'
import type { Issue, Story } from '@/lib/sheets'

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(dateStr + 'T12:00:00Z')
      : new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return dateStr }
}

function estimateReadTime(blurb: string): number {
  return Math.max(1, Math.ceil(blurb.trim().split(/\s+/).length / 200))
}

// ─── Canonical tag system ─────────────────────────────────────────────────────
// All raw tags from the JSON are normalised to one of these four labels.
// Add new mappings here as new raw tags appear in the sheet.

const CANONICAL_TAGS = ['UX Research', 'Product Design', 'AI', 'Product Management'] as const
type CanonicalTag = typeof CANONICAL_TAGS[number]

function normalizeTag(raw: string): CanonicalTag {
  const t = (raw ?? '').toLowerCase()
  if (t.includes('ux') || t.includes('user research') || t.includes('usability')) return 'UX Research'
  if (t.includes('product management') || t.includes('product manager')) return 'Product Management'
  if (
    t.includes('ai') || t.includes('machine learning') || t.includes('llm') ||
    t.includes('enterprise') || t.includes('automation') || t.includes('agent')
  ) return 'AI'
  if (t.includes('design') || t.includes('figma') || t.includes('prototype')) return 'Product Design'
  return 'AI' // safe fallback
}

const TAG_CLASS: Record<CanonicalTag, string> = {
  'UX Research':       'tag-ux-research',
  'Product Design':    'tag-product-design',
  'Product Management':'tag-product-management',
  'AI':                'tag-ai-tools',
}

const DISCIPLINES: string[] = ['All', ...CANONICAL_TAGS]

// ─── Bookmark hook ────────────────────────────────────────────────────────────

function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('the-interface-bookmarks')
      if (saved) setBookmarks(new Set(JSON.parse(saved) as string[]))
    } catch {}
    setLoaded(true)
  }, [])

  const toggle = (url: string) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      next.has(url) ? next.delete(url) : next.add(url)
      try {
        localStorage.setItem('the-interface-bookmarks', JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }

  return { bookmarks, toggle, loaded }
}

// ─── Why Tooltip ─────────────────────────────────────────────────────────────

function WhyTooltip({ reason }: { reason?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  if (!reason) return null

  return (
    <div className="why-wrapper" ref={ref}>
      <button
        className="why-btn"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        aria-expanded={open}
        aria-label="Why this story?"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5.5" stroke="currentColor"/>
          <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeLinecap="round"/>
        </svg>
        Why this?
      </button>
      {open && (
        <div className="why-tooltip" role="tooltip">
          <div className="why-arrow" />
          <p>{reason}</p>
        </div>
      )}
    </div>
  )
}

// ─── Story Card ───────────────────────────────────────────────────────────────

function StoryCard({
  story,
  bookmarks,
  onBookmark,
  searchQuery,
}: {
  story: Story
  bookmarks: Set<string>
  onBookmark: (url: string) => void
  searchQuery: string
}) {
  const readTime = estimateReadTime(story.blurb)
  const isBookmarked = bookmarks.has(story.url)
  const canonicalTag = normalizeTag(story.tag)
  const tagClass = TAG_CLASS[canonicalTag]

  // Highlight matching text in title/blurb when searching
  function highlight(text: string): React.ReactNode {
    const q = searchQuery.trim()
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="search-highlight">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div className="story-card-outer">
      <a
        href={story.url}
        target="_blank"
        rel="noopener noreferrer"
        className="story-card"
      >
        <div className="story-card-top">
          <span className={`story-tag ${tagClass}`}>{canonicalTag}</span>
          <span className="story-meta">
            <span className="story-source">{story.source}</span>
            <span className="story-dot">·</span>
            <span className="story-read-time">{readTime} min read</span>
          </span>
        </div>

        <h3 className="story-title">{highlight(story.title)}</h3>
        <p className="story-blurb">{highlight(story.blurb)}</p>
      </a>

      <div className="story-card-actions">
        <WhyTooltip reason={(story as Story & { relevance_reason?: string }).relevance_reason} />
        <button
          className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={() => onBookmark(story.url)}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Save for later'}
          title={isBookmarked ? 'Saved' : 'Save for later'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 2h8a1 1 0 0 1 1 1v9l-5-2.5L2 12V3a1 1 0 0 1 1-1z"
              stroke="currentColor"
              strokeWidth="1.2"
              fill={isBookmarked ? 'currentColor' : 'none'}
            />
          </svg>
          {isBookmarked ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Issue Block ──────────────────────────────────────────────────────────────
// Receives stories already filtered by tag + search — just renders them.

function IssueBlock({
  issue,
  index,
  bookmarks,
  onBookmark,
  searchQuery,
}: {
  issue: Issue & { stories: Story[] }
  index: number
  bookmarks: Set<string>
  onBookmark: (url: string) => void
  searchQuery: string
}) {
  const canonicalTags = Array.from(new Set(issue.stories.map(s => normalizeTag(s.tag))))

  return (
    <article className="issue-block" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="issue-header">
        <time className="issue-date" dateTime={issue.date}>
          {formatDate(issue.date)}
        </time>
        <span className="issue-badge">{issue.stories.length} {issue.stories.length === 1 ? 'story' : 'stories'}</span>
        <div className="issue-tags">
          {canonicalTags.map(t => (
            <span key={t} className={`issue-tag-pill ${TAG_CLASS[t] ?? ''}`}>{t}</span>
          ))}
        </div>
      </div>

      <p className="issue-intro">{issue.synthesised_opener ?? issue.intro}</p>

      <div className="story-list">
        {issue.stories.map((story, i) => (
          <StoryCard
            key={`${issue.date}-${i}`}
            story={story}
            bookmarks={bookmarks}
            onBookmark={onBookmark}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </article>
  )
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

export function Feed({ issues }: { issues: Issue[] }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { bookmarks, toggle, loaded } = useBookmarks()

  // All filtering happens here — tag, search, and bookmarks — before passing down
  const filteredIssues = issues.map(issue => {
    let stories = issue.stories

    if (showBookmarksOnly) {
      stories = stories.filter(s => bookmarks.has(s.url))
    }

    if (activeFilter !== 'All') {
      stories = stories.filter(s => normalizeTag(s.tag) === activeFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      stories = stories.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q)
      )
    }

    return { ...issue, stories }
  }).filter(issue => issue.stories.length > 0)

  const isFiltered = activeFilter !== 'All' || showBookmarksOnly || searchQuery.trim() !== ''

  return (
    <>
      {/* Search */}
      <div className="search-wrapper">
        <div className="search-field">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            className="search-input"
            type="search"
            placeholder="Search stories, sources…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowBookmarksOnly(false) }}
            aria-label="Search stories"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-pills">
          {DISCIPLINES.map(d => (
            <button
              key={d}
              className={`filter-pill ${activeFilter === d && !showBookmarksOnly ? 'active' : ''}`}
              onClick={() => { setActiveFilter(d); setShowBookmarksOnly(false) }}
            >
              {d}
            </button>
          ))}
        </div>

        {loaded && bookmarks.size > 0 && (
          <button
            className={`bookmarks-toggle ${showBookmarksOnly ? 'active' : ''}`}
            onClick={() => setShowBookmarksOnly(o => !o)}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 2h8a1 1 0 0 1 1 1v9l-5-2.5L2 12V3a1 1 0 0 1 1-1z"
                stroke="currentColor"
                strokeWidth="1.2"
                fill={showBookmarksOnly ? 'currentColor' : 'none'}
              />
            </svg>
            Saved ({bookmarks.size})
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="issue-feed">
        {filteredIssues.length === 0 ? (
          <div className="state-wrapper">
            <p className="state-label">
              {isFiltered
                ? 'No stories match — try a different filter or search term'
                : 'No issues published yet — check back tomorrow'}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue, i) => (
            <IssueBlock
              key={issue.date}
              issue={issue}
              index={i}
              bookmarks={bookmarks}
              onBookmark={toggle}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </>
  )
}
