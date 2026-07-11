import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id } = await req.json()
    const startTime = Date.now()

    // 1. Récupérer le profil et les réglages de l'agent
    const { data: profile } = await supabase
      .from('users_profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    const { data: schedule } = await supabase
      .from('agent_schedules')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // 2. Lancer la recherche Serper via notre API interne ou directe
    // Pour l'Edge Function, on appelle directement Serper
    const serperKey = Deno.env.get('SERPER_API_KEY')
    const query = `${profile.domain} job hiring ${profile.country} 2026`
    
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey ?? '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 20 }),
    })
    const serperData = await serperRes.json()
    const rawResults = serperData.organic || []

    // 3. Scoring par Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '')
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Tu es l'agent autonome Searcher. Analyse ces opportunités pour :
    Nom: ${profile.full_name}, Domaine: ${profile.domain}, Pays: ${profile.country}
    Résultats web: ${JSON.stringify(rawResults.slice(0, 10))}
    
    Retourne les 5 meilleures opportunités au format JSON :
    {"opportunities": [{"title": "...", "company": "...", "score": 95, "match_reason": "...", "url": "..."}]}`

    const aiRes = await model.generateContent(prompt)
    const aiText = aiRes.response.text().replace(/```json|```/g, '').trim()
    const scoredData = JSON.parse(aiText)

    // 4. Enregistrement et Auto-Apply si score élevé
    const opportunities = scoredData.opportunities || []
    for (const opp of opportunities) {
      const { data: newOpp } = await supabase.from('opportunities').insert({
        title: opp.title,
        company: opp.company,
        location: profile.country,
        url: opp.url,
        description: opp.match_reason,
        score: opp.score,
        status: 'open'
      }).select().single()

      if (newOpp && opp.score >= (schedule?.auto_apply_threshold || 85)) {
        // Logique d'auto-apply (simulation ou appel API externe)
        await supabase.from('agent_actions').insert({
          user_id,
          action_type: 'auto_apply',
          opportunity_id: newOpp.id,
          result: `Auto-applied to ${opp.company} (Score: ${opp.score})`,
          success: true,
          execution_ms: Date.now() - startTime
        })
      }
    }

    // 5. Log de fin de scan
    await supabase.from('agent_actions').insert({
      user_id,
      action_type: 'search_scan',
      result: `Scan completed. Found ${opportunities.length} opportunities.`,
      execution_ms: Date.now() - startTime
    })

    return new Response(JSON.stringify({ success: true, count: opportunities.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
