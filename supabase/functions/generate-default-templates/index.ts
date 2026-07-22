// @ts-nocheck
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
    "body_template": "Corps avec {company}, {position}, {name}, {date} comme variables. 80-120 mots max. Fin avec : — ${profile.full_name} | Powered by Searcher Connector · SCAI"
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
