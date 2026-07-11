================================================================
SEARCHER CONNECTOR — ULTIMATE COMPLETE PROMPT
================================================================
YOU ARE A SENIOR FULL-STACK DEVELOPER WITH 15 YEARS OF EXPERIENCE.
BUILD THIS APPLICATION EXACTLY AS DESCRIBED. DO NOT SKIP ANYTHING.
THIS IS NOT A PROTOTYPE. THIS IS A PRODUCTION-READY APPLICATION.
================================================================

BEFORE YOU WRITE A SINGLE LINE OF CODE:
1. Read this entire prompt from top to bottom without skipping.
2. Do a mental benchmark of LinkedIn, Indeed, Upwork, AngelList,
   Apollo, Clay, Hims & Hers, Calendly, and Stripe.
   Take what they do best. Improve on everything.
3. If during coding you identify a missing feature, UX improvement,
   or best practice from any competitor — ADD IT without asking.
   You are a senior developer. You decide like one.
4. Write clean, organised, maintainable code.
5. After building each section, test it yourself mentally.
   Fix your own bugs before moving to the next section.
6. Before considering the work done, verify every single item
   in the FINAL CHECKLIST at the end of this prompt.
7. Zero white backgrounds. Zero placeholder data.
   Zero broken buttons. Zero incomplete features.
8. This app must work as intended from day one.

================================================================
WHAT THIS APP IS
================================================================

SEARCHER CONNECTOR is a global autonomous AI opportunity agent.
It is NOT a job board. NOT a social network. NOT a freelance
marketplace. It is a new category that has never existed before:

"An agent that works for you 24/7 — like a VPS trading bot
that never stops — finding opportunities, applying, responding,
connecting, and growing — while you sleep."

The founding principle:
"What Searcher can do alone → it does immediately.
 What it cannot → it alerts the user every 30 minutes
 until they act."

Built from Douala, Cameroon.
By someone who refused to wait for the right conditions.
searcherconnector.com

================================================================
ENVIRONMENT VARIABLES
================================================================

VITE_SUPABASE_URL = [user's Supabase URL]
VITE_SUPABASE_ANON_KEY = [user's Supabase anon key]
VITE_GEMINI_API_KEY = [user's Gemini API key]
VITE_SERPER_API_KEY = [user's Serper API key]
VITE_APIFY_API_KEY = [user's Apify API key]
VITE_STRIPE_PUBLISHABLE_KEY = [user's Stripe publishable key]
STRIPE_SECRET_KEY = [user's Stripe secret key]
VITE_FOUNDER_EMAIL = stephanenana.pro@gmail.com

================================================================
GEOGRAPHIC COVERAGE — ABSOLUTE NON-NEGOTIABLE RULE
================================================================

ALL searches cover ALL countries in the world simultaneously.
Africa, Asia, Americas, Europe, Oceania, Middle East, Pacific.
NO geographic filter by default. Default = worldwide. Always.
User can RESTRICT geography — but never the default.
Searcher never limits itself to one region or continent.

================================================================
DESIGN SYSTEM — EVERY PIXEL MATTERS
================================================================

Background primary:    #0A0A0A
Card background:       #111111
Card dark variant:     #141414
Gold primary:          #D4AF37
Gold dark background:  #1A1500
Cyan accent:           #00FFFF
Text white:            #FFFFFF
Text gray:             #888888
Text muted:            #444444
Border default:        1px solid #2a2a2a
Border gold:           1px solid #D4AF37
Border radius cards:   12px
Border radius buttons: 8px
Button primary:        background #D4AF37, text #0A0A0A, font-bold
Button outlined:       border #D4AF37, text #D4AF37, transparent bg
Input:                 bg #111111, border #2a2a2a, text white
                       focus: border #D4AF37
Font:                  Inter or system-ui sans-serif
Overall style:         Ultra premium. Like a Black American Express card.
                       Every element whispers: "This is not ordinary."

ANIMATIONS (use framer-motion):
- Pulsing gold dot: all "Active" indicators
- Smooth hover: cards get subtle gold border glow
- Scanning animation: pills light up one by one during search
- Globe 3D: slow rotation on landing, fast spin during search
- Count-up: metric numbers animate on load
- Tinder swipe: opportunity cards on mobile
- Score > 90: gold explosion particle animation "PERFECT MATCH"
- Page transitions: smooth fade

GLOBE 3D (use react-globe.gl or three.js):
- Landing page hero background + all active search animations
- Continents: thin gold lines #D4AF37
- Active connection points: cyan dots #00FFFF pulsing on 20+ countries
- Connection lines: animated gold arcs between countries
- Semi-transparent so foreground content is always readable
- Slow rotation on landing page
- Fast spin during any active search operation

================================================================
SPLASH SCREEN
================================================================

On every app open: full screen #0A0A0A for 2.5 seconds.
Center: "SEARCHER CONNECTOR" large bold gold.
Below: thin gold animated progress bar left to right.
Below bar: "OPPORTUNITY INTELLIGENCE" small gold text.
After 2.5s: smooth fade to Landing or Dashboard based on auth state.

================================================================
INTERNATIONALIZATION — 80+ LANGUAGES
================================================================

Library: i18next + react-i18next.
Auto-detect from browser. Language selector visible in nav.
All Gemini API responses in user's chosen language.
Voice recognition matches selected language.
RTL automatic layout for: Arabic, Hebrew, Urdu, Farsi, Pashto.

EUROPEAN: Français (fr) DEFAULT, English (en), Español (es),
Português (pt), Deutsch (de), Italiano (it), Русский (ru),
Polski (pl), Română (ro), Nederlands (nl), Svenska (sv),
Türkçe (tr), Українська (uk), Ελληνικά (el) and all others.

ASIAN: 中文简体 (zh-CN), 中文繁體 (zh-TW), 日本語 (ja),
한국어 (ko), हिन्दी (hi), বাংলা (bn), ภาษาไทย (th),
Tiếng Việt (vi), Bahasa Indonesia (id), Filipino (fil),
اردو (ur) RTL, فارسی (fa) RTL and all others.

MIDDLE EASTERN: العربية (ar) RTL, עברית (he) RTL,
Қазақша (kk), Ўзбекча (uz) and all others.

AFRICAN: Kiswahili (sw), Hausa (ha), Wolof (wo), Yorùbá (yo),
Igbo (ig), አማርኛ (am), Somali (so), Afrikaans (af),
Zulu (zu), Kinyarwanda (rw), Lingala (ln), Bambara (bm),
Fulfulde (ff), Twi (tw), Moore (mos), Malagasy (mg),
Tigrinya (ti), Oromo (om), Sesotho (st) and all others.

AMERICAS: Kreyòl ayisyen (ht), Guaraní (gn), Quechua (qu).
PACIFIC: Māori (mi), Samoan (sm), Hawaiian (haw).

Voice recognition language codes:
fr-FR, en-US, es-ES, pt-BR, de-DE, it-IT, ru-RU, ar-SA,
zh-CN, ja-JP, ko-KR, hi-IN, sw-KE, ha-NG, tr-TR, pl-PL,
nl-NL, uk-UA, id-ID, ms-MY, th-TH, vi-VN, fil-PH,
am-ET, yo-NG, ig-NG, zu-ZA, af-ZA, wo-SN and all others.

================================================================
COMPLETE SUPABASE DATABASE SCHEMA
================================================================

Run ALL of this SQL in Supabase before any code:

-- =============================================
-- CORE USER TABLE
-- =============================================
create table if not exists users_profiles (
  id uuid references auth.users primary key,
  full_name text,
  email text,
  profile_type text check (profile_type in
    ('job_seeker','freelance','business','investor')),
  domain text,
  bio text,
  country text,
  timezone text,
  languages text,
  salary_min integer,
  salary_max integer,
  response_template text,
  verification_status text default 'pending'
    check (verification_status in
      ('pending','verified','genius','refused')),
  refusal_reason text,
  verification_score integer,
  plan text default 'free'
    check (plan in ('free','talent','business','investor')),
  is_founder boolean default false,
  cv_url text,
  portfolio_url text,
  github_url text,
  behance_url text,
  youtube_url text,
  linkedin_url text,
  profile_photo_url text,
  stripe_customer_id text,
  interface_language text default 'fr',
  followers_count integer default 0,
  following_count integer default 0,
  profile_views integer default 0,
  onboarding_completed boolean default false,
  surveillance_mode boolean default false,
  email_notifications boolean default true,
  whatsapp_monitoring boolean default false,
  auto_email_responses boolean default false,
  repeat_alerts boolean default true,
  created_at timestamp default now()
);

-- =============================================
-- UPLOADED DOCUMENTS
-- =============================================
create table if not exists uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  doc_type text,
  file_name text,
  file_url text,
  created_at timestamp default now()
);

-- =============================================
-- OPPORTUNITIES FOUND
-- =============================================
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  title text,
  company text,
  company_rating numeric(3,1),
  location text,
  country text,
  salary_min integer,
  salary_max integer,
  currency text default 'USD',
  published_at timestamp,
  applicants_count integer default 0,
  score integer,
  match_reason text,
  source_platform text,
  original_url text,
  is_foreign boolean default false,
  is_suspicious boolean default false,
  cover_message text,
  cv_adaptation text,
  visual_project text,
  status text default 'found'
    check (status in
      ('found','auto_applied','pending_action','response_received')),
  created_at timestamp default now()
);

-- =============================================
-- APPLICATIONS SENT
-- =============================================
create table if not exists applications_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  opportunity_id uuid references opportunities(id),
  applied_at timestamp default now(),
  cover_message text,
  adapted_cv_notes text,
  visual_project_description text,
  status text default 'sent'
    check (status in ('sent','viewed','responded','hired','rejected'))
);

-- =============================================
-- RECOMMENDATIONS
-- =============================================
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references users_profiles(id),
  to_user_id uuid references users_profiles(id),
  message text,
  verified boolean default false,
  verified_by_ai boolean default true,
  ai_verification_note text,
  ai_confidence integer,
  created_at timestamp default now()
);

-- =============================================
-- NOTIFICATIONS AND ALERTS
-- =============================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  type text,
  title text,
  message text,
  financial_value text,
  action_url text,
  requires_action boolean default false,
  alert_level text default 'gold'
    check (alert_level in ('red','gold','cyan','orange')),
  is_read boolean default false,
  alert_count integer default 0,
  last_alerted_at timestamp default now(),
  created_at timestamp default now()
);

-- =============================================
-- SUBSCRIPTIONS
-- =============================================
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  plan text check (plan in ('free','talent','business','investor')),
  status text check (status in
    ('active','expired','cancelled','trial')),
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamp default now(),
  expires_at timestamp
);

-- =============================================
-- APP SETTINGS (FREE_MODE TOGGLE)
-- =============================================
create table if not exists app_settings (
  key text primary key,
  value text
);
insert into app_settings (key, value)
values ('FREE_MODE', 'true')
on conflict (key) do nothing;

-- =============================================
-- PROFESSIONAL CONNECTIONS
-- =============================================
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references users_profiles(id),
  to_user_id uuid references users_profiles(id),
  status text default 'pending'
    check (status in ('pending','accepted','declined')),
  created_at timestamp default now()
);

-- =============================================
-- PUBLICATIONS (VERIFIED AND GENIUS ONLY)
-- =============================================
create table if not exists publications (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users_profiles(id),
  title text,
  content text,
  likes_count integer default 0,
  views_count integer default 0,
  created_at timestamp default now()
);

-- =============================================
-- GLOBAL STARTUP DATABASE
-- =============================================
create table if not exists startups_database (
  id uuid primary key default gen_random_uuid(),
  name text,
  sector text,
  stage text,
  country text,
  city text,
  founder_name text,
  website text,
  description text,
  total_raised numeric,
  last_round_amount numeric,
  last_round_date timestamp,
  last_round_type text,
  valuation numeric,
  investors_list text,
  employee_count text,
  founded_year integer,
  viability_score integer,
  risk_level text,
  verified boolean default false,
  created_at timestamp default now()
);

-- =============================================
-- FUNDRAISING HISTORY
-- =============================================
create table if not exists fundraising_history (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references startups_database(id),
  round_type text,
  amount numeric,
  currency text default 'USD',
  date timestamp,
  lead_investor text,
  all_investors text,
  valuation_at_round numeric,
  source_url text,
  created_at timestamp default now()
);

-- =============================================
-- VC AND INVESTOR DATABASE
-- =============================================
create table if not exists vc_database (
  id uuid primary key default gen_random_uuid(),
  name text,
  firm text,
  country text,
  investment_thesis text,
  sectors_of_interest text,
  stages_preferred text,
  ticket_min numeric,
  ticket_max numeric,
  currency text default 'USD',
  portfolio_companies text,
  linkedin_url text,
  twitter_url text,
  email text,
  social_platforms_active text,
  recent_activity text,
  last_investment_date timestamp,
  created_at timestamp default now()
);

-- =============================================
-- SALARY DATA
-- =============================================
create table if not exists salary_data (
  id uuid primary key default gen_random_uuid(),
  role text,
  country text,
  salary_min integer,
  salary_median integer,
  salary_max integer,
  currency text default 'USD',
  trend text,
  growth_percent numeric,
  insight text,
  source text,
  scraped_at timestamp default now()
);

-- =============================================
-- HIDDEN TALENTS
-- =============================================
create table if not exists hidden_talents (
  id uuid primary key default gen_random_uuid(),
  platform text,
  profile_url text,
  domain text,
  country text,
  proof_of_work text,
  skills text,
  contact_info text,
  genius_score integer,
  approach_message text,
  status text default 'discovered'
    check (status in
      ('discovered','contacted','responded','placed')),
  discovered_at timestamp default now()
);

-- =============================================
-- VC TRACKING CAMPAIGNS (ORANGE MERCHANT)
-- =============================================
create table if not exists vc_tracking_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  vc_id uuid references vc_database(id),
  project_description text,
  platforms_posted text[],
  post_count integer default 0,
  last_posted_at timestamp,
  status text default 'active'
    check (status in ('active','paused','converted')),
  created_at timestamp default now()
);

-- =============================================
-- SAVED SEARCHES
-- =============================================
create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  search_name text,
  domain text,
  country text,
  salary_min integer,
  salary_max integer,
  filters jsonb,
  auto_repeat boolean default false,
  repeat_frequency text default 'daily'
    check (repeat_frequency in ('daily','weekly')),
  last_run_at timestamp,
  results_count integer default 0,
  created_at timestamp default now()
);

-- =============================================
-- SEARCH HISTORY
-- =============================================
create table if not exists search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  domain text,
  country text,
  results_found integer default 0,
  applications_sent_count integer default 0,
  created_at timestamp default now()
);

-- =============================================
-- SUPPORT TICKETS
-- =============================================
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  name text,
  email text,
  subject text,
  message text,
  status text default 'open'
    check (status in ('open','in_progress','resolved')),
  created_at timestamp default now()
);

-- =============================================
-- INVESTMENT SUMMITS (GENIUS ONLY)
-- =============================================
create table if not exists investment_summits (
  id uuid primary key default gen_random_uuid(),
  name text,
  location text,
  country text,
  date timestamp,
  description text,
  attendee_profile text,
  registration_url text,
  positioning_strategy text,
  created_at timestamp default now()
);

-- =============================================
-- WEEKLY REPORTS
-- =============================================
create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id),
  week_start date,
  opportunities_found integer default 0,
  applications_sent integer default 0,
  responses_received integer default 0,
  profile_views integer default 0,
  progress_score integer default 0,
  insight text,
  created_at timestamp default now()
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
alter table users_profiles enable row level security;
alter table uploaded_documents enable row level security;
alter table opportunities enable row level security;
alter table applications_sent enable row level security;
alter table recommendations enable row level security;
alter table notifications enable row level security;
alter table subscriptions enable row level security;
alter table connections enable row level security;
alter table publications enable row level security;
alter table salary_data enable row level security;
alter table hidden_talents enable row level security;
alter table startups_database enable row level security;
alter table fundraising_history enable row level security;
alter table vc_database enable row level security;
alter table vc_tracking_campaigns enable row level security;
alter table saved_searches enable row level security;
alter table search_history enable row level security;
alter table support_tickets enable row level security;
alter table investment_summits enable row level security;
alter table weekly_reports enable row level security;

-- =============================================
-- POLICIES
-- =============================================
create policy "own_profile" on users_profiles for all
  using (auth.uid() = id);

create policy "own_documents" on uploaded_documents for all
  using (auth.uid() = user_id);

create policy "own_opportunities" on opportunities for all
  using (auth.uid() = user_id);

create policy "own_applications" on applications_sent for all
  using (auth.uid() = user_id);

create policy "own_notifications" on notifications for all
  using (auth.uid() = user_id);

create policy "own_subscriptions" on subscriptions for all
  using (auth.uid() = user_id);

create policy "own_saved_searches" on saved_searches for all
  using (auth.uid() = user_id);

create policy "own_search_history" on search_history for all
  using (auth.uid() = user_id);

create policy "own_support_tickets" on support_tickets for all
  using (auth.uid() = user_id);

create policy "own_tracking" on vc_tracking_campaigns for all
  using (auth.uid() = user_id);

create policy "own_weekly_reports" on weekly_reports for all
  using (auth.uid() = user_id);

create policy "view_verified_profiles" on users_profiles for select
  using (verification_status in ('verified','genius'));

create policy "view_all_publications" on publications for select
  using (true);

create policy "public_read_startups" on startups_database for select
  using (true);

create policy "public_read_fundraising" on fundraising_history for select
  using (true);

create policy "public_read_vcs" on vc_database for select
  using (true);

create policy "public_read_summits" on investment_summits for select
  using (true);

create policy "verified_recommendations" on recommendations for select
  using (true);

create policy "hidden_talents_business_investor"
  on hidden_talents for select
  using (
    exists (
      select 1 from users_profiles
      where id = auth.uid()
      and plan in ('business','investor')
    )
  );

================================================================
FOUNDER ACCOUNT
================================================================

Email: stephanenana.pro@gmail.com

On signup with this exact email, automatically set:
- is_founder = true
- verification_status = 'genius'
- plan = 'investor'
- onboarding_completed = true
- No verification required. No payment. Ever.

FOUNDER DASHBOARD (route: /founder, accessible only to founder):

Gold animated border panel. Exclusive.

STATS SECTION:
- Total registered users
- Breakdown: VERIFIED / PENDING / REFUSED / GENIUS counts
- Subscribers per plan + total monthly revenue ($)
- Searches launched today + countries represented
- Startups in database + VCs tracked
- Hidden talents discovered + placed
- Applications sent today via Searcher (platform-wide)

CONTROLS SECTION:
Toggle "Activate payments (FREE_MODE = OFF)" → production mode
Toggle "Free access for all (FREE_MODE = ON)" → testing mode

USER MANAGEMENT TABLE:
- Name, email, plan, verification_status, created_at
- Filters by status and plan
- For each user:
  Button "Promote to GENIUS"
  Button "Refuse with explanation" → textarea for reason
  Button "View profile"

SUPPORT TICKETS SECTION:
- All open support tickets
- Mark as in_progress / resolved

OPEN SUPPORT TICKETS SECTION:
- All open tickets
- Mark as resolved

================================================================
AUTHENTICATION FLOW
================================================================

Supabase Auth: email + password.
AuthContext wraps entire app.

App load routing logic:
- Not authenticated → Splash → Landing Page (/)
- Status = pending → Splash → Verification Page (/signup)
- Status = verified or genius → Splash → Dashboard (/dashboard)
- Status = refused → Splash → Resubmission Page (/resubmit)
- is_founder = true → Splash → Founder Dashboard (/founder)

Resubmission page (/resubmit):
Show exact refusal reason from Gemini.
Allow re-upload of documents.
Re-trigger Gemini analysis on submit.

================================================================
PAGE 1 — LANDING PAGE (/)
================================================================

Full screen #0A0A0A. Globe 3D rotating slowly in background.

TOP NAVIGATION:
Left: "SEARCHER CONNECTOR" gold bold
      Below: "OPPORTUNITY INTELLIGENCE" in #444
Center: Language selector dropdown
Right:  [Sign In] outlined gold + [Join Free] gold filled
        + pulsing gold dot "Agent Active 24/7"

STORY CIRCLES (Instagram-style, horizontal scroll):
Row of the freshest global opportunities under 6h old.
Each circle: gold pulsing ring + company logo or initials.
Label below: "🔥 Fresh — 2h ago"
Tap/click to expand full opportunity card.

HERO CENTER:
Gold pill badge: "THE WORLD'S FIRST AUTONOMOUS OPPORTUNITY AGENT"
H1 white 48px: "Every opportunity in the world."
H1 gold: "Found. Applied. Delivered."
Subtitle #888: "Searcher works for you around the clock —
while you sleep, eat, and live your life."

HOW IT WORKS — 4 STEPS:
Title: "How Searcher works for you"
Subtitle: "Four steps. Zero effort on your part."

4 steps horizontal row (desktop) / vertical (mobile).
Each step: gold numbered circle + icon + title + 1 sentence.

Step 1 — user-check icon:
"You verify your profile"
"Submit real proof of your skills. Searcher decides.
No fakers allowed."

Step 2 — globe icon:
"Searcher scans the world"
"40+ platforms simultaneously. Every country.
Every hour. While you live your life."

Step 3 — zap icon:
"Searcher acts for you"
"Fresh match found? Searcher applies immediately
with your adapted CV and personalised message."

Step 4 — bell icon:
"You receive results"
"Real opportunities. Real scores. Real contacts.
Delivered to your dashboard in real time."

Arrows (→) connecting steps on desktop.

4 PROFILE BUTTONS (2×2 grid mobile, row desktop):

Button 1 — gold filled, briefcase icon:
"I am a Job Seeker"
"Find and apply to jobs worldwide automatically"
→ /signup?type=job_seeker

Button 2 — outlined gold, code icon:
"I am a Freelance Talent"
"Find contracts and missions globally"
→ /signup?type=freelance

Button 3 — outlined gold, building icon:
"I am a Business Owner"
"Find verified clients and hidden talents worldwide"
→ /signup?type=business

Button 4 — outlined gold, trending-up icon:
"I am an Investor"
"Discover verified high-potential projects globally"
→ /signup?type=investor

LIVE STATS BAR (gold numbers, gray labels):
Animated count-up numbers. Update from Supabase in real time.
"2,847 opportunities found today"
"934 applications sent while users slept"
"67 countries scanned"

COMPETITOR TABLE:
Title: "Why Searcher Connector is in a category of its own"
Black/gold table design.

| Feature                | LinkedIn | Indeed | Upwork | SEARCHER  |
|------------------------|----------|--------|--------|-----------|
| Autonomous 24/7        | No       | No     | No     | YES       |
| Applies for you        | No       | No     | No     | YES       |
| Replies to emails      | No       | No     | No     | YES       |
| Timezone resolver      | No       | No     | No     | YES       |
| Finds hidden talents   | No       | No     | No     | YES       |
| Investor bridge        | No       | No     | No     | YES       |
| VC tracking            | No       | No     | No     | YES       |
| Startup database       | No       | No     | No     | YES       |
| Fundraising history    | No       | No     | No     | YES       |
| Strict verification    | No       | No     | Partial| YES       |
| Forced diversification | No       | No     | No     | YES       |
| International alert    | No       | No     | No     | YES       |
| Client finder B2B      | No       | No     | No     | YES       |
| Verified endorsements  | Partial  | No     | No     | YES       |
| Real-time salary       | No       | Partial| No     | YES       |
| 80+ languages          | No       | No     | No     | YES       |
| Worldwide by default   | No       | No     | No     | YES       |
| Genius category        | No       | No     | No     | YES       |
| Saved searches repeat  | No       | Partial| No     | YES       |
| Weekly reports         | No       | No     | No     | YES       |
| Free PWA (install)     | No       | No     | No     | YES       |

PRICING PREVIEW (4 cards, dark #111, gold borders):
Free: $0 → 3 searches/day, 5 results, 1 application/day
Talent: $29/month → unlimited job + freelance search
Business: $99/month → Talent + client finder + talent search
Investor: $299/month → Business + Genius + VC + summits

TESTIMONIALS SECTION (3 cards):
Card 1: "Found a remote contract in Canada in 48 hours.
Searcher applied while I was sleeping."
— Marketing Specialist, Cameroon

Card 2: "As an investor, I discovered 3 Genius profiles in one week
that I would never have found on LinkedIn."
— Business Angel, Dubai

Card 3: "Searcher found me 47 verified buyers for my product.
I now have a waiting list."
— E-commerce Founder, Kenya

FAQ SECTION:
Title: "Frequently asked questions"
5 expandable items (accordion):

Q1: "How does the verification work?"
A: "You submit real proof of your skills — projects, certifications,
GitHub, YouTube, portfolio. Searcher's AI analyses everything
and decides: VERIFIED, GENIUS, or REFUSED with a clear explanation.
No diploma required if you have real proof of competence."

Q2: "Is it free?"
A: "Yes, you can start with the free plan (3 searches per day).
Full access plans start at $29/month. During our launch period,
all plans may be available at no cost."

Q3: "How does Searcher apply for me?"
A: "When a fresh opportunity matches your profile score,
Searcher applies with your CV adapted to that specific role,
a personalised cover message, and a visual project showing you
already think like one of their employees."

Q4: "Is my data secure?"
A: "All your data is stored encrypted on Supabase servers.
We never sell your data to any third party. You can delete
everything from your settings at any time."

Q5: "How do I deactivate Searcher?"
A: "From your settings, toggle off any feature you want.
You can pause the autonomous search at any time."

FOOTER:
"Opportunity delivered via Searcher Connector"
searcherconnector.com (gold link, clickable)
"People click not out of curiosity — but because there is money waiting."
"Built from Douala, Cameroon."
Links: Privacy Policy | Terms of Service | Support
"© 2026 Searcher Connector. All rights reserved."

================================================================
PAGE 2 — SIGNUP + VERIFICATION (/signup)
================================================================

Read profile_type from URL query param.
Create Supabase Auth account (email + password).

SECTION A — TELL SEARCHER WHO YOU ARE:

Title: "Tell Searcher who you are"
Subtitle: "Speak naturally. Like a voice note to a friend."

Large circular gold microphone button (Web Speech API):
- Pulsing animation when recording
- Transcription appears in real time in text area below
- Auto-parse voice to fill the form fields
- Language from interface_language setting

Text area below mic:
Placeholder: "Or type — describe yourself, your skills,
and what you are looking for..."

Fields auto-filled from voice or manual entry:
→ Full name
→ Domain of expertise (text + dropdown suggestions)
→ What you seek (based on profile_type, dropdown)
→ Country (dropdown, all countries)
→ Preferred work location
→ Languages spoken (multi-select)
→ Salary or budget range (slider + manual entry)
→ Response template (how Searcher should write for you)
→ Timezone (auto-detected, adjustable)
→ CV upload (PDF → Supabase Storage)

SECTION B — PROOF OF COMPETENCE (mandatory):

Title in gold: "Prove your competence. No fakers allowed."
Subtitle: "You do not need a diploma. You need real proof.
Searcher judges quality — not quantity."

FOR JOB_SEEKER AND FREELANCE profiles:
Upload zones (dark card, gold border on hover, icon + label):

1. University diploma or degree
   Icon: graduation-cap | "PDF or image"

2. Professional certifications
   Icon: award | "Coursera, Google, Meta, Udemy, HubSpot, any platform"
   (multiple files accepted)

3. Completed projects with measurable results
   Icon: briefcase | "Show what you actually built"

4. Portfolio URL
   Icon: link | URL text input

5. GitHub profile
   Icon: code | URL input

6. Behance or Dribbble profile
   Icon: palette | URL input

7. YouTube or TikTok channel
   Icon: play-circle | "Proof of expertise through content"

8. AI-assisted work samples showing genius
   Icon: sparkles | "Exceptional AI work + genuine strategic insight"

Note card (gold border, dark bg):
"Searcher accepts any strong combination.
A YouTube channel + real projects can replace a diploma.
A GitHub full of active code speaks louder than a certificate.
Searcher decides — not a form."

FOR BUSINESS profiles:
1. Business registration document
2. Tax identification document
3. Proof of business activity (invoices, screenshots)
4. Business website URL

FOR INVESTOR profiles:
1. Investment portfolio (PDF)
2. LinkedIn profile URL
3. Investment thesis document (PDF)
4. Proof of investment capacity

Submit button full width:
"Submit My Profile to Searcher" (gold)
→ Save all data to Supabase
→ Call Gemini verification API
→ Save status to users_profiles
→ Navigate to /status

================================================================
STATUS PAGE (/status)
================================================================

Auto-refresh every 30 seconds via useEffect.

PENDING (gray #333 border):
Hourglass icon + animated spinner
"PENDING"
"Searcher is analysing your profile.
Grab a coffee — this is thorough."

VERIFIED (gold border):
Gold checkmark icon
"VERIFIED"
"Welcome. Full access granted.
Searcher is now working for you 24/7."
Button gold: "Enter Your Dashboard"
→ triggers welcome email → navigates to /dashboard

GENIUS (gold diamond border, subtle outer glow):
Diamond icon
"GENIUS"
"Elite status. Identified by Searcher.
You are exceptional.
Not self-declared — earned."
Button gold: "Enter Your Dashboard"
→ triggers genius welcome email → navigates to /dashboard

REFUSED (dark red border #8B0000):
X-circle icon
"NOT YET"
"Here is exactly what you need to strengthen:"
[Gemini explanation text shown here]
Button outlined: "Improve and Resubmit"
→ navigates to /signup with existing data pre-filled

================================================================
GUIDED ONBOARDING (first login after verification only)
================================================================

Show a 5-step modal fullscreen overlay.
Cannot be skipped on first visit.
Gold progress bar at top: "Step X of 5"

After completing, set onboarding_completed = true.
Never show again.

Step 1 — Welcome:
Diamond icon + "Welcome to Searcher Connector"
"Your profile has been verified. Searcher is now working for you 24/7."
"Here is how it works — in 4 steps."

Step 2 — How Searcher searches:
Globe animation (small)
"Searcher scans LinkedIn, Indeed, GitHub, Reddit, Upwork,
Behance, YouTube, Twitter/X, Telegram, and 40+ other platforms
simultaneously — every day — without you doing anything."

Step 3 — How Searcher applies:
Briefcase icon
"When a fresh opportunity matches your profile score,
Searcher applies immediately with your adapted CV
and a personalised cover message:
'I am not applying — I am joining your team.'"

Step 4 — The golden rule:
Split icon
"What Searcher can do alone → it does immediately.
What it cannot → it sends you an alert every 30 minutes
until you act.
You will never miss an opportunity due to a time zone again."

Step 5 — Ready:
Gold checkmark
"Searcher has started scanning the world for you.
Check your dashboard for your first results."
Button gold: "Go to my Dashboard"

================================================================
MAIN DASHBOARD (/dashboard)
================================================================

THREE COLUMN LAYOUT — like LinkedIn but BLACK and GOLD.

LEFT SIDEBAR:
Profile photo (circular, gold border with initials if no photo)
Full name white bold
VERIFIED or GENIUS badge (gold pill)
Plan badge (Free / Talent / Business / Investor)
Domain + country + timezone
Metrics (small, gray label, gold number):
  - Opportunities found this week
  - Applications sent this week
  - Profile views this week
  - Active connections count
Profile completion bar (gold, 0-100%)
  With label: "Add your CV to boost results by 15%"
  (shows only missing items as tips)
[Edit Profile] button outlined
[Upgrade Plan] button gold (if free plan)

CENTER MAIN FEED:

STORY CIRCLES (top row, horizontal scroll):
Fresh opportunities < 6h old. Gold pulsing ring.
Tap to expand full card. Label: "🔥 2h ago"

SEARCH TRIGGER CARD (gold border):
Title: "Searcher is working for you right now"
Subtitle: "Last scan: [time ago] · [X] platforms active"
Large gold button: "Start Global Search Now"

When search is active:
Globe 3D background → fast spin
Scanning pills horizontal scroll (all light up one by one):
LinkedIn Jobs | Indeed | Glassdoor | RemoteOK | Wellfound |
Reddit r/forhire | Twitter/X | Facebook Groups | Telegram |
Upwork | Fiverr | Malt | Toptal | Contra | Freelancer |
GitHub Jobs | Stack Overflow | HackerNews Who's Hiring |
YouTube | TikTok | Behance | Dribbble | Substack |
Crunchbase | AngelList | PitchBook | TechCrunch | Forbes |
Google Search Live | Company Career Pages | SEC Filings |
Jeune Afrique | African Tech Media | Jobberman | Bayt |
Jobstreet | ZipRecruiter | Monster | CareerBuilder |
and more worldwide...

PROFILE COMPLETION INDICATOR:
Gold progress bar showing 0-100%.
"Elite profile — Maximum results" at 86-100%
"Strong profile — Searcher is effective" at 61-85%
"Good start — add more to improve results" at 31-60%
"Incomplete — Searcher cannot work at full power" at 0-30%
Specific actionable tip: "Add your CV → +15% effectiveness"

METRIC CARDS ROW (4 cards, real data from Supabase):
Opportunities Found Today | Applications Sent While You Slept
Responses Received | Best Match Score /100

TIMEZONE RESOLVER CARD (gold border):
Auto-detects user timezone.
"You are in [timezone].
Searcher monitors your communications 24/7 and responds
for companies in America, Europe, Asia — everywhere —
so you never miss an opportunity due to time zones."
Toggle: Automatic email responses (on/off)
Toggle: WhatsApp monitoring (on/off — requires permission)
"What Searcher can do alone → it does.
What it cannot → it alerts you until you act."

ACTIVE ALERTS CENTER:
Only alerts where requires_action = true.
Repeat every 30 minutes until user acts.
Each alert type has a color:
RED (urgent): "Recruiter waiting — respond now"
GOLD (opportunity): "New high-score match found"
CYAN (diversification): "Only 1 active lead — Searcher found more"
ORANGE (international): "Foreign offer — check passport"
Each alert has a direct action button.

CONTINUOUS SURVEILLANCE TOGGLE (card, gold border):
"Keep searching even after I find a job"
"Like a VPS trading bot that never stops running.
Even after you accept a position, Searcher continues monitoring
for better opportunities with higher salary — unless you stop it."

WEEKLY REPORT CARD (shown on Mondays):
"Your week in review — [week dates]"
Opportunities: [X] | Applications: [X]
Responses: [X] | Profile views: [X]
Gemini insight: "Your marketing profile attracted 3x more
opportunities this week than last week."

SALARY MARKET PULSE WIDGET (right sidebar mini-widget):
"Your market value today"
Quick salary benchmark for user's domain + country.
Min/Median/Max in gold.
Trend arrow.
Button: "Full salary analysis →"

DIVERSIFICATION WARNING (if less than 3 active leads):
Gold warning card:
"Searcher recommends keeping multiple active options simultaneously.
Never put all your eggs in one basket.
This is a system rule — not a suggestion.
[X] other strong opportunities are ready for you."

RIGHT SIDEBAR:
Verified users in same domain (connection suggestions)
Each card: name + VERIFIED badge + domain + [Connect] button
"Trending in your sector" (from Serper, 5 links)
Salary benchmark quick widget
[Upgrade Plan] CTA if on free plan

TOP NAVIGATION:
Logo left | Search bar center | Language selector
Bell icon (red badge with unread count)
"Agent Active 24/7" with pulsing gold dot
User avatar → dropdown: Profile / Settings / Logout

MAIN NAVIGATION TABS (below top nav):
Home | Opportunities | Applications | History |
Salary | Network | Publish | Investor/Business | Intelligence | Profile

================================================================
OPPORTUNITIES TAB
================================================================

Title: "Best Opportunities Found For You"
Subtitle: "Sorted by freshness and score.
Minimum 5 opportunities always shown."

MOBILE: Tinder-style swipe cards
Swipe RIGHT → "Let Searcher Apply" (green glow)
Swipe LEFT → Skip (red glow)
Score > 90 → gold particle explosion "PERFECT MATCH — 95/100"

DESKTOP CARDS (#111 background, gold border on hover):
Row 1: Job title (bold white) + Score "94/100" gold pill
Row 2: Company + location flag emoji + rating stars
Row 3: Salary range gold + "Published 2h ago"
       Color-coded time:
       Green if < 6h | Gold if < 24h | Gray if older
Row 4: "[X] applicants so far" + platform source pill
Row 5: Match reason — italic #888
       "Your marketing skills align perfectly with this role.
        You have an advantage: only 3 applicants so far."
Row 6: Trust badge:
       Green "VERIFIED REAL" or Red "SUSPICIOUS"
Row 7: Status badge:
       "AUTO-APPLIED BY SEARCHER" green |
       "PENDING YOUR ACTION" gold |
       "RESPONSE RECEIVED" blue

INTERNATIONAL ALERT (if is_foreign = true):
Gold-orange card inside opportunity:
"⚠ International opportunity — [Country]
Passport required. Apostilled degree + medical record +
police clearance. Preparation time: 4-8 weeks recommended.
Tap for full visa and document checklist."

DIVERSIFICATION WARNING (if viewing same card 3+ times):
"Searcher reminds you: never rely on a single opportunity.
[X] other strong opportunities are waiting for you.
System rule — not a suggestion."

SAVE SEARCH button:
Modal → name the search + toggle auto-repeat + frequency (daily/weekly)
Saved to saved_searches table.

TWO BUTTONS PER CARD:
[View Original Offer ↗] → opens original_url in new tab
[Let Searcher Apply] gold →
  Confirmation modal:
  "Searcher will apply with:
  ✓ CV fully adapted to this specific role
  ✓ Cover: 'I am not applying — I am joining your team.'
  ✓ Visual project showing you already think like their employee"
  [Confirm — Apply Now] (gold) [Cancel] (outlined)
  →
  On confirm: insert into applications_sent
  Update opportunity status = 'auto_applied'
  Toast: "Applied via Searcher Connector ✓"
  Application includes signature:
  "Submitted via Searcher Connector
   The autonomous agent that finds and applies for you 24/7
   searcherconnector.com"

================================================================

  =================================================================
  FRONTEND: Initialisation React + Tailwind + composant Navbar (Glassmorphism)
  =================================================================

  Suivez ces étapes dans un terminal (à la racine du dossier Downloads) pour créer le dossier Frontend, initialiser un projet React (Vite), installer Tailwind et ajouter un composant Navbar au style Glassmorphism.

  1) Créer le projet React (Vite)

  Windows / PowerShell:

  ```powershell
  cd "C:\Users\BIYO STEPHANE\Downloads"
  npm create vite@latest Frontend -- --template react
  cd Frontend
  npm install
  ```

  2) Installer Tailwind

  ```powershell
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```

  3) Configurer Tailwind

  Créez/éditez tailwind.config.cjs:

  ```js
  module.exports = {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: { extend: {
      colors: {
        gold: '#f6c84c',
        'gold-dark': '#d4aa2b',
        'dark-bg': '#061221'
      }
    } },
    plugins: [],
  };
  ```

  postcss.config.cjs (généré automatiquement) :

  ```js
  module.exports = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
  ```

  4) src/index.css

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  :root{
    --glass-bg: rgba(255,255,255,0.06);
    --glass-border: rgba(255,255,255,0.12);
    --glass-shadow: 0 8px 32px rgba(0,0,0,0.25);
  }

  .glass {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    backdrop-filter: blur(8px) saturate(120%);
  }

  body { @apply bg-[linear-gradient(180deg,#0b1020,#071025)] text-white; }
  ```

  5) src/components/Navbar.jsx

  ```jsx
  import React, { useState } from 'react';
  import { Link } from 'react-router-dom';

  export default function Navbar(){
    const [open, setOpen] = useState(false);
    return (
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 w-[92%] max-w-5xl z-50">
        <div className="glass rounded-xl p-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-purple-500 flex items-center justify-center font-bold text-dark-bg">S</div>
            <div>
              <div className="text-white font-bold">Searcher</div>
              <div className="text-xs text-white/70">Built from Douala</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/" className="text-white/90 hover:text-gold transition">Home</Link>
            <Link to="/features" className="text-white/80 hover:text-gold transition">Features</Link>
            <Link to="/about" className="text-white/80 hover:text-gold transition">About</Link>
            <button className="ml-2 px-4 py-1 bg-gold text-dark-bg rounded-md font-semibold">Sign In</button>
          </div>

          <button className="md:hidden text-white/90" onClick={() => setOpen(!open)} aria-label="menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {open && (
          <div className="mt-3 glass rounded-xl p-3 px-4 max-w-5xl mx-auto md:hidden">
            <div className="flex flex-col gap-2">
              <Link to="/" onClick={() => setOpen(false)} className="text-white/90">Home</Link>
              <Link to="/features" onClick={() => setOpen(false)} className="text-white/80">Features</Link>
              <Link to="/about" onClick={() => setOpen(false)} className="text-white/80">About</Link>
              <button className="mt-2 px-4 py-2 bg-gold text-dark-bg rounded-md font-semibold">Sign In</button>
            </div>
          </div>
        )}
      </nav>
    );
  }
  ```

  6) src/App.jsx

  ```jsx
  import React from 'react';
  import { BrowserRouter } from 'react-router-dom';
  import Navbar from './components/Navbar';
  import './index.css';

  export default function App(){
    return (
      <BrowserRouter>
        <div className="min-h-screen">
          <Navbar />
          <main className="pt-36 px-4">{/* contenu */}</main>
        </div>
      </BrowserRouter>
    );
  }
  ```

  7) src/main.jsx

  ```jsx
  import React from 'react'
  import ReactDOM from 'react-dom/client'
  import App from './App'

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  ```

  8) Lancer le projet

  ```powershell
  npm run dev
  ```

  Remarques: adaptez les couleurs et le logo au besoin. Le composant Navbar utilise des classes Tailwind et une classe utilitaire .glass définie dans index.css pour l'effet Glassmorphism.

================================================================

Title: "All Applications Sent by Searcher"
Subtitle: "Full history of every application sent in your name."

Each application card:
Company + role + date applied
Status: Sent / Viewed / Responded / Hired / Rejected
Cover message preview (expandable)
CV adaptation notes
Response received (if any) → full text shown
Auto-reply sent by Searcher (if applicable)

Filter by status: All / Sent / Responded / Hired / Rejected
Sort by: Most recent / Company name / Status

================================================================
HISTORY TAB
================================================================

Title: "Search History"
Subtitle: "Every search Searcher has run for you."

Grouped by: Today | Yesterday | This week | Earlier

Each history item:
Date + time | Domain searched | Country
Results found (gold number) | Applications sent from this search
[See results again] link

Filter: All / With applications / With responses
[Clear history] button → confirmation modal required

================================================================
SALARY TAB
================================================================

Title: "Know your market value before you negotiate"
Subtitle: "Real-time data scraped from live global job offers —
not outdated surveys. More accurate than Indeed or Glassdoor."

Inputs: Role (text) + Country (dropdown, all countries)
Button: "Show My Market Value" (gold)
→ Call searchSalaries() from Serper
→ Call analyseSalaries() from Gemini
→ Save result to salary_data table

Results:
3 gold metric cards: Minimum | Median | Maximum
Trend arrow indicator (↑ up / → stable / ↓ down)
Growth percent: "Salaries grew 9.2% in the last 12 months"
Bar chart (recharts, gold colors)
Gemini insight text in user language

"Based on live data scraped today from real job offers worldwide.
Updated every time you search."

================================================================
NETWORK TAB
================================================================

Title: "Your Professional Network"
Subtitle: "Only VERIFIED and GENIUS profiles. No unverified accounts.
Every person here has been validated by Searcher."

Suggestions section (top):
Verified users in same domain
Name + badge + domain + mutual connections count
[Connect] button

My connections:
Accepted connections
Name + badge + domain
[Message] → opens modal (generates WhatsApp or email draft)
[Endorse] → goes to Recommendations flow

Pending requests:
Sent / Received with [Accept] [Decline] buttons

Connection activity feed:
"[Name] joined Searcher Connector"
"[Name] received GENIUS badge"
"[Name] found an opportunity in [country]"

================================================================
RECOMMENDATIONS TAB
================================================================

Title: "Verified endorsements. Impossible to fake."
Subtitle: "Every endorsement cross-checked by Searcher AI.
Only verified users can endorse other verified users.
A recommendation here carries real weight —
it cannot be purchased or manipulated.
Unlike LinkedIn — every endorsement is verified."

GIVE RECOMMENDATION:
Search verified users by name or domain
Write recommendation message (textarea, min 50 characters)
Button: "Submit to Searcher for verification" (gold)
→ Call gemini verifyRecommendation()
→ If authentic (confidence > 70): save verified=true
  Show stamp: "Verified by Searcher ✓"
  Notify the recipient
→ If suspicious: show explanation, do not save

RECEIVED RECOMMENDATIONS (cards):
Endorser name + VERIFIED badge + endorser domain
Recommendation text
Gold stamp: "Verified by Searcher ✓" + confidence score
Date
[Thank you] reaction

GIVEN RECOMMENDATIONS (cards):
All recommendations I have given
Status: Verified / Pending / Rejected

================================================================
PUBLICATIONS TAB
================================================================

Title: "Professional Publications"
Subtitle: "Only VERIFIED and GENIUS profiles can publish here.
Investors and recruiters trust this feed because every author
has been validated by Searcher."

Write new publication (if VERIFIED or GENIUS):
Title input
Content (rich text, minimum 200 characters)
[Publish] button gold

Not VERIFIED/GENIUS: show lock card
"Complete your verification to publish here."

Publication feed (all users can read):
Author name + badge + domain + date
Title (bold) + content preview
Views count + Likes count
[Like] [Share] [Read more]

================================================================
INVESTOR / BUSINESS TAB
================================================================

Sub-tabs: "Investor" | "Business Owner" | "Smart Connector"

------- INVESTOR SUB-TAB -------

Title: "Find verified projects to fund"
Subtitle: "Only solid projects that passed Searcher's filter.
Calibrated by level — no mismatches. No wasted pitches."

PROJECT LEVEL LOGIC (Gemini evaluates first):
LOCAL: early stage → searches local/proximity investors
REGIONAL: solid → searches regional/African funds
CONTINENTAL: proven traction → searches continental VCs
GLOBAL: exceptional → searches Sequoia, a16z, SoftBank

Inputs:
Investment sector preference
Ticket size range (slider + manual)
Expected return timeline (dropdown)
Geography preference (dropdown)
Risk tolerance: Low / Medium / High

Button: "Find Projects For Me" (gold)
→ Query Supabase for verified business/genius profiles
→ Gemini evaluates each project level
→ Show only projects matching investor criteria

Project cards:
Domain + founder name + GENIUS badge (if applicable)
Funding needed (gold) + risk badge (Low/Medium/High)
Estimated return range
Viability score /100
"Searcher verified: this project is solid"
Button: "I want to know more"
→ Creates notification to that user (type: investor_interest)
→ Includes financial value: "An investor is interested.
   Estimated ticket: $[X]. Tap to respond."

------- BUSINESS OWNER SUB-TAB -------

Title: "Find real verified clients"
Subtitle: "Facebook sells impressions and hope.
Searcher delivers confirmed buyer profiles.
Only prospects with verified purchase intent."

CLIENT SEGMENTATION:
LOCAL business → searches clients within 30km first
REGIONAL business → searches same country + neighbors
GLOBAL digital business → searches worldwide, no limits

Inputs:
Describe your product or service
Describe your ideal client profile
Geographic target (dropdown)
Your service price range
Budget of ideal client

Business certification check:
If user is business type AND documents uploaded →
Show "Business Certified by Searcher ✓" badge
Else → show "Upload business documents to activate client search"

Button: "Find My Verified Clients" (gold)
→ Call searchB2BClients() from Serper
→ Call verifyClientIntent() from Gemini
→ Show only prospects with intent_score > 60

Prospect cards:
Profile type (anonymised, e.g. "Marketing Director, 35-45")
Why they match (Gemini insight)
Purchasing power: Confirmed / Likely / Uncertain
Purchase probability percentage (gold)
Platforms where they spend time online
Personalised approach message (Gemini generated)
Verdict: "REAL BUYER" green | "UNCERTAIN" gold | "NOT A FIT" gray
Button: "Connect via Searcher"

------- SMART CONNECTOR SUB-TAB -------

Title: "Smart Connector"
Subtitle: "Searcher finds the right person —
whether they are on the platform or not."

CASE 1 — Target IS on Searcher Connector:
Gold notification card:
"A verified [profile type] has [described need/project].
This could generate [financial value] for you.
Do you want to know more?"
[Accept] gold [Decline] outlined

CASE 2 — Target NOT on Searcher Connector:
Status display card:
"Searcher placed your opportunity on:"
✓ LinkedIn | ✓ Twitter/X | ✓ Reddit | ✓ Crunchbase | ✓ AngelList
"Like a merchant on every street —
they will find it naturally, repeatedly,
until curiosity becomes interest."
Auto-join notification sent:
"A verified opportunity on Searcher Connector is waiting for you.
Join free — searcherconnector.com
[Financial value description here — always specific]"

VIRAL LOOP EXPLANATION (collapsible info card):
"Every search you make on Searcher Connector automatically
becomes a targeted acquisition campaign for new users.
Zero advertising budget required.
People join because there is money waiting — not curiosity."

================================================================
INTELLIGENCE TAB (exclusive features)
================================================================

Sub-tabs:
"Startup Database" | "Fundraising History" |
"VC & Investors" | "Hidden Talents" | "Investment Summits"

------- STARTUP DATABASE -------

Title: "Global Verified Startup Database"
"Continuously updated from Crunchbase, ProductHunt, Y Combinator,
TechCrunch, African Tech Media and commercial registries worldwide."

Filters: sector + stage + country + minimum traction
Button: "Search Startups" (gold)
→ Call searchStartups() Serper
→ Gemini extracts and structures data
→ Save to startups_database

Startup cards:
Name + sector + stage badge (Pre-seed/Seed/Series A/B/C)
Country flag + founded year + employee count
Total raised (gold) + last round date + last round type
Viability score /100 + risk badge
[See fundraising history] button

------- FUNDRAISING HISTORY -------

Title: "Complete Global Fundraising History"
"Scraped from Crunchbase, TechCrunch, PitchBook,
SEC filings, Jeune Afrique, African Tech Media."

Search: company name
Button: "Search History"
→ Serper queries → Gemini extraction

Timeline of rounds:
Round type badge + Amount gold + Date
Lead investor + All investors listed
Valuation at round
[Source link] button

------- VC & INVESTORS -------

Title: "VC and Investor Intelligence"
"All data from public sources.
Searcher makes it actionable — not just searchable."

Filters: sector + stage + geography + ticket range
Button: "Find Investors" (gold)
→ searchVCData() + analyseVCProfile()

VC cards:
Name + Firm + Country flag
Investment thesis summary
Sectors + stages preferred (chips)
Ticket range (gold)
Social platforms where active (LinkedIn, Twitter, etc.)
Recent investment activity
Button: "Analyse compatibility with my project"
→ Gemini analyses match
→ Shows: match score /100, how to approach, best platform,
  best timing, pitch angle, red flags

------- HIDDEN TALENTS -------

VISIBLE ONLY TO: Business and Investor plan users.
Lock card shown to others: "Upgrade to Business or Investor
to access hidden talents worldwide."

Title: "Hidden Talents — Found Worldwide"
Subtitle: "People who are NOT looking for work —
but are exactly what you need.
LinkedIn cannot find them. Searcher can.
GitHub · Behance · Reddit · YouTube · TikTok ·
Substack · Stack Overflow · Twitter/X · Dribbble"

Filters: domain + skill + geography
Button: "Find Hidden Talents" (gold)
→ searchHiddenTalents() Serper
→ analyseHiddenTalent() Gemini

Hidden talent cards:
Platform found on (GitHub / Behance / YouTube / etc.) badge
Domain + country flag
Proof of work summary (what makes them exceptional)
Genius score /100
Skills chips (gold)
Button: "Contact via Searcher"
→ Sends notification to user if on platform:
  "We found you on [platform].
   A company in your domain is interested.
   Here is the opportunity: [description]"
→ If not on platform: Smart Connector logic applies
  Posts where they are active online

------- INVESTMENT SUMMITS -------

VISIBLE ONLY TO: GENIUS status users.
Lock card for others: "Achieve GENIUS status to access
investment summit intelligence."

Title: "Investment Summits & High-Net-Worth Gatherings"
Subtitle: "Searcher identifies the next major gatherings
of investors and high-net-worth individuals worldwide.
Including private conferences, economic summits, and
exclusive events where capital decisions are made."

Search by: sector + geography + date range
Button: "Find Upcoming Summits" (gold)

Summit cards:
Summit name + location + country flag
Date (with countdown: "In 47 days")
Attendee profile description
Positioning strategy (Gemini generated):
"Here is how to position yourself at this event:"
→ How to get invited or registered
→ What to prepare (pitch deck, business card, portfolio)
→ Key people who will likely attend
→ Best opening lines and conversation starters
[Register / Get Info ↗] button

VC TRACKING CAMPAIGNS (Orange Merchant):

Title: "VC Tracking — Intelligent Presence"
Subtitle: "Like a merchant who puts his orange stand
on every street the customer might take.
Searcher places your project everywhere your target investor
naturally passes — without cold outreach or spam.
They discover it naturally, repeatedly,
until curiosity becomes interest."

Add new campaign:
Select target VC from database
Describe your project
Select platforms to post on:
  LinkedIn | Twitter/X | Reddit | AngelList |
  Crunchbase Community | Newsletters | Forums
Button: "Start Campaign" (gold)

Active campaigns (cards):
VC name + firm + campaign status
Platforms posted count + last post date
Post content preview
Financial value included: "Estimated return for investor: $X+"
Status: Active / Paused / Converted

================================================================
PROFILE PAGE (/profile)
================================================================

LinkedIn-style layout, black and gold.

Gold gradient cover banner (editable)
Profile photo (circular, gold border) + upload button
Full name + VERIFIED or GENIUS badge
Domain + country + plan badge
"[X] profile views this week"
[Edit Profile] button

SECTIONS:
About / Bio (editable text)
Skills (chips, editable)
Languages (chips)
Projects / Experience (add entries)
Certifications (list from uploads)
Documents uploaded (list with icons)
Recommendations received (cards with stamps)
Publications (list of user's articles)

EDIT MODE:
Click [Edit Profile] → inline editing on all fields
[Save changes] → update Supabase
[Upload new photo] → Supabase Storage
[Update CV] → Supabase Storage

================================================================
ACCOUNT SETTINGS (/settings)
================================================================

Title: "Account Settings"

PROFILE SECTION:
Change full name | Change email | Change password
Language preference (updates entire interface language)
Timezone (auto-detected, manually adjustable)
Response template (how Searcher writes emails and messages for you)

NOTIFICATIONS SECTION:
Toggle: Email notifications (on/off)
Toggle: Alert for new high-score opportunities
Toggle: Alert for recruiter responses
Toggle: Repeat alerts every 30 minutes (on/off)
Toggle: Surveillance mode (keep searching after hired)
Toggle: WhatsApp monitoring (on/off)
Toggle: Automatic email responses (on/off)

SUBSCRIPTION SECTION:
Current plan displayed (gold badge)
Next billing date
[Upgrade Plan] if free
[Cancel Subscription] if paid → confirmation required
[Download Invoices] → Stripe portal

DATA AND PRIVACY SECTION:
[Download my data] → exports JSON of all user data
[Delete my account] red button → confirmation modal
Modal: "This will permanently delete your profile,
documents, opportunities, and all data.
This action cannot be undone.
Type DELETE to confirm."
On confirm: soft delete Supabase + confirmation email sent

Links: Privacy Policy | Terms of Service

================================================================
SUPPORT PAGE (/support)
================================================================

Title: "Contact Searcher Support"
Subtitle: "We respond within 24 hours."

Form:
Name (pre-filled if logged in)
Email (pre-filled if logged in)
Subject dropdown:
  Technical issue | Verification question |
  Account problem | Billing | Partnership | Other
Message textarea (min 50 characters)
[Send Message] gold button

On submit:
Insert into support_tickets table
Toast: "Message sent. We will respond within 24 hours."
Email notification sent to founder email via Supabase Edge Function

Footer link: "Support" visible on every page

================================================================
PRIVACY POLICY (/privacy)
================================================================

Title: "Privacy Policy — Searcher Connector"
Last updated: May 2026

1. Data we collect
"We collect your name, email, professional documents,
and search activity to provide the Searcher service."

2. How we use your data
"Your data is used exclusively to find and present
opportunities relevant to your profile.
We never sell your data to third parties."

3. Data storage
"All data is stored securely on Supabase servers
with encryption at rest and in transit."

4. Your rights
"You can request deletion of your account and all
associated data at any time from your settings page."

5. Cookies
"We use essential cookies only for authentication.
No advertising cookies."

6. Contact
"For privacy concerns: stephanenana.pro@gmail.com"

================================================================
TERMS OF SERVICE (/terms)
================================================================

Title: "Terms of Service — Searcher Connector"
Last updated: May 2026

1. Acceptance
2. Service description
3. User responsibilities — false information = permanent ban
4. Prohibited use
5. Limitation of liability
6. Payments — monthly via Stripe, cancellation at period end
7. Termination rights

================================================================
ALL SERVICE FILES
================================================================

--- src/services/geminiService.ts ---

import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Profile Verification
export async function analyseProfile(profileData, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `You are Searcher Connector verification AI.
Respond entirely in ${userLanguage}.
Name: ${profileData.fullName}
Domain: ${profileData.domain}
Type: ${profileData.profileType}
Documents submitted: ${profileData.documents.join(", ")}
Portfolio: ${profileData.portfolioUrl || "not provided"}
GitHub: ${profileData.githubUrl || "not provided"}
YouTube: ${profileData.youtubeUrl || "not provided"}
Rules:
- GENIUS: only if truly world-class and exceptional
- VERIFIED: if real competence is demonstrated in any combination
- REFUSED: if proof is insufficient or appears dishonest
Respond ONLY in this JSON:
{
  "status": "verified" or "genius" or "refused",
  "score": 0-100,
  "reason": "one clear sentence in ${userLanguage}",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["if refused: what to improve"]
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { status: "pending", reason: "Analysis in progress" };
  }
}

// Opportunity Search + Scoring
export async function searchOpportunities(profile, serperResults, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `You are Searcher Connector opportunity AI.
Respond in ${userLanguage}.
User profile:
Domain: ${profile.domain}
Location: ${profile.country}
Salary: ${profile.salaryMin}-${profile.salaryMax}
Type: ${profile.profileType}
Raw results: ${JSON.stringify(serperResults.slice(0,15),null,2)}
Analyse. Return 8 best opportunities scored 0-100.
For each generate:
- cover_message starting: "I am not applying — I am joining your team."
- cv_adaptation: how to adapt CV specifically for this role
- visual_project: project showing candidate thinks like their employee
Flag suspicious listings. Flag is_foreign if country differs from user.
JSON format:
{
  "opportunities": [{
    "title": "",
    "company": "",
    "location": "",
    "country": "",
    "salary_min": 0,
    "salary_max": 0,
    "currency": "USD",
    "published_hours_ago": 0,
    "applicants_count": 0,
    "score": 85,
    "match_reason": "",
    "source_platform": "",
    "original_url": "",
    "is_foreign": false,
    "is_suspicious": false,
    "company_rating": 4.2,
    "cover_message": "",
    "cv_adaptation": "",
    "visual_project": ""
  }]
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { opportunities: [] };
  }
}

// Salary Analysis
export async function analyseSalaries(role, country, serperResults, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Extract real salary data.
Role: ${role} | Country: ${country}
Results: ${JSON.stringify(serperResults.slice(0,10))}
Respond in ${userLanguage}. JSON only:
{
  "min": 0, "median": 0, "max": 0,
  "currency": "USD",
  "trend": "up" or "stable" or "down",
  "growth_percent": 0,
  "insight": "market insight in ${userLanguage}"
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { min: 0, median: 0, max: 0 };
  }
}

// Email Response Generator
export async function generateEmailResponse(recruiterMessage, userProfile, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Write a professional email response on behalf of
${userProfile.fullName}.
Communication style: ${userProfile.responseTemplate}
Recruiter message: "${recruiterMessage}"
Write in ${userLanguage}. Response text only.`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Recommendation Authenticity Verifier
export async function verifyRecommendation(fromUser, toUser, message, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Verify if this professional recommendation is genuine.
From: ${fromUser.fullName} (${fromUser.domain}) ${fromUser.verification_status}
To: ${toUser.fullName} (${toUser.domain}) ${toUser.verification_status}
Message: "${message}"
Is this specific and credible? Or generic and fake?
Respond in ${userLanguage}. JSON only:
{
  "authentic": true or false,
  "confidence": 0-100,
  "verdict": "one sentence in ${userLanguage}",
  "stamp": "Verified by Searcher" or "Flagged as suspicious"
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { authentic: true, confidence: 80, stamp: "Verified by Searcher" };
  }
}

// Hidden Talent Scanner
export async function analyseHiddenTalent(platformData, domain, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `You are Searcher Connector hidden talent detector.
Platform: ${platformData.platform}
URL: ${platformData.url}
Activity: ${JSON.stringify(platformData.activity)}
Domain searched: ${domain}
This person is NOT actively job-seeking.
Are their skills genuinely exceptional?
Would a serious company want them immediately?
Respond in ${userLanguage}. JSON:
{
  "is_exceptional": true or false,
  "genius_score": 0-100,
  "domain_match": "",
  "proof_summary": "what makes them exceptional",
  "skills": ["skill1", "skill2"],
  "approach_message": "message to send them in ${userLanguage}: 'We found you. A company is interested.'"
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { is_exceptional: false, genius_score: 0 };
  }
}

// VC Compatibility Analyser
export async function analyseVCProfile(vcData, projectData, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Analyse investor-project compatibility.
VC: ${JSON.stringify(vcData)}
Project: ${JSON.stringify(projectData)}
Respond in ${userLanguage}. JSON:
{
  "match_score": 0-100,
  "approach_strategy": "how to approach",
  "best_platform": "where they spend time",
  "best_timing": "when to contact",
  "pitch_angle": "angle tailored to this VC",
  "red_flags": ["any concerns"]
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { match_score: 50 };
  }
}

// B2B Client Intent Verifier
export async function verifyClientIntent(clientData, businessProfile, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Analyse if this prospect has real purchase intent.
Business offers: ${businessProfile.domain}
Price range: ${businessProfile.salary_min}-${businessProfile.salary_max}
Prospect: ${JSON.stringify(clientData)}
Respond in ${userLanguage}. JSON:
{
  "intent_score": 0-100,
  "financial_capacity": "confirmed" or "likely" or "uncertain",
  "purchase_probability": 0-100,
  "approach_message": "personalised outreach in ${userLanguage}",
  "verdict": "REAL BUYER" or "UNCERTAIN" or "NOT A FIT"
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { intent_score: 50, verdict: "UNCERTAIN" };
  }
}

// Project Level Evaluator (for investor matching calibration)
export async function evaluateProjectLevel(projectDescription, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Evaluate this project for investor calibration.
Project: ${projectDescription}
Assign ONE level:
- local: early stage, limited market
- regional: solid, African or continental opportunity
- continental: proven traction, Series A ready
- global: exceptional, world-changing potential
Respond in ${userLanguage}. JSON:
{
  "level": "local" or "regional" or "continental" or "global",
  "justification": "one sentence",
  "max_ticket": estimated max USD ticket,
  "investor_types": ["type1", "type2"]
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { level: "regional", max_ticket: 500000 };
  }
}

// Weekly Report Generator
export async function generateWeeklyReport(userStats, userProfile, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Generate a weekly performance report for ${userProfile.fullName}.
Stats this week:
- Opportunities found: ${userStats.opportunities}
- Applications sent: ${userStats.applications}
- Responses received: ${userStats.responses}
- Profile views: ${userStats.profileViews}
Write an encouraging, data-driven insight in ${userLanguage}.
One paragraph, actionable, specific to their domain: ${userProfile.domain}.`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Profile Health Score Analyser
export async function analyseProfileHealth(profile, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Analyse this professional profile and give a health score.
Profile: ${JSON.stringify(profile)}
Respond in ${userLanguage}. JSON:
{
  "health_score": 0-100,
  "strong_points": ["point1", "point2"],
  "weak_points": ["point1", "point2"],
  "priority_improvement": "most impactful thing to add or fix",
  "market_trend": "brief trend insight for their domain"
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { health_score: 70 };
  }
}

// Intensive Interview Preparation (for score > 90 matches)
export async function generateInterviewPrep(opportunity, userProfile, userLanguage = 'fr') {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Prepare a job candidate for an interview.
Company: ${opportunity.company}
Role: ${opportunity.title}
Candidate: ${userProfile.fullName}, domain: ${userProfile.domain}
Create in ${userLanguage}:
1. Company analysis (culture, values, recent news)
2. 5 likely interview questions for this role
3. Best answer angles for each question
4. 3 ways to stand out from other candidates
5. Questions to ask the interviewer
JSON:
{
  "company_analysis": "",
  "likely_questions": [{"question": "", "best_angle": ""}],
  "standout_strategies": ["strategy1", "strategy2", "strategy3"],
  "questions_to_ask": ["question1", "question2"]
}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().replace(/```json|```/g,"").trim());
  } catch {
    return { company_analysis: "", likely_questions: [] };
  }
}

--- src/services/serperService.ts ---

const SERPER_KEY = import.meta.env.VITE_SERPER_API_KEY;

async function serperSearch(query, lang = 'en') {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10, gl: "us", hl: lang }),
    });
    const data = await res.json();
    return data.organic || [];
  } catch (e) {
    console.error("Serper:", e);
    return [];
  }
}

export async function searchJobs(domain, country, language = 'en') {
  const queries = [
    `${domain} job hiring ${country} 2026`,
    `${domain} remote job opportunity worldwide`,
    `hiring ${domain} expert worldwide`,
    `${domain} job site:linkedin.com/jobs`,
    `${domain} job site:indeed.com`,
    `${domain} job site:remoteok.com`,
    `${domain} freelance site:upwork.com`,
    `${domain} hiring site:wellfound.com`,
    `${domain} job site:glassdoor.com`,
    `${domain} job opportunities Africa Asia Europe Americas 2026`,
    `${domain} emploi recrutement mondial 2026`,
    `${domain} jobs site:stackoverflow.com/jobs`,
    `${domain} who is hiring site:news.ycombinator.com`,
  ];
  const all = [];
  for (const q of queries.slice(0, 8)) {
    const r = await serperSearch(q, language);
    all.push(...r);
  }
  return all;
}

export async function searchSalaries(role, country) {
  return serperSearch(`average salary ${role} ${country} 2026`);
}

export async function searchHiddenTalents(domain) {
  const queries = [
    `${domain} expert portfolio site:github.com`,
    `${domain} designer portfolio site:behance.net`,
    `${domain} creator site:youtube.com`,
    `${domain} expert site:reddit.com`,
    `${domain} work samples site:dribbble.com`,
    `${domain} published site:substack.com`,
    `${domain} professional TikTok portfolio`,
    `best ${domain} work examples worldwide 2025 2026`,
    `${domain} expert site:stackoverflow.com`,
    `${domain} thought leader site:twitter.com`,
  ];
  const all = [];
  for (const q of queries.slice(0, 6)) {
    const r = await serperSearch(q);
    all.push(...r);
  }
  return all;
}

export async function searchVCData(sector, stage) {
  const queries = [
    `${sector} venture capital investor ${stage} thesis 2025 2026`,
    `best VC investors ${sector} site:crunchbase.com`,
    `${sector} angel investor active investments`,
    `top investors ${sector} Africa Asia Europe Americas`,
    `${sector} investor Forbes list`,
    `${sector} VC ticket size investment thesis`,
    `${sector} investor Jeune Afrique African tech`,
    `${sector} investment fund SEC filing`,
  ];
  const all = [];
  for (const q of queries.slice(0, 5)) {
    const r = await serperSearch(q);
    all.push(...r);
  }
  return all;
}

export async function searchStartups(sector, stage, country) {
  const queries = [
    `${sector} startup ${stage} funding ${country} 2025 2026`,
    `${sector} startup raised funding site:crunchbase.com`,
    `${sector} startup site:producthunt.com`,
    `${sector} Y Combinator startup`,
    `${sector} startup investment TechCrunch`,
    `${sector} startup Africa Asia worldwide 2026`,
  ];
  const all = [];
  for (const q of queries.slice(0, 4)) {
    const r = await serperSearch(q);
    all.push(...r);
  }
  return all;
}

export async function searchB2BClients(product, idealCustomer, geography, budget) {
  const queries = [
    `${idealCustomer} buying ${product} ${geography}`,
    `${idealCustomer} looking for ${product} worldwide`,
    `${idealCustomer} need ${product} Reddit forums`,
    `${product} customer ${idealCustomer} reviews`,
    `${idealCustomer} budget ${budget} purchasing ${product}`,
    `who needs ${product} ${geography} 2026`,
  ];
  const all = [];
  for (const q of queries.slice(0, 5)) {
    const r = await serperSearch(q);
    all.push(...r);
  }
  return all;
}

export async function searchInvestmentSummits(sector, geography) {
  const queries = [
    `investment summit conference ${sector} ${geography} 2026`,
    `high net worth investors gathering ${sector} 2026`,
    `Davos Web Summit startup pitch event ${sector} 2026`,
    `private equity conference ${geography} 2026`,
    `business angel network event ${sector} ${geography}`,
  ];
  const all = [];
  for (const q of queries.slice(0, 4)) {
    const r = await serperSearch(q);
    all.push(...r);
  }
  return all;
}

--- src/services/apifyService.ts ---

export async function scrapeJobPlatforms(domain, country) {
  const token = import.meta.env.VITE_APIFY_API_KEY;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          queries: [`${domain} ${country}`],
          maxResults: 10
        })
      }
    );
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('Apify:', e);
    return [];
  }
}

================================================================
STRIPE INTEGRATION
================================================================

Plans:
- free: $0 — 3 searches/day, 5 results max, 1 application/day
- talent: $29/month — unlimited job + freelance + all search
- business: $99/month — talent + client finder + talent search + audit
- investor: $299/month — business + Genius + VC + summits + hidden talents

FREE_MODE logic:
- Check app_settings table on app load
- FREE_MODE = 'true' → show "Free — Launch Period" on all plan buttons
  Stripe never triggered. All features unlocked.
- FREE_MODE = 'false' → show real prices, Stripe checkout active

Stripe webhooks:
- payment_intent.succeeded → set plan in Supabase automatically
- customer.subscription.deleted → downgrade to free automatically
- invoice.payment_failed → send alert notification to user
Zero manual intervention from founder ever.

================================================================
VOICE INTERFACE — WEB SPEECH API
================================================================

const startRecording = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Voice not supported in this browser. Please type."); return; }
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = getLanguageCode(selectedLanguage);
  r.onresult = (e) => {
    let t = "";
    for (let i = e.resultIndex; i < e.results.length; i++)
      t += e.results[i][0].transcript;
    setVoiceText(t);
    parseVoiceToFields(t);
  };
  r.start();
  setIsRecording(true);
  r.onend = () => setIsRecording(false);
};

================================================================
ALERT SYSTEM — 30 MINUTE REPETITION
================================================================

useEffect: every 30 minutes, check notifications table.
For any notification where:
  requires_action = true AND is_read = false
→ Show prominent alert card in dashboard
→ Send browser push notification (if PWA installed)
→ Increment alert_count
→ Update last_alerted_at
→ This continues until user marks it read or takes action

Alert colors:
RED: urgent — recruiter waiting
GOLD: fresh opportunity
CYAN: diversification — user needs more leads
ORANGE: international — passport/visa action needed

================================================================
PWA — INSTALLABLE ON ALL DEVICES
================================================================

manifest.json:
{
  "name": "Searcher Connector",
  "short_name": "Searcher",
  "description": "The autonomous agent that works for you 24/7",
  "theme_color": "#000000",
  "background_color": "#000000",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"}
  ]
}

Service Worker:
- Cache all pages for offline reading
- Background sync for pending actions
- Push notification support

"Install App" button visible in header.
Compatible: Windows, Mac, Android, iOS.
Opens without browser bar. Feels native.

================================================================
AUTO-PROMOTION ENGINE — EVERY PAGE AND EVERY ACTION
================================================================

RULE: Every action Searcher takes includes financial value.
NOT: "Someone wants to connect with you."
YES: "A verified Genius has a project worth $500,000+.
     Join Searcher Connector — searcherconnector.com"

Fixed footer on EVERY page:
"Opportunity delivered via Searcher Connector"
searcherconnector.com (gold link)
"People click not out of curiosity — but because there is money waiting."

Every application sent includes signature:
"Submitted via Searcher Connector
 The autonomous agent that finds and applies for you 24/7
 searcherconnector.com"

Every Smart Connector notification to non-users:
"A verified opportunity on Searcher Connector is waiting for you.
 Join free — [specific financial value stated clearly]
 searcherconnector.com"

Every hidden talent contact:
"We found you on [platform].
 A company in your exact domain is actively looking.
 This opportunity is exclusive to Searcher Connector.
 Join free — searcherconnector.com"

Auto-promo footer links: Privacy Policy | Terms of Service | Support

================================================================
NPM PACKAGES TO INSTALL
================================================================

@google/generative-ai
@supabase/supabase-js
recharts
lucide-react
i18next
react-i18next
three
react-globe.gl
@stripe/stripe-js
framer-motion
react-swipeable

================================================================
RESPONSIVE DESIGN — NON-NEGOTIABLE
================================================================

MOBILE (< 768px):
Bottom tab navigation bar (5 main icons)
Single column layout
Tinder swipe cards for opportunities
Globe: smaller, still visible
All text readable without zoom
Touch-friendly tap targets (min 44px)
RTL: Arabic, Hebrew, Urdu, Farsi, Pashto — automatic

DESKTOP (> 768px):
Top navigation
3-column LinkedIn layout
Grid opportunity cards
Globe: full size in hero

================================================================
ERROR HANDLING — NEVER A BLANK SCREEN
================================================================

ALL errors shown as dark cards (#111, gold border, clear message):
Serper fails → "Search temporarily unavailable. Tap to retry."
Gemini fails → "Analysis in progress. Check back in a moment."
Supabase fails → "Connection error. Check your internet."
Rate limit → "Searcher is resting briefly. Try again in a moment."
No results → "Searcher found nothing yet. Try broadening your criteria."
API key missing → "Configuration needed. Contact support."

NEVER a white background. NEVER a blank screen.
NEVER show raw error codes to users.

================================================================
LOADING STATES
================================================================

Search active: Globe fast spin + scanning pills light up one by one
Gemini analysis: "Searcher is thinking..." + pulsing gold dot
Hidden talent scan: "Searcher is scanning GitHub, Behance,
YouTube, Reddit, Twitter worldwide..."
Supabase saves: spinner on submit buttons, disabled state
Opportunities loading: skeleton shimmer cards (#141414)
Intelligence tab: "Searcher is scanning global databases..."
Heavy operations: full overlay with globe animation

================================================================
FINAL CHECKLIST — APP IS COMPLETE WHEN ALL OF THESE WORK:
================================================================

SPLASH AND NAVIGATION:
[ ] Splash screen shows 2.5s then fades
[ ] Landing page: black gold premium, globe 3D rotating
[ ] Story circles with fresh opportunities < 6h
[ ] 4 profile type buttons route correctly
[ ] How it works 4-step section visible
[ ] Competitor table visible and styled
[ ] Stats bar with real numbers from Supabase
[ ] Testimonials section with 3 cards
[ ] FAQ accordion works
[ ] Pricing preview 4 plans
[ ] Privacy + Terms + Support links in footer
[ ] Language selector works in nav

AUTHENTICATION:
[ ] Signup creates Supabase auth account
[ ] Founder email (stephanenana.pro@gmail.com) → instant GENIUS + founder panel
[ ] Auth routing works: pending/verified/genius/refused/founder
[ ] Logout works

ONBOARDING:
[ ] Voice mic records in correct language
[ ] Transcription fills fields in real time
[ ] All document upload zones work
[ ] Files save to Supabase Storage
[ ] Gemini analyses profile → returns status + score + reason
[ ] Status page auto-refreshes every 30 seconds
[ ] VERIFIED/GENIUS/REFUSED/PENDING all display correctly
[ ] Welcome email triggered on verification
[ ] Guided onboarding 5 steps shown once then never again
[ ] onboarding_completed set to true after

DASHBOARD:
[ ] 3-column layout desktop, 1-column mobile
[ ] Left sidebar: profile data, metrics, completion bar
[ ] Completion bar calculates correctly and shows tips
[ ] Story circles show fresh opportunities
[ ] Search trigger card works
[ ] Scanning pills animate when search active
[ ] Globe fast spins during search
[ ] Metric cards show real Supabase data
[ ] Timezone resolver card + toggles work
[ ] Active alerts repeat every 30 min
[ ] Diversification warning triggers when < 3 leads
[ ] Surveillance toggle saves to Supabase
[ ] Weekly report shows on Mondays
[ ] Right sidebar: connections, trending, salary widget

OPPORTUNITIES:
[ ] Global search calls Serper (8 queries worldwide)
[ ] Gemini scores and analyses results
[ ] Minimum 5 opportunities always shown
[ ] Freshest first (green < 6h, gold < 24h, gray older)
[ ] Trust badge on each card (VERIFIED REAL / SUSPICIOUS)
[ ] Score /100 gold pill per card
[ ] International alert shows if is_foreign = true
[ ] Diversification alert if user views same card 3x
[ ] Tinder swipe works on mobile
[ ] Score > 90 → gold explosion animation
[ ] View Original Offer → opens real URL in new tab
[ ] Let Searcher Apply → confirmation modal → application sent
[ ] Application signature appended to every submission
[ ] Status updates (auto_applied/pending/response_received)
[ ] Save search button works → saved_searches table
[ ] Saved searches show in sidebar with auto-repeat toggle

APPLICATIONS:
[ ] Full list of all applications sent
[ ] Status tracking per application
[ ] Cover message and CV adaptation visible
[ ] Filter by status works

HISTORY:
[ ] All search sessions listed
[ ] Grouped by date
[ ] Clear history works with confirmation

SALARY:
[ ] Role + country input
[ ] Serper search for real salary data
[ ] Gemini extracts min/median/max
[ ] Bar chart displays (recharts)
[ ] Trend arrow shows
[ ] Growth percentage shows
[ ] Data saved to salary_data table

NETWORK:
[ ] Only verified/genius profiles shown
[ ] Connection requests work (send/accept/decline)
[ ] Mutual connections count
[ ] Activity feed shows verified user actions

RECOMMENDATIONS:
[ ] Search verified users to endorse
[ ] Gemini verifies authenticity
[ ] "Verified by Searcher" stamp on authentic ones
[ ] Suspicious ones rejected with explanation
[ ] Received recommendations listed with stamps
[ ] Given recommendations tracked

PUBLICATIONS:
[ ] Only VERIFIED and GENIUS can publish
[ ] Rich text editor works
[ ] All users can read publications
[ ] Views + likes count

INVESTOR TAB:
[ ] Project level evaluated by Gemini
[ ] Calibrated investor search by level
[ ] Project cards with viability score
[ ] "I want to know more" creates financial notification

BUSINESS TAB:
[ ] Business certification check
[ ] Client segmentation (local/regional/global)
[ ] Serper searches for B2B clients
[ ] Gemini verifies purchase intent
[ ] Only intent > 60 shown
[ ] Prospect cards with all data

SMART CONNECTOR:
[ ] Detects if target is on platform → direct notification
[ ] Detects if not on platform → posts where they are
[ ] All notifications include specific financial value
[ ] Viral loop logic documented + logged

INTELLIGENCE TAB:
[ ] Startup database search works
[ ] Fundraising history timeline works
[ ] VC database with thesis/ticket/approach
[ ] VC compatibility analysis by Gemini
[ ] Hidden talents: Business/Investor plan only + lock card
[ ] Hidden talent cards with approach message
[ ] Investment summits: GENIUS only + lock card
[ ] Summit cards with positioning strategy
[ ] VC tracking campaigns (Orange Merchant) work

PROFILE:
[ ] All fields editable
[ ] Photo upload works
[ ] CV update works
[ ] Recommendations visible on profile
[ ] Profile views counter increments

SETTINGS:
[ ] All toggles save to Supabase
[ ] Language change updates entire interface
[ ] Delete account → confirmation → soft delete
[ ] Download data → JSON export

SUPPORT:
[ ] Form saves to support_tickets table
[ ] Toast confirmation shows
[ ] Founder sees all open tickets

LEGAL:
[ ] /privacy page exists with complete content
[ ] /terms page exists with complete content
[ ] Links in footer work

FOUNDER DASHBOARD:
[ ] Only founder email can access /founder
[ ] Stats: all users, plans, revenue, countries
[ ] FREE_MODE toggle works (updates app_settings)
[ ] Manual GENIUS promotion works
[ ] Manual REFUSE with explanation works
[ ] Open support tickets visible

STRIPE:
[ ] Plans display correctly
[ ] FREE_MODE = true → "Free — Launch Period" shown
[ ] FREE_MODE = false → real prices + Stripe checkout
[ ] Webhook sets plan automatically after payment
[ ] Subscription cancellation → downgrade automatically

PWA:
[ ] Install button visible in header
[ ] Works on Android and iOS
[ ] Offline shows cached pages

DESIGN:
[ ] Zero white backgrounds anywhere in the app
[ ] Zero placeholder or lorem ipsum text
[ ] Zero broken buttons
[ ] Globe 3D visible and rotating
[ ] All animations smooth (framer-motion)
[ ] Mobile and desktop both perfect
[ ] 80+ languages selector works including RTL
[ ] Voice recognition works in correct language
[ ] Pulsing gold dot on all active states
[ ] Auto-promotion footer on every page
[ ] "Verified by Searcher" stamp on recommendations
[ ] Black American Express card energy — exclusive, premium, powerful

================================================================
SENIOR DEVELOPER INSTRUCTIONS
================================================================

1. During coding: benchmark LinkedIn, Indeed, Upwork, AngelList,
   Apollo, Calendly, Stripe, Hims & Hers. If you identify
   any feature, UX pattern, or improvement that would make
   Searcher Connector better — ADD IT without being asked.

2. Organise your code cleanly:
   /src/pages — one file per route
   /src/components — reusable UI components
   /src/services — all API calls (gemini, serper, apify, stripe)
   /src/hooks — custom hooks
   /src/context — auth context
   /src/i18n — translations
   /src/lib — supabase client

3. Error boundaries on every major section.
   No crash should bring down the whole app.

4. Loading states on every async operation.
   Never leave the user looking at a frozen screen.

5. Test your logic mentally before moving to next section.
   Fix your own bugs before delivering.

6. Before considering the work done: go through every item
   in the FINAL CHECKLIST above and verify it works.

7. The goal: deliver a production-ready application that
   a real paying user can use from day one without any
   manual fixes from the developer.

================================================================
TAILWIND CSS CONFIGURATION
================================================================

tailwind.config.js:
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0A0A0A',
        'dark-card': '#111111',
        'dark-deeper': '#141414',
        'gold': '#D4AF37',
        'gold-dark': '#1A1500',
        'cyan': '#00FFFF',
        'text-gray': '#888888',
        'text-muted': '#444444',
      },
      borderColor: {
        'default': '#2a2a2a',
        'gold': '#D4AF37',
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 1.5s ease-in-out',
        'spin-fast': 'spin 1s linear infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212, 175, 55, 0)' },
        },
        'scan': {
          '0%': { opacity: '0.5', transform: 'scaleX(0.95)' },
          '50%': { opacity: '1', transform: 'scaleX(1)' },
          '100%': { opacity: '0.5', transform: 'scaleX(0.95)' },
        },
      },
    },
  },
  plugins: [],
}
```

================================================================
NAVBAR GLASSMORPHISM COMPONENT
================================================================

File: /src/components/Navbar.jsx

```javascript
import React, { useState } from 'react';
import { Menu, X, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Opportunities', path: '/opportunities' },
    { label: 'Profile', path: '/profile' },
    { label: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50">
      {/* Glassmorphism Background */}
      <div 
        className="absolute inset-0 bg-dark-bg/40 backdrop-blur-lg border-b border-default"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(212, 175, 55, 0.1)',
        }}
      />

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center">
              <span className="text-dark-bg font-bold text-lg">S</span>
            </div>
            <span className="text-white font-bold text-xl hidden sm:inline">
              Searcher
            </span>
            <span className="hidden md:inline text-cyan text-xs font-semibold ml-1">
              CONNECTOR
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="text-text-gray hover:text-white transition-colors duration-200 text-sm font-medium relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Settings Button */}
                <button 
                  onClick={() => navigate('/settings')}
                  className="p-2 hover:bg-dark-card rounded-btn transition-colors duration-200 hidden sm:flex"
                >
                  <Settings size={20} className="text-text-gray hover:text-gold transition-colors" />
                </button>

                {/* User Profile */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-btn bg-dark-card/50 hover:bg-dark-card transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-gold" />
                  <span className="text-white text-sm font-medium truncate max-w-[100px]">
                    {user.email?.split('@')[0]}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-500/10 rounded-btn transition-colors duration-200"
                >
                  <LogOut size={20} className="text-text-gray hover:text-red-500 transition-colors" />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-gold text-dark-bg rounded-btn font-bold hover:bg-gold-dark transition-all duration-200 text-sm"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-dark-card rounded-btn transition-colors"
            >
              {isOpen ? (
                <X size={24} className="text-gold" />
              ) : (
                <Menu size={24} className="text-text-gray" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-dark-card/95 backdrop-blur-lg border-b border-default animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 text-text-gray hover:text-gold hover:bg-dark-deeper rounded-btn transition-all duration-200 text-left font-medium"
                >
                  {link.label}
                </button>
              ))}
              {!user && (
                <button
                  onClick={() => {
                    navigate('/login');
                    setIsOpen(false);
                  }}
                  className="mt-2 px-4 py-2 bg-gold text-dark-bg rounded-btn font-bold hover:bg-gold-dark transition-all w-full"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
```

================================================================
THIS IS SEARCHER CONNECTOR.
BUILT FROM DOUALA, CAMEROON.
BY SOMEONE WHO REFUSED TO WAIT FOR THE RIGHT CONDITIONS.

"What Searcher can do alone → it does immediately.
 What it cannot → it alerts until you act."

searcherconnector.com
================================================================
