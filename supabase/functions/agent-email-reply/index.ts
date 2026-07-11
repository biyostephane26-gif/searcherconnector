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

    const { thread_id, incoming_body } = await req.json()

    const { data: thread } = await supabase
      .from('email_threads')
      .select('*, user:user_id(*)')
      .eq('id', thread_id)
      .single()

    if (!thread) throw new Error('Thread not found')

    // 1. Analyse du sentiment et intention par Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '')
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Analyse cet email reçu par ${thread.user?.full_name} :
    "${incoming_body}"
    
    Génère une réponse professionnelle et enthousiaste.
    Si l'email demande une dispo pour un entretien, propose des créneaux.
    Retourne le JSON : {"reply": "...", "sentiment": "positive|neutral|negative", "requires_human": false}`

    const aiRes = await model.generateContent(prompt)
    const aiData = JSON.parse(aiRes.response.text().replace(/```json|```/g, '').trim())

    // 2. Mettre à jour le thread
    await supabase
      .from('email_threads')
      .update({
        searcher_replied: true,
        reply_body: aiData.reply,
        reply_sent_at: new Date().toISOString(),
        sentiment: aiData.sentiment,
        requires_human: aiData.requires_human
      })
      .eq('id', thread_id)

    // 3. Logger
    await supabase.from('agent_actions').insert({
      user_id: thread.user_id,
      action_type: 'email_response',
      result: `Auto-replied to email from ${thread.from_name}`,
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
