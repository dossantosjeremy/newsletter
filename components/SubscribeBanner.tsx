'use client'

import { useState, useEffect } from 'react'
import { SubscribeForm } from './SubscribeForm'

export function SubscribeBanner() {
  const [visible,   setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already subscribed or previously dismissed
    try {
      if (
        localStorage.getItem('subscribed') ||
        localStorage.getItem('banner-dismissed')
      ) return
    } catch {}

    const onScroll = () => {
      if (window.scrollY > 420) setVisible(true)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem('banner-dismissed', '1') } catch {}
  }

  if (dismissed || !visible) return null

  return (
    <div className="subscribe-banner" role="complementary" aria-label="Subscribe to The Interface">
      <div className="subscribe-banner-inner site-wrapper">
        <div className="subscribe-banner-text">
          <span className="subscribe-banner-title">Get The Interface in your inbox</span>
          <span className="subscribe-banner-sub">5 curated stories · Every morning · Free</span>
        </div>
        <SubscribeForm variant="banner" onSuccess={dismiss} />
        <button
          className="subscribe-banner-close"
          onClick={dismiss}
          aria-label="Dismiss subscription banner"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
