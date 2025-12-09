import { supabase, type Profile } from '../client/supabase';

/**
 * Get user profile by user ID
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[ProfileRepo] Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Get daily usage count for a user
 */
export async function getDailyUsageCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_daily_usage_count', { 
      p_user_id: userId 
    });
    
    if (error) {
      console.error('[ProfileRepo] Error getting usage count:', error);
      return 0;
    }
    
    return data || 0;
  } catch (e) {
    console.error('[ProfileRepo] Error getting usage count:', e);
    return 0;
  }
}

