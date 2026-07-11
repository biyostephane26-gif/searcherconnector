// =================================================================
// SEARCHER CONNECTOR — TEST EMAIL BIENVENUE
// =================================================================

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, test_mode } = await req.json()

    // Simuler l'envoi d'email (Resend sera configuré plus tard)
    const emailContent = {
      to: email,
      subject: '🎉 Bienvenue sur Searcher Connector !',
      html: `
        <div style="background: #0A0A0A; color: white; padding: 40px; font-family: Arial, sans-serif;">
          <h1 style="color: #D4AF37;">Bienvenue sur Searcher Connector !</h1>
          <p>Nous sommes ravis de t'accueillir dans la communauté.</p>
          
          <h2 style="color: #D4AF37; margin-top: 30px;">Prochaines étapes :</h2>
          <ol style="line-height: 2;">
            <li>Complète ton profil pour de meilleurs résultats</li>
            <li>Lance ton premier scan d'opportunités</li>
            <li>Active SCAI Voice pour un assistant IA personnalisé</li>
          </ol>

          <div style="margin-top: 30px; padding: 20px; background: #1a1a1a; border-radius: 8px;">
            <p style="margin: 0;"><strong>🎁 Cadeau de bienvenue :</strong></p>
            <p style="margin: 10px 0 0 0;">10 crédits SCAI Voice offerts pour commencer !</p>
          </div>

          <p style="margin-top: 30px;">À très vite,<br><strong style="color: #D4AF37;">L'équipe Searcher Connector</strong></p>
          
          ${test_mode ? '<p style="color: #ff6b6b; margin-top: 20px; font-size: 12px;">⚠️ EMAIL DE TEST - Mode simulation</p>' : ''}
        </div>
      `
    }

    console.log('📧 Email bienvenue simulé:', emailContent)

    // TODO: Intégrer Resend.com ici
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send(emailContent)

    return NextResponse.json({ 
      success: true, 
      message: 'Email de bienvenue envoyé',
      preview: emailContent 
    })

  } catch (error: any) {
    console.error('Erreur envoi email:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
