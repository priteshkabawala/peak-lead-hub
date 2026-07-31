'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import Icon from './Icon'

type Theme = 'dark' | 'light'
const KEY = 'peak.elite-guide.theme'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Dark is the deliberate default — the experience is designed dark-first.
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY) as Theme | null
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved)
        return
      }
      if (window.matchMedia('(prefers-color-scheme: light)').matches) setTheme('light')
    } catch {
      /* storage unavailable — keep the default */
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="pk-chip"
      style={{ padding: '7px 9px' }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
    </button>
  )
}
