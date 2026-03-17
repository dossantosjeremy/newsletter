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

const TOPIC_KEYWORDS: Record<string, string> = {
  'ai agents': 'AI Agents', 'copilot': 'Copilot', 'llm': 'LLM',
  'generative ai': 'Generative AI', 'chatgpt': 'ChatGPT', 'claude': 'Claude',
  'prompt': 'Prompting', 'user research': 'User Research', 'usability': 'Usability',
  'accessibility': 'Accessibility', 'design system': 'Design Systems',
  'information architecture': 'IA', 'product strategy': 'Product Strategy',
  'roadmap': 'Roadmapping', 'metrics': 'Metrics', 'automation': 'Automation',
  'prototyping': 'Prototyping', 'figma': 'Figma', 'multimodal': 'Multimodal',
  'personaliz': 'Personalisation', 'workflow': 'Workflow',
}

function extractTopics(story: Story): string[] {
  const text = (story.title + ' ' + story.blurb).toLowerCase()
  const found = new Set<string>()
  for (const [kw, label] of Object.entries(TOPIC_KEYWORDS)) {
    if (text.includes(kw)) found.add(label)
  }
  return Array.from(found).slice(0, 3)
}

const TAG_CLASS: Record<string, string> = {
  'UX Research': 'tag-ux-research',
  'Product Design': 'tag-product-design',
  'Product Management': 'tag-product-management',
  'AI Tools': 'tag-ai-tools',
  'AI Tooling': 'tag-ai-tools',
  'AI-Assisted Development': 'tag-ai-tools',
  'Design Tools': 'tag-product-design',
  'Enterprise AI': 'tag-ai-tools',
}

const DISCIPLINES = ['All', 'Product Design', 'Design Tools', 'AI Tooling', 'AI-Assisted Development', 'Enterprise AI', 'UX Research', 'Product Management']

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
}: {
  story: Story
  bookmarks: Set<string>
  onBookmark: (url: string) => void
}) {
  const topics = extractTopics(story)
  const readTime = estimateReadTime(story.blurb)
  const isBookmarked = bookmarks.has(story.url)
  const tagClass = TAG_CLASS[story.tag] ?? 'tag-ai-tools'

  return (
    <div className="story-card-outer">
      <a
        href={story.url}
        target="_blank"
        rel="noopener noreferrer"
        className="story-card"
      >
        <div className="story-card-top">
          <span className={`story-tag ${tagClass}`}>{story.tag}</span>
          <span className="story-meta">
            <span className="story-source">{story.source}</span>
            <span className="story-dot">·</span>
            <span className="story-read-time">{readTime} min read</span>
          </span>
        </div>

        <h3 className="story-title">{story.title}</h3>
        <p className="story-blurb">{story.blurb}</p>

        {topics.length > 0 && (
          <div className="story-topics">
            {topics.map(t => (
              <span key={t} className="topic-pill">{t}</span>
            ))}
          </div>
        )}
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

function IssueBlock({
  issue,
  index,
  activeFilter,
  bookmarks,
  onBookmark,
}: {
  issue: Issue
  index: number
  activeFilter: string
  bookmarks: Set<string>
  onBookmark: (url: string) => void
}) {
  const visibleStories = activeFilter === 'All'
    ? issue.stories
    : issue.stories.filter(s => s.tag === activeFilter)

  if (visibleStories.length === 0) return null

  const allTags = Array.from(new Set(issue.stories.map(s => s.tag).filter(Boolean)))

  return (
    <article className="issue-block" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="issue-header">
        <time className="issue-date" dateTime={issue.date}>
          {formatDate(issue.date)}
        </time>
        <span className="issue-badge">{issue.stories.length} stories</span>
        <div className="issue-tags">
          {allTags.map(t => (
            <span
              key={t}
              className={`issue-tag-pill ${TAG_CLASS[t] ?? ''}`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <p className="issue-intro">{issue.synthesised_opener ?? issue.intro}</p>

      <div className="story-list">
        {visibleStories.map((story, i) => (
          <StoryCard
            key={`${issue.date}-${i}`}
            story={story}
            bookmarks={bookmarks}
            onBookmark={onBookmark}
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
  const { bookmarks, toggle, loaded } = useBookmarks()

  const filteredIssues = showBookmarksOnly
    ? issues.map(issue => ({
        ...issue,
        stories: issue.stories.filter(s => bookmarks.has(s.url))
      })).filter(issue => issue.stories.length > 0)
    : issues

  return (
    <>
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
              {showBookmarksOnly ? 'No saved articles yet' : 'No issues published yet — check back tomorrow'}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue, i) => (
            <IssueBlock
              key={issue.date}
              issue={issue}
              index={i}
              activeFilter={activeFilter}
              bookmarks={bookmarks}
              onBookmark={toggle}
            />
          ))
        )}
      </div>
    </>
  )
}
