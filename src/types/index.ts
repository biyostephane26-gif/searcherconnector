export type UserProfile = {
  id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  domain?: string;
  country?: string;
  city?: string;
  profile_type?: 'jobseeker' | 'freelance' | 'business' | 'investor' | 'founder' | 'searcher';
  search_preferences?: {
    keywords?: string[];
    target_industries?: string[];
    vision_summary?: string;
    special_requirements?: string;
  };
  verification_status?: 'pending' | 'verified' | 'genius';
  salary_min?: number;
  salary_max?: number;
  profile_completion?: number;
  created_at?: string;
};

export type Group = {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  avatar_url?: string;
  category: string;
  visibility: 'public' | 'private';
  created_by?: string;
  members_count: number;
  posts_count: number;
  is_verified: boolean;
  created_at: string;
  is_member?: boolean;
  member_role?: string;
};

export type GroupPost = {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  author?: UserProfile;
};

export type Story = {
  id: string;
  author_id: string;
  content?: string;
  image_url?: string;
  story_type: 'text' | 'image' | 'video' | 'audio' | 'achievement' | 'opportunity';
  bg_color: string;
  views_count: number;
  expires_at: string;
  created_at: string;
  author?: UserProfile;
  is_viewed?: boolean;
};

export type Hashtag = {
  id: string;
  tag: string;
  posts_count: number;
  trend_score: number;
  last_used_at: string;
};

export type Article = {
  id: string;
  author_id: string;
  title: string;
  subtitle?: string;
  cover_url?: string;
  content: string;
  tags?: string[];
  reads_count: number;
  likes_count: number;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  author?: UserProfile;
};

export type Endorsement = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  skill: string;
  comment?: string;
  verified_by_searcher: boolean;
  created_at: string;
  from_user?: UserProfile;
};

export type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'document';
  is_read: boolean;
  searcher_draft?: boolean;
  ai_suggestions?: string[];
  created_at: string;
  sender?: UserProfile;
  receiver?: UserProfile;
};

export type Conversation = {
  id: string;
  last_message?: Message;
  other_user: UserProfile;
  unread_count: number;
  updated_at: string;
};

export type PostReaction = 'like' | 'fire' | 'clap' | 'genius' | 'rocket';

// =================================================================
// COUCHE 3 : AGENT AUTONOME
// =================================================================

export type AgentAction = {
  id: string;
  user_id: string;
  action_type: string;
  opportunity_id?: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  result?: string;
  success: boolean;
  error_message?: string;
  auto_promo_sent: boolean;
  execution_ms: number;
  created_at: string;
};

export type AgentQueueTask = {
  id: string;
  user_id: string;
  task_type: string;
  scheduled_for: string;
  priority: number;
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  attempts: number;
  payload: Record<string, any>;
  result?: Record<string, any>;
  created_at: string;
};

export type ResponseTemplate = {
  id: string;
  user_id: string;
  template_type: string;
  subject_template?: string;
  body_template: string;
  tone: 'professional' | 'friendly' | 'assertive' | 'enthusiastic';
  is_active: boolean;
  uses_count: number;
};

export type EmailThread = {
  id: string;
  user_id: string;
  opportunity_id?: string;
  subject?: string;
  from_email?: string;
  from_name?: string;
  company?: string;
  direction: 'incoming' | 'outgoing';
  body_preview?: string;
  full_body?: string;
  searcher_replied: boolean;
  reply_body?: string;
  requires_human: boolean;
  sentiment?: string;
  created_at: string;
};

export type Followup = {
  id: string;
  user_id: string;
  opportunity_id: string;
  application_id?: string;
  followup_number: number;
  scheduled_for?: string;
  sent_at?: string;
  body?: string;
  channel: 'email' | 'whatsapp' | 'platform';
  status: 'scheduled' | 'sent' | 'replied' | 'cancelled';
};

export type InterviewPrep = {
  id: string;
  user_id: string;
  opportunity_id: string;
  interview_date?: string;
  interview_type?: string;
  company_research?: string;
  likely_questions: any[];
  suggested_answers: any[];
  talking_points?: string;
  red_flags?: string;
  salary_strategy?: string;
  reminder_sent: boolean;
};

export type AgentSchedule = {
  user_id: string;
  scan_frequency_hours: number;
  scan_times: string[];
  followup_delay_days: number;
  max_followups: number;
  auto_apply_threshold: number;
  require_approval_below: number;
  surveillance_active: boolean;
  email_auto_reply: boolean;
  whatsapp_auto_reply: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};
