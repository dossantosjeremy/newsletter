'use client'

import { useState, useEffect } from 'react'

type Theme = 'cream' | 'dark' | 'apple'

const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'cream', label: 'Cream', icon: '☕' },
  { id: 'dark',  label: 'Dark',  icon: '🌙' },
  { id: 'apple', label: 'Apple', icon: '◻' },
]

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('cream')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('the-interface-theme') as Theme
      if (saved && ['cream', 'dark', 'apple'].includes(saved)) {
        setTheme(saved)
        document.documentElement.setAttribute('data-theme', saved)
      }
    } catch {}
  }, [])

  const apply = (t: Theme) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    try { localStorage.setItem('the-interface-theme', t) } catch {}
  }

  return (
    <div className="theme-switcher" role="group" aria-label="Choose theme">
      {THEMES.map(t => (
        <button
          key={t.id}
          className={`theme-btn ${theme === t.id ? 'active' : ''}`}
          onClick={() => apply(t.id)}
          title={t.label}
          aria-pressed={theme === t.id}
        >
          {t.icon}
        </button>
      ))}
    </div>
  )
}
