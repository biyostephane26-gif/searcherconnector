import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AgentSchedule, EmailThread } from '../types';

export function useAgent() {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [loading] = useState(false);

  const getSchedule = async () => {
    try {
      if (!user) return null;
      const { data, error } = await supabase
        .from('agent_schedules').select('*').eq('user_id', user.id).maybeSingle();
      if (error) { console.warn('Error fetching schedule:', error.message); return null; }
      return data;
    } catch (e) { console.error('getSchedule exception:', e); return null; }
  };

  const updateSchedule = async (updates: Partial<AgentSchedule>) => {
    if (!user) return;
    await supabase.from('agent_schedules').update(updates).eq('user_id', user.id);
  };

  const getEmailThreads = async (): Promise<EmailThread[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('email_threads').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return (data || []) as EmailThread[];
  };

  const launchScan = async (zoneOverride?: string) => {
    if (!user) return null;
    setScanning(true);
    try {
      const startedAt = Date.now();

      const { data: profile, error: profileError } = await supabase
        .from('users_profiles').select('*').eq('id', user.id).single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (!profile) {
        await supabase.from('users_profiles').upsert({
          id: user.id, full_name: user.email, email: user.email,
          profile_type: 'freelance', domain: '', country: '',
          profile_completion: 0,
        }, { onConflict: 'id', ignoreDuplicates: true });
        throw new Error('Profil créé. Complète ton domaine et ton pays dans les paramètres avant de lancer le scan.');
      }

      if (!profile.domain || !profile.country)
        throw new Error('Complète ton domaine et ton pays dans les paramètres avant de lancer le scan.');

      // Récupérer le token — vérifier qu'il n'est pas expiré
      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session;

      // Si la session est expirée, tenter de la rafraîchir
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed.session) throw new Error('Session expirée. Reconnecte-toi.');
      }

      const token = session?.access_token || sessionResult.data.session?.access_token;

      // Zone : priorité à zoneOverride (passé par SCAI), puis last_search_zone, puis continental
      const zone = zoneOverride || (profile.last_search_zone as string) || 'continental';

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId:    user.id,
          zone,
          has_budget: (profile as any).has_budget || (profile.search_preferences as any)?.has_budget || false,
          scan_type:  ['starter','pro','enterprise'].includes(profile.plan || 'free') ? 'deep' : 'quick',
        }),
      });

      const scanData = await res.json();

      if (!res.ok) {
        // Quota atteint → message clair
        if (res.status === 429) {
          throw new Error(scanData.error || `Quota de scans atteint pour aujourd'hui. Reviens demain ou passe à un plan supérieur.`);
        }
        throw new Error(scanData.error || 'Erreur lors du scan. Réessaie dans quelques secondes.');
      }

      const foundCount = scanData.found || 0;
      const sc = scanData.sourcesScanned || {};

      // Log dans agent_actions (non-bloquant)
      supabase.from('agent_actions').insert({
        user_id:      user.id,
        action_type:  'search_scan',
        result:       `Scan terminé. ${foundCount} opportunités trouvées sur ${sc.sourcesTouched || sc.total || 0} sources.`,
        success:      true,
        execution_ms: Date.now() - startedAt,
      }).catch(() => {});

      return {
        success:               true,
        found:                 foundCount,
        auto_applied:          scanData.autoApplied || 0,
        locked_count:          scanData.locked_count || 0,
        locked_message:        scanData.locked_message || null,
        sitesScanned:          (sc.serper || 0) + (sc.ats || 0),
        socialNetworksScanned: (sc.reddit || 0) + (sc.mastodon || 0) + (sc.bluesky || 0) + (sc.telegram || 0),
        platformsScanned:      (sc.github || 0) + (sc.hackernews || 0) + (sc.extra || 0),
        feedsScanned:          (sc.rss || 0),
        totalSources:          sc.sourcesTouched || sc.total || 0,
      };
    } catch (err: any) {
      const errorMessage = err?.message || 'Erreur inconnue pendant le scan.';
      // Log l'erreur (non-bloquant)
      supabase.from('agent_actions').insert({
        user_id: user.id, action_type: 'search_scan',
        result: 'Scan interrompu.', success: false, error_message: errorMessage,
      }).catch(() => {});
      return { success: false, error: errorMessage };
    } finally {
      setScanning(false);
    }
  };

  return { scanning, loading, getSchedule, updateSchedule, getEmailThreads, launchScan };
}
