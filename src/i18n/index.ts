import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../types'
import en from './locales/en.json'
import zh from './locales/zh.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'
import ru from './locales/ru.json'

export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  en: 'English', zh: '中文', es: 'Español', fr: 'Français', ar: 'العربية', ru: 'Русский',
}

export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇬🇧', zh: '🇨🇳', es: '🇪🇸', fr: '🇫🇷', ar: '🇸🇦', ru: '🇷🇺',
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en }, zh: { translation: zh }, es: { translation: es },
    fr: { translation: fr }, ar: { translation: ar }, ru: { translation: ru },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function applyDir(lang: Language): void {
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}

export function setLanguage(lang: Language): void {
  i18n.changeLanguage(lang)
  applyDir(lang)
}

export default i18n
