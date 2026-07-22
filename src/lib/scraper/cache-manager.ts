// =================================================================
// SEARCHER CONNECTOR — ADVANCED CACHING LAYER
// =================================================================
// Uses Supabase PostgreSQL for centralized cache pool

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-loaded Supabase client to avoid blocking during build
// Typé `any` explicitement : sans schéma Database généré, le générique par
// défaut de supabase-js résout en `never` sur toutes les requêtes ici,
// ce qui masquait les vraies erreurs sous ~16 faux positifs de typage.
let supabaseAdmin: SupabaseClient<any, any, any> | null = null;

function getSupabaseClient(): SupabaseClient<any, any, any> {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return supabaseAdmin;
}

// =================================================================
// CACHE MANAGER
// =================================================================

export class CacheManager {
  private get supabase() {
    return getSupabaseClient();
  }
  private readonly BATCH_SIZE = 500; // Batch size for bulk operations (optimized for 1M+ opportunities)

  // Add a new opportunity to cache (with deduplication)
  async addOpportunity(opportunity: {
    title: string;
    company?: string;
    location?: string;
    country?: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    description?: string;
    original_url: string;
    source_platform: string;
    source_type: 'free' | 'premium';
    category: string;
    published_at?: Date;
    applicants_count?: number;
  }) {
    // Generate fingerprint
    const fingerprint = `${opportunity.title}::${opportunity.source_platform}::${opportunity.published_at || new Date().toISOString().split('T')[0]}`;

    // Upsert the opportunity (avoid duplicates with fingerprint)
    const { data, error } = await this.supabase
      .from('cache_opportunities')
      .upsert({
        ...opportunity,
        fingerprint,
        published_at: opportunity.published_at || new Date(),
      }, { onConflict: 'fingerprint' })
      .select();

    if (error) {
      console.error('Error adding opportunity to cache:', error);
      throw error;
    }

    return data;
  }

  // Bulk add opportunities for high-throughput scraping (optimized for 1M+ opportunities)
  async addOpportunitiesBulk(opportunities: Array<{
    title: string;
    company?: string;
    location?: string;
    country?: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    description?: string;
    original_url: string;
    source_platform: string;
    source_type: 'free' | 'premium';
    category: string;
    published_at?: Date;
    applicants_count?: number;
  }>) {
    const results: any[] = [];
    const errors: any[] = [];

    // Process in batches to avoid timeouts and optimize performance
    for (let i = 0; i < opportunities.length; i += this.BATCH_SIZE) {
      const batch = opportunities.slice(i, i + this.BATCH_SIZE);
      const batchWithFingerprints = batch.map(opp => ({
        ...opp,
        fingerprint: `${opp.title}::${opp.source_platform}::${opp.published_at || new Date().toISOString().split('T')[0]}`,
        published_at: opp.published_at || new Date(),
        freshness_score: this.calculateFreshnessScore(opp.published_at),
      }));

      try {
        const { data, error } = await this.supabase
          .from('cache_opportunities')
          .upsert(batchWithFingerprints, { onConflict: 'fingerprint' })
          .select();

        if (error) {
          errors.push({ batchIndex: i, error });
          console.error(`Error adding batch ${i} to cache:`, error);
        } else if (data) {
          results.push(...data);
        }
      } catch (err) {
        errors.push({ batchIndex: i, error: err });
      }
    }

    return { added: results.length, errors, totalProcessed: opportunities.length };
  }

  // Calculate freshness score (0-100, higher = fresher)
  private calculateFreshnessScore(publishedAt?: Date): number {
    if (!publishedAt) return 50;
    const now = new Date();
    const diffHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
    return Math.max(0, Math.min(100, 100 - diffHours * 2)); // Decrease by 2 points per hour, max 100
  }

  // Get cache statistics for monitoring
  async getCacheStats() {
    const [activeOpportunities, expiredOpportunities, bySourceType, recentAdds] = await Promise.all([
      this.supabase.from('cache_opportunities').select('count', { count: 'exact' }).eq('is_expired', false),
      this.supabase.from('cache_opportunities').select('count', { count: 'exact' }).eq('is_expired', true),
      this.supabase.from('cache_opportunities').select('source_type').eq('is_expired', false),
      this.supabase.from('cache_opportunities').select('created_at').eq('is_expired', false).order('created_at', { ascending: false }).limit(100),
    ]);

    return {
      activeOpportunities: activeOpportunities.count || 0,
      expiredOpportunities: expiredOpportunities.count || 0,
      totalOpportunities: (activeOpportunities.count || 0) + (expiredOpportunities.count || 0),
      freeOpportunities: bySourceType.data?.filter(o => o.source_type === 'free').length || 0,
      premiumOpportunities: bySourceType.data?.filter(o => o.source_type === 'premium').length || 0,
      lastHourAdditions: recentAdds.data?.filter(o => {
        const hourAgo = new Date(Date.now() - 3600000);
        return new Date(o.created_at) > hourAgo;
      }).length || 0,
    };
  }

  // Cleanup old/expired opportunities (auto-run daily)
  async cleanupExpiredOpportunities(maxAgeHours = 168) { // Default 7 days
    const cutoffDate = new Date(Date.now() - maxAgeHours * 3600000);
    
    const { data, error } = await this.supabase
      .from('cache_opportunities')
      .update({ is_expired: true })
      .lt('published_at', cutoffDate.toISOString())
      .eq('is_expired', false)
      .select();

    if (error) {
      console.error('Error cleaning up expired opportunities:', error);
      throw error;
    }

    return { expiredCount: data?.length || 0, cutoffDate };
  }

  // Get multiple opportunities with filters
  async getOpportunities({
    categories = [],
    sourceType,
    excludeSeenByUserId,
    limit = 100,
  }: {
    categories?: string[];
    sourceType?: 'free' | 'premium';
    excludeSeenByUserId?: string;
    limit?: number;
  }) {
    let query = this.supabase
      .from('cache_opportunities')
      .select('*')
      .eq('is_expired', false)
      .order('freshness_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (categories.length > 0) {
      query = query.in('category', categories);
    }

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    // PostgREST n'accepte pas de sous-requête SQL brute dans .not('id','in',...) —
    // il faut d'abord récupérer la liste réelle d'IDs, puis filtrer dessus.
    if (excludeSeenByUserId) {
      const { data: seen } = await this.supabase
        .from('user_seen_opportunities')
        .select('cache_opportunity_id')
        .eq('user_id', excludeSeenByUserId);
      const seenIds = (seen || []).map((s: any) => s.cache_opportunity_id).filter(Boolean);
      if (seenIds.length > 0) {
        query = query.not('id', 'in', `(${seenIds.join(',')})`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching opportunities from cache:', error);
      throw error;
    }

    return data;
  }

  // Mark an opportunity as seen by a user
  async markOpportunityAsSeen(userId: string, opportunityId: string, interactionType: 'seen' | 'saved' | 'applied' | 'dismissed' = 'seen') {
    const { data, error } = await this.supabase
      .from('user_seen_opportunities')
      .upsert({
        user_id: userId,
        cache_opportunity_id: opportunityId,
        interaction_type: interactionType,
      }, { onConflict: 'user_id, cache_opportunity_id' })
      .select();

    if (error) {
      console.error('Error marking opportunity as seen:', error);
      throw error;
    }

    return data;
  }

  // Start a new scraper session
  async startScraperSession() {
    const { data, error } = await this.supabase
      .from('scraper_sessions')
      .insert({ status: 'running' })
      .select()
      .single();

    if (error) {
      console.error('Error starting scraper session:', error);
      throw error;
    }

    return data;
  }

  // Update an existing scraper session
  async updateScraperSession(sessionId: string, updates: Partial<{
    ended_at: Date;
    sources_scanned: number;
    opportunities_found: number;
    opportunities_added: number;
    errors: any[];
    status: 'running' | 'completed' | 'failed';
  }>) {
    const { data, error } = await this.supabase
      .from('scraper_sessions')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating scraper session:', error);
      throw error;
    }

    return data;
  }

  // Create a founder alert
  async createFounderAlert(alertType: string, title: string, message: string, severity: 'info' | 'warning' | 'error' | 'critical' = 'info') {
    const { data, error } = await this.supabase
      .from('founder_alerts')
      .insert({ alert_type: alertType, title, message, severity })
      .select()
      .single();

    if (error) {
      console.error('Error creating founder alert:', error);
      throw error;
    }

    return data;
  }

  // Voice credits management
  async getVoiceCredits(userId: string) {
    let { data, error } = await this.supabase
      .from('user_voice_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found, create new
      const { data: newData, error: newError } = await this.supabase
        .from('user_voice_credits')
        .insert({ user_id: userId, credits_remaining: 0 })
        .select()
        .single();

      if (newError) {
        console.error('Error creating voice credits:', newError);
        throw newError;
      }

      data = newData;
    } else if (error) {
      console.error('Error getting voice credits:', error);
      throw error;
    }

    return data;
  }

  async useVoiceCredits(userId: string, amount: number) {
    // Supabase n'accepte pas de fonction comme valeur dans .update() — il faut
    // lire le solde actuel puis écrire la nouvelle valeur (pas atomique, mais
    // correct — l'ancien code ne faisait littéralement rien, la fonction
    // n'était jamais exécutée par PostgREST).
    const current = await this.getVoiceCredits(userId);
    const { data, error } = await this.supabase
      .from('user_voice_credits')
      .update({
        credits_remaining: Math.max(0, (current?.credits_remaining || 0) - amount),
        total_credits_used: (current?.total_credits_used || 0) + amount,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error using voice credits:', error);
      throw error;
    }

    return data;
  }
}

// =================================================================
// GLOBAL INSTANCE
// =================================================================

export const cache = new CacheManager();


// =================================================================
// ALIAS FOR BACKWARD COMPATIBILITY
// =================================================================

export const scanCache = {
  get: async (key: string) => null,
  set: async (key: string, value: any) => {},
  has: async (key: string) => false,
};
