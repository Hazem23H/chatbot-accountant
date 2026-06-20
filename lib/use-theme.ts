'use client'

import { useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark'

/** Dark-mode toggle that mirrors the design system: toggles `.dark` on the
 *  root element and persists to localStorage under `mahasib_theme`. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = (localStorage.getItem('mahasib_theme') as Theme | null) ?? 'light'
    setTheme(stored)
    document.documentElement.classList.toggle('dark', stored === 'dark')
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('mahasib_theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
