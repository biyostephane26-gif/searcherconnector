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

    const { opportunity_id, user_id } = await req.json()

    const { data: opp } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .single()

    const { data: profile } = await supabase
      .from('users_profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (!opp || !profile) throw new Error('Opp or Profile not found')

    // 1. Génération de la prep par Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '')
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Génère une préparation d'entretien complète pour :
    Entreprise: ${opp.company}, Poste: ${opp.title}, Candidat: ${profile.full_name}
    
    Retourne un JSON :
    {
      "company_research": "...",
      "likely_questions": ["q1", "q2"],
      "suggested_answers": ["a1", "a2"],
      "talking_points": "...",
      "red_flags": "...",
      "salary_strategy": "..."
    }`

    const aiRes = await model.generateContent(prompt)
    const prepData = JSON.parse(aiRes.response.text().replace(/```json|```/g, '').trim())

    // 2. Sauvegarder
    await supabase.from('interview_preps').insert({
      user_id,
      opportunity_id,
      ...prepData
    })

    // 3. Logger
    await supabase.from('agent_actions').insert({
      user_id,
      action_type: 'schedule_interview_prep',
      opportunity_id,
      result: `Interview prep generated for ${opp.company}`,
      success: true
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
