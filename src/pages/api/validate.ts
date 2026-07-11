import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  // Fetch user profile
  const { data: profile, error } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('Profile fetch error', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }

  // Simple validation rules
  const requiredFields = ['full_name', 'domain', 'country', 'plan'];
  const missing = requiredFields.filter((field) => !profile[field]);

  // Check documents existence
  const { data: docs, error: docsError } = await supabase
    .from('uploaded_documents')
    .select('id')
    .eq('user_id', userId);

  if (docsError) {
    console.error('Documents fetch error', docsError);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }

  const isSolid = missing.length === 0 && docs && docs.length > 0;
  const messages: string[] = [];
  if (missing.length) messages.push(`Missing profile fields: ${missing.join(', ')}`);
  if (!docs || docs.length === 0) messages.push('No supporting documents uploaded');

  return res.status(200).json({ isSolid, messages, profileComplete: missing.length === 0 });
}
