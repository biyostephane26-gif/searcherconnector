import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SCAIMatcher, type UserProfile, type Opportunity } from '@/lib/scai-matching'

type ResponseData = {
  success: boolean
  data?: {
    matches: Array<{
      opportunity_id: string
      match_score: number
      breakdown: {
        skill_match: number
        location_match: number
        salary_match: number
        experience_match: number
        freshness_score: number
      }
      recommended: boolean
      opportunity?: any
    }>
  }
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'User ID is required' })
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (profileError || !userProfile) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    // Check if user is premium (tout palier payant + founder + genius)
    const isPremium = ['pro', 'premium', 'enterprise', 'starter'].includes(userProfile.plan || '') ||
                       userProfile.role === 'founder' ||
                       userProfile.verification_status === 'genius'

    // Get opportunities from cache
    const { data: cacheOpportunities, error: cacheError } = await supabaseAdmin
      .from('cache_opportunities')
      .select('*')
      .eq('is_expired', false)
      .order('freshness_score', { ascending: false })
      .limit(isPremium ? 1000 : 300)

    if (cacheError || !cacheOpportunities) {
      return res.status(500).json({ success: false, error: 'Failed to fetch opportunities' })
    }

    // Initialize SCAI Matcher
    const matcher = new SCAIMatcher(userProfile as UserProfile)

    // Convert and match opportunities
    const opportunities = cacheOpportunities.map(opp => ({
      ...opp,
      match: matcher.calculateMatch(opp as Opportunity)
    }))

    // Sort by match score descending
    opportunities.sort((a, b) => (b.match.match_score - a.match.match_score))

    // Prepare response
    const matches = opportunities.map(item => ({
      opportunity_id: item.id,
      match_score: item.match.match_score,
      breakdown: item.match.breakdown,
      recommended: item.match.recommended,
      opportunity: item
    }))

    // For free users, blur some results
    const filteredMatches = isPremium ? matches : matches.map(match => ({
      ...match,
      opportunity: {
        ...match.opportunity,
        title: match.match_score < 80 ? 'Opportunité premium' : match.opportunity.title,
        description: match.match_score < 80 ? 'Débloque pour voir les détails' : match.opportunity.description
      }
    }))

    return res.status(200).json({
      success: true, data: { matches: filteredMatches }
    })
  } catch (error) {
    console.error('Matching error:', error)
    return res.status(500).json({ success: false, error: 'Failed to match opportunities' })
  }
}
