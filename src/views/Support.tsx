'use client'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { Mail, MessageSquare, BookOpen, ChevronDown, ChevronUp, Send, Loader2, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Support() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const FAQ = t('supportPage.faq', { returnObjects: true }) as { q: string; a: string }[]
  const QUICK_LINKS = (t('supportPage.quickLinks', { returnObjects: true }) as { label: string; sub: string }[]).map((item, i) => ({
    ...item,
    icon: [<Mail className="w-5 h-5" key="m" />, <MessageSquare className="w-5 h-5" key="w" />, <BookOpen className="w-5 h-5" key="b" />][i],
    href: ['mailto:biyostephane26@gmail.com', 'https://wa.me/237683655802', '/guide'][i],
  }))

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return
    setSending(true)
    try {
      await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 'anonymous', email: profile?.email || user?.email || '', subject, message }),
      })
      setSent(true)
      setSubject(''); setMessage('')
    } catch { setSent(true) }
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-4xl mx-auto w-full space-y-10">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{t('supportPage.title')}</h1>
            <p className="text-gray-500 text-sm">{t('supportPage.subtitle')}</p>
          </div>

          {/* Liens rapides */}
          <div className="grid grid-cols-3 gap-4">
            {QUICK_LINKS.map((item, i) => (
              <a key={i} href={item.href} target={item.href.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer">
                <Card className="p-4 hover:border-[#D4AF37]/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 text-[#D4AF37] mb-2">{item.icon}</div>
                  <div className="font-bold text-white text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>
                </Card>
              </a>
            ))}
          </div>

          {/* FAQ */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">{t('supportPage.faqTitle')}</h2>
            {FAQ.map((item, i) => (
              <Card key={i} className="overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#111] transition-colors">
                  <span className="text-sm font-medium text-white">{item.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#D4AF37]" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-gray-400 leading-relaxed border-t border-[#1A1A1A] pt-3">{item.a}</div>
                )}
              </Card>
            ))}
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">{t('supportPage.sendMessageTitle')}</h2>
            {sent ? (
              <Card className="p-6 text-center">
                <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-white font-bold">{t('supportPage.messageReceived')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('supportPage.responseWithin24h')} <strong className="text-[#D4AF37]">biyostephane26@gmail.com</strong></p>
                <button onClick={() => setSent(false)} className="text-xs text-gray-600 hover:text-[#D4AF37] mt-3 transition-colors">{t('supportPage.sendAnother')}</button>
              </Card>
            ) : (
              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('supportPage.subject')}</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder={t('supportPage.subjectPlaceholder')}
                    className="w-full bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-lg px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('supportPage.message')}</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder={t('supportPage.messagePlaceholder')}
                    rows={5} className="w-full bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-lg px-4 py-3 text-white text-sm outline-none resize-none" />
                </div>
                <GoldButton onClick={handleSend} loading={sending} fullWidth>
                  <Send className="w-4 h-4 mr-2" /> {t('supportPage.send')}
                </GoldButton>
              </Card>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600 border-t border-[#1A1A1A] pt-6">
            <a href="/privacy" className="hover:text-[#D4AF37]">{t('supportPage.privacy')}</a>
            <a href="/terms" className="hover:text-[#D4AF37]">{t('supportPage.terms')}</a>
            <a href="mailto:biyostephane26@gmail.com" className="hover:text-[#D4AF37]">{t('supportPage.contact')}</a>
            <span className="ml-auto">{t('supportPage.copyright', { year: 2025 })}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
