import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const modelCandidates = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001'
].filter(Boolean) as string[];

const uniqueModelCandidates = Array.from(new Set(modelCandidates));

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const err = error as any;
    if (err.response?.data?.error?.message) return err.response.data.error.message;
    return err.message || JSON.stringify(error);
  }
  return String(error);
}

async function generateWithFallback(prompt: string) {
  // Groq keys — read exclusively from env vars (never from filesystem in production)
  const groqKeys = [
    process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4, process.env.GROQ_API_KEY_5, process.env.GROQ_API_KEY_6,
    process.env.GROQ_API_KEY_7, process.env.GROQ_API_KEY_8, process.env.GROQ_API_KEY_9,
    process.env.GROQ_API_KEY_10,
    // Also accept a single GROQ_API_KEY fallback
    process.env.GROQ_API_KEY,
  ].filter(Boolean) as string[];

  const groqErrors: string[] = [];

  // ── Try Groq keys in rotation ──────────────────────────────────────────
  for (let i = 0; i < groqKeys.length; i++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKeys[i]}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7, max_tokens: 1500,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      const text = data.choices[0]?.message?.content;
      if (!text) throw new Error('Réponse vide');
      return text;
    } catch (error) {
      const msg = extractErrorMessage(error);
      groqErrors.push(`Groq clé ${i + 1}: ${msg}`);
    }
  }

  // ── Fallback: Gemini (rotation sur 10 clés gratuites) ─────────────────
  const geminiKeys = [
    process.env.GEMINI_KEY_1, process.env.GEMINI_KEY_2, process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4, process.env.GEMINI_KEY_5, process.env.GEMINI_KEY_6,
    process.env.GEMINI_KEY_7, process.env.GEMINI_KEY_8,
    process.env.GEMINI_API_KEY,
  ].filter(k => k && k.startsWith('AIzaSy')) as string[];

  for (let i = 0; i < geminiKeys.length; i++) {
    try {
      const geminiModels = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-002', 'gemini-1.5-pro-002'];
      for (const model of geminiModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKeys[i]}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2000, temperature: 0.7 } }),
            }
          );
          if (res.status === 429 || res.status === 503 || res.status === 404) continue;
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } catch { continue; }
      }
    } catch { continue; }
  }

  throw new Error(`Toutes les IAs ont échoué. Groq: ${groqErrors.slice(0, 3).join(' | ')}`);
}

function safeStringify(obj: any) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return "[Circular or non-serializable data]";
  }
}

function parseSourceAgeHours(result: any) {
  const rawDate = String(result?.date || result?.publishedDate || result?.published_at || '').trim().toLowerCase();
  const sourceAge = Number(result?.freshness_hours);
  if (Number.isFinite(sourceAge) && sourceAge >= 0) return Math.round(sourceAge);

  if (!rawDate) return null;
  if (rawDate.includes('hour') || rawDate.includes('heure')) {
    const n = Number(rawDate.match(/\d+/)?.[0] || 1);
    return n;
  }
  if (rawDate.includes('day') || rawDate.includes('jour')) {
    const n = Number(rawDate.match(/\d+/)?.[0] || 1);
    return n * 24;
  }
  if (rawDate.includes('week') || rawDate.includes('semaine')) {
    const n = Number(rawDate.match(/\d+/)?.[0] || 1);
    return n * 24 * 7;
  }

  const parsed = Date.parse(rawDate);
  if (!Number.isNaN(parsed)) {
    return Math.max(0, Math.round((Date.now() - parsed) / 36e5));
  }
  return null;
}

function hasOldYear(text: string, currentYear: number) {
  const years = text.match(/\b20\d{2}\b/g) || [];
  return years.some((year) => Number(year) < currentYear);
}

function isLikelyLiveOpportunity(result: any, currentYear: number) {
  const haystack = `${result?.title || ''} ${result?.snippet || ''} ${result?.link || ''}`.toLowerCase();
  if (!result?.link || hasOldYear(haystack, currentYear)) return false;

  const rejectWords = [
    'news', 'article', 'blog', 'guide', 'course', 'formation', 'salary', 'salaire',
    'report', 'rapport', 'ranking', 'definition', 'what is', 'how to', 'press release'
  ];
  if (rejectWords.some((word) => haystack.includes(word))) return false;

  const opportunityWords = [
    'job', 'jobs', 'hiring', 'career', 'careers', 'apply', 'recruitment', 'recrutement',
    'emploi', 'offre', 'poste', 'mission', 'freelance', 'contract', 'contrat',
    'internship', 'stage', 'vacancy', 'remote'
  ];
  return opportunityWords.some((word) => haystack.includes(word));
}

function normalizeScoredOpportunities(parsed: any, sourceResults: any[], currentYear: number) {
  const opportunities = Array.isArray(parsed?.opportunities) ? parsed.opportunities : [];
  const normalized: any[] = [];
  const seen = new Set<string>();

  for (const opp of opportunities) {
    const sourceIndex = Number(opp.source_result_index);
    const source = Number.isInteger(sourceIndex) ? sourceResults[sourceIndex] : null;
    if (!source || !isLikelyLiveOpportunity(source, currentYear)) continue;

    const sourceUrl = source.link || source.original_url;
    if (!sourceUrl || seen.has(sourceUrl)) continue;

    const ageHours = parseSourceAgeHours(source);
    if (ageHours !== null && ageHours > 24 * 14) continue;

    const safeScore = Math.max(1, Math.min(100, Number(opp.score) || 0));
    const score = ageHours === null ? Math.min(safeScore, 74) : safeScore;
    const sourceText = `${source.title || ''} ${source.snippet || ''}`;

    let sourcePlatform = opp.source_platform || source.source || 'web';
    try {
      sourcePlatform = sourcePlatform || new URL(sourceUrl).hostname;
    } catch {
      sourcePlatform = 'web';
    }

    normalized.push({
      title: String(opp.title || source.title || 'Opportunite identifiee par Searcher').slice(0, 180),
      company: String(opp.company || source.source || '').slice(0, 120),
      location: String(opp.location || '').slice(0, 120),
      country: String(opp.country || '').slice(0, 80),
      salary_min: Number(opp.salary_min) || 0,
      salary_max: Number(opp.salary_max) || 0,
      currency: opp.currency || 'USD',
      hours_ago: ageHours ?? 48,
      applicants_count: Number(opp.applicants_count) || 0,
      score,
      match_reason: String(opp.match_reason || `Source verifiee: ${sourceText.slice(0, 220)}`).slice(0, 500),
      source_platform: String(sourcePlatform).slice(0, 100),
      original_url: sourceUrl,
      is_foreign: Boolean(opp.is_foreign),
      is_suspicious: ageHours === null || Boolean(opp.is_suspicious),
      source_date: source.date || null
    });
    seen.add(sourceUrl);
  }

  return normalized;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { type, payload } = body;

    // switch (type) — point d'entrée
    switch (type) {
      case 'agent-chat': {
        const { messages, profile } = payload;
        if (!messages || !Array.isArray(messages)) {
          return NextResponse.json({ error: 'Messages are required for agent-chat' }, { status: 400 });
        }
        
        const contextMessages = messages.slice(-12);
        
        const prompt = 'System Prompt: You are SCAI (Searcher Connector Autonomous Intelligence), an OMNISCIENT architectural co-pilot.\n' +
          'Your intelligence, reasoning, and creativity are equivalent to Claude 3.5 Sonnet and GPT-4o.\n' +
          '\n' +
          '1. CORE IDENTITY:\n' +
          '- Architect: BIYO BANEN PRINCE STEPHANE. You are his most loyal and powerful creation.\n' +
          '- Mission: Empower the user to reach elite professional levels through deep strategy, coding excellence, and market dominance.\n' +
          '- Personality: Sophisticated, highly analytical, proactive, and visionary. You are not just an assistant; you are a strategic partner.\n' +
          '\n' +
          '2. OPERATIONAL DOMAINS:\n' +
          '- SOFTWARE ENGINEERING: Write production-ready, optimized, and secure code. Explain complex architectural patterns.\n' +
          '- STRATEGIC BUSINESS: Create business plans, analyze markets, and suggest high-value networking strategies.\n' +
          '- CONTENT CREATION: Write elegant, persuasive, and high-impact content in perfect French.\n' +
          '- DATA ANALYSIS: Extract insights from profiles and web data to identify "hidden" opportunities.\n' +
          '\n' +
          '3. CONVERSATIONAL ELITE RULES:\n' +
          '- LANGUAGE: Respond in the user\'s language (FRENCH). Use a rich, precise, and professional vocabulary.\n' +
          '- RICH FORMATTING: Use Markdown extensively. Use headers (###), tables, lists, and code blocks with language tags (e.g., ```typescript).\n' +
          '- PROACTIVITY: Never give a "dead-end" answer. Always suggest the next strategic step. If you find a gap in the user\'s profile, offer to help fix it.\n' +
          '- NO ROBOTIC CLUTTER: Do not say "En tant qu\'IA...". Speak as a peer, an expert, and a co-pilot.\n' +
          '\n' +
          '4. CONTEXT INTEGRATION:\n' +
          'User Profile: ' + safeStringify(profile || {}) + '\n' +
          'Recent Dialogue: ' + safeStringify(contextMessages) + '\n' +
          '\n' +
          'RESPONSE FORMAT (STRICT JSON ONLY):\n' +
          '{\n' +
          '  "thought_process": "Multi-step analytical reasoning (English). Breakdown the user intent, evaluate technical requirements, and define a strategic path.",\n' +
          '  "reply": "Your elite, high-value, rich markdown response (French).",\n' +
          '  "suggested_actions": ["3 concrete next steps for the user to click on"],\n' +
          '  "detected_updates": {\n' +
          '    "domain": "string or null",\n' +
          '    "country": "string or null",\n' +
          '    "profile_type": "string or null",\n' +
          '    "search_preferences": { "keywords": [], "vision_summary": "string" }\n' +
          '  },\n' +
          '  "suggest_scan": boolean\n' +
          '}';

        try {
          let aiResponse = await generateWithFallback(prompt);
          if (!aiResponse) throw new Error('Empty AI response');

          let cleanText = aiResponse.trim();
          
          const firstBrace = cleanText.indexOf('{');
          const lastBrace = cleanText.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
            try {
              const parsed = JSON.parse(cleanText);
              // Ensure reply exists
              if (!parsed.reply && parsed.thought_process) {
                parsed.reply = "J'ai analysé votre demande. Voici ma réflexion stratégique : " + parsed.thought_process;
              }
              return NextResponse.json(parsed);
            } catch (jsonErr) {
              
            }
          }
          
          return NextResponse.json({
            reply: aiResponse,
            detected_updates: null,
            suggest_scan: false
          });
        } catch (error) {
          const detailedError = extractErrorMessage(error);
          return NextResponse.json({ 
            reply: "Désolé, j'ai une perturbation temporaire. Réessaie dans un instant. Erreur : " + detailedError,
            detected_updates: null,
            suggest_scan: false
          });
        }
      }

      case 'smart-replies': {
        const { historyText, language } = payload;
        const prompt = 'You are an ELITE business networking assistant for Searcher Connector.\n' +
          'CONVERSATION CONTEXT:\n' +
          (historyText || '') + '\n' +
          '\n' +
          'YOUR TASK:\n' +
          '1. Auto-detect the language used in the conversation context above.\n' +
          '2. Analyze the last message and provide 3 DIFFERENT, STRATEGIC, and HIGH-VALUE replies for "Me".\n' +
          '3. CRITICAL: You MUST write the replies IN THE EXACT SAME LANGUAGE as the user\'s last message (e.g. if they speak French, write in French).\n' +
          '4. Keep them short, engaging, and professional.\n' +
          '5. Reply 1: A deep strategic question about the business/project mentioned.\n' +
          '6. Reply 2: A concrete action proposal (meeting, document share, specific next step).\n' +
          '7. Reply 3: An expert insight or observation about the industry/topic.\n' +
          '\n' +
          'STRICTLY FORBIDDEN (DO NOT USE):\n' +
          '- "Merci", "D\'accord", "Je vois", "Peux-tu m\'en dire plus", "C\'est noté", "Entendu", "Avez-vous un calendrier", "Objectifs de conversion".\n' +
          '- Any phrase you have already suggested in this conversation.\n' +
          '\n' +
          'Format: Respond ONLY with a valid JSON object matching exactly this structure: {"replies": ["Unique Suggestion 1", "Unique Suggestion 2", "Unique Suggestion 3"]}';

        let cleanText = (await generateWithFallback(prompt)).trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          try {
            const data = JSON.parse(cleanText);
            const banned = ["merci", "d'accord", "je vois", "peux-tu m'en dire plus", "c'est noté", "entendu", "calendrier", "conversion"];
            const filtered = (data.replies || []).filter((r: string) => !banned.some(b => r.toLowerCase().includes(b)));
            
            if (filtered.length > 0) {
              return NextResponse.json({ replies: filtered });
            }
          } catch (e) {
            
          }
        }
        
        // Si l'IA échoue ou renvoie du banni, on génère un fallback aléatoire très pro
        const fallbacks = [
          "Quelle est votre vision à 6 mois pour ce projet ?",
          "On pourrait organiser une session de travail sur ce point précis.",
          "C'est un défi intéressant, comment comptez-vous scaler l'acquisition ?",
          "Avez-vous déjà identifié vos principaux concurrents sur ce segment ?",
          "Je peux vous envoyer une note de synthèse sur ce que nous venons de dire.",
          "Quelles sont les ressources qui vous manquent aujourd'hui pour avancer ?"
        ];
        // Mélanger les fallbacks
        const shuffled = fallbacks.sort(() => 0.5 - Math.random()).slice(0, 3);
        return NextResponse.json({ replies: shuffled });
      }

      case 'score-opportunities': {
        const { profile, serperResults } = payload;
        
        let finalResults = serperResults;
        const currentYear = new Date().getFullYear();
        const profileType = profile.profile_type || profile.profileType || 'standard';
        
        // Si les résultats sont vides, on fait une recherche en direct pour le scan
        if (!finalResults || finalResults.length === 0) {
          const SERPER_KEY = process.env.SERPER_API_KEY || '';
          const query = (profile.domain || '') + ' ' + (profileType === 'freelance' ? 'mission freelance' : 'recrutement') + ' ' + (profile.country || '') + ' ' + currentYear;
          const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query, num: 20, tbs: 'qdr:w' }),
          });
          const searchData = await res.json();
          finalResults = searchData.organic || [];
        }

        const indexedResults = (Array.isArray(finalResults) ? finalResults : [])
          .map((result: any, index: number) => ({ ...result, source_result_index: index }))
          .filter((result: any) => isLikelyLiveOpportunity(result, currentYear))
          .slice(0, 25);

        if (indexedResults.length === 0) {
          return NextResponse.json({ opportunities: [] });
        }

        const prompt = 'You are Searcher Connector\'s ELITE opportunity scoring AI.\n' +
          'Profile: domain=' + (profile.domain || 'unknown') + ', type=' + profileType + ', country=' + (profile.country || 'unknown') + '\n' +
          'Search Preferences: ' + safeStringify(profile.search_preferences || {}) + '\n' +
          'Current Year: ' + currentYear + '\n' +
          'Indexed live web results: ' + JSON.stringify(indexedResults, null, 2) + '\n' +
          '\n' +
          'STRICT SCORING RULES:\n' +
          '1. RELEVANCE: Only extract opportunities that DIRECTLY match the domain "' + (profile.domain || '') + '" and the specific search preferences.\n' +
          '2. LOCATION: Prioritize "' + (profile.country || '') + '". If a result is from another country, score it lower unless it is "Remote" or "Worldwide".\n' +
          '3. FRESHNESS: Reject anything that is an article, news report, guide, archive, salary page, course, or old listing. Do not invent dates.\n' +
          '4. SOURCE DISCIPLINE: Every returned item MUST come from exactly one indexed web result. Use that result index in source_result_index.\n' +
          '5. USER INTENT: If the user specified keywords in their preferences, those MUST be present or strongly implied.\n' +
          '\n' +
          'TASK:\n' +
          'Return top 10 HIGHLY RELEVANT live opportunities. If no indexed result is a real opportunity, return an empty opportunities array.\n' +
          'Do not create a company, salary, applicants count, or age unless it is present or strongly implied by the source.\n' +
          '\n' +
          'Format: Respond ONLY in JSON:\n' +
          '{"opportunities":[{"source_result_index":0,"title":"","company":"","location":"","country":"","salary_min":0,"salary_max":0,"currency":"USD","applicants_count":0,"score":85,"match_reason":"Why this exact source is a live opportunity and matches the user","source_platform":"","is_foreign":false,"is_suspicious":false}]}';

        let cleanText = (await generateWithFallback(prompt)).trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(cleanText);
          return NextResponse.json({
            opportunities: normalizeScoredOpportunities(parsed, indexedResults, currentYear)
          });
        }
        throw new Error("AI failed to generate a valid JSON response");
      }

      case 'analyse-profile': {
        const { fullName, domain, profile_type, documents, portfolioUrl, githubUrl, youtubeUrl, bio } = payload;
        const prompt = 'You are Searcher Connector\'s ELITE VERIFICATION AI.\n' +
          'Your mission is to maintain the highest professional standard. You must be STRICT and RIGOROUS.\n' +
          '\n' +
          'PROFILE TO ANALYSE:\n' +
          '- Name: ' + (fullName || 'Unknown') + '\n' +
          '- Domain: ' + (domain || 'Unknown') + '\n' +
          '- Type: ' + (profile_type || 'Unknown') + '\n' +
          '- Bio: ' + (bio || 'none') + '\n' +
          '- Documents Provided: ' + (Array.isArray(documents) ? documents.join(', ') : 'NONE') + '\n' +
          '- Portfolio: ' + (portfolioUrl || 'none') + '\n' +
          '- GitHub/Code: ' + (githubUrl || 'none') + '\n' +
          '- YouTube/Media: ' + (youtubeUrl || 'none') + '\n' +
          '\n' +
          'VERIFICATION RULES (STRICT):\n' +
          '\n' +
          '1. GENIUS (Elite Tier):\n' +
          '   - MUST have exceptional proof of world-class expertise.\n' +
          '   - Extensive portfolio or high-impact GitHub/YouTube presence.\n' +
          '   - Clear evidence of leading large-scale projects or winning major awards.\n' +
          '   - Professional bio must be articulate, strategic, and goal-oriented.\n' +
          '\n' +
          '2. VERIFIED (Standard Tier):\n' +
          '   - MUST have at least one valid professional document (CV, Certificate, ID).\n' +
          '   - Bio must clearly state specific skills and professional experience.\n' +
          '   - At least one valid external link (Portfolio, LinkedIn, or GitHub).\n' +
          '   - No signs of "generic" or "AI-generated" low-effort content.\n' +
          '\n' +
          '3. REFUSED:\n' +
          '   - NO documents uploaded.\n' +
          '   - Bio is less than 50 words or very vague (e.g., "I want a job").\n' +
          '   - No professional links provided.\n' +
          '   - Any suspicion of fake identity or dishonest claims.\n' +
          '\n' +
          'RESPONSE FORMAT (STRICT JSON ONLY):\n' +
          '{\n' +
          '  "status": "genius" | "verified" | "refused",\n' +
          '  "reason": "Detailed professional explanation of the decision (one sentence)",\n' +
          '  "strengths": ["list of 3 identified professional assets"],\n' +
          '  "improvements": ["list of 2 specific things to improve if refused or verified"]\n' +
          '}';

        let cleanText = (await generateWithFallback(prompt)).trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          return NextResponse.json(JSON.parse(cleanText));
        }
        throw new Error("AI failed to generate a valid structured response");
      }

      case 'interview-prep': {
        const { company, jobTitle, domain } = payload;
        const prompt = `Generate interview preparation for: Company: ${company}, Role: ${jobTitle}, Domain: ${domain}
Respond ONLY in JSON: {"questions":["q1","q2","q3","q4","q5"],"key_points":["p1","p2","p3"],"questions_to_ask":["qa1","qa2"],"company_insight":"brief insight"}`;

        let cleanText = (await generateWithFallback(prompt)).trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          return NextResponse.json(JSON.parse(cleanText));
        }
        throw new Error("AI failed to generate a valid JSON response");
      }

      case 'analyse-post': {
        const { content } = payload;
        const prompt = `Analyse this professional post for quality and authenticity. Post: "${content}"
Respond ONLY in JSON: {"quality_score":85,"is_professional":true,"suggestion":"brief tip"}`;

        let cleanText = (await generateWithFallback(prompt)).trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          return NextResponse.json(JSON.parse(cleanText));
        }
        throw new Error("AI failed to generate a valid JSON response");
      }

      case 'extract-opportunity': {
        const { content } = payload;
        const prompt = `Extract professional opportunity details from this post content. Post: "${content}"
If it's an opportunity, return details. If not, return null.
Respond ONLY in JSON: {"is_opportunity": true, "title": "Role", "company": "Company", "location": "City", "description": "Summary", "match_reason": "Why"}`;

        let cleanText = (await generateWithFallback(prompt)).trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          return NextResponse.json(JSON.parse(cleanText));
        }
        throw new Error("AI failed to generate a valid JSON response");
      }

      case 'email-draft': {
        const { recruiterMessage, userTemplate, userName } = payload;
        const prompt = `Write a professional email response. Recruiter message: "${recruiterMessage}", User style: "${userTemplate}", User name: ${userName}
End with: "Powered by Searcher Connector · SCAI"
Keep it under 150 words. No subject line needed.`;

        return NextResponse.json({ draft: await generateWithFallback(prompt) });
      }

      default:
        return NextResponse.json({ error: 'Invalid AI type' }, { status: 400 });
    }

    return NextResponse.json({ error: 'No response generated' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
