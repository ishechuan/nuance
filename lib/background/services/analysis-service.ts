import * as analysisRepo from '../repositories/analysis-repository';
import type { AnalyzeTextResponse, GetCachedAnalysisResponse, GenerateEntryFieldsResponse, FavoriteType } from '@/lib/messages';

/**
 * Analyze text using AI
 * Errors bubble up to the handler layer for unified handling
 */
export async function analyzeText(text: string, url: string, title: string): Promise<AnalyzeTextResponse> {
  const result = await analysisRepo.analyze(text, url, title);
  return {
    success: true,
    data: result.data,
    usage: result.usage,
  };
}

/**
 * Get cached analysis for a URL
 */
export async function getCachedAnalysis(url: string): Promise<GetCachedAnalysisResponse> {
  const cached = await analysisRepo.getCachedAnalysis(url);
  if (!cached) {
    return {
      success: true,
      hasCached: false,
    };
  }
  return {
    success: true,
    hasCached: true,
    data: cached.analysis,
    analyzedAt: cached.analyzedAt,
    articleTitle: cached.articleTitle,
  };
}

/**
 * Generate entry fields using AI
 */
export async function generateEntryFields(
  entryType: FavoriteType,
  primaryValue: string,
  context?: string
): Promise<GenerateEntryFieldsResponse> {
  const result = await analysisRepo.generateFields(entryType, primaryValue, context);
  return {
    success: true,
    data: result,
  };
}
