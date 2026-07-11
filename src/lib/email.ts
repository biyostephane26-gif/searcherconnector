// =================================================================
// SEARCHER CONNECTOR — Service Email
// Utilise Resend (gratuit 3000 emails/mois, zéro config)
// Fallback : Supabase Auth emails si Resend pas configuré
//
// Templates professionnels pour :
//   - Confirmation de paiement
//   - Nouvelle opportunité score élevé
//   - Message/email important reçu
//   - Candidature envoyée par SCAI
//   - Alerte action urgente requise
// =================================================================

const RESEND_KEY  = process.env.RESEND_API_KEY || ''
const FROM_EMAIL  = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const FROM_NAME   = 'Searcher Connector'
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL || 'https://searcherconnector.com'

// Couleurs Searcher
const GOLD   = '#D4AF37'
const BLACK  = '#0A0A0A'
const DARK   = '#111111'
const GRAY   = '#888888'

// ── Template HTML de base ────────────────────────────────────────
function baseTemplate(content: string, previewText: string = '') {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Searcher Connector</title>
  <style>
    body { margin:0; padding:0; background:#0A0A0A; font-family:'Segoe UI',Arial,sans-serif; color:#E5E5E5; }
    .wrapper { max-width:600px; margin:0 auto; padding:20px; }
    .header { text-align:center; padding:32px 0 24px; border-bottom:1px solid #1A1A1A; }
    .logo { font-size:22px; font-weight:900; letter-spacing:-0.5px; }
    .logo span { color:${GOLD}; }
    .tagline { font-size:10px; color:${GRAY}; letter-spacing:4px; text-transform:uppercase; margin-top:4px; }
    .content { padding:32px 24px; background:#111111; border-radius:12px; margin:20px 0; }
    .title { font-size:22px; font-weight:800; color:#FFFFFF; margin:0 0 12px; }
    .text { font-size:14px; color:#AAAAAA; line-height:1.7; margin:0 0 16px; }
    .highlight { background:#1A1500; border-left:3px solid ${GOLD}; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; }
    .highlight p { color:${GOLD}; font-size:13px; margin:0; }
    .btn { display:inline-block; background:${GOLD}; color:#000000; font-weight:700; font-size:14px; padding:14px 28px; border-radius:8px; text-decoration:none; margin:20px 0; }
    .divider { border:none; border-top:1px solid #1A1A1A; margin:24px 0; }
    .footer { text-align:center; padding:20px 0; }
    .footer p { font-size:11px; color:#444444; margin:4px 0; }
    .footer a { color:${GOLD}; text-decoration:none; }
    .badge { display:inline-block; background:#1A1500; border:1px solid ${GOLD}40; color:${GOLD}; font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:2px; }
    .score-big { font-size:48px; font-weight:900; color:${GOLD}; line-height:1; }
    .meta { font-size:11px; color:#555555; }
  </style>
</head>
<body>
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
<div class="wrapper">
  <div class="header">
    <div class="logo">SEARCHER <span>CONNECTOR</span></div>
    <div class="tagline">L'agent IA qui travaille pour vous 24h/24</div>
  </div>
  ${content}
  <div class="footer">
    <p>© ${new Date().getFullYear()} Searcher Connector · <a href="${APP_URL}">searcherconnector.com</a></p>
    <p>Tu reçois cet email car tu es inscrit sur Searcher Connector.</p>
    <p><a href="${APP_URL}/settings">Gérer mes préférences</a> · <a href="${APP_URL}/support">Support</a></p>
  </div>
</div>
</body>
</html>`
}

// ── Envoi via Resend ──────────────────────────────────────────────
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_KEY) {
    // Resend pas configuré — log silencieux en production
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Email non envoyé - Resend non configuré]\nTo: ${to}\nSubject: ${subject}`)
    }
    return false
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    })
    return r.ok
  } catch {
    return false
  }
}

// =================================================================
// TEMPLATES D'EMAILS
// =================================================================

// ── 1. Confirmation de paiement ───────────────────────────────────
export async function sendPaymentConfirmation(params: {
  to:          string
  name:        string
  plan:        string
  amount:      string
  currency:    string
  paymentRef:  string
  method:      string
}) {
  const planLabel = params.plan.charAt(0).toUpperCase() + params.plan.slice(1)
  const methodLabel = params.method === 'flutterwave' ? 'Flutterwave (Carte/Mobile Money)'
    : params.method === 'monetbil' ? 'MTN/Orange Mobile Money'
    : params.method === 'paydunya' ? 'Mobile Money PayDunya'
    : 'Mobile Money'

  const html = baseTemplate(`
    <div class="content">
      <div class="badge">Paiement confirmé ✓</div>
      <h1 class="title" style="margin-top:16px;">Plan ${planLabel} activé !</h1>
      <p class="text">Bonjour ${params.name},</p>
      <p class="text">Ton paiement a été confirmé et ton plan <strong style="color:#fff;">${planLabel}</strong> est maintenant actif. Profite de toutes les fonctionnalités premium.</p>

      <div class="highlight">
        <p>💰 Montant : <strong>${params.amount} ${params.currency}</strong></p>
        <p style="margin-top:6px;">📋 Réf : <strong>${params.paymentRef}</strong></p>
        <p style="margin-top:6px;">💳 Via : <strong>${methodLabel}</strong></p>
        <p style="margin-top:6px;">📅 Date : <strong>${new Date().toLocaleString('fr-FR', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</strong></p>
      </div>

      <p class="text">Ce que tu débloque avec le plan <strong style="color:#fff;">${planLabel}</strong> :</p>
      ${params.plan === 'talent' ? `
        <ul style="color:#AAAAAA;font-size:14px;line-height:2;padding-left:20px;">
          <li>✅ Scan automatique toutes les 4 heures</li>
          <li>✅ 100+ opportunités par scan</li>
          <li>✅ Auto-candidature par SCAI</li>
          <li>✅ Badge Vérifié sur ton profil</li>
        </ul>
      ` : params.plan === 'business' ? `
        <ul style="color:#AAAAAA;font-size:14px;line-height:2;padding-left:20px;">
          <li>✅ Tout le plan Talent</li>
          <li>✅ Scan toutes les 2 heures</li>
          <li>✅ Opportunity Creator + Find Worker</li>
          <li>✅ Cowork inbox Gmail + WhatsApp</li>
        </ul>
      ` : `
        <ul style="color:#AAAAAA;font-size:14px;line-height:2;padding-left:20px;">
          <li>✅ Tout le plan Business</li>
          <li>✅ Scan toutes les heures</li>
          <li>✅ Matching investisseurs VC</li>
          <li>✅ Support direct fondateur</li>
        </ul>
      `}

      <a href="${APP_URL}/dashboard" class="btn">Ouvrir mon dashboard →</a>

      <hr class="divider"/>
      <p class="meta">Si tu n'es pas à l'origine de ce paiement, contacte-nous immédiatement : <a href="mailto:biyostephane26@gmail.com" style="color:${GOLD};">biyostephane26@gmail.com</a></p>
    </div>
  `, `Ton plan ${planLabel} est activé — paiement confirmé`)

  return sendEmail(params.to, `✅ Plan ${planLabel} activé — Searcher Connector`, html)
}

// ── 2. Alerte opportunité à score élevé + fraîche ─────────────────
export async function sendOpportunityAlert(params: {
  to:    string
  name:  string
  opportunities: Array<{ title: string; score: number; source: string; hours_ago: number; url: string }>
}) {
  const top = params.opportunities.slice(0, 3)
  const oppRows = top.map(o => `
    <div style="background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:14px;margin-bottom:10px;">
      <div style="font-size:14px;font-weight:700;color:#FFFFFF;margin-bottom:4px;">${o.title}</div>
      <div style="display:flex;gap:12px;margin-bottom:8px;">
        <span style="font-size:20px;font-weight:900;color:${GOLD};">${o.score}/100</span>
        <span style="font-size:11px;color:#666;align-self:center;">Source: ${o.source} · Il y a ${o.hours_ago}h</span>
      </div>
      <a href="${o.url}" style="font-size:12px;color:${GOLD};text-decoration:none;font-weight:700;">Voir l'opportunité →</a>
    </div>
  `).join('')

  const html = baseTemplate(`
    <div class="content">
      <div class="badge">⚡ Alerte Opportunités</div>
      <h1 class="title" style="margin-top:16px;">${params.opportunities.length} opportunités fraîches trouvées</h1>
      <p class="text">Bonjour ${params.name}, SCAI a détecté des opportunités à score élevé correspondant à ton profil. Agis vite — ces offres sont fraîches !</p>
      ${oppRows}
      <a href="${APP_URL}/opportunities" class="btn">Voir toutes mes opportunités →</a>
      <p class="meta" style="margin-top:16px;">Ces opportunités ont un score ≥ 75/100 et ont été publiées il y a moins de 24h.</p>
    </div>
  `, `${params.opportunities.length} opportunités à score élevé — agis maintenant`)

  return sendEmail(params.to, `⚡ ${params.opportunities.length} opportunités fraîches détectées — Searcher`, html)
}

// ── 3. Email/message important reçu ──────────────────────────────
export async function sendMessageAlert(params: {
  to:      string
  name:    string
  from:    string
  subject: string
  preview: string
  channel: string
}) {
  const channelIcon = params.channel === 'whatsapp' ? '💬' : '📧'
  const html = baseTemplate(`
    <div class="content">
      <div class="badge">${channelIcon} Nouveau message</div>
      <h1 class="title" style="margin-top:16px;">Tu as reçu un message important</h1>
      <p class="text">Bonjour ${params.name},</p>
      <p class="text">SCAI a détecté un message qui mérite ton attention :</p>

      <div class="highlight">
        <p>De : <strong>${params.from}</strong></p>
        <p style="margin-top:6px;">Sujet : <strong>${params.subject}</strong></p>
      </div>

      <div style="background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="font-size:13px;color:#CCCCCC;line-height:1.7;margin:0;">${params.preview}</p>
      </div>

      <a href="${APP_URL}/cowork" class="btn">Répondre dans Cowork →</a>
    </div>
  `, `Nouveau message de ${params.from} — réponse requise`)

  return sendEmail(params.to, `${channelIcon} Message de ${params.from} — action requise`, html)
}

// ── 4. Candidature envoyée par SCAI ──────────────────────────────
export async function sendApplicationConfirmation(params: {
  to:          string
  name:        string
  jobTitle:    string
  company:     string
  score:       number
  viewUrl:     string
}) {
  const html = baseTemplate(`
    <div class="content">
      <div class="badge">🤖 SCAI a agi pour toi</div>
      <h1 class="title" style="margin-top:16px;">Candidature envoyée automatiquement</h1>
      <p class="text">Bonjour ${params.name},</p>
      <p class="text">SCAI a soumis une candidature en ton nom pour une opportunité à score élevé :</p>

      <div class="highlight">
        <p style="font-size:16px;font-weight:700;color:#FFFFFF;">${params.jobTitle}</p>
        ${params.company ? `<p style="margin-top:4px;color:#AAAAAA;">${params.company}</p>` : ''}
        <p style="margin-top:8px;"><span class="score-big" style="font-size:28px;">${params.score}</span><span style="color:#AAAAAA;font-size:12px;"> /100</span></p>
      </div>

      <p class="text">SCAI a rédigé un message personnalisé en incluant ta signature Searcher Connector. Tu peux voir exactement ce qui a été envoyé :</p>
      <a href="${params.viewUrl}" class="btn">Voir la candidature →</a>

      <p class="meta" style="margin-top:16px;">Si tu n'avais pas autorisé cette action, baisse ton seuil d'auto-apply dans Paramètres.</p>
    </div>
  `, `SCAI a postulé pour ${params.jobTitle} — score ${params.score}/100`)

  return sendEmail(params.to, `🤖 SCAI a postulé pour "${params.jobTitle}" — Searcher Connector`, html)
}

// ── 5. Scan terminé — résumé ──────────────────────────────────────
export async function sendScanSummary(params: {
  to:         string
  name:       string
  found:      number
  fresh:      number
  topScore:   number
  zone:       string
}) {
  const html = baseTemplate(`
    <div class="content">
      <div class="badge">📡 Scan terminé</div>
      <h1 class="title" style="margin-top:16px;">SCAI a terminé le scan</h1>
      <p class="text">Bonjour ${params.name},</p>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:20px 0;">
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:16px;">
          <div style="font-size:32px;font-weight:900;color:${GOLD};">${params.found}</div>
          <div style="font-size:11px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Trouvées</div>
        </div>
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:16px;">
          <div style="font-size:32px;font-weight:900;color:#22C55E;">${params.fresh}</div>
          <div style="font-size:11px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Fraîches</div>
        </div>
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:16px;">
          <div style="font-size:32px;font-weight:900;color:${GOLD};">${params.topScore}</div>
          <div style="font-size:11px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Score Max</div>
        </div>
      </div>

      <p class="text">Zone : <strong style="color:#fff;">${params.zone}</strong></p>
      <a href="${APP_URL}/opportunities" class="btn">Voir mes opportunités →</a>
    </div>
  `, `Scan terminé — ${params.found} opportunités trouvées`)

  return sendEmail(params.to, `📡 Scan terminé — ${params.found} opportunités (score max: ${params.topScore}/100)`, html)
}

// ── 6. Bienvenue à l'inscription ──────────────────────────────────
export async function sendWelcomeEmail(params: {
  to:   string
  name: string
}) {
  const html = baseTemplate(`
    <div class="content">
      <h1 class="title">Bienvenue sur Searcher Connector, ${params.name} 👋</h1>
      <p class="text">SCAI est maintenant actif et prêt à travailler pour toi. Voici ce qu'il peut faire :</p>

      <div style="space-y:8px;">
        ${[
          ['🔍', 'Scanner 15+ sources mondiales en temps réel'],
          ['⚡', 'Postuler automatiquement en ton nom'],
          ['📊', 'Scorer chaque opportunité selon ton profil'],
          ['🔔', 'T\'alerter par email pour les actions urgentes'],
        ].map(([icon, text]) => `
          <div style="display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #1A1A1A;">
            <span style="font-size:18px;">${icon}</span>
            <span style="font-size:13px;color:#CCCCCC;">${text}</span>
          </div>
        `).join('')}
      </div>

      <a href="${APP_URL}/agent" class="btn" style="margin-top:24px;">Parler à SCAI maintenant →</a>
    </div>
  `, 'Bienvenue — SCAI est prêt à travailler pour toi')

  return sendEmail(params.to, '👋 Bienvenue sur Searcher Connector — SCAI est prêt', html)
}

// ── 7. Rapport hebdomadaire personnalisé ─────────────────────────
export async function sendWeeklyReport(params: {
  to:              string
  name:            string
  week:            string
  stats:           {
    opportunitiesFound:      number
    freshOpportunities:      number
    applicationsSubmitted:   number
    interviewsScheduled:     number
    offersReceived:          number
    acceptedOffers:          number
    avgScore:                number
  }
  topOpportunities: Array<{ title: string; company: string; score: number; url: string }>
  insights:         string[]
  isPremium:        boolean
  premiumBenefits:  string[]
  currentPlan:      string
}) {
  const planBadge = params.isPremium 
    ? `<span style="background:${GOLD};color:#000;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:2px;">${params.currentPlan.toUpperCase()}</span>`
    : `<span style="background:#1A1A1A;border:1px solid #333;color:#666;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:2px;">FREE</span>`

  const html = baseTemplate(`
    <div class="content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div class="badge">📊 Rapport hebdomadaire</div>
        ${planBadge}
      </div>
      
      <h1 class="title">Ton activité cette semaine</h1>
      <p class="text">Bonjour ${params.name}, voici un résumé de ce que SCAI a accompli pour toi cette semaine (${params.week}) :</p>

      <!-- Stats Grid -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:24px 0;">
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:14px;">
          <div style="font-size:28px;font-weight:900;color:${GOLD};">${params.stats.opportunitiesFound}</div>
          <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Opportunités</div>
        </div>
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:14px;">
          <div style="font-size:28px;font-weight:900;color:#22C55E;">${params.stats.freshOpportunities}</div>
          <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Fraîches</div>
        </div>
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:14px;">
          <div style="font-size:28px;font-weight:900;color:${GOLD};">${params.stats.applicationsSubmitted}</div>
          <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Candidatures</div>
        </div>
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:14px;">
          <div style="font-size:28px;font-weight:900;color:${GOLD};">${params.stats.avgScore}</div>
          <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Score Moyen</div>
        </div>
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:14px;">
          <div style="font-size:28px;font-weight:900;color:#8B5CF6;">${params.stats.interviewsScheduled}</div>
          <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Entretiens</div>
        </div>
        <div style="text-align:center;background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:14px;">
          <div style="font-size:28px;font-weight:900;color:#10B981;">${params.stats.offersReceived}</div>
          <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Offres</div>
        </div>
      </div>

      ${params.stats.acceptedOffers > 0 ? `
        <div style="background:linear-gradient(135deg,#1A1500 0%,#0D0D0D 100%);border:2px solid ${GOLD};border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
          <div style="font-size:32px;margin-bottom:8px;">🎊</div>
          <div style="font-size:18px;font-weight:900;color:#FFFFFF;margin-bottom:4px;">Félicitations !</div>
          <div style="font-size:14px;color:${GOLD};">${params.stats.acceptedOffers} offre${params.stats.acceptedOffers > 1 ? 's' : ''} acceptée${params.stats.acceptedOffers > 1 ? 's' : ''} cette semaine</div>
        </div>
      ` : ''}

      <!-- Top Opportunités -->
      ${params.topOpportunities.length > 0 ? `
        <hr class="divider"/>
        <h3 style="font-size:16px;font-weight:700;color:#FFFFFF;margin:16px 0 12px;">Top 5 opportunités de la semaine</h3>
        ${params.topOpportunities.map(opp => `
          <div style="background:#0D0D0D;border:1px solid #1A1A1A;border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:700;color:#FFFFFF;margin-bottom:4px;">${opp.title}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11px;color:#666;">${opp.company}</span>
              <span style="font-size:18px;font-weight:900;color:${GOLD};">${opp.score}/100</span>
            </div>
          </div>
        `).join('')}
      ` : ''}

      <!-- Insights -->
      ${params.insights.length > 0 ? `
        <hr class="divider"/>
        <h3 style="font-size:16px;font-weight:700;color:#FFFFFF;margin:16px 0 12px;">💡 Insights personnalisés</h3>
        ${params.insights.map(insight => `
          <div style="background:#0D0D0D;border-left:3px solid ${GOLD};padding:12px 16px;margin-bottom:10px;border-radius:0 8px 8px 0;">
            <p style="font-size:13px;color:#CCCCCC;margin:0;">${insight}</p>
          </div>
        `).join('')}
      ` : ''}

      <!-- Gap Premium -->
      ${!params.isPremium && params.premiumBenefits.length > 0 ? `
        <hr class="divider"/>
        <div style="background:linear-gradient(135deg,#1A1500 0%,#0D0D0D 100%);border:1px solid ${GOLD}40;border-radius:12px;padding:20px;margin:20px 0;">
          <h3 style="font-size:16px;font-weight:700;color:${GOLD};margin:0 0 12px;">🚀 Passe en Premium pour débloquer</h3>
          <ul style="margin:0;padding-left:20px;color:#CCCCCC;font-size:13px;line-height:2;">
            ${params.premiumBenefits.map(benefit => `<li>${benefit}</li>`).join('')}
          </ul>
          <a href="${APP_URL}/pricing" style="display:inline-block;background:${GOLD};color:#000000;font-weight:700;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">Voir les plans →</a>
        </div>
      ` : ''}

      <a href="${APP_URL}/dashboard" class="btn">Ouvrir mon dashboard →</a>

      <hr class="divider"/>
      <p class="meta">Tu reçois ce rapport tous les lundis. <a href="${APP_URL}/settings" style="color:${GOLD};">Gérer mes préférences email</a></p>
    </div>
  `, `Ton activité de la semaine — ${params.stats.opportunitiesFound} opportunités trouvées`)

  return sendEmail(params.to, `📊 Ton rapport hebdomadaire Searcher Connector — ${params.stats.opportunitiesFound} opportunités`, html)
}
