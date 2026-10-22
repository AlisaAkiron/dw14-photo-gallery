import { useColorScheme, useLocalStorage } from '@mantine/hooks'
import { createContext, useContext, useEffect, useMemo } from 'react'

export type Theme = ActiveTheme | 'auto'
export type ActiveTheme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  activeTheme: ActiveTheme
  setTheme: (theme: Theme) => void
}>({
  theme: 'light',
  activeTheme: 'light',
  setTheme: () => {},
})

export const useThemeContext = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Both hooks read their real value synchronously on the first client render
  // (getInitialValueInEffect: false). This is hydration-safe because the theme
  // is never rendered into SSR markup — it only feeds an effect and context —
  // and it avoids a one-commit data-theme="light" flash on dark systems.
  const osTheme = useColorScheme('light', {
    getInitialValueInEffect: false,
  })

  const [theme, setThemeSettings] = useLocalStorage<Theme>({
    key: 'dw14-theme',
    defaultValue: 'auto',
    getInitialValueInEffect: false,
  })

  const activeTheme: ActiveTheme = useMemo(() => {
    if (theme === 'auto') {
      return osTheme
    }
    return theme
  }, [osTheme, theme])

  // The inline head script in routes/__root.tsx already applied both
  // attributes before first paint; this effect takes over from hydration
  // on (OS preference changes, cross-tab updates, ThemeSwitch).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme)
    document.documentElement.setAttribute('data-theme-mode', theme)
  }, [activeTheme, theme])

  const value = useMemo(
    () => ({
      theme: theme,
      activeTheme: activeTheme,
      setTheme: setThemeSettings,
    }),
    [theme, activeTheme, setThemeSettings],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
