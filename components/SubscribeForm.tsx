'use client'

import { useState } from 'react'

interface SubscribeFormProps {
  variant?: 'hero' | 'banner'
  onSuccess?: () => void
}

export function SubscribeForm({ variant = 'hero', onSuccess }: SubscribeFormProps) {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json() as { success?: boolean; error?: string }

      if (res.ok && data.success) {
        setStatus('success')
        try { localStorage.setItem('subscribed', '1') } catch {}
        onSuccess?.()
      } else {
        setErrorMsg(data.error ?? 'Something went wrong')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error — please try again')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className={`subscribe-success subscribe-success--${variant}`}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.1"/>
          <path d="M4 6.5l2 2 3-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        You&rsquo;re subscribed — see you tomorrow at 7am CET
      </div>
    )
  }

  return (
    <form
      className={`subscribe-form subscribe-form--${variant}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <input
        className="subscribe-input"
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
        required
        aria-label="Email address"
        disabled={status === 'loading'}
        autoComplete="email"
      />
      <button
        className="subscribe-btn"
        type="submit"
        disabled={status === 'loading'}
        aria-label="Subscribe to The Interface"
      >
        {status === 'loading' ? '…' : variant === 'banner' ? 'Subscribe' : 'Subscribe →'}
      </button>

      {status === 'error' && (
        <p className="subscribe-error" role="alert">{errorMsg}</p>
      )}
    </form>
  )
}
