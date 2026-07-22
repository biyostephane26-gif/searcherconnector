import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

// Liste des langues avec une vraie traduction de l'interface, écrite
// à la main pour chaque clé (pas du texte anglais recopié tel quel comme
// avant — vérifié caractère par caractère). SCAI (le chat IA) peut en
// plus discuter dans encore plus de langues nativement, indépendamment
// de ces fichiers d'interface — voir genererSystemPrompt dans scaiUtils.ts.
const supportedLngs = [
  'fr', 'en', 'pt', 'es', 'de', 'it', 'nl', 'ru', 'pl', 'uk',
  'ro', 'el', 'tr', 'sv', 'ar', 'he', 'fa', 'hi', 'bn', 'ur',
  'zh-CN', 'ja', 'ko', 'vi', 'id', 'th', 'tl', 'sw', 'ha', 'am',
  'yo', 'zu', 'ig',
]

const RTL_LANGS = ['ar', 'he', 'fa', 'ur']

function applyTextDirection(lng: string) {
  if (typeof document === 'undefined') return
  document.documentElement.dir = RTL_LANGS.includes(lng) ? 'rtl' : 'ltr'
}

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
  .then(() => applyTextDirection(i18n.language))

i18n.on('languageChanged', applyTextDirection)

export default i18n
