import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

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

    // 1. Récupérer les applications envoyées
    const { data: apps } = await supabase
      .from('applications_sent')
      .select('*, opportunity:opportunity_id(*)')
      .eq('user_id', user_id)

    // 2. Simuler une surveillance de statut sur les plateformes (LinkedIn, Indeed, etc.)
    // Ici on simule une alerte si pas de réponse après 7 jours
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const stalledApps = apps?.filter(app => 
      new Date(app.created_at) < sevenDaysAgo && app.status === 'applied'
    ) || []

    for (const app of stalledApps) {
      // Alerte de diversification
      await supabase.from('agent_actions').insert({
        user_id,
        action_type: 'diversification_warning',
        opportunity_id: app.opportunity_id,
        result: `No response from ${app.opportunity?.company} after 7 days. Suggested action: Apply to 3 more similar roles.`,
        success: true
      })
    }

    return new Response(JSON.stringify({ checked: apps?.length, alerts: stalledApps.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
