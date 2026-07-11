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

    const now = new Date().toISOString()

    // 1. Récupérer les follow-ups planifiés pour maintenant
    const { data: pendingFollowups } = await supabase
      .from('followups')
      .select(`
        *,
        opportunity:opportunity_id(*),
        user:user_id(*)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)

    if (!pendingFollowups || pendingFollowups.length === 0) {
      return new Response(JSON.stringify({ message: 'No followups to send' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const followup of pendingFollowups) {
      // 2. Simulation d'envoi d'email via SendGrid ou API
      console.log(`Sending followup ${followup.followup_number} to ${followup.opportunity?.company}`)

      // 3. Mettre à jour le statut
      await supabase
        .from('followups')
        .update({ status: 'sent', sent_at: now })
        .eq('id', followup.id)

      // 4. Logger l'action
      await supabase.from('agent_actions').insert({
        user_id: followup.user_id,
        action_type: 'follow_up_sent',
        opportunity_id: followup.opportunity_id,
        result: `Follow-up #${followup.followup_number} sent to ${followup.opportunity?.company}`,
        success: true
      })
    }

    return new Response(JSON.stringify({ sent: pendingFollowups.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
