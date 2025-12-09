import * as analysisRepo from '../repositories/analysis-repository';
import type { AnalyzeTextResponse } from '@/lib/messages';

/**
 * Analyze text using AI
 * Errors bubble up to the handler layer for unified handling
 */
export async function analyzeText(text: string): Promise<AnalyzeTextResponse> {
  const result = await analysisRepo.analyze(text);
  return {
    success: true,
    data: result.data,
    usage: result.usage,
  };
}
