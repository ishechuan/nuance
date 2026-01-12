import type { AnalysisRecord, SearchMatch, SearchResult } from './types';

export function searchWord(query: string, records: AnalysisRecord[]): SearchResult[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  const results: SearchResult[] = [];

  for (const record of records) {
    const matches: SearchMatch[] = [];

    for (const idiom of record.analysis.idioms) {
      if (idiom.expression.toLowerCase().includes(lowerQuery) ||
          idiom.meaning.toLowerCase().includes(lowerQuery) ||
          idiom.example.toLowerCase().includes(lowerQuery)) {
        matches.push({
          type: 'idiom',
          expression: idiom.expression,
          meaning: idiom.meaning,
          example: idiom.example
        });
      }
    }

    for (const vocab of record.analysis.vocabulary) {
      if (vocab.word.toLowerCase().includes(lowerQuery) ||
          vocab.definition.toLowerCase().includes(lowerQuery) ||
          vocab.context.toLowerCase().includes(lowerQuery)) {
        matches.push({
          type: 'vocabulary',
          word: vocab.word,
          meaning: vocab.definition,
          example: vocab.context
        });
      }
    }

    for (const syntax of record.analysis.syntax) {
      if (syntax.sentence.toLowerCase().includes(lowerQuery) ||
          syntax.explanation.toLowerCase().includes(lowerQuery)) {
        matches.push({
          type: 'syntax',
          sentence: syntax.sentence,
          meaning: syntax.explanation
        });
      }
    }

    if (matches.length > 0) {
      results.push({
        recordId: record.id,
        title: record.title,
        url: record.url,
        timestamp: record.timestamp,
        matchCount: matches.length,
        matches
      });
    }
  }

  return results.sort((a, b) => b.matchCount - a.matchCount);
}
