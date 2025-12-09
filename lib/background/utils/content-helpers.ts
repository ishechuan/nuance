import type { IdiomItem, SyntaxItem, VocabularyItem } from '@/lib/storage';
import type { FavoriteType } from '@/lib/messages';

export type FavoriteContent = IdiomItem | SyntaxItem | VocabularyItem;

/**
 * Extract the primary expression/identifier from content based on type
 */
export function getExpression(type: FavoriteType, content: FavoriteContent): string {
  switch (type) {
    case 'idiom':
      return (content as IdiomItem).expression;
    case 'syntax':
      return (content as SyntaxItem).sentence;
    case 'vocabulary':
      return (content as VocabularyItem).word;
  }
}

/**
 * Generate a unique key for Map lookups combining type and expression
 * Format: "type:expression" (e.g., "idiom:break a leg")
 */
export function getExpressionKey(type: FavoriteType, content: FavoriteContent): string {
  return `${type}:${getExpression(type, content)}`;
}

/**
 * Get a display-friendly expression (truncates long syntax sentences)
 */
export function getDisplayExpression(type: FavoriteType, content: FavoriteContent): string {
  const expr = getExpression(type, content);
  if (type === 'syntax' && expr.length > 50) {
    return expr.slice(0, 50) + '...';
  }
  return expr;
}

/**
 * Check if content matches a search query
 */
export function matchesSearchQuery(
  type: FavoriteType, 
  content: FavoriteContent, 
  query: string
): boolean {
  const lowerQuery = query.toLowerCase();
  
  if (type === 'idiom') {
    const idiom = content as IdiomItem;
    return idiom.expression.toLowerCase().includes(lowerQuery) ||
           idiom.meaning.toLowerCase().includes(lowerQuery) ||
           idiom.example.toLowerCase().includes(lowerQuery);
  } else if (type === 'syntax') {
    const syntax = content as SyntaxItem;
    return syntax.sentence.toLowerCase().includes(lowerQuery) ||
           syntax.structure.toLowerCase().includes(lowerQuery) ||
           syntax.explanation.toLowerCase().includes(lowerQuery);
  } else {
    const vocab = content as VocabularyItem;
    return vocab.word.toLowerCase().includes(lowerQuery) ||
           vocab.definition.toLowerCase().includes(lowerQuery) ||
           vocab.context.toLowerCase().includes(lowerQuery);
  }
}

