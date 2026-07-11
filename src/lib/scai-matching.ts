/**
 * SCAI Matching Algorithm
 * Personalized opportunity scoring based on user profile
 */

export interface UserProfile {
  id?: string
  full_name?: string
  domain?: string
  skills?: string[]
  country?: string
  city?: string
  salary_min?: number
  salary_max?: number
  currency?: string
  profile_type?: string
  bio?: string
  experience_years?: number
  preferred_locations?: string[]
  preferred_industries?: string[]
  remote_preference?: 'remote' | 'hybrid' | 'onsite' | 'any'
}

export interface Opportunity {
  id: string
  title: string
  company?: string
  location?: string
  salary_min?: number
  salary_max?: number
  description?: string
  required_skills?: string[]
  industry?: string
  job_type?: 'full-time' | 'part-time' | 'contract' | 'freelance'
  remote?: boolean
  published_at?: string
  applicants_count?: number
  source_platform?: string
}

export interface MatchResult {
  opportunity_id: string
  opportunity: Opportunity
  match_score: number
  breakdown: {
    skill_match: number
    location_match: number
    salary_match: number
    experience_match: number
    freshness_score: number
  }
  recommended: boolean
}

export class SCAIMatcher {
  private userProfile: UserProfile

  constructor(userProfile: UserProfile) {
    this.userProfile = userProfile
  }

  /**
   * Calculate match score for a single opportunity
   */
  calculateMatch(opportunity: Opportunity): MatchResult {
    const skillMatch = this.calculateSkillMatch(opportunity)
    const locationMatch = this.calculateLocationMatch(opportunity)
    const salaryMatch = this.calculateSalaryMatch(opportunity)
    const experienceMatch = this.calculateExperienceMatch(opportunity)
    const freshnessScore = this.calculateFreshnessScore(opportunity)

    // Weighted average
    const totalScore = (
      skillMatch * 0.35 +
      locationMatch * 0.25 +
      salaryMatch * 0.20 +
      experienceMatch * 0.10 +
      freshnessScore * 0.10
    )

    return {
      opportunity_id: opportunity.id,
      opportunity: opportunity,
      match_score: Math.min(100, Math.max(0, totalScore)),
      breakdown: {
        skill_match: skillMatch,
        location_match: locationMatch,
        salary_match: salaryMatch,
        experience_match: experienceMatch,
        freshness_score: freshnessScore
      },
      recommended: totalScore >= 70
    }
  }

  /**
   * Batch calculate matches for multiple opportunities
   */
  batchMatch(opportunities: Opportunity[]): MatchResult[] {
    return opportunities
      .map(opp => this.calculateMatch(opp))
      .sort((a, b) => b.match_score - a.match_score)
  }

  /**
   * Calculate skill match score (0-100)
   */
  private calculateSkillMatch(opportunity: Opportunity): number {
    const userSkills = this.extractUserSkills()
    if (userSkills.length === 0) return 50

    const requiredSkills = this.extractOpportunitySkills(opportunity)
    if (requiredSkills.length === 0) return 50

    // Calculate overlap
    const matchingSkills = userSkills.filter(skill => 
      requiredSkills.some(reqSkill => 
        skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
        reqSkill.toLowerCase().includes(skill.toLowerCase())
      )
    )

    const matchPercentage = (matchingSkills.length / requiredSkills.length) * 100
    return Math.min(100, matchPercentage)
  }

  /**
   * Calculate location match score (0-100)
   */
  private calculateLocationMatch(opportunity: Opportunity): number {
    // Remote preference
    if (this.userProfile.remote_preference === 'remote' && opportunity.remote) {
      return 100
    }
    if (this.userProfile.remote_preference === 'remote' && !opportunity.remote) {
      return 30
    }

    const userLocation = `${this.userProfile.city || ''} ${this.userProfile.country || ''}`.toLowerCase()
    const oppLocation = (opportunity.location || '').toLowerCase()

    // Perfect match
    if (userLocation && oppLocation.includes(userLocation)) return 100
    if (this.userProfile.country && oppLocation.includes(this.userProfile.country.toLowerCase())) return 80

    // Preferred locations
    if (this.userProfile.preferred_locations?.some(loc => oppLocation.includes(loc.toLowerCase()))) {
      return 90
    }

    return 50
  }

  /**
   * Calculate salary match score (0-100)
   */
  private calculateSalaryMatch(opportunity: Opportunity): number {
    const userMin = this.userProfile.salary_min || 0
    const userMax = this.userProfile.salary_max || Infinity
    const oppMin = opportunity.salary_min || 0
    const oppMax = opportunity.salary_max || Infinity

    // Perfect overlap
    if (oppMin >= userMin && oppMax <= userMax) return 100

    // Partial overlap
    if ((oppMin >= userMin && oppMin <= userMax) || (oppMax >= userMin && oppMax <= userMax)) {
      return 70
    }

    // Opportunity above user range
    if (oppMin > userMax) return 40

    // Opportunity below user range
    if (oppMax < userMin) return 20

    return 50
  }

  /**
   * Calculate experience match score (0-100)
   */
  private calculateExperienceMatch(opportunity: Opportunity): number {
    const userExp = this.userProfile.experience_years || 2
    const desc = (opportunity.description || '').toLowerCase()
    const title = opportunity.title.toLowerCase()

    // Check for senior/lead keywords
    const seniorKeywords = ['senior', 'lead', 'principal', 'head of', 'director']
    const juniorKeywords = ['junior', 'entry', 'intern', 'graduate']

    const isSeniorRole = seniorKeywords.some(k => title.includes(k) || desc.includes(k))
    const isJuniorRole = juniorKeywords.some(k => title.includes(k) || desc.includes(k))

    if (isSeniorRole && userExp >= 5) return 90
    if (isSeniorRole && userExp >= 3) return 70
    if (isJuniorRole && userExp <= 3) return 90
    if (isJuniorRole && userExp <= 5) return 70

    return 50
  }

  /**
   * Calculate freshness score (0-100) based on publish date
   */
  private calculateFreshnessScore(opportunity: Opportunity): number {
    if (!opportunity.published_at) return 50

    const published = new Date(opportunity.published_at)
    const now = new Date()
    const hoursAgo = (now.getTime() - published.getTime()) / 3600000

    if (hoursAgo < 2) return 100
    if (hoursAgo < 24) return 80
    if (hoursAgo < 72) return 60
    if (hoursAgo < 168) return 40 // 1 week
    return 20
  }

  /**
   * Extract skills from user profile
   */
  private extractUserSkills(): string[] {
    const skills: string[] = []

    // Add domain as skill
    if (this.userProfile.domain) {
      skills.push(this.userProfile.domain)
    }

    // Add explicit skills
    if (this.userProfile.skills) {
      skills.push(...this.userProfile.skills)
    }

    // Extract from bio
    if (this.userProfile.bio) {
      const bioSkills = this.extractSkillsFromText(this.userProfile.bio)
      skills.push(...bioSkills)
    }

    return [...new Set(skills)]
  }

  /**
   * Extract skills from opportunity
   */
  private extractOpportunitySkills(opportunity: Opportunity): string[] {
    const skills: string[] = []

    // Extract from title
    const titleSkills = this.extractSkillsFromText(opportunity.title)
    skills.push(...titleSkills)

    // Extract from description
    if (opportunity.description) {
      const descSkills = this.extractSkillsFromText(opportunity.description)
      skills.push(...descSkills)
    }

    // Add required_skills if available
    if (opportunity.required_skills) {
      skills.push(...opportunity.required_skills)
    }

    return [...new Set(skills)]
  }

  /**
   * Helper to extract common tech skills from text
   */
  private extractSkillsFromText(text: string): string[] {
    const lowerText = text.toLowerCase()
    const skills: string[] = []

    const commonSkills = [
      'react', 'node.js', 'nodejs', 'javascript', 'js', 'typescript', 'ts',
      'python', 'java', 'kotlin', 'swift', 'go', 'golang', 'rust',
      'aws', 'azure', 'gcp', 'cloud', 'docker', 'kubernetes',
      'sql', 'nosql', 'mongodb', 'postgres', 'mysql',
      'ui', 'ux', 'design', 'figma', 'photoshop',
      'ai', 'ml', 'machine learning', 'deep learning', 'nlp'
    ]

    commonSkills.forEach(skill => {
      if (lowerText.includes(skill)) {
        skills.push(skill)
      }
    })

    return skills
  }
}

export default SCAIMatcher
