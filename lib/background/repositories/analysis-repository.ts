import { supabase, SUPABASE_URL } from '../client/supabase';
import { getAccessToken, getUserId } from '../storage/session-storage';
import { ExternalServiceError, UsageLimitError } from '../errors';
import type { AnalysisResult } from '@/lib/storage';
import type { UsageInfo } from '@/lib/messages';

export interface AnalyzeResponse {
  data: AnalysisResult;
  usage: UsageInfo;
}

export interface CachedAnalysis {
  analysis: AnalysisResult;
  analyzedAt: string;
  articleTitle: string | null;
}

/**
 * Call Supabase Edge Function for text analysis
 * Throws typed errors for different failure scenarios
 * 
 * Note: Authentication is already verified by auth-middleware before this is called
 */
export async function analyze(text: string, url: string, title: string): Promise<AnalyzeResponse> {
  // Access token is guaranteed to exist by auth-middleware
  const accessToken = (await getAccessToken())!;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, url, title }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    if (data.code === 'DAILY_LIMIT_EXCEEDED') {
      throw new UsageLimitError(data.message, data.usage);
    }
    throw new ExternalServiceError(data.error || `请求失败: ${response.status}`);
  }
  
  return { data: data.data, usage: data.usage };
}

/**
 * Get cached analysis result for a URL
 * Returns null if no cached analysis exists
 */
export async function getCachedAnalysis(url: string): Promise<CachedAnalysis | null> {
  const userId = await getUserId();
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('articles')
    .select('analysis, analyzed_at, title')
    .eq('user_id', userId)
    .eq('url', url)
    .single();

  if (error || !data || !data.analysis) {
    return null;
  }

  return {
    analysis: data.analysis as AnalysisResult,
    analyzedAt: data.analyzed_at,
    articleTitle: data.title,
  };
}

