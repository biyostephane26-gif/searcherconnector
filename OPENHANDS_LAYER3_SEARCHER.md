=================================================================
SEARCHER CONNECTOR — OPENHANDS PROMPT — COUCHE 3
AGENT AUTONOME 24/7 — EMAIL · WHATSAPP · CRON · SCHEDULER
=================================================================
Tu es un développeur senior full-stack avec 15 ans d'expérience.
Les Couches 1 et 2 sont déjà codées et fonctionnelles.
Tu construis PAR-DESSUS sans rien casser.
Tu codes TOUT. Tu ne sautes RIEN. Tu te corriges toi-même.
La Couche 3 est le cerveau opérationnel de Searcher :
l'agent qui agit SEUL, SANS que l'utilisateur soit connecté.
=================================================================

PRÉREQUIS : Couches 1 et 2 tournent parfaitement.
npm run dev fonctionne. Build passe.
Tables existantes utilisées : users_profiles, opportunities,
applications_sent, notifications, messages, conversations,
stories, posts, groups.
=================================================================

PHILOSOPHIE DE LA COUCHE 3 :
"Ce que Searcher peut faire seul, il le fait.
 Ce qu'il ne peut pas, il alerte jusqu'à ce que l'utilisateur agisse."
— Comme un VPS de trading qui exécute des ordres 24h/24.
=================================================================

=================================================================
ÉTAPE 1 — NOUVELLES TABLES SQL (COUCHE 3)
=================================================================

Ouvre Supabase SQL Editor et exécute ce SQL complet :

-- Logs de toutes les actions autonomes de Searcher
create table if not exists agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  action_type text not null check (
    action_type in (
      'search_scan',
      'auto_apply',
      'email_response',
      'whatsapp_response',
      'alert_sent',
      'cv_adapted',
      'cover_generated',
      'diversification_warning',
      'international_alert',
      'surveillance_check',
      'salary_monitor',
      'schedule_interview_prep',
      'follow_up_sent'
    )
  ),
  opportunity_id uuid references opportunities(id) on delete set null,
  input_data jsonb default '{}',
  output_data jsonb default '{}',
  result text,
  success boolean default true,
  error_message text,
  auto_promo_sent boolean default false,
  execution_ms integer default 0,
  created_at timestamp default now()
);

-- Queue des tâches planifiées pour l'agent
create table if not exists agent_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  task_type text not null check (
    task_type in (
      'daily_scan',
      'followup_check',
      'response_monitor',
      'salary_alert',
      'diversification_check',
      'surveillance_scan',
      'interview_prep_reminder',
      'whatsapp_check',
      'email_check'
    )
  ),
  scheduled_for timestamp not null,
  priority integer default 5,
  status text default 'pending' check (
    status in ('pending','running','done','failed','cancelled')
  ),
  attempts integer default 0,
  max_attempts integer default 3,
  payload jsonb default '{}',
  result jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Templates de réponse personnalisés par utilisateur
create table if not exists response_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  template_type text not null check (
    template_type in (
      'initial_response',
      'follow_up_1',
      'follow_up_2',
      'interview_confirm',
      'offer_received',
      'salary_negotiation',
      'decline_politely',
      'thank_you'
    )
  ),
  subject_template text,
  body_template text not null,
  tone text default 'professional' check (
    tone in ('professional','friendly','assertive','enthusiastic')
  ),
  generated_by text default 'claude',
  is_active boolean default true,
  uses_count integer default 0,
  created_at timestamp default now()
);

-- Suivi des emails entrants/sortants
create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  thread_id text,
  subject text,
  from_email text,
  from_name text,
  company text,
  direction text not null check (direction in ('incoming','outgoing')),
  body_preview text,
  full_body text,
  searcher_replied boolean default false,
  reply_body text,
  reply_sent_at timestamp,
  reply_approved_by_user boolean default false,
  requires_human boolean default false,
  sentiment text check (sentiment in ('positive','neutral','negative','unknown')),
  created_at timestamp default now()
);

-- Connexion WhatsApp de l'utilisateur
create table if not exists whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade unique,
  phone_number text not null,
  is_active boolean default false,
  webhook_verified boolean default false,
  access_token_encrypted text,
  last_message_at timestamp,
  messages_handled integer default 0,
  created_at timestamp default now()
);

-- Messages WhatsApp gérés par l'agent
create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  wa_message_id text unique,
  from_number text,
  from_name text,
  body text,
  direction text check (direction in ('incoming','outgoing')),
  searcher_replied boolean default false,
  reply_body text,
  reply_sent_at timestamp,
  requires_human boolean default false,
  created_at timestamp default now()
);

-- Suivi des follow-ups automatiques
create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  application_id uuid references applications_sent(id) on delete cascade,
  followup_number integer default 1,
  scheduled_for timestamp,
  sent_at timestamp,
  body text,
  channel text check (channel in ('email','whatsapp','platform')),
  status text default 'scheduled' check (
    status in ('scheduled','sent','replied','cancelled')
  ),
  created_at timestamp default now()
);

-- Préparation aux entretiens
create table if not exists interview_preps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  interview_date timestamp,
  interview_type text check (
    interview_type in ('phone','video','in_person','technical','hr')
  ),
  company_research text,
  likely_questions jsonb default '[]',
  suggested_answers jsonb default '[]',
  talking_points text,
  red_flags text,
  salary_strategy text,
  reminder_sent boolean default false,
  created_at timestamp default now()
);

-- Configuration du scheduler par utilisateur
create table if not exists agent_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade unique,
  scan_frequency_hours integer default 6,
  scan_times text[] default array['07:00','13:00','19:00'],
  followup_delay_days integer default 3,
  max_followups integer default 2,
  auto_apply_threshold integer default 80,
  require_approval_below integer default 70,
  surveillance_active boolean default false,
  surveillance_threshold_percent integer default 15,
  email_auto_reply boolean default false,
  whatsapp_auto_reply boolean default false,
  quiet_hours_start text default '22:00',
  quiet_hours_end text default '07:00',
  timezone text default 'Africa/Douala',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS
alter table agent_actions enable row level security;
alter table agent_queue enable row level security;
alter table response_templates enable row level security;
alter table email_threads enable row level security;
alter table whatsapp_config enable row level security;
alter table whatsapp_messages enable row level security;
alter table followups enable row level security;
alter table interview_preps enable row level security;
alter table agent_schedules enable row level security;

create policy "own_agent_actions" on agent_actions
  for all using (auth.uid() = user_id);

create policy "own_queue" on agent_queue
  for all using (auth.uid() = user_id);

create policy "own_templates" on response_templates
  for all using (auth.uid() = user_id);

create policy "own_email_threads" on email_threads
  for all using (auth.uid() = user_id);

create policy "own_whatsapp_config" on whatsapp_config
  for all using (auth.uid() = user_id);

create policy "own_whatsapp_messages" on whatsapp_messages
  for all using (auth.uid() = user_id);

create policy "own_followups" on followups
  for all using (auth.uid() = user_id);

create policy "own_interview_preps" on interview_preps
  for all using (auth.uid() = user_id);

create policy "own_schedules" on agent_schedules
  for all using (auth.uid() = user_id);

-- Supabase Cron : activer pg_cron
create extension if not exists pg_cron;

-- Cron job : marquer les tâches overdue
select cron.schedule(
  'agent-queue-cleanup',
  '*/15 * * * *',
  $$
    update agent_queue
    set status = 'failed', updated_at = now()
    where status = 'running'
      and updated_at < now() - interval '30 minutes';
  $$
);

-- Cron job : créer les scans quotidiens pour tous les utilisateurs actifs
select cron.schedule(
  'create-daily-scans',
  '0 6 * * *',
  $$
    insert into agent_queue (user_id, task_type, scheduled_for, priority)
    select id, 'daily_scan', now(), 10
    from users_profiles
    where verification_status in ('verified','genius')
      and surveillance_active = true
    on conflict do nothing;
  $$
);

=================================================================
ÉTAPE 2 — INSTALLER LES NOUVELLES DÉPENDANCES
=================================================================

npm install node-cron
npm install @sendgrid/mail
npm install axios
npm install crypto-js
npm install @anthropic-ai/sdk

IMPORTANT : Ces packages sont pour le backend Express (couche serveur).
Si le projet est uniquement frontend Vite/React, utilise les
Supabase Edge Functions à la place (voir Étape 4).

=================================================================
ÉTAPE 3 — MISE À JOUR DES TYPES TYPESCRIPT
=================================================================

Ouvre src/types/index.ts et AJOUTE (sans supprimer) :

export type AgentAction = {
  id: string;
  user_id: string;
  action_type: string;
  opportunity_id?: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  result?: string;
  success: boolean;
  error_message?: string;
  auto_promo_sent: boolean;
  execution_ms: number;
  created_at: string;
};

export type AgentQueueTask = {
  id: string;
  user_id: string;
  task_type: string;
  scheduled_for: string;
  priority: number;
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  attempts: number;
  payload: Record<string, any>;
  result?: Record<string, any>;
  created_at: string;
};

export type ResponseTemplate = {
  id: string;
  user_id: string;
  template_type: string;
  subject_template?: string;
  body_template: string;
  tone: 'professional' | 'friendly' | 'assertive' | 'enthusiastic';
  is_active: boolean;
  uses_count: number;
};

export type EmailThread = {
  id: string;
  user_id: string;
  opportunity_id?: string;
  subject?: string;
  from_email?: string;
  from_name?: string;
  company?: string;
  direction: 'incoming' | 'outgoing';
  body_preview?: string;
  full_body?: string;
  searcher_replied: boolean;
  reply_body?: string;
  requires_human: boolean;
  sentiment?: string;
  created_at: string;
};

export type Followup = {
  id: string;
  user_id: string;
  opportunity_id: string;
  application_id?: string;
  followup_number: number;
  scheduled_for?: string;
  sent_at?: string;
  body?: string;
  channel: 'email' | 'whatsapp' | 'platform';
  status: 'scheduled' | 'sent' | 'replied' | 'cancelled';
};

export type InterviewPrep = {
  id: string;
  user_id: string;
  opportunity_id: string;
  interview_date?: string;
  interview_type?: string;
  company_research?: string;
  likely_questions: any[];
  suggested_answers: any[];
  talking_points?: string;
  red_flags?: string;
  salary_strategy?: string;
  reminder_sent: boolean;
};

export type AgentSchedule = {
  user_id: string;
  scan_frequency_hours: number;
  scan_times: string[];
  followup_delay_days: number;
  max_followups: number;
  auto_apply_threshold: number;
  require_approval_below: number;
  surveillance_active: boolean;
  email_auto_reply: boolean;
  whatsapp_auto_reply: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};

=================================================================
ÉTAPE 4 — SUPABASE EDGE FUNCTIONS (CŒUR DE LA COUCHE 3)
=================================================================

Les Edge Functions remplacent un backend Node.js pour ce projet
Vite/React. Elles s'exécutent sur les serveurs Supabase et peuvent
être déclenchées par cron, webhooks, ou appels API.

Crée le dossier : supabase/functions/

--- supabase/functions/agent-scan/index.ts ---

Cette fonction est le moteur principal du scan autonome.
Elle est appelée :
1. Par le cron Supabase (toutes les 6h)
2. Par le frontend quand l'utilisateur clique "Lancer scan"
3. Automatiquement après inscription

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')!;
const SERPER_KEY = Deno.env.get('SERPER_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const startTime = Date.now();
  const { user_id, manual = false } = await req.json();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Charger le profil utilisateur
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', user_id)
    .single();

  if (!profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
  }

  // 2. Charger la config du scheduler
  const { data: schedule } = await supabase
    .from('agent_schedules')
    .select('*')
    .eq('user_id', user_id)
    .single();

  const autoThreshold = schedule?.auto_apply_threshold || 80;
  const approvalThreshold = schedule?.require_approval_below || 70;

  // 3. Construire les requêtes de recherche Serper
  const queries = buildSearchQueries(profile);
  const allOpportunities: any[] = [];

  // 4. Scanner chaque plateforme via Serper
  for (const query of queries) {
    try {
      const serperRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: 10,
          gl: profile.country || 'fr',
          hl: profile.languages?.[0] || 'fr'
        })
      });
      const data = await serperRes.json();
      const results = data.organic || [];

      for (const result of results) {
        allOpportunities.push({
          raw_title: result.title,
          company: extractCompany(result.title, result.snippet),
          location: extractLocation(result.snippet),
          url: result.link,
          snippet: result.snippet,
          published_hint: result.date,
          source_platform: detectPlatform(result.link)
        });
      }
    } catch (e) {
      console.error('Serper query failed:', query, e);
    }
  }

  // 5. Scorer avec Gemini (batch de 5 pour économiser les tokens)
  const scoredOpps: any[] = [];
  const batches = chunkArray(allOpportunities, 5);

  for (const batch of batches) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: buildScoringPrompt(profile, batch)
              }]
            }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );
      const geminiData = await geminiRes.json();
      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const scored = JSON.parse(text.replace(/```json|```/g, '').trim());
      scoredOpps.push(...scored);
    } catch (e) {
      console.error('Gemini scoring failed:', e);
    }
  }

  // 6. Filtrer : score > 40, pas suspectes, pas expirées
  const validOpps = scoredOpps.filter(o =>
    o.score >= 40 &&
    !o.is_suspicious &&
    !o.is_expired
  );

  // 7. Trier par score décroissant
  validOpps.sort((a, b) => b.score - a.score);

  // 8. Sauvegarder en base
  const savedOpps: any[] = [];
  for (const opp of validOpps.slice(0, 20)) {
    const { data: saved } = await supabase
      .from('opportunities')
      .upsert({
        user_id,
        title: opp.title,
        company: opp.company,
        location: opp.location,
        country: opp.country,
        score: opp.score,
        match_reason: opp.match_reason,
        source_platform: opp.platform,
        original_url: opp.url,
        is_foreign: opp.is_foreign,
        is_suspicious: opp.is_suspicious,
        visa_required: opp.visa_required,
        passport_required: opp.passport_required,
        hours_ago: opp.hours_ago,
        applicants_count: opp.applicants_count,
        status: 'found',
        published_at: opp.published_at ? new Date(opp.published_at).toISOString() : null
      }, { onConflict: 'user_id,original_url', ignoreDuplicates: false })
      .select()
      .single();

    if (saved) savedOpps.push(saved);
  }

  // 9. Auto-appliquer pour les offres score >= autoThreshold
  let autoApplied = 0;
  for (const opp of savedOpps.filter(o => o.score >= autoThreshold)) {
    const applied = await autoApply(supabase, profile, opp, GEMINI_KEY);
    if (applied) autoApplied++;
  }

  // 10. Alertes pour score entre approvalThreshold et autoThreshold
  const needsApproval = savedOpps.filter(
    o => o.score >= approvalThreshold && o.score < autoThreshold
  );
  for (const opp of needsApproval) {
    await supabase.from('notifications').insert({
      user_id,
      type: 'opportunity_found',
      title: '🎯 Opportunité à valider',
      message: `${opp.title} chez ${opp.company} — Score ${opp.score}/100. Cliquez pour approuver l'envoi.`,
      financial_value: opp.salary_max ? `$${opp.salary_max}/an` : null,
      action_url: `/opportunites/${opp.id}`,
      action_label: 'Voir et postuler',
      requires_action: true
    });
  }

  // 11. Vérification diversification
  await checkDiversification(supabase, user_id);

  // 12. Alertes internationales
  const foreignOpps = savedOpps.filter(o => o.is_foreign);
  for (const opp of foreignOpps) {
    await createInternationalAlert(supabase, user_id, opp);
  }

  // 13. Log de l'action
  await supabase.from('agent_actions').insert({
    user_id,
    action_type: 'search_scan',
    output_data: {
      total_found: allOpportunities.length,
      total_valid: validOpps.length,
      total_saved: savedOpps.length,
      auto_applied: autoApplied,
      needs_approval: needsApproval.length
    },
    result: `Scan terminé: ${savedOpps.length} opportunités, ${autoApplied} candidatures auto`,
    success: true,
    execution_ms: Date.now() - startTime,
    auto_promo_sent: true
  });

  // 14. Notification récap
  if (savedOpps.length > 0) {
    await supabase.from('notifications').insert({
      user_id,
      type: 'scan_complete',
      title: '⚡ Scan terminé',
      message: `Searcher a trouvé ${savedOpps.length} opportunités. ${autoApplied} candidatures envoyées automatiquement.`,
      action_url: '/opportunites',
      action_label: 'Voir les résultats'
    });
  }

  return new Response(JSON.stringify({
    success: true,
    found: savedOpps.length,
    auto_applied: autoApplied,
    execution_ms: Date.now() - startTime
  }), { headers: { 'Content-Type': 'application/json' } });
});

// ---- HELPERS ----

function buildSearchQueries(profile: any): string[] {
  const domain = profile.domain || 'software developer';
  const country = profile.country || 'France';
  const remote = profile.search_preferences?.include_remote !== false;

  return [
    `"${domain}" job offer site:indeed.com OR site:linkedin.com OR site:glassdoor.com`,
    `"${domain}" emploi offre 2025 2026`,
    `"${domain}" remote job hiring now`,
    remote ? `"${domain}" remote work from anywhere` : `"${domain}" job ${country}`,
    `"${domain}" job Africa OR Cameroon OR Nigeria OR Senegal`,
    `"${domain}" job opportunity LinkedIn posted today`,
    `hiring "${domain}" site:wellfound.com OR site:remoteok.io`,
    `"${domain}" freelance contract mission 2026`,
  ];
}

function buildScoringPrompt(profile: any, opps: any[]): string {
  return `Tu es Searcher, un agent expert en recrutement mondial.

PROFIL UTILISATEUR :
- Nom : ${profile.full_name}
- Domaine : ${profile.domain}
- Pays : ${profile.country}
- Type : ${profile.profile_type}
- Salaire cible : ${profile.salary_min || 0}-${profile.salary_max || 0} ${profile.currency || 'USD'}
- Statut : ${profile.verification_status}

OFFRES À ANALYSER (${opps.length}) :
${JSON.stringify(opps, null, 2)}

Pour chaque offre, analyse et retourne UN TABLEAU JSON avec ces champs exacts :
[
  {
    "title": "titre de l'offre",
    "company": "nom entreprise",
    "location": "ville, pays",
    "country": "pays ISO",
    "score": 0-100,
    "match_reason": "Explication courte et concrète du score en 1 phrase",
    "platform": "indeed|linkedin|remoteok|upwork|...",
    "url": "url originale",
    "is_foreign": true/false,
    "is_suspicious": true/false,
    "is_expired": true/false,
    "visa_required": true/false,
    "passport_required": true/false,
    "hours_ago": nombre estimé,
    "applicants_count": nombre estimé,
    "salary_min": nombre,
    "salary_max": nombre,
    "published_at": "ISO date ou null"
  }
]

RÈGLES DE SCORING :
- 90-100 : match parfait, récente < 24h, peu de candidats
- 70-89 : bon match, quelques jours
- 50-69 : match partiel, peut valoir la peine
- < 40 : mauvais match → à filtrer
- Marquage SUSPICIOUS : pas de site entreprise, demande argent, trop vague
- Marquage FOREIGN : pays différent du profil → déclenche alerte passeport/visa

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ou après.`;
}

async function autoApply(supabase: any, profile: any, opp: any, geminiKey: string): Promise<boolean> {
  try {
    // Générer le CV adapté + message de candidature
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: buildApplicationPrompt(profile, opp)
            }]
          }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const application = JSON.parse(text.replace(/```json|```/g, '').trim());

    // Sauvegarder la candidature
    await supabase.from('applications_sent').insert({
      user_id: profile.id,
      opportunity_id: opp.id,
      company: opp.company,
      job_title: opp.title,
      cover_message: application.cover_message,
      cv_adapted: application.cv_adapted_summary,
      applied_at: new Date().toISOString(),
      response_status: 'waiting'
    });

    // Mettre à jour le statut de l'opportunité
    await supabase
      .from('opportunities')
      .update({ status: 'auto_applied' })
      .eq('id', opp.id);

    // Logger l'action
    await supabase.from('agent_actions').insert({
      user_id: profile.id,
      action_type: 'auto_apply',
      opportunity_id: opp.id,
      output_data: { cover_message: application.cover_message },
      result: `Candidature auto-envoyée : ${opp.title} chez ${opp.company}`,
      success: true,
      auto_promo_sent: true
    });

    // Notification utilisateur
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'auto_applied',
      title: '✅ Candidature envoyée automatiquement',
      message: `Searcher a postulé pour vous : ${opp.title} chez ${opp.company} · Score ${opp.score}/100`,
      financial_value: opp.salary_max ? `$${opp.salary_max}/an` : null,
      action_url: `/opportunites/${opp.id}`,
      action_label: 'Voir la candidature'
    });

    // Planifier le follow-up dans 3 jours
    const followupDate = new Date();
    followupDate.setDate(followupDate.getDate() + 3);
    await supabase.from('agent_queue').insert({
      user_id: profile.id,
      task_type: 'followup_check',
      scheduled_for: followupDate.toISOString(),
      priority: 8,
      payload: { opportunity_id: opp.id, followup_number: 1 }
    });

    return true;
  } catch (e) {
    console.error('autoApply failed:', e);
    return false;
  }
}

function buildApplicationPrompt(profile: any, opp: any): string {
  return `Tu es Searcher Connector, l'agent de carrière numéro 1 mondial.

Génère une candidature PARFAITE pour ce profil et cette offre.

PROFIL :
${JSON.stringify(profile, null, 2)}

OFFRE :
Titre: ${opp.title}
Entreprise: ${opp.company}
Localisation: ${opp.location}
Raison du match: ${opp.match_reason}

Génère un JSON avec :
{
  "cover_message": "Message de candidature de 150-200 mots. Commence par 'Je ne postule pas — je rejoins votre équipe.' Montre que tu connais l'entreprise. Démontre que tu penses déjà comme un employé de cette société. Fin avec la signature automatique : 'Candidature envoyée via Searcher Connector — searcherconnector.com'",
  "cv_adapted_summary": "Résumé des adaptations apportées au CV pour ce poste spécifique",
  "subject_line": "Objet de l'email de candidature",
  "key_strengths_highlighted": ["force 1", "force 2", "force 3"]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
}

async function checkDiversification(supabase: any, userId: string): Promise<void> {
  const { data: activeOpps } = await supabase
    .from('opportunities')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['found', 'auto_applied', 'pending_action'])
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const count = activeOpps?.length || 0;

  if (count < 5) {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'diversification_warning',
      title: '⚠️ Diversifiez vos candidatures',
      message: `Vous n'avez que ${count} offre(s) active(s). Searcher recommande au minimum 5 pistes en parallèle. Ne misez jamais sur une seule opportunité.`,
      action_url: '/opportunites',
      action_label: 'Lancer un nouveau scan',
      requires_action: true
    });

    await supabase.from('agent_actions').insert({
      user_id: userId,
      action_type: 'diversification_warning',
      output_data: { active_count: count, minimum: 5 },
      result: `Alerte diversification : seulement ${count} offres actives`,
      success: true
    });
  }
}

async function createInternationalAlert(supabase: any, userId: string, opp: any): Promise<void> {
  const alerts: string[] = [];

  if (opp.passport_required) {
    alerts.push('🛂 Passeport valide requis — vérifiez la date d\'expiration');
  }
  if (opp.visa_required) {
    alerts.push('📋 Visa de travail nécessaire — délai moyen 4-8 semaines');
    alerts.push('📝 Documents généralement requis : contrat signé, justificatifs financiers, casier judiciaire');
  }

  if (alerts.length > 0) {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'international_alert',
      title: `🌍 Offre internationale : ${opp.company} (${opp.country})`,
      message: alerts.join('\n') + `\n\nNe soyez jamais surpris après une sélection. Préparez ces documents maintenant.`,
      action_url: `/opportunites/${opp.id}`,
      action_label: 'Voir l\'offre',
      requires_action: true
    });
  }
}

function extractCompany(title: string, snippet: string): string {
  const patterns = [/ - (.+?)$/, / \| (.+?)$/, / at (.+?) /i, / chez (.+?) /i];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1].trim();
  }
  return 'Entreprise inconnue';
}

function extractLocation(snippet: string): string {
  const match = snippet.match(/([A-Z][a-zA-ZÀ-ÿ]+(?:,\s*[A-Z][a-zA-ZÀ-ÿ]+)?)/);
  return match ? match[1] : 'Non précisé';
}

function detectPlatform(url: string): string {
  if (url.includes('indeed')) return 'indeed';
  if (url.includes('linkedin')) return 'linkedin';
  if (url.includes('glassdoor')) return 'glassdoor';
  if (url.includes('remoteok')) return 'remoteok';
  if (url.includes('upwork')) return 'upwork';
  if (url.includes('wellfound')) return 'wellfound';
  if (url.includes('jobberman')) return 'jobberman';
  return 'web';
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

=================================================================
ÉTAPE 5 — EDGE FUNCTION : FOLLOW-UP AUTOMATIQUE
=================================================================

--- supabase/functions/agent-followup/index.ts ---

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { user_id, opportunity_id, followup_number = 1 } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Charger le contexte
  const [{ data: profile }, { data: opp }, { data: application }] = await Promise.all([
    supabase.from('users_profiles').select('*').eq('id', user_id).single(),
    supabase.from('opportunities').select('*').eq('id', opportunity_id).single(),
    supabase.from('applications_sent').select('*').eq('opportunity_id', opportunity_id).single()
  ]);

  if (!profile || !opp || !application) {
    return new Response(JSON.stringify({ error: 'Context not found' }), { status: 404 });
  }

  // Vérifier si une réponse a déjà été reçue
  if (application.response_received) {
    await supabase.from('agent_queue')
      .update({ status: 'cancelled' })
      .eq('user_id', user_id)
      .eq('task_type', 'followup_check')
      .contains('payload', { opportunity_id });
    return new Response(JSON.stringify({ skipped: true, reason: 'Response already received' }));
  }

  // Vérifier schedule de l'utilisateur
  const { data: schedule } = await supabase
    .from('agent_schedules')
    .select('*')
    .eq('user_id', user_id)
    .single();

  const maxFollowups = schedule?.max_followups || 2;

  if (followup_number > maxFollowups) {
    // Marquer l'opportunité comme silencieuse et notifier
    await supabase.from('opportunities')
      .update({ status: 'dismissed' })
      .eq('id', opportunity_id);

    await supabase.from('notifications').insert({
      user_id,
      type: 'followup_exhausted',
      title: '📭 Aucune réponse de ' + opp.company,
      message: `Searcher a envoyé ${maxFollowups} relances sans retour. Cette opportunité est classée. Continuons avec les autres pistes.`,
      action_url: '/opportunites',
      action_label: 'Voir les autres opportunités'
    });

    return new Response(JSON.stringify({ done: true, reason: 'Max followups reached' }));
  }

  // Générer le message de relance
  const geminiKey = Deno.env.get('GEMINI_API_KEY')!;
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Tu es Searcher Connector. Génère un email de relance ${followup_number === 1 ? 'poli et professionnel' : 'bref et direct'} pour :

Candidat : ${profile.full_name}
Domaine : ${profile.domain}
Poste visé : ${opp.title}
Entreprise : ${opp.company}
Candidature initiale envoyée le : ${application.applied_at}
Relance numéro : ${followup_number} sur ${maxFollowups}

Génère uniquement le JSON :
{
  "subject": "objet de l'email de relance",
  "body": "corps complet de l'email, 80-120 mots max. Fin avec : 'Envoyé via Searcher Connector — searcherconnector.com'"
}

JSON uniquement, sans texte avant ou après.`
          }]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );

  const gData = await geminiRes.json();
  const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const followupContent = JSON.parse(rawText.replace(/```json|```/g, '').trim());

  // Sauvegarder le follow-up
  await supabase.from('followups').insert({
    user_id,
    opportunity_id,
    application_id: application.id,
    followup_number,
    scheduled_for: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    body: followupContent.body,
    channel: 'email',
    status: 'sent'
  });

  // Logger
  await supabase.from('agent_actions').insert({
    user_id,
    action_type: 'follow_up_sent',
    opportunity_id,
    output_data: followupContent,
    result: `Relance ${followup_number}/${maxFollowups} envoyée à ${opp.company}`,
    success: true,
    auto_promo_sent: true
  });

  // Notification
  await supabase.from('notifications').insert({
    user_id,
    type: 'followup_sent',
    title: `📧 Relance ${followup_number}/${maxFollowups} envoyée`,
    message: `Searcher a relancé ${opp.company} pour le poste ${opp.title}. Relance ${followup_number} sur ${maxFollowups} max.`,
    action_url: `/opportunites/${opportunity_id}`,
    action_label: 'Voir le suivi'
  });

  // Planifier la prochaine relance si nécessaire
  if (followup_number < maxFollowups) {
    const nextFollowup = new Date();
    const delayDays = schedule?.followup_delay_days || 3;
    nextFollowup.setDate(nextFollowup.getDate() + delayDays);

    await supabase.from('agent_queue').insert({
      user_id,
      task_type: 'followup_check',
      scheduled_for: nextFollowup.toISOString(),
      priority: 7,
      payload: { opportunity_id, followup_number: followup_number + 1 }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    followup_number,
    body: followupContent.body
  }), { headers: { 'Content-Type': 'application/json' } });
});

=================================================================
ÉTAPE 6 — EDGE FUNCTION : RÉPONSE EMAIL AUTOMATIQUE
=================================================================

--- supabase/functions/agent-email-reply/index.ts ---

Cette fonction est appelée par le webhook email (Sendgrid Inbound Parse).
Quand un recruteur envoie un email à l'utilisateur, Searcher répond
automatiquement si email_auto_reply = true.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const formData = await req.formData();
  const from = formData.get('from')?.toString() || '';
  const subject = formData.get('subject')?.toString() || '';
  const body = formData.get('text')?.toString() || '';
  const to = formData.get('to')?.toString() || '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Identifier l'utilisateur destinataire
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('email', to)
    .single();

  if (!profile) return new Response('User not found', { status: 404 });

  // Vérifier si l'auto-reply est activé
  const { data: schedule } = await supabase
    .from('agent_schedules')
    .select('email_auto_reply, quiet_hours_start, quiet_hours_end, timezone')
    .eq('user_id', profile.id)
    .single();

  // Sauvegarder l'email entrant
  const { data: thread } = await supabase
    .from('email_threads')
    .insert({
      user_id: profile.id,
      subject,
      from_email: extractEmail(from),
      from_name: extractName(from),
      company: extractCompanyFromEmail(from, subject),
      direction: 'incoming',
      body_preview: body.slice(0, 200),
      full_body: body,
      searcher_replied: false
    })
    .select()
    .single();

  // Notifier l'utilisateur
  await supabase.from('notifications').insert({
    user_id: profile.id,
    type: 'email_received',
    title: `📨 Email reçu de ${extractName(from)}`,
    message: `Sujet : ${subject}. ${schedule?.email_auto_reply ? 'Searcher prépare une réponse.' : 'Répondez maintenant pour ne pas manquer cette opportunité.'}`,
    requires_action: !schedule?.email_auto_reply
  });

  // Si auto-reply activé → générer et envoyer la réponse
  if (schedule?.email_auto_reply) {
    const geminiKey = Deno.env.get('GEMINI_API_KEY')!;

    // Analyser le sentiment et l'intent
    const analysisRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyse cet email d'un recruteur et génère la meilleure réponse pour le candidat.

PROFIL CANDIDAT :
Nom : ${profile.full_name}
Domaine : ${profile.domain}
Template de réponse : ${profile.response_template || 'professionnel et enthousiaste'}

EMAIL REÇU :
De : ${from}
Sujet : ${subject}
Corps : ${body.slice(0, 1000)}

Réponds UNIQUEMENT avec ce JSON :
{
  "sentiment": "positive|neutral|negative|unknown",
  "intent": "interview_invite|info_request|rejection|offer|follow_up|unknown",
  "requires_human": true/false,
  "requires_human_reason": "raison si true",
  "reply_subject": "sujet de la réponse",
  "reply_body": "corps complet de la réponse. 100-150 mots. Professionnel. Adapté au ton de l'email. Fin avec : — ${profile.full_name} | Envoyé via Searcher Connector"
}`
            }]
          }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    const aData = await analysisRes.json();
    const rawText = aData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const analysis = JSON.parse(rawText.replace(/```json|```/g, '').trim());

    // Mettre à jour le thread avec l'analyse
    await supabase.from('email_threads')
      .update({
        sentiment: analysis.sentiment,
        requires_human: analysis.requires_human,
        reply_body: analysis.reply_body,
        searcher_replied: !analysis.requires_human
      })
      .eq('id', thread?.id);

    if (!analysis.requires_human) {
      // Logger l'action
      await supabase.from('agent_actions').insert({
        user_id: profile.id,
        action_type: 'email_response',
        output_data: {
          from,
          subject,
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          reply: analysis.reply_body
        },
        result: `Réponse auto envoyée à ${extractName(from)} (${analysis.intent})`,
        success: true,
        auto_promo_sent: true
      });

      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'email_replied',
        title: `✅ Searcher a répondu à ${extractName(from)}`,
        message: `Email de ${extractName(from)} — Intent détecté : ${analysis.intent}. Réponse envoyée automatiquement.`,
        action_url: '/agent/emails',
        action_label: 'Voir la réponse'
      });
    } else {
      // Demander intervention humaine
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'human_action_required',
        title: `🚨 Action urgente requise`,
        message: `Email de ${extractName(from)} nécessite votre attention personnelle : ${analysis.requires_human_reason}`,
        action_url: '/agent/emails',
        action_label: 'Répondre maintenant',
        requires_action: true
      });
    }
  }

  return new Response('OK', { status: 200 });
});

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/);
  return match ? match[1] : from;
}
function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1].trim() : from;
}
function extractCompanyFromEmail(from: string, subject: string): string {
  const emailDomain = extractEmail(from).split('@')[1]?.split('.')[0] || '';
  return emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1);
}

=================================================================
ÉTAPE 7 — EDGE FUNCTION : SURVEILLANCE CONTINUE
=================================================================

--- supabase/functions/agent-surveillance/index.ts ---

Même après avoir trouvé un emploi, Searcher continue de surveiller
pour détecter de meilleures opportunités (sauf si désactivé).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Charger tous les utilisateurs avec surveillance active
  const { data: users } = await supabase
    .from('users_profiles')
    .select('id, full_name, domain, salary_max, currency')
    .eq('surveillance_active', true)
    .in('verification_status', ['verified', 'genius']);

  if (!users || users.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }));
  }

  let processed = 0;

  for (const user of users) {
    // Chercher des opportunités avec salaire supérieur au seuil
    const { data: schedule } = await supabase
      .from('agent_schedules')
      .select('surveillance_threshold_percent')
      .eq('user_id', user.id)
      .single();

    const threshold = (schedule?.surveillance_threshold_percent || 15) / 100;
    const currentSalary = user.salary_max || 0;
    const minBetterSalary = currentSalary * (1 + threshold);

    // Chercher via Serper des offres avec salaires plus élevés
    const serperKey = Deno.env.get('SERPER_API_KEY')!;
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: `"${user.domain}" job salary high offer 2025 2026 site:linkedin.com OR site:indeed.com`,
        num: 5
      })
    });

    const data = await res.json();
    const results = data.organic || [];

    if (results.length > 0) {
      await supabase.from('agent_actions').insert({
        user_id: user.id,
        action_type: 'surveillance_check',
        output_data: { results_count: results.length, min_better_salary: minBetterSalary },
        result: `Surveillance: ${results.length} nouvelles opportunités potentielles détectées`,
        success: true
      });

      // Notification surveillance
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'surveillance_alert',
        title: '🔭 Surveillance — Nouvelles opportunités',
        message: `Searcher a détecté ${results.length} offres potentiellement supérieures à votre situation actuelle (+${schedule?.surveillance_threshold_percent || 15}%). Souhaitez-vous les explorer ?`,
        action_url: '/opportunites',
        action_label: 'Explorer les opportunités',
        requires_action: false
      });
    }

    processed++;
  }

  return new Response(JSON.stringify({ processed }));
});

=================================================================
ÉTAPE 8 — EDGE FUNCTION : PRÉPARATION ENTRETIEN
=================================================================

--- supabase/functions/agent-interview-prep/index.ts ---

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { user_id, opportunity_id, interview_date, interview_type } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const [{ data: profile }, { data: opp }] = await Promise.all([
    supabase.from('users_profiles').select('*').eq('id', user_id).single(),
    supabase.from('opportunities').select('*').eq('id', opportunity_id).single(),
  ]);

  if (!profile || !opp) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY')!;

  // Rechercher des infos sur l'entreprise via Serper
  const serperKey = Deno.env.get('SERPER_API_KEY')!;
  let companyInfo = '';
  try {
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${opp.company} company overview culture values 2025`, num: 5 })
    });
    const sData = await serperRes.json();
    companyInfo = (sData.organic || []).slice(0, 3).map((r: any) => r.snippet).join(' | ');
  } catch (e) {
    companyInfo = 'Informations non disponibles';
  }

  // Générer la préparation avec Gemini
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Tu es un coach de carrière expert. Prépare ${profile.full_name} pour son entretien.

PROFIL :
Domaine : ${profile.domain}
Bio : ${profile.bio || 'Non renseignée'}
Type d'entretien : ${interview_type}

POSTE :
Titre : ${opp.title}
Entreprise : ${opp.company}
Localisation : ${opp.location}
Raison du match : ${opp.match_reason}

INFORMATIONS ENTREPRISE :
${companyInfo}

Génère UN JSON complet :
{
  "company_research": "Résumé de 3 paragraphes sur l'entreprise : mission, culture, actualités récentes, points forts",
  "likely_questions": [
    {
      "question": "question d'entretien probable",
      "category": "comportemental|technique|motivationnel|situationnel",
      "why_asked": "pourquoi cette question pour ce poste"
    }
  ],
  "suggested_answers": [
    {
      "question": "même question",
      "answer_framework": "réponse suggérée adaptée au profil (méthode STAR si comportemental)",
      "key_points": ["point 1", "point 2", "point 3"]
    }
  ],
  "talking_points": "3-4 sujets à aborder proactivement pour impressionner",
  "red_flags": "Points sensibles à éviter ou à préparer à justifier",
  "salary_strategy": "Stratégie de négociation salariale adaptée au marché et au poste"
}

JSON uniquement, sans texte avant ou après.`
          }]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );

  const gData = await geminiRes.json();
  const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const prep = JSON.parse(rawText.replace(/```json|```/g, '').trim());

  // Sauvegarder la préparation
  const { data: saved } = await supabase
    .from('interview_preps')
    .insert({
      user_id,
      opportunity_id,
      interview_date: interview_date || null,
      interview_type: interview_type || 'video',
      company_research: prep.company_research,
      likely_questions: prep.likely_questions,
      suggested_answers: prep.suggested_answers,
      talking_points: prep.talking_points,
      red_flags: prep.red_flags,
      salary_strategy: prep.salary_strategy
    })
    .select()
    .single();

  // Logger
  await supabase.from('agent_actions').insert({
    user_id,
    action_type: 'schedule_interview_prep',
    opportunity_id,
    output_data: { questions_count: prep.likely_questions?.length || 0 },
    result: `Préparation entretien générée pour ${opp.title} chez ${opp.company}`,
    success: true
  });

  // Notification
  await supabase.from('notifications').insert({
    user_id,
    type: 'interview_prep_ready',
    title: `🎯 Préparation entretien prête — ${opp.company}`,
    message: `${prep.likely_questions?.length || 0} questions probables, stratégie salariale, points forts à mettre en avant. Tout est prêt pour votre entretien.`,
    action_url: `/entretiens/${saved?.id}`,
    action_label: 'Voir ma préparation'
  });

  return new Response(JSON.stringify({ success: true, prep_id: saved?.id }));
});

=================================================================
ÉTAPE 9 — HOOKS REACT (COUCHE 3)
=================================================================

--- src/hooks/useAgent.ts ---

Hook principal pour interagir avec l'agent depuis le frontend.

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useAgent() {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const launchScan = async () => {
    if (!user || scanning) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-scan', {
        body: { user_id: user.id, manual: true }
      });
      if (error) throw error;
      setLastResult(data);
      return data;
    } catch (e) {
      console.error('Scan failed:', e);
      return null;
    } finally {
      setScanning(false);
    }
  };

  const generateInterviewPrep = async (opportunityId: string, interviewDate?: string, interviewType?: string) => {
    if (!user) return null;
    const { data, error } = await supabase.functions.invoke('agent-interview-prep', {
      body: {
        user_id: user.id,
        opportunity_id: opportunityId,
        interview_date: interviewDate,
        interview_type: interviewType || 'video'
      }
    });
    if (error) throw error;
    return data;
  };

  const getAgentActions = async (limit = 20) => {
    if (!user) return [];
    const { data } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  };

  const getEmailThreads = async () => {
    if (!user) return [];
    const { data } = await supabase
      .from('email_threads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    return data || [];
  };

  const getSchedule = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('agent_schedules')
      .select('*')
      .eq('user_id', user.id)
      .single();
    return data;
  };

  const updateSchedule = async (updates: Partial<any>) => {
    if (!user) return;
    await supabase
      .from('agent_schedules')
      .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() });
  };

  return {
    scanning,
    lastResult,
    launchScan,
    generateInterviewPrep,
    getAgentActions,
    getEmailThreads,
    getSchedule,
    updateSchedule
  };
}

--- src/hooks/useAgentRealtime.ts ---

Subscription realtime pour les actions de l'agent en cours.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useAgentRealtime() {
  const { user } = useAuth();
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [pendingQueue, setPendingQueue] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('agent_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_actions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setRecentActions(prev => [payload.new, ...prev].slice(0, 20));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_queue',
        filter: `user_id=eq.${user.id}`
      }, async () => {
        const { count } = await supabase
          .from('agent_queue')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'pending');
        setPendingQueue(count || 0);
      })
      .subscribe();

    // Charger les actions récentes
    supabase
      .from('agent_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setRecentActions(data || []));

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { recentActions, pendingQueue };
}

=================================================================
ÉTAPE 10 — PAGE : AGENT DASHBOARD
=================================================================

--- src/pages/AgentDashboard.tsx ---

Route : /agent

Cette page est le centre de commande de l'agent autonome.
C'est là que l'utilisateur voit TOUT ce que Searcher fait en son nom.

STRUCTURE (4 sections) :

SECTION 1 — Statut live :
Card avec animation pulse verte "● Agent Actif"
Log en temps réel des 10 dernières actions (défile automatiquement)
Chaque ligne : horodatage + icône action + résultat + badge auto-promo si applicable
Bouton "Lancer scan maintenant" → appelle launchScan()
Spinner pendant le scan avec texte animé :
  "Scan Indeed..." → "Analyse LinkedIn..." → "Scoring Gemini..." → "Terminé"

SECTION 2 — File d'attente planifiée :
Liste des tâches dans agent_queue avec status
Colonnes : Type | Planifié pour | Priorité | Statut
Statuts colorés : pending (gold) | running (bleu) | done (vert) | failed (rouge)
Bouton "Annuler" sur les tâches pending

SECTION 3 — Emails & WhatsApp :
Onglets : "Emails" | "WhatsApp"
Emails : liste des email_threads, direction, sentiment (emoji), replied
WhatsApp : liste whatsapp_messages + config connexion (numéro téléphone)
Chaque email : bouton "Voir la réponse de Searcher" → modal

SECTION 4 — Configuration de l'agent :
(reprend la page Settings Couche 1 mais centrée sur l'agent)
Fréquence scan : slider 1h-24h
Seuil auto-apply : slider 0-100 (sous: "Postuler automatiquement si score ≥ X")
Seuil approbation : slider
Heures silencieuses : heure début + fin
Toggle email auto-reply
Toggle WhatsApp auto-reply
Toggle surveillance continue

CODE COMPLET :

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAgent } from '../hooks/useAgent';
import { useAgentRealtime } from '../hooks/useAgentRealtime';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Zap, Mail, MessageCircle, Settings,
  CheckCircle, Clock, XCircle, Loader, Play
} from 'lucide-react';

const ACTION_ICONS: Record<string, string> = {
  search_scan: '🔍',
  auto_apply: '✅',
  email_response: '📧',
  whatsapp_response: '💬',
  follow_up_sent: '📨',
  diversification_warning: '⚠️',
  international_alert: '🌍',
  surveillance_check: '🔭',
  schedule_interview_prep: '🎯',
  cv_adapted: '📄',
  cover_generated: '✍️',
};

export default function AgentDashboard() {
  const { user, profile } = useAuth();
  const { scanning, launchScan, getEmailThreads, getSchedule, updateSchedule } = useAgent();
  const { recentActions, pendingQueue } = useAgentRealtime();
  const [activeTab, setActiveTab] = useState<'status' | 'queue' | 'communications' | 'config'>('status');
  const [queue, setQueue] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [queueData, emailData, scheduleData] = await Promise.all([
      supabase.from('agent_queue').select('*').eq('user_id', user.id)
        .order('scheduled_for', { ascending: true }).limit(20),
      getEmailThreads(),
      getSchedule()
    ]);
    setQueue(queueData.data || []);
    setEmails(emailData);
    setSchedule(scheduleData);
  };

  const handleScan = async () => {
    const steps = [
      'Connexion à Indeed, LinkedIn, Glassdoor...',
      'Scan RemoteOK, Wellfound, Jobberman...',
      'Analyse des 40+ plateformes...',
      'Scoring Gemini en cours...',
      'Filtrage des offres suspectes...',
      'Vérification diversification...',
      'Préparation candidatures automatiques...',
      'Enregistrement des résultats...'
    ];
    setScanLog([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setScanLog(prev => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    const result = await launchScan();
    clearInterval(interval);
    if (result) {
      setScanLog(prev => [
        ...prev,
        `✅ Scan terminé : ${result.found} opportunités trouvées, ${result.auto_applied} candidatures envoyées automatiquement.`
      ]);
    }
    loadData();
  };

  const cancelTask = async (taskId: string) => {
    await supabase.from('agent_queue')
      .update({ status: 'cancelled' })
      .eq('id', taskId);
    loadData();
  };

  const handleScheduleChange = async (key: string, value: any) => {
    const updated = { ...schedule, [key]: value };
    setSchedule(updated);
    await updateSchedule({ [key]: value });
  };

  const tabs = [
    { id: 'status', label: 'Statut Live', icon: '⚡' },
    { id: 'queue', label: `File d'attente (${pendingQueue})`, icon: '📋' },
    { id: 'communications', label: 'Emails & WA', icon: '📨' },
    { id: 'config', label: 'Configuration', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-syne text-2xl font-bold text-white">Agent Searcher</h1>
            <p className="text-sm text-gray-400 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Actif 24h/24 · {pendingQueue} tâches planifiées
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 bg-gold text-black px-5 py-2.5 rounded-lg font-syne font-bold text-sm hover:bg-gold-light disabled:opacity-50 transition-colors"
          >
            {scanning ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
            {scanning ? 'Scan en cours...' : 'Lancer un scan'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-gold border-gold'
                  : 'text-gray-500 border-transparent hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Status Live */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* Scan log */}
            {scanLog.length > 0 && (
              <div className="bg-black-card border border-gold/30 rounded-xl p-4">
                <div className="font-syne text-sm font-bold text-gold mb-3">⚡ Scan en cours</div>
                {scanLog.map((line, i) => (
                  <div key={i} className="text-xs text-gray-300 py-1 border-b border-gray-800/50 last:border-0 font-mono">
                    <span className="text-gray-600 mr-2">{new Date().toLocaleTimeString('fr-FR')}</span>
                    {line}
                  </div>
                ))}
              </div>
            )}

            {/* Recent actions */}
            <div className="bg-black-card border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <span className="font-syne font-bold text-sm text-white">Journal des actions</span>
                <span className="text-xs text-gray-500">{recentActions.length} actions récentes</span>
              </div>
              {recentActions.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-sm">
                  Aucune action pour l'instant. Lancez un scan pour commencer.
                </div>
              ) : (
                recentActions.map(action => (
                  <div key={action.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0 hover:bg-black/30">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {ACTION_ICONS[action.action_type] || '🤖'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{action.result}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDistanceToNow(new Date(action.created_at), { addSuffix: true, locale: fr })}
                        {action.execution_ms > 0 && ` · ${(action.execution_ms / 1000).toFixed(1)}s`}
                      </div>
                    </div>
                    {action.auto_promo_sent && (
                      <span className="text-xs text-gold/60 flex-shrink-0">● promo</span>
                    )}
                    {action.success ? (
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle size={14} className="text-red-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Queue */}
        {activeTab === 'queue' && (
          <div className="bg-black-card border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Tâche</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Planifié</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Priorité</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-600 text-sm">
                      Aucune tâche planifiée
                    </td>
                  </tr>
                ) : queue.map(task => (
                  <tr key={task.id} className="border-b border-gray-800/50 hover:bg-black/20">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{task.task_type.replace(/_/g, ' ')}</div>
                      {task.payload?.opportunity_id && (
                        <div className="text-xs text-gray-500">Relance #{task.payload.followup_number}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(task.scheduled_for), { addSuffix: true, locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-4 rounded-sm ${i < Math.ceil(task.priority / 2) ? 'bg-gold' : 'bg-gray-700'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.status === 'pending' ? 'bg-gold/10 text-gold' :
                        task.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                        task.status === 'done' ? 'bg-green-500/10 text-green-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.status === 'pending' && (
                        <button
                          onClick={() => cancelTask(task.id)}
                          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                        >
                          Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Communications */}
        {activeTab === 'communications' && (
          <div className="space-y-3">
            {emails.length === 0 ? (
              <div className="bg-black-card border border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
                Aucun email géré par Searcher pour l'instant.
              </div>
            ) : emails.map(email => (
              <div key={email.id} className="bg-black-card border border-gray-800 rounded-xl p-4 hover:border-gold/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-white">{email.from_name || email.from_email}</span>
                      {email.company && (
                        <span className="text-xs text-gray-500">· {email.company}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{email.subject}</div>
                    <div className="text-xs text-gray-500">{email.body_preview}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      email.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' :
                      email.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {email.sentiment === 'positive' ? '😊' :
                       email.sentiment === 'negative' ? '😞' : '😐'} {email.sentiment || 'inconnu'}
                    </span>
                    {email.searcher_replied ? (
                      <span className="text-xs text-green-400">✅ Searcher a répondu</span>
                    ) : email.requires_human ? (
                      <span className="text-xs text-gold">⚠️ Votre action requise</span>
                    ) : (
                      <span className="text-xs text-gray-600">En attente</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Config */}
        {activeTab === 'config' && schedule && (
          <div className="space-y-4">

            <div className="bg-black-card border border-gray-800 rounded-xl p-5">
              <div className="font-syne font-bold text-sm text-white mb-4">⏰ Fréquence de scan</div>
              <div className="flex items-center gap-4">
                <input
                  type="range" min="1" max="24" step="1"
                  value={schedule.scan_frequency_hours}
                  onChange={e => handleScheduleChange('scan_frequency_hours', parseInt(e.target.value))}
                  className="flex-1 accent-gold"
                />
                <span className="text-gold font-syne font-bold text-lg w-16 text-right">
                  {schedule.scan_frequency_hours}h
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Scan automatique toutes les {schedule.scan_frequency_hours} heures</div>
            </div>

            <div className="bg-black-card border border-gray-800 rounded-xl p-5">
              <div className="font-syne font-bold text-sm text-white mb-4">🎯 Seuil de candidature automatique</div>
              <div className="flex items-center gap-4">
                <input
                  type="range" min="50" max="100" step="5"
                  value={schedule.auto_apply_threshold}
                  onChange={e => handleScheduleChange('auto_apply_threshold', parseInt(e.target.value))}
                  className="flex-1 accent-gold"
                />
                <span className="text-gold font-syne font-bold text-lg w-16 text-right">
                  {schedule.auto_apply_threshold}+
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Searcher postule automatiquement si score ≥ {schedule.auto_apply_threshold}/100</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'email_auto_reply', label: '📧 Réponses email auto', desc: 'Searcher répond aux recruteurs' },
                { key: 'whatsapp_auto_reply', label: '💬 Réponses WhatsApp auto', desc: 'Searcher gère les messages WA' },
                { key: 'surveillance_active', label: '🔭 Surveillance continue', desc: 'Même après avoir trouvé un poste' },
              ].map(item => (
                <div key={item.key} className="bg-black-card border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => handleScheduleChange(item.key, !schedule[item.key])}
                      className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                        schedule[item.key] ? 'bg-gold' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        schedule[item.key] ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

=================================================================
ÉTAPE 11 — PAGE : ENTRETIENS
=================================================================

--- src/pages/InterviewPreps.tsx ---

Route : /entretiens

Liste toutes les préparations d'entretien de l'utilisateur.

AFFICHAGE :
- Card par entretien : entreprise + poste + date + type
- Badge "Rappel envoyé" si reminder_sent
- Clic → InterviewPrepDetail

--- src/pages/InterviewPrepDetail.tsx ---

Route : /entretiens/:id

SECTIONS :

1. HEADER :
   - Entreprise + poste + date + type badge
   - Countdown : "Entretien dans 2 jours 14h"
   - Bouton "Générer nouvelle préparation" si stale

2. RECHERCHE ENTREPRISE :
   - Texte formaté (company_research)
   - "Ce que vous devez savoir avant d'entrer dans la salle"

3. QUESTIONS PROBABLES + RÉPONSES :
   Accordéon : chaque question → expand pour voir la réponse suggérée
   Catégories avec couleurs : comportemental (or) | technique (bleu) | motivationnel (vert)
   Bouton "Je maîtrise" → check vert (localStorage)

4. POINTS À ABORDER :
   Liste des talking_points avec icône ✅

5. POINTS SENSIBLES :
   Alerte orange : red_flags

6. STRATÉGIE SALARIALE :
   Card spéciale : salary_strategy
   "Ne révélez jamais en premier. Contre-proposez toujours."

7. MINUTERIE D'ENTRAÎNEMENT :
   Bouton "S'entraîner" → mode Q&R
   Timer 2 min par question
   L'utilisateur écrit sa réponse → Claude la note

=================================================================
ÉTAPE 12 — MISE À JOUR DE LA PAGE PARAMÈTRES (COUCHE 1)
=================================================================

Ouvre src/pages/Settings.tsx et AJOUTE la section "Agent" :

SECTION AGENT (nouvelle) :
Lien vers "/agent" avec description
Résumé du planning actuel
Toggle rapide : "Activer le scan automatique"
Dernier scan : date et résultat

Cette section remplace le contenu existant sur la surveillance.
Ne supprime PAS les autres sections de Settings.

=================================================================
ÉTAPE 13 — MISE À JOUR DES ROUTES
=================================================================

Ouvre src/App.tsx et AJOUTE :

<Route path="/agent" element={<AgentDashboard />} />
<Route path="/entretiens" element={<InterviewPreps />} />
<Route path="/entretiens/:prepId" element={<InterviewPrepDetail />} />

=================================================================
ÉTAPE 14 — MISE À JOUR DE LA NAVIGATION
=================================================================

SIDEBAR (desktop) — AJOUTE dans la section "Outils" :
🤖 Agent 24/7    → /agent     (avec badge "LIVE" vert animé)
🎯 Entretiens    → /entretiens

BOTTOM TABS (mobile) — les tabs actuels restent.
Ajoute "🤖 Agent" comme 5ème tab si possible.
Sinon, accessible depuis le Dashboard via bouton rapide.

=================================================================
ÉTAPE 15 — INITIALISATION AU SIGNUP
=================================================================

Ouvre src/pages/Signup.tsx et AJOUTE après la création du profil :

// Initialiser le scheduler de l'agent
await supabase.from('agent_schedules').insert({
  user_id: newUser.id,
  scan_frequency_hours: 6,
  scan_times: ['07:00', '13:00', '19:00'],
  followup_delay_days: 3,
  max_followups: 2,
  auto_apply_threshold: 80,
  require_approval_below: 70,
  surveillance_active: false,
  email_auto_reply: false,
  whatsapp_auto_reply: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
});

// Générer les templates de réponse par défaut via Gemini
await supabase.functions.invoke('generate-default-templates', {
  body: { user_id: newUser.id }
});

// Lancer le premier scan automatiquement après 10 secondes
setTimeout(() => {
  supabase.functions.invoke('agent-scan', {
    body: { user_id: newUser.id, manual: false }
  });
}, 10000);

=================================================================
ÉTAPE 16 — EDGE FUNCTION : GÉNÉRATION TEMPLATES PAR DÉFAUT
=================================================================

--- supabase/functions/generate-default-templates/index.ts ---

Appelée une seule fois au signup pour préremplir les templates
de réponse personnalisés pour chaque utilisateur.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { user_id } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('full_name, domain, profile_type')
    .eq('id', user_id)
    .single();

  if (!profile) return new Response('Not found', { status: 404 });

  const geminiKey = Deno.env.get('GEMINI_API_KEY')!;
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Génère 4 templates d'email professionnels pour ${profile.full_name}, expert en ${profile.domain}.

Types à générer :
1. initial_response : réponse initiale à un recruteur (enthousiaste mais sobre)
2. follow_up_1 : première relance douce (3 jours après candidature)
3. follow_up_2 : deuxième relance directe (6 jours après)
4. interview_confirm : confirmation de disponibilité pour un entretien

Retourne UN JSON :
[
  {
    "template_type": "initial_response|follow_up_1|follow_up_2|interview_confirm",
    "subject_template": "Objet avec {company} et {position} comme variables",
    "body_template": "Corps avec {company}, {position}, {name}, {date} comme variables. 80-120 mots max. Fin avec : — ${profile.full_name} | Envoyé via Searcher Connector — searcherconnector.com"
  }
]

JSON uniquement.`
          }]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );

  const data = await geminiRes.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const templates = JSON.parse(raw.replace(/```json|```/g, '').trim());

  const toInsert = templates.map((t: any) => ({
    user_id,
    ...t,
    tone: 'professional',
    generated_by: 'gemini',
    is_active: true
  }));

  await supabase.from('response_templates').insert(toInsert);

  return new Response(JSON.stringify({ created: toInsert.length }));
});

=================================================================
ÉTAPE 17 — AFFICHAGE DANS LE DASHBOARD PRINCIPAL (COUCHE 1)
=================================================================

Ouvre src/pages/Dashboard.tsx et AJOUTE :

1. Dans la section top, en dessous de la card KPI "Candidatures" :
   Une mini-card "Agent Searcher" avec :
   - Pulse vert "● Actif"
   - Dernière action (depuis agent_actions, 1 ligne)
   - Bouton "⚡ Lancer scan" → appelle launchScan()

2. Dans le log de scan existant (agent_scan_bar) :
   Afficher les 3 dernières actions depuis agent_actions
   au lieu de données statiques.

=================================================================
ÉTAPE 18 — EDGE FUNCTION CRON DISPATCHER
=================================================================

--- supabase/functions/agent-cron-dispatcher/index.ts ---

Cette fonction est appelée par le cron Supabase toutes les 15 minutes.
Elle lit la agent_queue et exécute les tâches dues.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Récupérer les tâches dues et non traitées
  const { data: tasks } = await supabase
    .from('agent_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: false })
    .limit(10);

  if (!tasks || tasks.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }));
  }

  let processed = 0;

  for (const task of tasks) {
    // Marquer comme en cours
    await supabase.from('agent_queue')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', task.id);

    try {
      let functionName = '';
      let body: any = { user_id: task.user_id };

      switch (task.task_type) {
        case 'daily_scan':
          functionName = 'agent-scan';
          break;
        case 'followup_check':
          functionName = 'agent-followup';
          body = { ...body, ...task.payload };
          break;
        case 'surveillance_scan':
          functionName = 'agent-surveillance';
          break;
        default:
          await supabase.from('agent_queue')
            .update({ status: 'cancelled' })
            .eq('id', task.id);
          continue;
      }

      // Invoquer la fonction
      const { error } = await supabase.functions.invoke(functionName, { body });

      await supabase.from('agent_queue')
        .update({
          status: error ? 'failed' : 'done',
          attempts: task.attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      processed++;
    } catch (e) {
      await supabase.from('agent_queue')
        .update({
          status: task.attempts >= task.max_attempts ? 'failed' : 'pending',
          attempts: task.attempts + 1,
          scheduled_for: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
    }
  }

  return new Response(JSON.stringify({ processed }));
});

-- Cron Supabase pour déclencher le dispatcher --
-- À exécuter dans SQL Editor :
select cron.schedule(
  'agent-cron-dispatcher',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/agent-cron-dispatcher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

=================================================================
ÉTAPE 19 — DÉPLOIEMENT DES EDGE FUNCTIONS
=================================================================

Dans ton terminal, depuis la racine du projet :

# Installer Supabase CLI si pas encore fait
npm install -g supabase

# Login
supabase login

# Lier au projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer toutes les Edge Functions
supabase functions deploy agent-scan
supabase functions deploy agent-followup
supabase functions deploy agent-email-reply
supabase functions deploy agent-surveillance
supabase functions deploy agent-interview-prep
supabase functions deploy generate-default-templates
supabase functions deploy agent-cron-dispatcher

# Vérifier les secrets
supabase secrets set GEMINI_API_KEY=your_key
supabase secrets set SERPER_API_KEY=your_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key

=================================================================
ÉTAPE 20 — VÉRIFICATION FINALE COUCHE 3
=================================================================

Lance : npm run dev

Vérifie que TOUT fonctionne (en plus des checks couches 1 et 2) :

✅ Page /agent s'affiche avec les 4 onglets
✅ Bouton "Lancer scan" déclenche l'Edge Function agent-scan
✅ Le scan log s'affiche étape par étape pendant le scan
✅ Les actions apparaissent en temps réel dans le journal
✅ Les opportunités sont créées en base après le scan
✅ Les candidatures auto sont créées si score >= seuil
✅ Les notifications apparaissent (scan terminé, candidature envoyée)
✅ L'alerte diversification se déclenche si < 5 offres actives
✅ L'alerte internationale se déclenche pour les offres étrangères
✅ La file d'attente affiche les follow-ups planifiés
✅ Annuler une tâche dans la queue fonctionne
✅ La page /entretiens liste les préparations
✅ Générer une préparation via l'Edge Function fonctionne
✅ La préparation affiche questions, réponses, stratégie salariale
✅ Les templates sont créés au signup
✅ La config de l'agent se sauvegarde (sliders + toggles)
✅ Les toggles email_auto_reply et whatsapp_auto_reply sont persistants
✅ La sidebar affiche "🤖 Agent" avec badge vert
✅ Le Dashboard principal affiche l'état de l'agent
✅ Le cron dispatcher est configuré dans Supabase
✅ Zéro fond blanc
✅ Zéro bouton cassé
✅ Build : npm run build passe sans erreurs TypeScript

=================================================================
NOTES POUR OPENHANDS — COUCHE 3
=================================================================

1. Les Edge Functions Supabase sont en Deno (pas Node.js).
   Importer depuis https://esm.sh/ pour les packages npm.
   Exemple : import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

2. Pour tester les Edge Functions en local :
   supabase functions serve agent-scan --env-file .env.local
   Puis : curl -X POST http://localhost:54321/functions/v1/agent-scan \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -d '{"user_id":"test-uuid"}'

3. Gemini Flash vs Pro :
   - gemini-1.5-flash : scoring rapide (batches d'offres), templates, follow-ups
   - gemini-1.5-pro : préparation entretien (plus détaillée, contexte large)

4. La Serper API est limitée à 2500 req/mois en plan gratuit.
   En production : passer au plan payant ou implémenter un cache Redis.
   Pour le MVP : mettre en cache les résultats 6h dans Supabase.

5. Le webhook email (agent-email-reply) nécessite :
   - Un compte Sendgrid avec Inbound Parse activé
   - Le webhook pointant vers ton URL Edge Function
   Pour le MVP, simuler avec un bouton "Simuler email entrant" dans l'UI.

6. WhatsApp Business API (MVP 3) :
   Actuellement simulé. Pour une vraie intégration :
   - Meta Business Account
   - WhatsApp Cloud API
   - Webhook configuré sur l'Edge Function

7. Pour les heures silencieuses :
   Vérifier le timezone de l'utilisateur avant d'envoyer des notifications.
   Utiliser : new Date().toLocaleTimeString('fr-FR', { timeZone: schedule.timezone })

8. Sécurité : les Edge Functions qui reçoivent des webhooks externes
   (Sendgrid, WhatsApp) doivent vérifier une signature HMAC.
   Implémenter cette vérification en production.

9. L'auto-promo_sent = true doit être ajouté à CHAQUE action de l'agent.
   C'est le moteur de croissance organique : chaque email envoyé par Searcher
   se termine par la signature avec le lien searcherconnector.com

10. Ne jamais envoyer de notifications pendant les heures silencieuses
    (quiet_hours_start à quiet_hours_end).
    Les mettre en queue et les envoyer à la reprise.

=================================================================
FIN DU PROMPT COUCHE 3
=================================================================
La Couche 3 est maintenant le VPS de trading de carrière :
un agent qui agit SEUL, SANS que l'utilisateur soit connecté,
24 heures sur 24, 7 jours sur 7.

Couche 4 = VC Tracking Orange Merchant + Préparation entretiens investisseurs
Couche 5 = Stripe paiements + webhooks + plans + essai gratuit
Couche 6 = Analytics avancées + dashboard croissance + parrainage
Couche 7 = App native React Native + Extension Chrome
Couche 8 = Modèle IA propriétaire entraîné sur données Searcher
=================================================================
