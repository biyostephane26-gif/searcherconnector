import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
// Bundlées en dur (pas de fetch HTTP) pour fr/en — le Backend HTTP ci-dessous
// ne peut pas fonctionner pendant le pré-rendu statique de Next.js (build) ni
// le premier rendu serveur : pas de vrai serveur HTTP encore disponible pour
// fetch('/locales/...') à ce moment-là. Sans ce filet, t(key, {returnObjects:
// true}) renvoyait undefined pendant `next build`, et tout .map() dessus
// faisait planter le build en entier (Pricing/Support/Terms/Privacy/About/
// Landing sont touchées — vérifié en reproduisant le crash de build en
// local le 2026-09-22). fr/en restent la paire garantie disponible
// immédiatement ; les 31 autres langues continuent d'être chargées à la
// demande via le Backend HTTP une fois dans le vrai navigateur.
import frTranslation from '../../public/locales/fr/translation.json'
import enTranslation from '../../public/locales/en/translation.json'

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
    resources: {
      fr: { translation: frTranslation },
      en: { translation: enTranslation },
    },
    partialBundledLanguages: true,
  })
  .then(() => applyTextDirection(i18n.language))

i18n.on('languageChanged', applyTextDirection)

export default i18n
