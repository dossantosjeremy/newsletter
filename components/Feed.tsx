'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
  return 'AI'
}

const TAG_CLASS: Record<CanonicalTag, string> = {
  'UX Research':        'tag-ux-research',
  'Product Design':     'tag-product-design',
  'Product Management': 'tag-product-management',
  'AI':                 'tag-ai-tools',
}

const DISCIPLINES: string[] = ['All', ...CANONICAL_TAGS]

// ─── Keyword extraction (for related stories) ─────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','can','this','that',
  'these','those','it','its','how','what','when','where','why','who','which',
  'as','from','by','not','no','so','if','up','out','now','new','more','also',
  'just','their','they','them','we','our','you','your','he','she','his','her',
  'than','then','into','over','very','some','such','about','after','before',
  'between','through','during','without','within','against','across',
])

function extractKeywords(text: string): string[] {
  return Array.from(new Set(
    text.toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  ))
}

// ─── Topic threads ────────────────────────────────────────────────────────────

interface TopicThread { name: string; keywords: string[]; color: string }

const TOPIC_THREADS: TopicThread[] = [
  { name: 'Agentic AI',       keywords: ['agent', 'agentic', 'autonomous', 'multi-agent', 'marketplace'], color: 'tag-ai-tools' },
  { name: 'Vibe Coding',      keywords: ['vibe', 'code', 'coding', 'developer', 'ios', 'cursor', 'claude code', 'journalist'], color: 'tag-ai-tools' },
  { name: 'Design × AI',      keywords: ['figma', 'design tool', 'designer', 'handoff', 'interface', 'sycophancy'], color: 'tag-product-design' },
  { name: 'Enterprise AI',    keywords: ['enterprise', 'organization', 'adoption', 'governance', 'compliance', 'persona'], color: 'tag-ai-tools' },
  { name: 'UX Research',      keywords: ['user research', 'usability', 'interview', 'testing', 'insight'], color: 'tag-ux-research' },
  { name: 'Product Strategy', keywords: ['strategy', 'roadmap', 'metric', 'product manager', 'priorit'], color: 'tag-product-management' },
]

function assignThread(story: Story): string | null {
  const text = (story.title + ' ' + story.blurb).toLowerCase()
  let best: { name: string; score: number } | null = null
  for (const thread of TOPIC_THREADS) {
    const score = thread.keywords.filter(kw => text.includes(kw)).length
    if (score > 0 && (!best || score > best.score)) best = { name: thread.name, score }
  }
  return best?.name ?? null
}

// ─── Trending ─────────────────────────────────────────────────────────────────

interface TrendingItem { label: string; count: number; type: 'tag' | 'thread' }

function getTrending(issues: Issue[], days = 30): TrendingItem[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const counts: Record<string, { count: number; type: 'tag' | 'thread' }> = {}

  for (const issue of issues) {
    if (new Date(issue.date + 'T12:00:00Z') < cutoff) continue
    for (const story of issue.stories) {
      const thread = assignThread(story)
      if (thread) {
        counts[thread] = { count: (counts[thread]?.count ?? 0) + 1, type: 'thread' }
      } else {
        const tag = normalizeTag(story.tag)
        if (!counts[tag]) counts[tag] = { count: 0, type: 'tag' }
        counts[tag].count++
      }
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([label, { count, type }]) => ({ label, count, type }))
}

// ─── Related stories ──────────────────────────────────────────────────────────

export type StoryWithContext = Story & { issueDate: string }

function findRelated(story: Story, issueDate: string, allStories: StoryWithContext[]): StoryWithContext[] {
  const keywords = extractKeywords(story.title + ' ' + story.blurb)
  return allStories
    .filter(s => s.issueDate !== issueDate && s.url !== story.url)
    .map(s => {
      const other = extractKeywords(s.title + ' ' + s.blurb)
      const score = keywords.filter(k => other.includes(k)).length
      return { s, score }
    })
    .filter(({ score }) => score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ s }) => s)
}

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
      try { localStorage.setItem('the-interface-bookmarks', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  return { bookmarks, toggle, loaded }
}

// ─── Trending Bar ─────────────────────────────────────────────────────────────

function TrendingBar({
  trending, activeView, onSelectTag, onSelectThread, onSwitchView,
}: {
  trending: TrendingItem[]
  activeView: 'feed' | 'threads'
  onSelectTag: (tag: string) => void
  onSelectThread: (thread: string) => void
  onSwitchView: (view: 'feed' | 'threads') => void
}) {
  if (trending.length === 0) return null
  return (
    <div className="trending-bar">
      <span className="trending-label">Trending</span>
      <div className="trending-chips">
        {trending.map(item => (
          <button
            key={item.label}
            className="trending-chip"
            onClick={() => item.type === 'thread' ? onSelectThread(item.label) : onSelectTag(item.label)}
          >
            {item.label}
            <span className="trending-count">{item.count}</span>
          </button>
        ))}
      </div>
      <div className="view-toggle">
        <button className={`view-btn ${activeView === 'feed' ? 'active' : ''}`} onClick={() => onSwitchView('feed')}>Feed</button>
        <button className={`view-btn ${activeView === 'threads' ? 'active' : ''}`} onClick={() => onSwitchView('threads')}>Threads</button>
      </div>
    </div>
  )
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
  story, issueDate, bookmarks, onBookmark, searchQuery, allStories, showDate = false,
}: {
  story: Story
  issueDate: string
  bookmarks: Set<string>
  onBookmark: (url: string) => void
  searchQuery: string
  allStories: StoryWithContext[]
  showDate?: boolean
}) {
  const [showRelated, setShowRelated] = useState(false)
  const readTime = estimateReadTime(story.blurb)
  const isBookmarked = bookmarks.has(story.url)
  const canonicalTag = normalizeTag(story.tag)
  const tagClass = TAG_CLASS[canonicalTag]

  const related = useMemo(
    () => showRelated ? findRelated(story, issueDate, allStories) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showRelated, story.url, issueDate, allStories]
  )

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
      <a href={story.url} target="_blank" rel="noopener noreferrer" className="story-card">
        <div className="story-card-top">
          <span className={`story-tag ${tagClass}`}>{canonicalTag}</span>
          <span className="story-meta">
            {showDate && (
              <>
                <span className="story-source">{formatDate(issueDate)}</span>
                <span className="story-dot">·</span>
              </>
            )}
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
          className={`related-btn ${showRelated ? 'active' : ''}`}
          onClick={e => { e.preventDefault(); e.stopPropagation(); setShowRelated(o => !o) }}
          aria-expanded={showRelated}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <circle cx="2" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
            <circle cx="9" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
            <circle cx="5.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
            <path d="M2 3.5L5.5 7.5M9 3.5L5.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
          Related
        </button>
        <button
          className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={() => onBookmark(story.url)}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Save for later'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 2h8a1 1 0 0 1 1 1v9l-5-2.5L2 12V3a1 1 0 0 1 1-1z"
              stroke="currentColor" strokeWidth="1.2"
              fill={isBookmarked ? 'currentColor' : 'none'}
            />
          </svg>
          {isBookmarked ? 'Saved' : 'Save'}
        </button>
      </div>

      {showRelated && (
        <div className="related-panel">
          {related.length === 0 ? (
            <p className="related-empty">No related stories yet — more will surface as issues are published.</p>
          ) : (
            <div className="related-list">
              {related.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="related-story">
                  <div className="related-story-meta">
                    <span className={`story-tag ${TAG_CLASS[normalizeTag(s.tag)]}`}>{normalizeTag(s.tag)}</span>
                    <span className="related-story-source">{s.source}</span>
                    <span className="related-story-date">{formatDate(s.issueDate)}</span>
                  </div>
                  <p className="related-story-title">{s.title}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Issue Block ──────────────────────────────────────────────────────────────

function IssueBlock({
  issue, index, bookmarks, onBookmark, searchQuery, allStories,
}: {
  issue: Issue & { stories: Story[] }
  index: number
  bookmarks: Set<string>
  onBookmark: (url: string) => void
  searchQuery: string
  allStories: StoryWithContext[]
}) {
  const canonicalTags = Array.from(new Set(issue.stories.map(s => normalizeTag(s.tag))))
  return (
    <article className="issue-block" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="issue-header">
        <time className="issue-date" dateTime={issue.date}>{formatDate(issue.date)}</time>
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
            issueDate={issue.date}
            bookmarks={bookmarks}
            onBookmark={onBookmark}
            searchQuery={searchQuery}
            allStories={allStories}
          />
        ))}
      </div>
    </article>
  )
}

// ─── Threads View ─────────────────────────────────────────────────────────────

function ThreadsView({
  issues, bookmarks, onBookmark, searchQuery, allStories, activeThread,
}: {
  issues: Issue[]
  bookmarks: Set<string>
  onBookmark: (url: string) => void
  searchQuery: string
  allStories: StoryWithContext[]
  activeThread: string | null
}) {
  const threadMap = useMemo(() => {
    const map: Record<string, StoryWithContext[]> = {}
    for (const t of TOPIC_THREADS) map[t.name] = []
    for (const issue of issues) {
      for (const story of issue.stories) {
        const thread = assignThread(story)
        if (thread && map[thread]) map[thread].push({ ...story, issueDate: issue.date })
      }
    }
    // Sort each thread newest-first
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => b.issueDate.localeCompare(a.issueDate))
    }
    return map
  }, [issues])

  const q = searchQuery.toLowerCase().trim()

  const visibleThreads = TOPIC_THREADS.filter(t => {
    if (activeThread && t.name !== activeThread) return false
    const stories = q
      ? (threadMap[t.name] ?? []).filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.blurb.toLowerCase().includes(q) ||
          s.source.toLowerCase().includes(q)
        )
      : threadMap[t.name] ?? []
    return stories.length > 0
  })

  if (visibleThreads.length === 0) {
    return (
      <div className="state-wrapper">
        <p className="state-label">No stories match — try a different thread or search term</p>
      </div>
    )
  }

  return (
    <div className="issue-feed">
      {visibleThreads.map((threadDef, i) => {
        const stories = q
          ? (threadMap[threadDef.name] ?? []).filter(s =>
              s.title.toLowerCase().includes(q) ||
              s.blurb.toLowerCase().includes(q) ||
              s.source.toLowerCase().includes(q)
            )
          : threadMap[threadDef.name] ?? []

        return (
          <article key={threadDef.name} className="issue-block" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="issue-header">
              <span className={`story-tag ${threadDef.color}`}>{threadDef.name}</span>
              <span className="issue-badge">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>
            </div>
            <div className="story-list">
              {stories.map((story, j) => (
                <StoryCard
                  key={`${threadDef.name}-${j}`}
                  story={story}
                  issueDate={story.issueDate}
                  bookmarks={bookmarks}
                  onBookmark={onBookmark}
                  searchQuery={searchQuery}
                  allStories={allStories}
                  showDate
                />
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

export function Feed({ issues }: { issues: Issue[] }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeView, setActiveView] = useState<'feed' | 'threads'>('feed')
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const { bookmarks, toggle, loaded } = useBookmarks()

  const allStories = useMemo<StoryWithContext[]>(
    () => issues.flatMap(issue => issue.stories.map(s => ({ ...s, issueDate: issue.date }))),
    [issues]
  )

  const trending = useMemo(() => getTrending(issues, 30), [issues])

  const handleTrendingSelect = (item: TrendingItem) => {
    if (item.type === 'thread') {
      setActiveView('threads')
      setActiveThread(item.label)
    } else {
      setActiveView('feed')
      setActiveFilter(item.label)
    }
    setShowBookmarksOnly(false)
  }

  const handleViewSwitch = (view: 'feed' | 'threads') => {
    setActiveView(view)
    setActiveThread(null)
  }

  // Feed-mode filtering (tag + search + bookmarks applied before render)
  const filteredIssues = issues.map(issue => {
    let stories = issue.stories
    if (showBookmarksOnly) stories = stories.filter(s => bookmarks.has(s.url))
    if (activeFilter !== 'All') stories = stories.filter(s => normalizeTag(s.tag) === activeFilter)
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
      {/* Trending bar + Feed / Threads toggle */}
      <TrendingBar
        trending={trending}
        activeView={activeView}
        onSelectTag={tag => { setActiveView('feed'); setActiveFilter(tag); setShowBookmarksOnly(false) }}
        onSelectThread={thread => { setActiveView('threads'); setActiveThread(thread); setShowBookmarksOnly(false) }}
        onSwitchView={handleViewSwitch}
      />

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

      {/* Filter / thread pills */}
      <div className="filter-bar">
        <div className="filter-pills">
          {activeView === 'feed' ? (
            DISCIPLINES.map(d => (
              <button
                key={d}
                className={`filter-pill ${activeFilter === d && !showBookmarksOnly ? 'active' : ''}`}
                onClick={() => { setActiveFilter(d); setShowBookmarksOnly(false) }}
              >{d}</button>
            ))
          ) : (
            <>
              <button
                className={`filter-pill ${activeThread === null ? 'active' : ''}`}
                onClick={() => setActiveThread(null)}
              >All threads</button>
              {TOPIC_THREADS.map(t => (
                <button
                  key={t.name}
                  className={`filter-pill ${activeThread === t.name ? 'active' : ''}`}
                  onClick={() => setActiveThread(t.name)}
                >{t.name}</button>
              ))}
            </>
          )}
        </div>

        {loaded && bookmarks.size > 0 && activeView === 'feed' && (
          <button
            className={`bookmarks-toggle ${showBookmarksOnly ? 'active' : ''}`}
            onClick={() => setShowBookmarksOnly(o => !o)}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 2h8a1 1 0 0 1 1 1v9l-5-2.5L2 12V3a1 1 0 0 1 1-1z"
                stroke="currentColor" strokeWidth="1.2"
                fill={showBookmarksOnly ? 'currentColor' : 'none'}
              />
            </svg>
            Saved ({bookmarks.size})
          </button>
        )}
      </div>

      {/* Content */}
      {activeView === 'threads' ? (
        <ThreadsView
          issues={issues}
          bookmarks={bookmarks}
          onBookmark={toggle}
          searchQuery={searchQuery}
          allStories={allStories}
          activeThread={activeThread}
        />
      ) : (
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
                allStories={allStories}
              />
            ))
          )}
        </div>
      )}
    </>
  )
}
