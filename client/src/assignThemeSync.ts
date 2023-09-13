
import type { Theme } from "@aelea/ui-components-theme"
import { dark, light } from "./common/theme.js"

const THEME_PALLETE_SELECTED_KEY = `!!THEME_PALLETE_SELECTED_KEY`
const themeFromStorage = localStorage.getItem(THEME_PALLETE_SELECTED_KEY)
const themeList = [dark, light]

function setTheme<T extends Theme>(theme: T) {
  localStorage.setItem(THEME_PALLETE_SELECTED_KEY, JSON.stringify(theme))
  return theme
}
const darkModePreferance = self?.matchMedia('(prefers-color-scheme: dark)').matches
const defaultTheme = dark // darkModePreferance ? light : dark

let theme = defaultTheme

if (themeFromStorage === null) {
  setTheme(defaultTheme)
} else {
  const currentTheme = themeList.find(t => JSON.stringify(t) === themeFromStorage)

  if (currentTheme) {
    theme = setTheme(currentTheme)
  } else {
    console.warn('unable to set theme, stored version seems different. reassigning local version')

    try {
      const parsedStorageThemeName: string = JSON.parse(themeFromStorage).name
      const matchedTheme = themeList.find(t => t.name === parsedStorageThemeName)
      theme = setTheme(matchedTheme!)
    } catch (err) {
      console.error(err)
      theme = setTheme(defaultTheme)
    }
  }
  
}

export { theme }

// document.body.style.backgroundColor = theme.pallete.background

