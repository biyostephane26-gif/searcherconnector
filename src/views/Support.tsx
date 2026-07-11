'use client'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { Mail, MessageSquare, BookOpen, ChevronDown, ChevronUp, Send, Loader2, Check } from 'lucide-react'

const FAQ = [
  { q: 'Comment fonctionne le scan ?', a: 'SCAI lance une recherche multi-sources (Serper, APIs, plateformes pro) selon ton profil. Les résultats sont scorés de 0 à 100. En plan gratuit, 10 résultats sont visibles — les autres sont débloqués avec un plan Premium.' },
  { q: 'Combien de sources sont scannées ?', a: 'Le moteur interroge 15+ sources simultanément : Serper, Exa.ai, Tavily, Remotive, Arbeitnow, HackerNews, GitHub, Adzuna, ATS Greenhouse/Lever, Reddit, DuckDuckGo, Jooble et plus.' },
  { q: "Qu'est-ce que le statut Genius ?", a: "Le statut Genius est attribué aux profils d'exception. Il offre : badge doré sur le profil, priorité dans les résultats de recherche, accès anticipé aux nouvelles fonctionnalités." },
  { q: 'Comment connecter Gmail pour Cowork ?', a: "Dans Settings → Connexions, clique sur 'Connecter Gmail'. Tu seras redirigé vers la page d'autorisation Google." },
  { q: 'Mes données sont-elles en sécurité ?', a: 'Oui. Tes données sont hébergées sur Supabase (conforme RGPD), chiffrées en transit (HTTPS), et tes mots de passe ne sont jamais stockés en clair.' },
  { q: 'Comment supprimer mon compte ?', a: "Va dans Settings → Danger Zone → Supprimer le compte. La suppression est définitive sous 30 jours. Tu peux aussi envoyer une demande à biyostephane26@gmail.com." },
  { q: 'Puis-je utiliser Searcher depuis mon téléphone ?', a: "Searcher Connector est une Progressive Web App (PWA). Sur mobile, tu peux l'ajouter à ton écran d'accueil depuis Chrome ou Safari." },
  { q: "Comment fonctionne Cowork ?", a: "Cowork est ton inbox unifiée. Il regroupe tes emails Gmail et messages WhatsApp liés à tes candidatures. SCAI peut répondre automatiquement aux messages simples avec ta signature." },
]

export default function Support() {
  const { user, profile } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

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
      <main className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-4xl mx-auto w-full space-y-10">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Centre d'aide</h1>
            <p className="text-gray-500 text-sm">Tout ce que tu dois savoir sur Searcher Connector.</p>
          </div>

          {/* Liens rapides */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <Mail className="w-5 h-5" />, label: 'Email direct', sub: 'biyostephane26@gmail.com', href: 'mailto:biyostephane26@gmail.com' },
              { icon: <MessageSquare className="w-5 h-5" />, label: 'WhatsApp', sub: 'Réponse rapide', href: 'https://wa.me/237683655802' },
              { icon: <BookOpen className="w-5 h-5" />, label: 'Guide complet', sub: 'Guides et tutoriels', href: '/guide' },
            ].map((item, i) => (
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
            <h2 className="text-lg font-bold text-white">Questions fréquentes</h2>
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
            <h2 className="text-lg font-bold text-white">Envoyer un message</h2>
            {sent ? (
              <Card className="p-6 text-center">
                <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-white font-bold">Message reçu !</p>
                <p className="text-sm text-gray-500 mt-1">Réponse sous 24h à <strong className="text-[#D4AF37]">biyostephane26@gmail.com</strong></p>
                <button onClick={() => setSent(false)} className="text-xs text-gray-600 hover:text-[#D4AF37] mt-3 transition-colors">Envoyer un autre message</button>
              </Card>
            ) : (
              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Sujet</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Ex: Problème avec le scan, Question facturation..."
                    className="w-full bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-lg px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Décris ton problème ou ta question en détail..."
                    rows={5} className="w-full bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-lg px-4 py-3 text-white text-sm outline-none resize-none" />
                </div>
                <GoldButton onClick={handleSend} loading={sending} fullWidth>
                  <Send className="w-4 h-4 mr-2" /> Envoyer
                </GoldButton>
              </Card>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600 border-t border-[#1A1A1A] pt-6">
            <a href="/privacy" className="hover:text-[#D4AF37]">Confidentialité</a>
            <a href="/terms" className="hover:text-[#D4AF37]">CGU</a>
            <a href="mailto:biyostephane26@gmail.com" className="hover:text-[#D4AF37]">Contact</a>
            <span className="ml-auto">© 2025 Searcher Connector</span>
          </div>
        </div>
      </main>
    </div>
  )
}
