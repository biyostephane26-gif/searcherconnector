'use client'
import { useEffect } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import { useTranslation } from 'react-i18next'

export default function Privacy() {
  const { t } = useTranslation()
  const docTitle = t('privacyPage.docTitle')
  useEffect(() => { document.title = docTitle }, [docTitle])
  const sections = t('privacyPage.sections', { returnObjects: true }) as { title: string; content: string }[]

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-gray-300">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('privacyPage.title')}</h1>
              <p className="text-sm text-gray-500">{t('privacyPage.lastUpdated')}</p>
            </div>

            {sections.map((section, i) => (
              <section key={i} className="space-y-3">
                <h2 className="text-xl font-bold text-white">{section.title}</h2>
                <p className="text-sm leading-relaxed">{section.content}</p>
              </section>
            ))}

            <div className="border-t border-[#1A1A1A] pt-6 text-xs text-gray-600">
              {t('privacyPage.copyright', { year: new Date().getFullYear() })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
