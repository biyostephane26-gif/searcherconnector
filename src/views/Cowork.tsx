'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { Mail, MessageSquare, Send, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink, Loader2, Inbox, RefreshCw, Lock, Users, Sparkles, Award, TrendingUp, BriefcaseIcon } from 'lucide-react'
import { generateEmailDraft } from '../lib/gemini'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sent:              { label: 'Envoyé',          color: 'text-gray-400' },
  waiting_reply:     { label: 'En attente',      color: 'text-yellow-400' },
  replied:           { label: 'Répondu',         color: 'text-blue-400' },
  positive_response: { label: 'Réponse positive',color: 'text-green-400' },
  rejected:          { label: 'Refus',           color: 'text-red-400' },
}

export default function Cowork() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [inbox, setInbox] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMsg, setSelectedMsg] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [draftingReply, setDraftingReply] = useState(false)
  const [tab, setTab] = useState<'all' | 'email' | 'whatsapp'>('all')
  const [copied, setCopied] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  
  // Matching suggestions
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [viewMode, setViewMode] = useState<'inbox' | 'matches'>('inbox')
  
  // Paywall pour free users (le fondateur n'a aucune restriction)
  const isFree = profile?.role !== 'founder' && (!profile?.plan || profile.plan === 'free')
  const [showPaywall, setShowPaywall] = useState(false)

  const loadInbox = async () => {
    if (!user) return
    setLoading(true)
    try {
      const r = await fetch(`/api/cowork/inbox?userId=${user.id}`)
      if (r.ok) setInbox(await r.json())
    } catch (_) {}
    setLoading(false)
  }

  const loadSuggestions = async () => {
    if (!user || !profile) return
    setLoadingSuggestions(true)
    try {
      const r = await fetch(`/api/cowork/matches?userId=${user.id}`)
      if (r.ok) {
        const data = await r.json()
        setSuggestions(data.matches || [])
      }
    } catch (_) {}
    setLoadingSuggestions(false)
  }

  useEffect(() => {
    loadInbox()
    if (profile) loadSuggestions()
  }, [user, profile])

  // Afficher le paywall seulement une fois le profil chargé et confirmé free
  // (avant, il s'affichait pendant le chargement car profile était null →
  // même le fondateur et les payants voyaient l'écran Premium par erreur)
  useEffect(() => {
    if (profile) setShowPaywall(isFree)
  }, [profile, isFree])

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMsg || !user) return
    setSending(true)
    try {
      const res = await fetch('/api/cowork/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:         user.id,
          channel:        selectedMsg.type,
          to:             selectedMsg.from,
          subject:        `Re: ${selectedMsg.subject || 'Candidature'}`,
          message:        replyText,
          opportunity_id: selectedMsg.opportunity_id,
        }),
      })
      const data = await res.json()
      // Si WhatsApp lien → ouvrir dans nouvel onglet
      if (data.wa_link) window.open(data.wa_link, '_blank')
      setReplyText('')
      await loadInbox()
    } catch (_) {}
    setSending(false)
  }

  const handleDraftReply = async () => {
    if (!selectedMsg || draftingReply) return
    setDraftingReply(true)
    try {
      const draft = await generateEmailDraft(
        selectedMsg.preview || selectedMsg.subject || '',
        profile?.response_template || '',
        profile?.full_name || ''
      )
      if (draft) setReplyText(draft)
    } catch (_) {}
    setDraftingReply(false)
  }

  // Envoyer via WhatsApp normal (lien wa.me)
  const handleWhatsAppLink = async (phone: string) => {
    if (!replyText.trim() || !user) return
    setSending(true)
    try {
      const res = await fetch('/api/cowork/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:         user.id,
          channel:        'whatsapp_link',
          to:             phone,
          subject:        selectedMsg?.subject || 'Message Searcher',
          message:        replyText,
          opportunity_id: selectedMsg?.opportunity_id,
        }),
      })
      const data = await res.json()
      if (data.wa_link) window.open(data.wa_link, '_blank')
      setReplyText('')
    } catch (_) {}
    setSending(false)
  }

  const allMessages: any[] = inbox ? [
    ...inbox.all_messages,
  ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []

  const filtered = tab === 'all' ? allMessages : allMessages.filter((m: any) => m.type === tab)

  const sendCollabProposal = async (targetUserId: string, targetName: string) => {
    if (!user || !profile) return
    const message = `Bonjour ${targetName},\n\nJe suis ${profile.full_name}, et j'ai remarqué que nous partageons des compétences complémentaires sur Searcher Connector.\n\nJe serais intéressé(e) à échanger sur d'éventuelles collaborations ou projets communs.\n\nÀ bientôt!\n${profile.full_name}`
    
    try {
      await fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          type: 'collab_proposal',
          title: '🤝 Proposition de collaboration',
          message: `${profile.full_name} souhaite collaborer avec toi!`,
          actionUrl: `/profile/${user.id}`,
          actionLabel: 'Voir le profil',
          metadata: { proposerId: user.id, message }
        })
      })
      alert('✅ Proposition envoyée!')
    } catch {
      alert('Erreur lors de l\'envoi')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar />
        
        {/* Paywall Modal pour free users */}
        {showPaywall && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-8 max-w-md w-full space-y-6">
              <div className="text-center">
                <Lock className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Cowork Inbox</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Fonctionnalité Premium qui centralise tous tes emails et messages liés à tes candidatures avec réponses automatiques SCAI.
                </p>
              </div>
              
              <div className="bg-[#1A1500] border border-[#D4AF37]/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-[#D4AF37] mb-3">Inclus dans le plan Premium:</h3>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li>✓ Inbox unifiée Gmail + WhatsApp</li>
                  <li>✓ Réponses automatiques SCAI</li>
                  <li>✓ Suivi des candidatures centralisé</li>
                  <li>✓ Templates de réponse intelligents</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 py-3 text-sm text-gray-400 border border-[#2A2A2A] rounded-xl hover:border-[#444]"
                >
                  Retour
                </button>
                <GoldButton
                  onClick={() => router.push('/pricing')}
                  className="flex-1"
                >
                  Upgrade
                </GoldButton>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex overflow-hidden">

          {/* Toggle View Mode */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 flex gap-2 bg-[#111] border border-[#2A2A2A] rounded-xl p-1">
            <button
              onClick={() => setViewMode('inbox')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'inbox' 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4 inline mr-1" />
              Inbox
            </button>
            <button
              onClick={() => setViewMode('matches')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'matches' 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1" />
              Matches ({suggestions.length})
            </button>
          </div>

          {/* Vue Inbox (existant) */}
          {viewMode === 'inbox' && (
            <>
          {/* ── Liste des messages ────────────────────────────── */}
          <div className="w-full lg:w-[40%] border-r border-[#1A1A1A] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-[#D4AF37]" /> Cowork Inbox
                </h2>
                {inbox && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {inbox.unreplied_count > 0 && <span className="text-red-400 font-bold">{inbox.unreplied_count} sans réponse · </span>}
                    {inbox.total_messages} messages
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={user ? `/api/oauth/gmail/connect?userId=${user.id}` : '#'}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] rounded-lg text-[11px] font-bold text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-colors"
                >
                  <Mail className="w-3 h-3" /> Connecter Gmail
                </a>
                <button onClick={loadInbox} className="p-2 text-gray-600 hover:text-[#D4AF37] transition-colors">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filtres */}
            <div className="flex gap-0 border-b border-[#1A1A1A]">
              {(['all','email','whatsapp'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${tab === t ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-gray-600 hover:text-gray-400'}`}>
                  {t === 'all' ? 'Tous' : t === 'email' ? '📧 Email' : '💬 WhatsApp'}
                </button>
              ))}
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-600 px-6">
                  <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold text-gray-500 mb-1">Cowork est vide pour l'instant</p>
                  <p className="text-xs leading-relaxed">
                    Les messages apparaissent ici dès que SCAI envoie des candidatures en ton nom.<br/>
                    Lance un scan depuis le <a href="/agent" className="text-[#D4AF37] hover:underline">dashboard SCAI</a> pour commencer.
                  </p>
                  <div className="mt-4 space-y-2 text-left bg-[#111] border border-[#1A1A1A] rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Comment ça marche :</p>
                    {[
                      '1. Tu lances un scan → SCAI trouve des opportunités',
                      '2. SCAI rédige la candidature (avec ta signature) — tu l\'envoies',
                      '3. Les réponses arrivent ici dans Cowork',
                      '4. Tu peux répondre par Email ou WhatsApp depuis ici',
                    ].map((s, i) => (
                      <p key={i} className="text-xs text-gray-600">{s}</p>
                    ))}
                  </div>
                </div>
              ) : (
                filtered.map((msg: any) => {
                  const st = STATUS_LABELS[msg.status] || STATUS_LABELS['sent']
                  return (
                    <div key={msg.id} onClick={() => setSelectedMsg(msg)}
                      className={`p-4 border-b border-[#1A1A1A] cursor-pointer hover:bg-[#111] transition-colors ${selectedMsg?.id === msg.id ? 'bg-[#111] border-l-2 border-l-[#D4AF37]' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {msg.type === 'email' ? <Mail className="w-3 h-3 text-blue-400 flex-shrink-0" /> : <MessageSquare className="w-3 h-3 text-green-400 flex-shrink-0" />}
                            <span className="text-sm font-medium text-white truncate">{msg.from || msg.company || 'Contact'}</span>
                          </div>
                          {msg.opportunity && (
                            <p className="text-[10px] text-[#D4AF37] truncate mb-0.5">
                              → {msg.opportunity.title?.slice(0, 40)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 truncate">{msg.preview?.slice(0, 70)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-[10px] font-bold ${st.color}`}>{st.label}</span>
                          <span className="text-[10px] text-gray-700">
                            {new Date(msg.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                          </span>
                          {msg.direction === 'incoming' && !msg.searcher_replied && (
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Détail du message ─────────────────────────────── */}
          <div className="hidden lg:flex flex-1 flex-col">
            {!selectedMsg ? (
              <div className="flex items-center justify-center h-full text-gray-700">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Sélectionne un message</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Header message */}
                <div className="p-5 border-b border-[#1A1A1A]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold">{selectedMsg.subject || 'Message'}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">De : {selectedMsg.from}</p>
                      {selectedMsg.opportunity && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-gray-600">Opportunité :</span>
                          <span className="text-[10px] text-[#D4AF37] font-bold">{selectedMsg.opportunity.title?.slice(0, 50)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedMsg.opportunity?.original_url && (
                        <a href={selectedMsg.opportunity.original_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#D4AF37] hover:text-white flex items-center gap-1 transition-colors">
                          Voir l'offre <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Corps du message */}
                <div className="flex-1 overflow-y-auto p-5">
                  <Card className="p-4 mb-4">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedMsg.preview || 'Contenu du message non disponible.'}
                    </p>
                  </Card>

                  {/* Statut + actions */}
                  <div className="flex items-center gap-3 mb-4">
                    {selectedMsg.requires_human && (
                      <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        SCAI recommande une réponse manuelle
                      </div>
                    )}
                    {selectedMsg.searcher_replied && (
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" /> SCAI a déjà répondu
                      </div>
                    )}
                  </div>
                </div>

                {/* Zone de réponse */}
                <div className="p-5 border-t border-[#1A1A1A]">
                  <div className="flex gap-2 mb-3">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Écrire une réponse... (SCAI peut le faire automatiquement)"
                      rows={3}
                      className="flex-1 bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleDraftReply}
                    disabled={draftingReply}
                    className="flex items-center gap-1.5 mb-3 px-4 py-2 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl text-xs font-bold hover:bg-[#D4AF37]/10 disabled:opacity-50 transition-colors"
                  >
                    {draftingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {draftingReply ? 'SCAI rédige...' : 'Rédiger avec SCAI'}
                  </button>

                  {/* 3 boutons d'envoi */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Gmail */}
                    <button onClick={handleReply} disabled={!replyText.trim() || sending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-[#F5E6A3] disabled:opacity-50 transition-colors">
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      Envoyer par Email
                    </button>

                    {/* WhatsApp normal — lien wa.me */}
                    {showPhoneInput ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={e => setPhoneInput(e.target.value)}
                          placeholder="Ex: 237683655802"
                          className="flex-1 bg-black border border-[#2a2a2a] rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-green-500"
                          autoFocus
                        />
                        <button
                          onClick={() => { if (phoneInput.trim()) { handleWhatsAppLink(phoneInput.trim()); setShowPhoneInput(false); setPhoneInput('') } }}
                          className="px-3 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-500">
                          OK
                        </button>
                        <button onClick={() => setShowPhoneInput(false)} className="px-3 py-2 border border-[#2a2a2a] text-gray-500 rounded-xl text-xs hover:text-white">✕</button>
                      </div>
                    ) : (
                    <button
                      onClick={() => {
                        const phone = selectedMsg?.from_phone || selectedMsg?.phone || ''
                        if (!phone) {
                          setShowPhoneInput(true)
                        } else {
                          handleWhatsAppLink(phone)
                        }
                      }}
                      disabled={!replyText.trim() || sending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-500 disabled:opacity-50 transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                    )}

                    {/* Copier le message */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(replyText + '\n\n---\nPowered by Searcher Connector · SCAI\nsearcherconnector.com')
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2500)
                      }}
                      disabled={!replyText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 border border-[#2a2a2a] text-gray-400 rounded-xl text-xs font-bold hover:text-white hover:border-[#444] disabled:opacity-50 transition-colors">
                      {copied ? <><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Copié !</> : '📋 Copier'}
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-700 mt-2">
                    Signature : "Powered by Searcher Connector · SCAI"
                  </p>
                </div>
              </div>
            )}
          </div>
            </>
          )}

          {/* Vue Matches (nouveau) */}
          {viewMode === 'matches' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 bg-[#1A1500] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Matching intelligent</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#D4AF37] to-white bg-clip-text text-transparent">
                    Collaborateurs recommandés
                  </h2>
                  <p className="text-gray-400">
                    Basé sur ton domaine, tes compétences et ton type de profil
                  </p>
                  <button
                    onClick={loadSuggestions}
                    className="mt-4 text-sm text-[#D4AF37] hover:text-white flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                    Actualiser
                  </button>
                </div>

                {/* Suggestions */}
                {loadingSuggestions ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-500 mb-2">Aucune suggestion pour le moment</p>
                    <p className="text-sm text-gray-600">
                      Complete ton profil pour recevoir des suggestions de collaborateurs compatibles
                    </p>
                    <button
                      onClick={() => router.push('/profile')}
                      className="mt-4 text-sm text-[#D4AF37] hover:underline"
                    >
                      Compléter mon profil →
                    </button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suggestions.map((match: any) => (
                      <Card key={match.id} className="p-6 hover:border-[#D4AF37]/50 transition-all">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {match.avatar_url ? (
                              <img src={match.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[#D4AF37] font-bold text-xl">{match.full_name?.[0] || '?'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-white truncate">{match.full_name || 'Utilisateur'}</h3>
                              {match.verification_status === 'genius' && (
                                <Award className="w-4 h-4 text-[#D4AF37]" />
                              )}
                              {match.verification_status === 'verified' && (
                                <CheckCircle className="w-4 h-4 text-[#D4AF37]" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{match.profile_type}</div>
                          </div>
                        </div>

                        {/* Score compatibilité */}
                        <div className="bg-gradient-to-r from-[#1A1500] to-[#0D0D0D] border border-[#D4AF37]/20 rounded-xl p-3 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Compatibilité</span>
                            <span className="text-lg font-bold text-[#D4AF37]">{match.compatibility_score}%</span>
                          </div>
                          <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#D4AF37] transition-all"
                              style={{ width: `${match.compatibility_score}%` }}
                            />
                          </div>
                        </div>

                        {/* Domaine */}
                        {match.domain && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Domaine</div>
                            <div className="text-sm text-white font-medium">{match.domain}</div>
                          </div>
                        )}

                        {/* Compétences communes */}
                        {match.common_skills && match.common_skills.length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs text-gray-600 uppercase tracking-wider mb-2">Compétences communes</div>
                            <div className="flex flex-wrap gap-1">
                              {match.common_skills.slice(0, 3).map((skill: string, i: number) => (
                                <span key={i} className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-1 rounded-full">
                                  {skill}
                                </span>
                              ))}
                              {match.common_skills.length > 3 && (
                                <span className="text-xs text-gray-600 px-2 py-1">
                                  +{match.common_skills.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                          <div className="bg-[#0D0D0D] rounded-lg p-2">
                            <div className="text-lg font-bold text-white">{match.missions_completed || 0}</div>
                            <div className="text-[10px] text-gray-600 uppercase">Missions</div>
                          </div>
                          <div className="bg-[#0D0D0D] rounded-lg p-2">
                            <div className="text-lg font-bold text-white">{match.plan || 'free'}</div>
                            <div className="text-[10px] text-gray-600 uppercase">Plan</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/profile/${match.id}`)}
                            className="flex-1 py-2 text-sm border border-[#2A2A2A] text-gray-400 rounded-lg hover:border-[#D4AF37] hover:text-white transition-colors"
                          >
                            Voir profil
                          </button>
                          <GoldButton
                            onClick={() => sendCollabProposal(match.id, match.full_name)}
                            className="flex-1 text-sm"
                          >
                            <Send className="w-4 h-4" />
                            Proposer
                          </GoldButton>
                        </div>

                        {/* Raison du match */}
                        {match.match_reason && (
                          <p className="text-xs text-gray-600 mt-3 italic">
                            💡 {match.match_reason}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
