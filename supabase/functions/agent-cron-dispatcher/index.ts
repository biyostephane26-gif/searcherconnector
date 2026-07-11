// @ts-nocheck
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
