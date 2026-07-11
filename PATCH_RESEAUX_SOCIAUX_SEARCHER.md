=================================================================
SEARCHER CONNECTOR — PATCH RÉSEAUX SOCIAUX COMPLETS
TOUTES LES APIS GRATUITES — TELEGRAM · FACEBOOK · DISCORD · YOUTUBE
TIKTOK · INSTAGRAM · MASTODON · PINTEREST · SNAPCHAT · ET PLUS
=================================================================
Tu es un développeur senior full-stack avec 15 ans d'expérience.
Tu ajoutes ce patch PAR-DESSUS le code existant sans rien casser.
Tu codes TOUT. Tu ne laisses RIEN de côté.
=================================================================

=================================================================
ÉTAPE 1 — SQL : TOUTES LES SOURCES RÉSEAUX SOCIAUX
=================================================================

Exécute ce SQL dans Supabase SQL Editor.
Ce sont TOUTES les sources réseaux sociaux gratuites disponibles.
NE PAS truncate — juste INSERT pour ne pas écraser les sources déjà là.

-- ============================================================
-- TELEGRAM — NUMÉRO 1 EN AFRIQUE (Bot API 100% gratuite)
-- ============================================================
INSERT INTO scan_sources (source_name, source_type, source_url, category, country_code, profile_types) VALUES

('Telegram Emploi Cameroun','api_official','https://t.me/s/emploi_cameroun','job_africa','CM','{job_seeker,freelance}'),
('Telegram Jobs Cameroon','api_official','https://t.me/s/jobscameroon','job_africa','CM','{job_seeker,freelance}'),
('Telegram Opportunites CM','api_official','https://t.me/s/opportunites_cameroun','job_africa','CM','{job_seeker,freelance,business}'),
('Telegram Business Cameroun','api_official','https://t.me/s/business_cameroun','client_b2b','CM','{business,investor}'),
('Telegram Startup Douala','api_official','https://t.me/s/startup_douala','startup','CM','{business,investor}'),
('Telegram Jobs Nigeria','api_official','https://t.me/s/nigeriajobs','job_africa','NG','{job_seeker,freelance}'),
('Telegram Jobs Ghana','api_official','https://t.me/s/ghanajobs','job_africa','GH','{job_seeker}'),
('Telegram Jobs Senegal','api_official','https://t.me/s/senegaljobs','job_africa','SN','{job_seeker}'),
('Telegram Jobs Kenya','api_official','https://t.me/s/kenyajobs','job_africa','KE','{job_seeker}'),
('Telegram Africa Tech Jobs','api_official','https://t.me/s/africatechjobs','tech','AFRICA','{job_seeker,freelance}'),
('Telegram Africa Startup','api_official','https://t.me/s/africastartup','startup','AFRICA','{business,investor}'),
('Telegram Africa Business','api_official','https://t.me/s/africabusiness','client_b2b','AFRICA','{business,investor}'),
('Telegram Remote Jobs Global','api_official','https://t.me/s/remotejobsglobal','job_global','WORLD','{job_seeker,freelance}'),
('Telegram Freelance World','api_official','https://t.me/s/freelanceworld','freelance','WORLD','{freelance}'),
('Telegram Dev Jobs','api_official','https://t.me/s/devjobs','tech','WORLD','{job_seeker,freelance}'),
('Telegram Design Jobs','api_official','https://t.me/s/designjobs','freelance','WORLD','{freelance,talent}'),
('Telegram Marketing Jobs','api_official','https://t.me/s/marketingjobs','freelance','WORLD','{freelance,job_seeker}'),
('Telegram VC Funding News','api_official','https://t.me/s/vcfundingnews','investor','WORLD','{investor,business}'),
('Telegram Startup Funding','api_official','https://t.me/s/startupfunding','investor','WORLD','{investor,business}'),
('Telegram Angel Investors','api_official','https://t.me/s/angelinvestors','investor','WORLD','{investor,business}'),
('Telegram Crypto Jobs','api_official','https://t.me/s/cryptojobs','tech','WORLD','{freelance,job_seeker}'),
('Telegram Blockchain Jobs','api_official','https://t.me/s/blockchainjobs','tech','WORLD','{freelance,job_seeker}'),
('Telegram AI ML Jobs','api_official','https://t.me/s/aiml_jobs','tech','WORLD','{job_seeker,freelance}'),
('Telegram Python Jobs','api_official','https://t.me/s/pythonjobs','tech','WORLD','{freelance,job_seeker}'),
('Telegram React Jobs','api_official','https://t.me/s/reactjobs','tech','WORLD','{freelance,job_seeker}'),
('Telegram Node Jobs','api_official','https://t.me/s/nodejsjobs','tech','WORLD','{freelance,job_seeker}'),

-- ============================================================
-- FACEBOOK — Graph API gratuite (pages et groupes publics)
-- ============================================================
('Facebook Jobs Global','api_official','https://graph.facebook.com/v19.0/search?type=page&q=jobs+hiring','job_global','WORLD','{job_seeker,freelance}'),
('Facebook Jobs Cameroun','api_official','https://graph.facebook.com/v19.0/search?type=page&q=emploi+cameroun','job_africa','CM','{job_seeker}'),
('Facebook Jobs Nigeria','api_official','https://graph.facebook.com/v19.0/search?type=page&q=jobs+nigeria','job_africa','NG','{job_seeker}'),
('Facebook Jobs Senegal','api_official','https://graph.facebook.com/v19.0/search?type=page&q=emploi+senegal','job_africa','SN','{job_seeker}'),
('Facebook Jobs Cote Ivoire','api_official','https://graph.facebook.com/v19.0/search?type=page&q=emploi+abidjan','job_africa','CI','{job_seeker}'),
('Facebook Jobs Kenya','api_official','https://graph.facebook.com/v19.0/search?type=page&q=jobs+kenya','job_africa','KE','{job_seeker}'),
('Facebook Jobs Ghana','api_official','https://graph.facebook.com/v19.0/search?type=page&q=jobs+ghana','job_africa','GH','{job_seeker}'),
('Facebook Freelance Africa','api_official','https://graph.facebook.com/v19.0/search?type=page&q=freelance+africa','freelance','AFRICA','{freelance}'),
('Facebook Startup Africa','api_official','https://graph.facebook.com/v19.0/search?type=page&q=startup+africa','startup','AFRICA','{business,investor}'),
('Facebook Business Afrique','api_official','https://graph.facebook.com/v19.0/search?type=page&q=business+afrique','client_b2b','AFRICA','{business}'),
('Facebook Investors Africa','api_official','https://graph.facebook.com/v19.0/search?type=page&q=investors+africa','investor','AFRICA','{investor,business}'),
('Facebook Remote Work','api_official','https://graph.facebook.com/v19.0/search?type=page&q=remote+work+hiring','job_global','WORLD','{job_seeker,freelance}'),
('Facebook Tech Jobs','api_official','https://graph.facebook.com/v19.0/search?type=page&q=tech+jobs+hiring','tech','WORLD','{job_seeker,freelance}'),
('Facebook Design Jobs','api_official','https://graph.facebook.com/v19.0/search?type=page&q=design+jobs+freelance','freelance','WORLD','{freelance,talent}'),
('Facebook Marketing Jobs','api_official','https://graph.facebook.com/v19.0/search?type=page&q=marketing+jobs','freelance','WORLD','{freelance,job_seeker}'),

-- ============================================================
-- YOUTUBE — Data API v3 gratuite (10,000 req/jour)
-- ============================================================
('YouTube Emploi Afrique','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=emploi+afrique+opportunite&type=video&order=date','job_africa','AFRICA','{job_seeker,freelance}'),
('YouTube Jobs Remote 2025','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=remote+jobs+2025+hiring&type=video&order=date','job_global','WORLD','{job_seeker,freelance}'),
('YouTube Freelance Tips','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=freelance+opportunities+2025&type=video&order=date','freelance','WORLD','{freelance}'),
('YouTube Startup Funding','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=startup+funding+investor+pitch&type=video&order=date','investor','WORLD','{investor,business}'),
('YouTube Africa Tech','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=africa+tech+startup+2025&type=video&order=date','startup','AFRICA','{investor,business}'),
('YouTube Hidden Talents Tech','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=developer+tutorial+portfolio+2025&type=channel&order=viewCount','talent','WORLD','{talent}'),
('YouTube Hidden Talents Design','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=graphic+design+portfolio+creative&type=channel&order=viewCount','talent','WORLD','{talent}'),
('YouTube Hidden Talents Marketing','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=digital+marketing+growth+hacking&type=channel&order=viewCount','talent','WORLD','{talent}'),
('YouTube Business Cameroun','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=business+entrepreneuriat+cameroun&type=video&order=date','client_b2b','CM','{business,investor}'),
('YouTube VC Investors','api_official','https://www.googleapis.com/youtube/v3/search?part=snippet&q=venture+capital+investing+startups&type=channel&order=viewCount','investor','WORLD','{investor}'),

-- ============================================================
-- DISCORD — API gratuite (serveurs publics)
-- ============================================================
('Discord Reactiflux Jobs','api_official','https://discord.com/api/v10/channels/reactiflux-jobs/messages','tech','WORLD','{job_seeker,freelance}'),
('Discord Designer Hangout Jobs','api_official','https://discord.com/api/v10/channels/design-jobs/messages','freelance','WORLD','{freelance,talent}'),
('Discord Startup Jobs','api_official','https://discord.com/api/v10/channels/startup-jobs/messages','startup','WORLD','{job_seeker,freelance}'),
('Discord Remote Work','api_official','https://discord.com/api/v10/channels/remote-work/messages','job_global','WORLD','{job_seeker,freelance}'),
('Discord Web Dev Jobs','api_official','https://discord.com/api/v10/channels/web-dev-jobs/messages','tech','WORLD','{freelance,job_seeker}'),
('Discord Freelance Network','api_official','https://discord.com/api/v10/channels/freelance-network/messages','freelance','WORLD','{freelance}'),
('Discord Africa Tech','api_official','https://discord.com/api/v10/channels/africa-tech/messages','tech','AFRICA','{job_seeker,freelance,investor}'),
('Discord Crypto Jobs','api_official','https://discord.com/api/v10/channels/crypto-jobs/messages','tech','WORLD','{freelance,job_seeker}'),
('Discord AI Community Jobs','api_official','https://discord.com/api/v10/channels/ai-community-jobs/messages','tech','WORLD','{job_seeker,freelance}'),
('Discord Marketing Jobs','api_official','https://discord.com/api/v10/channels/marketing-jobs/messages','freelance','WORLD','{freelance,job_seeker}'),

-- ============================================================
-- TWITTER / X — API v2 gratuite (500K tweets/mois)
-- ============================================================
('Twitter Hiring Now','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23hiring+%23job+lang:en&max_results=50','job_global','WORLD','{job_seeker,freelance}'),
('Twitter Remote Jobs','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23remotejobs+%23hiring&max_results=50','job_global','WORLD','{job_seeker,freelance}'),
('Twitter Freelance Gigs','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23freelance+%23looking+%23gig&max_results=50','freelance','WORLD','{freelance}'),
('Twitter Africa Jobs','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23africajobs+%23hiring+%23emploi&max_results=50','job_africa','AFRICA','{job_seeker,freelance}'),
('Twitter Cameroun Emploi','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23emploicameroun+%23recrutement&max_results=50','job_africa','CM','{job_seeker}'),
('Twitter Startup Funding','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23startupfunding+%23venturecapital&max_results=50','investor','WORLD','{investor,business}'),
('Twitter Africa Tech','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23africatech+%23AfricaStartup&max_results=50','startup','AFRICA','{investor,business}'),
('Twitter VC Investors Active','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23investing+%23angelinvestor+%23seed&max_results=50','investor','WORLD','{investor,business}'),
('Twitter Dev Hiring','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23devjobs+%23webdev+hiring&max_results=50','tech','WORLD','{job_seeker,freelance}'),
('Twitter Design Gigs','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23designjobs+%23uidesign+hiring&max_results=50','freelance','WORLD','{freelance,talent}'),
('Twitter Growth Marketing Jobs','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23growthhacking+%23marketingjobs+hiring&max_results=50','freelance','WORLD','{freelance,job_seeker}'),
('Twitter Hidden Genius','api_official','https://api.twitter.com/2/tweets/search/recent?query=%23buildinpublic+%23indiemaker+%23saas&max_results=50','talent','WORLD','{talent,business}'),

-- ============================================================
-- INSTAGRAM — Graph API gratuite (hashtags publics)
-- ============================================================
('Instagram Hiring Posts','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=hiring','job_global','WORLD','{job_seeker,freelance}'),
('Instagram Remote Jobs','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=remotejobs','job_global','WORLD','{job_seeker,freelance}'),
('Instagram Africa Business','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=africabusiness','client_b2b','AFRICA','{business}'),
('Instagram Freelance Design','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=freelancedesigner','freelance','WORLD','{freelance,talent}'),
('Instagram Startup Africa','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=startupafrique','startup','AFRICA','{business,investor}'),
('Instagram Emploi Cameroun','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=emploicameroun','job_africa','CM','{job_seeker}'),
('Instagram Tech Talent','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=devlife+portfolio','talent','WORLD','{talent}'),
('Instagram Marketing Expert','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=digitalmarketing+expert','talent','WORLD','{talent,freelance}'),
('Instagram Investor Network','api_official','https://graph.instagram.com/v19.0/ig_hashtag_search?q=venturecapital+investing','investor','WORLD','{investor}'),

-- ============================================================
-- MASTODON — API ouverte (fediverse, communautés tech)
-- ============================================================
('Mastodon Fosstodon Jobs','api_official','https://fosstodon.org/api/v1/timelines/tag/jobs','tech','WORLD','{job_seeker,freelance}'),
('Mastodon Hachyderm Hiring','api_official','https://hachyderm.io/api/v1/timelines/tag/hiring','tech','WORLD','{job_seeker,freelance}'),
('Mastodon Infosec Jobs','api_official','https://infosec.exchange/api/v1/timelines/tag/infosecjobs','tech','WORLD','{job_seeker,freelance}'),
('Mastodon Dev Jobs','api_official','https://mastodon.social/api/v1/timelines/tag/devjobs','tech','WORLD','{job_seeker,freelance}'),
('Mastodon Remote Work','api_official','https://mastodon.social/api/v1/timelines/tag/remotework','job_global','WORLD','{job_seeker,freelance}'),
('Mastodon Freelance','api_official','https://mastodon.social/api/v1/timelines/tag/freelance','freelance','WORLD','{freelance}'),
('Mastodon Open Source Jobs','api_official','https://mastodon.social/api/v1/timelines/tag/opensource','tech','WORLD','{job_seeker,freelance}'),

-- ============================================================
-- LINKEDIN — Flux publics (sans connexion)
-- ============================================================
('LinkedIn Hashtag Hiring','rss','https://www.linkedin.com/feed/hashtag/hiring/rss','job_global','WORLD','{job_seeker,freelance}'),
('LinkedIn Hashtag RemoteJobs','rss','https://www.linkedin.com/feed/hashtag/remotejobs/rss','job_global','WORLD','{job_seeker,freelance}'),
('LinkedIn Hashtag AfricaTech','rss','https://www.linkedin.com/feed/hashtag/africatech/rss','startup','AFRICA','{investor,business}'),
('LinkedIn Hashtag Freelance','rss','https://www.linkedin.com/feed/hashtag/freelance/rss','freelance','WORLD','{freelance}'),
('LinkedIn Hashtag Startup','rss','https://www.linkedin.com/feed/hashtag/startup/rss','startup','WORLD','{investor,business}'),
('LinkedIn Hashtag Venture','rss','https://www.linkedin.com/feed/hashtag/venturecapital/rss','investor','WORLD','{investor,business}'),
('LinkedIn Hashtag Emploi','rss','https://www.linkedin.com/feed/hashtag/emploi/rss','job_global','FR','{job_seeker}'),
('LinkedIn Hashtag Recrutement','rss','https://www.linkedin.com/feed/hashtag/recrutement/rss','job_global','FR','{job_seeker}'),

-- ============================================================
-- REDDIT — TOUS LES SUBREDDITS MANQUANTS
-- ============================================================
('Reddit r/cscareerquestions','rss','https://www.reddit.com/r/cscareerquestions/.rss','tech','WORLD','{job_seeker}'),
('Reddit r/webdev','rss','https://www.reddit.com/r/webdev/.rss','tech','WORLD','{freelance,job_seeker}'),
('Reddit r/programming','rss','https://www.reddit.com/r/programming/.rss','tech','WORLD','{job_seeker,freelance}'),
('Reddit r/learnprogramming','rss','https://www.reddit.com/r/learnprogramming/.rss','tech','WORLD','{job_seeker}'),
('Reddit r/MachineLearning','rss','https://www.reddit.com/r/MachineLearning/.rss','tech','WORLD','{job_seeker,freelance}'),
('Reddit r/datascience','rss','https://www.reddit.com/r/datascience/.rss','tech','WORLD','{job_seeker,freelance}'),
('Reddit r/UXDesign','rss','https://www.reddit.com/r/UXDesign/.rss','freelance','WORLD','{freelance,talent}'),
('Reddit r/graphic_design','rss','https://www.reddit.com/r/graphic_design/.rss','freelance','WORLD','{freelance,talent}'),
('Reddit r/marketing','rss','https://www.reddit.com/r/marketing/.rss','freelance','WORLD','{freelance,job_seeker}'),
('Reddit r/digital_marketing','rss','https://www.reddit.com/r/digital_marketing/.rss','freelance','WORLD','{freelance,job_seeker}'),
('Reddit r/socialmedia','rss','https://www.reddit.com/r/socialmedia/.rss','freelance','WORLD','{freelance}'),
('Reddit r/SEO','rss','https://www.reddit.com/r/SEO/.rss','freelance','WORLD','{freelance}'),
('Reddit r/copywriting','rss','https://www.reddit.com/r/copywriting/.rss','freelance','WORLD','{freelance,talent}'),
('Reddit r/content_marketing','rss','https://www.reddit.com/r/content_marketing/.rss','freelance','WORLD','{freelance}'),
('Reddit r/videography','rss','https://www.reddit.com/r/videography/.rss','freelance','WORLD','{freelance,talent}'),
('Reddit r/FilmIndustryNetwork','rss','https://www.reddit.com/r/FilmIndustryNetwork/.rss','freelance','WORLD','{freelance,talent}'),
('Reddit r/photography','rss','https://www.reddit.com/r/photography/.rss','freelance','WORLD','{freelance,talent}'),
('Reddit r/Accounting','rss','https://www.reddit.com/r/Accounting/.rss','job_global','WORLD','{job_seeker}'),
('Reddit r/finance','rss','https://www.reddit.com/r/finance/.rss','investor','WORLD','{investor,job_seeker}'),
('Reddit r/PersonalFinance','rss','https://www.reddit.com/r/personalfinance/.rss','general','WORLD','{job_seeker}'),
('Reddit r/careerguidance','rss','https://www.reddit.com/r/careerguidance/.rss','job_global','WORLD','{job_seeker}'),
('Reddit r/resumes','rss','https://www.reddit.com/r/resumes/.rss','job_global','WORLD','{job_seeker}'),
('Reddit r/jobsearchhacks','rss','https://www.reddit.com/r/jobsearchhacks/.rss','job_global','WORLD','{job_seeker}'),
('Reddit r/recruitinghell','rss','https://www.reddit.com/r/recruitinghell/.rss','job_global','WORLD','{job_seeker}'),
('Reddit r/humanresources','rss','https://www.reddit.com/r/humanresources/.rss','job_global','WORLD','{job_seeker,business}'),
('Reddit r/Africa','rss','https://www.reddit.com/r/africa/.rss','job_africa','AFRICA','{job_seeker,freelance,business}'),
('Reddit r/Nigeria','rss','https://www.reddit.com/r/Nigeria/.rss','job_africa','NG','{job_seeker}'),
('Reddit r/Kenya','rss','https://www.reddit.com/r/Kenya/.rss','job_africa','KE','{job_seeker}'),
('Reddit r/southafrica','rss','https://www.reddit.com/r/southafrica/.rss','job_africa','ZA','{job_seeker}'),
('Reddit r/Morocco','rss','https://www.reddit.com/r/Morocco/.rss','job_africa','MA','{job_seeker}'),
('Reddit r/france','rss','https://www.reddit.com/r/france/.rss','job_global','FR','{job_seeker}'),
('Reddit r/de_IAmA','rss','https://www.reddit.com/r/IAmA/.rss','general','WORLD','{talent}'),
('Reddit r/AMA','rss','https://www.reddit.com/r/AMA/.rss','general','WORLD','{talent}'),
('Reddit r/SideProject','rss','https://www.reddit.com/r/SideProject/.rss','startup','WORLD','{business,investor}'),
('Reddit r/growmybusiness','rss','https://www.reddit.com/r/growmybusiness/.rss','client_b2b','WORLD','{business}'),
('Reddit r/ecommerce','rss','https://www.reddit.com/r/ecommerce/.rss','client_b2b','WORLD','{business}'),
('Reddit r/Affiliatemarketing','rss','https://www.reddit.com/r/Affiliatemarketing/.rss','freelance','WORLD','{freelance}'),
('Reddit r/passive_income','rss','https://www.reddit.com/r/passive_income/.rss','general','WORLD','{freelance,investor}'),
('Reddit r/CryptoCurrency','rss','https://www.reddit.com/r/CryptoCurrency/.rss','tech','WORLD','{investor,freelance}'),
('Reddit r/Web3','rss','https://www.reddit.com/r/Web3/.rss','tech','WORLD','{freelance,investor}'),

-- ============================================================
-- TIKTOK — Content API (tendances et talents)
-- ============================================================
('TikTok Emploi Afrique','api_official','https://open.tiktokapis.com/v2/video/query/?fields=id,title,video_description&hashtag=emploiafrique','talent','AFRICA','{talent,job_seeker}'),
('TikTok Remote Work','api_official','https://open.tiktokapis.com/v2/video/query/?fields=id,title,video_description&hashtag=remotework','job_global','WORLD','{job_seeker,freelance}'),
('TikTok Freelance Life','api_official','https://open.tiktokapis.com/v2/video/query/?fields=id,title,video_description&hashtag=freelancelife','freelance','WORLD','{freelance,talent}'),
('TikTok Africa Tech','api_official','https://open.tiktokapis.com/v2/video/query/?fields=id,title,video_description&hashtag=africatech','startup','AFRICA','{business,investor}'),
('TikTok Developer Life','api_official','https://open.tiktokapis.com/v2/video/query/?fields=id,title,video_description&hashtag=developerlife','talent','WORLD','{talent}'),
('TikTok Startup Pitch','api_official','https://open.tiktokapis.com/v2/video/query/?fields=id,title,video_description&hashtag=startuppitch','investor','WORLD','{investor,business}'),

-- ============================================================
-- PINTEREST — API gratuite (talents créatifs)
-- ============================================================
('Pinterest Design Portfolio','api_official','https://api.pinterest.com/v5/search/pins?query=design+portfolio','talent','WORLD','{talent,freelance}'),
('Pinterest UI UX Design','api_official','https://api.pinterest.com/v5/search/pins?query=ui+ux+design+inspiration','talent','WORLD','{talent,freelance}'),
('Pinterest Graphic Design','api_official','https://api.pinterest.com/v5/search/pins?query=graphic+design+portfolio','talent','WORLD','{talent,freelance}'),
('Pinterest Photography','api_official','https://api.pinterest.com/v5/search/pins?query=photography+portfolio','talent','WORLD','{talent,freelance}'),
('Pinterest Architecture','api_official','https://api.pinterest.com/v5/search/pins?query=architecture+portfolio','talent','WORLD','{talent}'),
('Pinterest Fashion Africa','api_official','https://api.pinterest.com/v5/search/pins?query=fashion+africa+designer','talent','AFRICA','{talent,freelance}'),

-- ============================================================
-- WHATSAPP — Business API (canaux publics vérifiés)
-- ============================================================
('WhatsApp Business Africa Jobs','api_official','https://graph.facebook.com/v19.0/me/messages?type=jobs+africa','job_africa','AFRICA','{job_seeker,freelance}'),
('WhatsApp Business Cameroun','api_official','https://graph.facebook.com/v19.0/me/messages?type=emploi+cameroun','job_africa','CM','{job_seeker}'),

-- ============================================================
-- SUBSTACK — Newsletters investisseurs et startups
-- ============================================================
('Substack VC Weekly','rss','https://vcweekly.substack.com/feed','investor','WORLD','{investor,business}'),
('Substack Africa Roundup','rss','https://africaroundupnewsletter.substack.com/feed','investor','AFRICA','{investor,business}'),
('Substack Startup Weekly','rss','https://startupweekly.substack.com/feed','startup','WORLD','{investor,business}'),
('Substack Remote Work Report','rss','https://remoteworkreport.substack.com/feed','job_global','WORLD','{job_seeker,freelance}'),
('Substack Freelance Movement','rss','https://freelancemovement.substack.com/feed','freelance','WORLD','{freelance}'),
('Substack Dev Weekly','rss','https://devweekly.substack.com/feed','tech','WORLD','{job_seeker,freelance}'),
('Substack Africa Tech Digest','rss','https://africatechdigest.substack.com/feed','startup','AFRICA','{investor,business}'),
('Substack Cameroun Business','rss','https://camerounbusiness.substack.com/feed','client_b2b','CM','{business,investor}'),

-- ============================================================
-- MEDIUM — Tags emploi, startup, freelance
-- ============================================================
('Medium Tag Jobs','rss','https://medium.com/feed/tag/jobs','job_global','WORLD','{job_seeker}'),
('Medium Tag Remote Work','rss','https://medium.com/feed/tag/remote-work','job_global','WORLD','{job_seeker,freelance}'),
('Medium Tag Freelancing','rss','https://medium.com/feed/tag/freelancing','freelance','WORLD','{freelance}'),
('Medium Tag Startup','rss','https://medium.com/feed/tag/startup','startup','WORLD','{investor,business}'),
('Medium Tag Venture Capital','rss','https://medium.com/feed/tag/venture-capital','investor','WORLD','{investor,business}'),
('Medium Tag Africa','rss','https://medium.com/feed/tag/africa','general','AFRICA','{job_seeker,freelance,investor,business}'),
('Medium Tag Entrepreneurship','rss','https://medium.com/feed/tag/entrepreneurship','startup','WORLD','{business,investor}'),
('Medium Tag Career','rss','https://medium.com/feed/tag/career','job_global','WORLD','{job_seeker}'),
('Medium Tag Programming','rss','https://medium.com/feed/tag/programming','tech','WORLD','{job_seeker,freelance}'),
('Medium Tag Design','rss','https://medium.com/feed/tag/design','freelance','WORLD','{freelance,talent}'),
('Medium Tag Marketing','rss','https://medium.com/feed/tag/marketing','freelance','WORLD','{freelance,job_seeker}'),

-- ============================================================
-- QUORA — Espaces emploi et startup
-- ============================================================
('Quora Jobs Space','rss','https://www.quora.com/topic/Jobs/rss','job_global','WORLD','{job_seeker}'),
('Quora Freelancing Space','rss','https://www.quora.com/topic/Freelancing/rss','freelance','WORLD','{freelance}'),
('Quora Startups Space','rss','https://www.quora.com/topic/Startups/rss','startup','WORLD','{business,investor}'),
('Quora Venture Capital','rss','https://www.quora.com/topic/Venture-Capital/rss','investor','WORLD','{investor}'),
('Quora Africa Business','rss','https://www.quora.com/topic/Business-in-Africa/rss','client_b2b','AFRICA','{business}'),

-- ============================================================
-- AUTRES PLATEFORMES SOCIALES
-- ============================================================
('Tumblr Jobs Tag','rss','https://www.tumblr.com/tagged/jobs/rss','job_global','WORLD','{job_seeker}'),
('Tumblr Design Portfolio','rss','https://www.tumblr.com/tagged/portfolio/rss','talent','WORLD','{talent}'),
('Flipboard Tech Jobs','rss','https://flipboard.com/topic/techjobs.rss','tech','WORLD','{job_seeker,freelance}'),
('Flipboard Startup','rss','https://flipboard.com/topic/startup.rss','startup','WORLD','{investor,business}'),
('Mix Career','rss','https://mix.com/explore/career/rss','job_global','WORLD','{job_seeker}'),
('Twitch Creators Jobs','api_official','https://api.twitch.tv/helix/search/channels?query=hiring+jobs','talent','WORLD','{talent}');

-- Vérifier le total après insertion
SELECT COUNT(*) as total_sources FROM scan_sources;
SELECT source_type, COUNT(*) FROM scan_sources GROUP BY source_type ORDER BY COUNT(*) DESC;
SELECT category, COUNT(*) FROM scan_sources GROUP BY category ORDER BY COUNT(*) DESC;

=================================================================
ÉTAPE 2 — SERVICE TELEGRAM (le plus important pour l'Afrique)
=================================================================

Crée src/services/telegramScanner.ts :

Telegram Bot API est 100% gratuite, pas de limite sévère.
Les canaux publics sont accessibles sans connexion via t.me/s/channel.
C'est la source numéro 1 d'opportunités en Afrique francophone.

import { callGemini } from '../lib/geminiRotation';

interface TelegramPost {
  text: string;
  date: string;
  channel: string;
  link: string;
}

export const scanTelegramChannel = async (channelName: string): Promise<TelegramPost[]> => {
  try {
    // Telegram expose les canaux publics via t.me/s/channel (HTML scraping légal)
    const url = `https://t.me/s/${channelName}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SearcherBot/1.0)'
      }
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const posts: TelegramPost[] = [];
    
    // Extraire les messages du HTML Telegram
    const messageRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    const dateRegex = /<time[^>]*datetime="([^"]+)"[^>]*>/g;
    const linkRegex = /https:\/\/t\.me\/[a-zA-Z0-9_]+\/(\d+)/g;
    
    let messageMatch;
    let dateMatches = [...html.matchAll(/<time[^>]*datetime="([^"]+)"/g)];
    let linkMatches = [...html.matchAll(/https:\/\/t\.me\/[a-zA-Z0-9_]+\/(\d+)/g)];
    
    let i = 0;
    while ((messageMatch = messageRegex.exec(html)) !== null && i < 20) {
      const rawText = messageMatch[1].replace(/<[^>]+>/g, ' ').trim();
      if (rawText.length > 20) {
        posts.push({
          text: rawText.substring(0, 500),
          date: dateMatches[i]?.[1] || new Date().toISOString(),
          channel: channelName,
          link: `https://t.me/${channelName}/${linkMatches[i]?.[1] || ''}`
        });
        i++;
      }
    }
    
    return posts;
  } catch {
    return [];
  }
};

// Canaux Telegram prioritaires pour Searcher
export const TELEGRAM_PRIORITY_CHANNELS: Record<string, string[]> = {
  job_seeker: [
    'emploi_cameroun', 'jobscameroon', 'africajobsofficial',
    'nigeriajobs', 'kenyajobs', 'ghanajobs', 'senegaljobs',
    'remotejobsglobal', 'devjobs', 'marketingjobs'
  ],
  freelance: [
    'freelanceworld', 'designjobs', 'reactjobs', 'nodejsjobs',
    'pythonjobs', 'aiml_jobs', 'blockchainjobs', 'cryptojobs'
  ],
  investor: [
    'vcfundingnews', 'startupfunding', 'angelinvestors',
    'africastartup', 'africatech_vc', 'partecharfica'
  ],
  business: [
    'business_cameroun', 'startup_douala', 'africa_business',
    'entrepreneuriat_afrique', 'b2b_africa'
  ]
};

export const scanAllTelegramByProfile = async (profileType: string): Promise<any[]> => {
  const channels = TELEGRAM_PRIORITY_CHANNELS[profileType] || [];
  const allPosts: any[] = [];
  
  for (const channel of channels) {
    const posts = await scanTelegramChannel(channel);
    posts.forEach(post => {
      allPosts.push({
        title: post.text.substring(0, 100),
        description: post.text,
        source: `Telegram @${channel}`,
        sourceUrl: post.link,
        pubDate: post.date,
        location: 'WORLD',
        category: 'telegram'
      });
    });
    // Délai humain entre les requêtes
    await new Promise(r => setTimeout(r, 1200));
  }
  
  return allPosts;
};

=================================================================
ÉTAPE 3 — SERVICE FACEBOOK (groupes et pages publics)
=================================================================

Crée src/services/facebookScanner.ts :

Facebook Graph API — gratuite pour les données publiques.
Nécessite un App Token (gratuit via developers.facebook.com).
Accès aux pages publiques, posts, groupes publics.

export const scanFacebookPublicPages = async (query: string, category: string): Promise<any[]> => {
  const appToken = import.meta.env.VITE_FACEBOOK_APP_TOKEN;
  if (!appToken) return [];
  
  try {
    // Recherche de pages publiques
    const searchUrl = `https://graph.facebook.com/v19.0/search?type=page&q=${encodeURIComponent(query)}&fields=name,about,posts{message,created_time,link}&access_token=${appToken}&limit=10`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) return [];
    
    const data = await response.json();
    const results: any[] = [];
    
    (data.data || []).forEach((page: any) => {
      (page.posts?.data || []).forEach((post: any) => {
        if (post.message && post.message.length > 30) {
          results.push({
            title: post.message.substring(0, 100),
            description: post.message.substring(0, 400),
            source: `Facebook: ${page.name}`,
            sourceUrl: post.link || `https://facebook.com/${page.id}`,
            pubDate: post.created_time,
            location: category.includes('africa') ? 'AFRICA' : 'WORLD'
          });
        }
      });
    });
    
    return results;
  } catch {
    return [];
  }
};

// Requêtes Facebook par profil
export const FACEBOOK_QUERIES: Record<string, string[]> = {
  job_seeker: ['emploi cameroun', 'jobs hiring africa', 'recrutement afrique', 'offre emploi douala'],
  freelance: ['freelance africa', 'mission freelance', 'graphic design jobs africa'],
  investor: ['startup africa investment', 'venture capital africa', 'angel investor africa'],
  business: ['business afrique', 'entrepreneur cameroun', 'b2b africa clients']
};

=================================================================
ÉTAPE 4 — INTÉGRER TELEGRAM ET FACEBOOK DANS LE SCAN PRINCIPAL
=================================================================

Dans l'Edge Function scan-multi-source ou le service de scan principal,
ajoute ces appels APRÈS les sources RSS existantes :

// ===== TELEGRAM SCAN =====
const telegramPosts = await scanAllTelegramByProfile(searchProfile.profile_type);
sitesScanned += TELEGRAM_PRIORITY_CHANNELS[searchProfile.profile_type]?.length || 0;
telegramPosts.forEach(post => allOpportunities.push(post));
await updateCounter(sitesScanned, allOpportunities.length, 'telegram');

// ===== FACEBOOK SCAN =====
const fbQueries = FACEBOOK_QUERIES[searchProfile.profile_type] || [];
for (const query of fbQueries.slice(0, 3)) {
  const fbResults = await scanFacebookPublicPages(query, searchProfile.profile_type);
  sitesScanned++;
  fbResults.forEach(r => allOpportunities.push(r));
  await updateCounter(sitesScanned, allOpportunities.length, 'facebook');
}

// ===== MASTODON SCAN =====
const mastodonTags = getMastodonTags(searchProfile.profile_type);
for (const tag of mastodonTags) {
  try {
    const mastoRes = await fetch(`https://mastodon.social/api/v1/timelines/tag/${tag}?limit=20`);
    if (mastoRes.ok) {
      const mastoData = await mastoRes.json();
      sitesScanned++;
      mastoData.forEach((post: any) => {
        if (post.content && post.content.length > 30) {
          allOpportunities.push({
            title: post.content.replace(/<[^>]+>/g, '').substring(0, 100),
            description: post.content.replace(/<[^>]+>/g, '').substring(0, 400),
            source: `Mastodon #${tag}`,
            sourceUrl: post.url,
            pubDate: post.created_at,
            location: 'WORLD'
          });
        }
      });
      await updateCounter(sitesScanned, allOpportunities.length, 'mastodon');
    }
  } catch {}
  await new Promise(r => setTimeout(r, 800));
}

const getMastodonTags = (profileType: string): string[] => {
  const tags: Record<string, string[]> = {
    job_seeker: ['jobs', 'hiring', 'remotejobs', 'devjobs'],
    freelance: ['freelance', 'remotework', 'gig', 'contract'],
    investor: ['venturecapital', 'startup', 'investing', 'angelinvestor'],
    business: ['entrepreneur', 'b2b', 'startup', 'smallbusiness']
  };
  return tags[profileType] || ['jobs'];
};

=================================================================
ÉTAPE 5 — VARIABLES D'ENVIRONNEMENT À AJOUTER
=================================================================

Dans .env et dans Supabase Secrets :

# Facebook App Token (gratuit — developers.facebook.com)
VITE_FACEBOOK_APP_TOKEN=ton_app_access_token_facebook

# Twitter/X Bearer Token (gratuit — developer.twitter.com)
VITE_TWITTER_BEARER=ton_bearer_token_twitter

# YouTube Data API Key (gratuit — console.cloud.google.com)
VITE_YOUTUBE_KEY=ta_cle_youtube

# Pinterest API (gratuit — developers.pinterest.com)
VITE_PINTEREST_TOKEN=ton_token_pinterest

# TikTok Client Key (gratuit — developers.tiktok.com)
VITE_TIKTOK_CLIENT_KEY=ton_client_key_tiktok

=================================================================
VÉRIFICATION FINALE — RÉSULTATS ATTENDUS APRÈS CE PATCH
=================================================================

SELECT COUNT(*) FROM scan_sources;
-- Attendu : 250+ sources totales

SELECT source_type, COUNT(*) FROM scan_sources GROUP BY source_type;
-- rss          : ~100
-- api_official : ~100
-- playwright   : ~50

SELECT category, COUNT(*) FROM scan_sources GROUP BY category;
-- job_global   : ~50
-- job_africa   : ~30
-- freelance    : ~40
-- investor     : ~30
-- talent       : ~20
-- client_b2b   : ~20
-- startup      : ~20
-- tech         : ~20
-- general      : ~20

Après ce patch + le patch précédent, Searcher scanne :
✅ Telegram (26 canaux — numéro 1 Afrique)
✅ Facebook (pages et groupes publics)
✅ YouTube (Data API)
✅ Twitter/X (API v2)
✅ Instagram (Graph API)
✅ Discord (serveurs publics)
✅ Mastodon (fediverse tech)
✅ LinkedIn (flux publics)
✅ Reddit (40+ subreddits)
✅ TikTok (Content API)
✅ Pinterest (API créatifs)
✅ WhatsApp Business (canaux publics)
✅ Substack (newsletters)
✅ Medium (tags)
✅ Quora (espaces)
✅ Plus de 100 sources RSS/API job boards
= 250+ sources totales — toutes gratuites — toutes légales
=================================================================
FIN DU PATCH RÉSEAUX SOCIAUX
=================================================================
