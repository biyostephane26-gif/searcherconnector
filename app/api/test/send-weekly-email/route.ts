// =================================================================
// SEARCHER CONNECTOR — TEST EMAIL HEBDOMADAIRE
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, test_mode } = await req.json()

    // Données simulées pour le résumé hebdomadaire
    const weeklyStats = {
      total_opportunities: 47,
      viewed_opportunities: 10,
      high_score_matches: 8,
      applications_sent: 3,
      profile_views: 12,
      new_opportunities_today: 5
    }

    const emailContent = {
      to: email,
      subject: '📊 Votre résumé hebdomadaire — Searcher Connector',
      html: `
        <div style="background: #0A0A0A; color: white; padding: 40px; font-family: Arial, sans-serif;">
          <h1 style="color: #D4AF37;">📊 Votre semaine sur Searcher Connector</h1>
          
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #D4AF37; margin-top: 0;">Résumé de la semaine</h2>
            <ul style="line-height: 2; padding-left: 20px;">
              <li><strong>${weeklyStats.total_opportunities} missions</strong> correspondaient à votre profil</li>
              <li><strong>${weeklyStats.high_score_matches} missions</strong> avec score > 80%</li>
              <li>Vous avez vu <strong>${weeklyStats.viewed_opportunities} missions</strong></li>
              <li><strong>${weeklyStats.applications_sent} candidatures</strong> envoyées</li>
              <li>Votre profil a été vu <strong>${weeklyStats.profile_views} fois</strong></li>
            </ul>
          </div>

          <div style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: #0A0A0A;">
            <h3 style="margin-top: 0;">🔥 Aujourd'hui</h3>
            <p style="margin: 0; font-size: 18px;"><strong>${weeklyStats.new_opportunities_today} nouvelles missions</strong> parfaites pour vous !</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/opportunities" style="background: #D4AF37; color: #0A0A0A; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Voir les opportunités
            </a>
          </div>

          <p style="margin-top: 30px; color: #888; font-size: 12px;">
            Vous recevez cet email car vous êtes inscrit sur Searcher Connector.
          </p>

          ${test_mode ? '<p style="color: #ff6b6b; margin-top: 20px; font-size: 12px;">⚠️ EMAIL DE TEST - Mode simulation</p>' : ''}
        </div>
      `
    }

    console.log('📧 Email hebdomadaire simulé:', emailContent)

    return NextResponse.json({ 
      success: true, 
      message: 'Email hebdomadaire envoyé',
      preview: emailContent,
      stats: weeklyStats
    })

  } catch (error: any) {
    console.error('Erreur envoi email:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
