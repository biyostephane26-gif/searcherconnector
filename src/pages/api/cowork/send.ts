// =================================================================
// SEARCHER CONNECTOR — COWORK / SEND MESSAGE
// Supports :
//   - Gmail OAuth (compte Google connecté)
//   - WhatsApp Business API (numéro Business)
//   - WhatsApp Normal (lien wa.me — fonctionne sans Business API)
// Avec signature automatique Searcher Connector
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Discrète et professionnelle — ce message part vers un recruteur/contact
// réel, pas vers l'utilisateur. Voir la même règle dans auto-apply/route.ts.
const SIGNATURE = '\n\n---\nPowered by Searcher Connector · SCAI\nsearcherconnector.com';

// ── Envoi Gmail via OAuth ─────────────────────────────────────────
async function sendGmail(to: string, subject: string, body: string, accessToken: string): Promise<boolean> {
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    body + SIGNATURE,
  ].join('\n');

  const encoded = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
    signal: AbortSignal.timeout(15000),
  });
  return r.ok;
}

// ── Envoi WhatsApp Business API ───────────────────────────────────
async function sendWhatsAppBusiness(to: string, message: string, waToken: string, waPhoneId: string): Promise<boolean> {
  const r = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/[^0-9]/g, ''),
      type: 'text',
      text: { body: message + SIGNATURE },
    }),
    signal: AbortSignal.timeout(15000),
  });
  return r.ok;
}

// ── WhatsApp Normal via lien wa.me ────────────────────────────────
// Fonctionne sans WhatsApp Business, sans API, sans approbation Meta
// L'utilisateur clique sur le lien → WhatsApp s'ouvre avec le message pré-rempli
function buildWaLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const fullMsg    = message + SIGNATURE;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMsg)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId, channel, to, subject, message, opportunity_id } = req.body;
  if (!userId || !channel || !to || !message) return res.status(400).json({ error: 'Champs manquants' });

  try {
    const { data: profile } = await supabaseAdmin.from('users_profiles').select('*').eq('id', userId).single();
    if (!profile) return res.status(404).json({ error: 'Profil introuvable' });

    let sent = false;
    let error_detail = '';

    if (channel === 'gmail') {
      // Récupérer le token Gmail OAuth
      const { data: oauth } = await supabaseAdmin.from('oauth_connections')
        .select('access_token_encrypted').eq('user_id', userId).eq('platform', 'gmail').single();
      if (!oauth) return res.status(400).json({ error: 'Gmail non connecté. Connecte ton compte Gmail dans Cowork.' });
      sent = await sendGmail(to, subject || `Opportunité via Searcher Connector`, message, oauth.access_token_encrypted);
    }

    if (channel === 'whatsapp') {
      const { data: waConfig } = await supabaseAdmin.from('whatsapp_config')
        .select('access_token_encrypted, phone_number').eq('user_id', userId).single();
      if (!waConfig) return res.status(400).json({ error: 'WhatsApp non configuré.' });
      const phoneId = process.env.WHATSAPP_PHONE_ID || '';
      sent = await sendWhatsAppBusiness(to, message, waConfig.access_token_encrypted, phoneId);
    }

    // ── WhatsApp Normal (lien wa.me — sans Business API) ─────────
    // Retourner le lien directement — le client l'ouvre dans une nouvelle fenêtre
    if (channel === 'whatsapp_link') {
      const waLink = buildWaLink(to, message);
      // Sauvegarder dans email_threads comme "préparé"
      await supabaseAdmin.from('email_threads').insert({
        user_id:        userId,
        opportunity_id: opportunity_id || null,
        from_email:     profile.email || '',
        from_name:      profile.full_name || '',
        direction:      'outgoing',
        body_preview:   message.slice(0, 200),
        full_body:      message + SIGNATURE,
        subject:        subject || '',
        searcher_replied: false,  // L'utilisateur doit cliquer lui-même
        channel:        'whatsapp_link',
      });
      return res.status(200).json({
        success:    true,
        channel:    'whatsapp_link',
        wa_link:    waLink,         // Le client ouvre ce lien
        note:       'Clique sur le lien pour envoyer via WhatsApp. Le message est pré-rempli avec la signature.',
      });
    }

    if (sent) {
      // Sauvegarder dans email_threads
      await supabaseAdmin.from('email_threads').insert({
        user_id:        userId,
        opportunity_id: opportunity_id || null,
        from_email:     profile.email || '',
        from_name:      profile.full_name || '',
        to_email:       to || '',
        direction:      'outgoing',
        body_preview:   message.slice(0, 200),
        full_body:      message + SIGNATURE,
        subject:        subject || '',
        searcher_replied: true,
        reply_sent_at:  new Date().toISOString(),
        channel:        channel,
      });

      // Log action
      await supabaseAdmin.from('agent_actions').insert({
        user_id:     userId,
        action_type: 'email_response',
        result:      `Message envoyé via ${channel} à ${to}`,
        success:     true,
        auto_promo_sent: true,
      });

      // Mettre à jour le statut de l'opportunité
      if (opportunity_id) {
        await supabaseAdmin.from('opportunities').update({ status: 'auto_applied' }).eq('id', opportunity_id).eq('user_id', userId);
      }
    }

    return res.status(200).json({ success: sent, channel, error_detail });

  } catch (error: any) {
    return res.status(500).json({ error: 'Erreur envoi', detail: error.message });
  }
}
