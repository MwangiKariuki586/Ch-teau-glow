"use client"

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

/**
 * Hook to sync user's dark mode preference with next-themes
 */
export function useThemeSync(darkMode: boolean | undefined) {
  const { setTheme } = useTheme()

  useEffect(() => {
    if (darkMode !== undefined) {
      setTheme(darkMode ? 'dark' : 'light')
    }
  }, [darkMode, setTheme])
}