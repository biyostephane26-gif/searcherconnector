import { describe, it, expect, beforeAll } from 'vitest';
import { SCAIMatcher } from '../scai-matching';

describe('SCAIMatcher', () => {
  let matcher: SCAIMatcher;

  beforeAll(() => {
    matcher = new SCAIMatcher({
      id: 'test-user',
      full_name: 'Test User',
      domain: 'Développeur Fullstack',
      skills: ['React', 'Node.js', 'TypeScript', 'JavaScript'],
      country: 'Cameroun',
      city: 'Douala',
      salary_min: 250000,
      experience_years: 5,
      verification_status: 'verified'
    });
  });

  describe('calculateMatch', () => {
    it('should calculate high match for perfect opportunity', () => {
      const opportunity = {
        id: 'opp-1',
        title: 'Développeur Fullstack React/Node',
        company: 'TechCorp',
        location: 'Douala, Cameroun',
        description: 'Nous cherchons un développeur Fullstack avec React et Node.js',
        salary_min: 300000,
        salary_max: 500000,
        required_skills: ['React', 'Node.js', 'TypeScript'],
        experience_required: 3,
        employment_type: 'full-time',
        source_platform: 'linkedin',
        original_url: 'https://linkedin.com/opp-1',
        published_at: new Date().toISOString(),
        is_premium: true
      };

      const result = matcher.calculateMatch(opportunity);
      
      expect(result.match_score).toBeGreaterThan(70);
      expect(result.recommended).toBe(true);
    });

    it('should calculate lower match for unrelated opportunity', () => {
      const opportunity = {
        id: 'opp-2',
        title: 'Designer UI/UX',
        company: 'Design Studio',
        location: 'Paris, France',
        description: 'Nous cherchons un designer avec Figma et Photoshop',
        salary_min: 40000,
        salary_max: 60000,
        required_skills: ['Figma', 'Photoshop', 'Illustrator'],
        experience_required: 2,
        employment_type: 'full-time',
        source_platform: 'indeed',
        original_url: 'https://indeed.com/opp-2',
        published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_premium: false
      };

      const result = matcher.calculateMatch(opportunity);
      
      expect(result.match_score).toBeLessThan(50);
    });

    it('should handle opportunities without all fields', () => {
      const opportunity = {
        id: 'opp-3',
        title: 'Développeur',
        company: 'Startup',
        location: 'Remote',
        description: 'Développeur web',
        required_skills: [],
        source_platform: 'linkedin',
        original_url: 'https://linkedin.com/opp-3',
        published_at: new Date().toISOString()
      };

      const result = matcher.calculateMatch(opportunity);
      
      expect(typeof result.match_score).toBe('number');
      expect(result.match_score).toBeGreaterThan(0);
      expect(result.match_score).toBeLessThanOrEqual(100);
    });
  });

  describe('batchMatch', () => {
    it('should match multiple opportunities and sort by score', () => {
      const opportunities = [
        {
          id: 'best',
          title: 'Développeur Fullstack React/Node',
          company: 'Tech Corp',
          location: 'Douala',
          description: 'React et Node.js',
          required_skills: ['React', 'Node.js', 'TypeScript'],
          source_platform: 'linkedin',
          original_url: 'https://linkedin.com/best',
          published_at: new Date().toISOString()
        },
        {
          id: 'worst',
          title: 'Plombier',
          company: 'Plumbing Inc',
          location: 'Paris',
          description: 'Réparation de tuyaux',
          required_skills: [],
          source_platform: 'indeed',
          original_url: 'https://indeed.com/worst',
          published_at: new Date().toISOString()
        }
      ];

      const results = matcher.batchMatch(opportunities);
      
      expect(results.length).toBe(2);
      expect(results[0].opportunity.id).toBe('best');
      expect(results[1].opportunity.id).toBe('worst');
      expect(results[0].match_score).toBeGreaterThan(results[1].match_score);
    });
  });
});
