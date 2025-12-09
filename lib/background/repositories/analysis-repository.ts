import { SUPABASE_URL } from '../client/supabase';
import { getAccessToken } from '../storage/session-storage';
import { ExternalServiceError, UsageLimitError } from '../errors';
import type { AnalysisResult } from '@/lib/storage';
import type { UsageInfo } from '@/lib/messages';

export interface AnalyzeResponse {
  data: AnalysisResult;
  usage: UsageInfo;
}

/**
 * Call Supabase Edge Function for text analysis
 * Throws typed errors for different failure scenarios
 * 
 * Note: Authentication is already verified by auth-middleware before this is called
 */
export async function analyze(text: string): Promise<AnalyzeResponse> {
  // Access token is guaranteed to exist by auth-middleware
  const accessToken = (await getAccessToken())!;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text }),
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

