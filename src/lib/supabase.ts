import { createClient } from '@supabase/supabase-js'

// Default values to prevent "supabaseKey is required" errors
const DEFAULT_SUPABASE_URL = 'https://keyfjdqenfyiixmehsbj.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZqZHFlbmZ5aWl4bWVoc2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDc3OTQsImV4cCI6MjA5NDM4Mzc5NH0.4PYEUSh7GxAvOKk9K5kATWP6rPbMZyAReGsDqcFkdOg'
const DEFAULT_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZqZHFlbmZ5aWl4bWVoc2JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgwNzc5NCwiZXhwIjoyMDk0MzgzNzk0fQ.RF3AVeNuiwSjWCOc3EmJShappUMplFgcF8mZ3Az7qAo'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_SERVICE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})



export interface Profile {
  id: string;
  full_name: string;
  email: string;
  profile_type: 'job_seeker' | 'freelance';
  domain: string;
  country: string;
  city?: string;
  verification_status: 'pending' | 'verified' | 'genius' | 'refused';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  role: 'user' | 'admin' | 'founder';
  avatar_url?: string;
  bio?: string;
  refusal_reason?: string;
  profile_completion: number;
  surveillance_active: boolean;
  free_mode: boolean;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  // Liens professionnels
  portfolio_url?: string;
  github_url?: string;
  linkedin_url?: string;
  behance_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  website_url?: string;
  cv_url?: string;
  // Préférences et config
  has_budget?: boolean;
  last_search_zone?: string;
  response_template?: string;
  search_preferences?: {
    keywords?: string[];
    target_industries?: string[];
    vision_summary?: string;
    special_requirements?: string;
    has_budget?: boolean;
  };
}
