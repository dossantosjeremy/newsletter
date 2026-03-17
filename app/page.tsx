import { getIssues } from '@/lib/sheets'
import { Feed } from '@/components/Feed'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const issues = await getIssues()
  const totalStories = issues.reduce((sum, i) => sum + i.stories.length, 0)

  return (
    <>
      <header className="site-header">
        <div className="site-wrapper">
          <div className="header-inner">
            <div className="header-left">
              <span className="site-logo">The Interface</span>
              <span className="site-tagline">AI × UX · Product · Design</span>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">Daily digest · Free · No noise</p>
          <h1 className="hero-title">
            Stop checking 20 tabs.<br />
            Read one digest.
          </h1>
          <p className="hero-description">
            If you work in UX, Product, or Design and want to stay on top of how AI intersect with your practice —
            {' '}<strong>The Interface</strong> scans 50+ sources every morning and surfaces what actually matters - Just the signal, no noise.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-number">52</span>
              <span className="hero-stat-label">Sources monitored</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">5</span>
              <span className="hero-stat-label">Stories per day</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">{issues.length || '—'}</span>
              <span className="hero-stat-label">Issues published</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">7am</span>
              <span className="hero-stat-label">Delivered CET</span>
            </div>
          </div>
        </div>
      </section>

      <main className="site-wrapper">
        <Feed issues={issues} />
      </main>

      <footer className="site-footer">
        <div className="site-wrapper">
          <div className="footer-inner">
            <span className="footer-text">The Interface — Published daily at 07:00 CET</span>
            <span className="footer-text">AI × UX · Product · Design</span>
          </div>
        </div>
      </footer>
    </>
  )
}
