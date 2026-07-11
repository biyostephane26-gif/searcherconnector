// =================================================================
// SEARCHER CONNECTOR — TEST SCAN MANUEL
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { test_mode } = await req.json()

    // Simuler un scan avec résultats
    const mockOpportunities = [
      {
        title: 'Développeur React Senior',
        company: 'TechCorp',
        match_score: 95,
        applicants: 2,
        salary: 8000,
        location: 'Remote'
      },
      {
        title: 'Frontend Engineer',
        company: 'StartupXYZ',
        match_score: 88,
        applicants: 5,
        salary: 6500,
        location: 'Paris'
      },
      {
        title: 'Full Stack Developer',
        company: 'Innovation Labs',
        match_score: 82,
        applicants: 8,
        salary: 7000,
        location: 'Remote'
      }
    ]

    // Créer une notification du résultat
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'scan_completed',
        title: '✅ Scan terminé',
        message: `${mockOpportunities.length} nouvelles opportunités trouvées avec un score > 80%`,
        priority: 'medium',
        metadata: {
          opportunities_count: mockOpportunities.length,
          highest_score: 95,
          test_mode: true
        }
      })
    }

    console.log('🔍 Scan simulé:', mockOpportunities)

    return NextResponse.json({ 
      success: true, 
      message: 'Scan manuel simulé',
      opportunities: mockOpportunities,
      opportunities_count: mockOpportunities.length
    })

  } catch (error: any) {
    console.error('Erreur scan:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
