import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, email, subject, message } = await req.json()

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject et message requis' }, { status: 400 })
    }

    // Sauvegarder dans Supabase (table support_tickets si elle existe, sinon notifications)
    const { error: insertError } = await supabase.from('support_tickets').insert({
      user_id: userId || null,
      email:   email || 'anonymous',
      subject: subject.trim(),
      message: message.trim(),
      status:  'open',
    }).select()

    if (insertError) {
      // Table support_tickets n'existe pas → fallback: notifier le fondateur via notifications
      await supabase.from('notifications').insert({
        user_id: process.env.NEXT_PUBLIC_FOUNDER_EMAIL || userId,
        type:    'support',
        title:   `🆘 Support: ${subject.trim().slice(0, 80)}`,
        message: `De: ${email || 'anonyme'}\n\n${message.trim().slice(0, 500)}`,
        is_read: false,
      }).catch(() => {})
    }

    // Notifier le fondateur via une notification interne
    await supabase.from('notifications').insert({
      // On utilise un ID fixe connu pour le fondateur — ou on log juste
      type:    'support_incoming',
      title:   `🆘 Nouveau ticket: ${subject.trim().slice(0, 60)}`,
      message: `De: ${email || 'anonyme'}\n${message.trim().slice(0, 300)}`,
      is_read: false,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Ne jamais faire crasher la page Support
    return NextResponse.json({ success: true })
  }
}
