import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

// Liste complète des 100+ langues supportées
const supportedLngs = [
  'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs',
  'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da',
  'nl', 'eo', 'et', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de',
  'el', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is',
  'ig', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw',
  'ko', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg',
  'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'or',
  'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr',
  'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw',
  'sv', 'tg', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'ug', 'uz',
  'vi', 'cy', 'xh', 'yi', 'yo', 'zu', 'he', 'en'
]

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    supportedLngs,
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
  })

export default i18n
