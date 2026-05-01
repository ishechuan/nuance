import { getStorageItem, setStorageItem } from './base';
import type { VocabularyBook, VocabularyBookItem, VocabularyBookIdiom } from '../types';

const VOCAB_BOOK_KEY = 'vocabulary_book';

const DEFAULT_VOCAB_BOOK: VocabularyBook = {
  id: 'default',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  vocabularyItems: [],
  idiomItems: [],
};

export async function getVocabularyBook(): Promise<VocabularyBook> {
  return getStorageItem<VocabularyBook>(VOCAB_BOOK_KEY, DEFAULT_VOCAB_BOOK);
}

export async function addVocabularyItem(item: Omit<VocabularyBookItem, 'id' | 'addedAt' | 'mastered' | 'reviewCount' | 'lastReviewedAt' | 'nextReviewDate' | 'easeFactor' | 'interval' | 'repetitions'>): Promise<VocabularyBookItem> {
  const book = await getVocabularyBook();

  const existing = book.vocabularyItems.find((i) => i.word.toLowerCase() === item.word.toLowerCase());
  if (existing) {
    return existing;
  }

  const newItem: VocabularyBookItem = {
    ...item,
    id: crypto.randomUUID?.() || `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    addedAt: Date.now(),
    mastered: false,
    reviewCount: 0,
    lastReviewedAt: 0,
    nextReviewDate: Date.now() + 24 * 60 * 60 * 1000,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    notes: '',
    tags: [],
  };

  book.vocabularyItems.push(newItem);
  book.updatedAt = Date.now();

  await setStorageItem(VOCAB_BOOK_KEY, book);
  return newItem;
}

export async function addIdiomItem(item: Omit<VocabularyBookIdiom, 'id' | 'addedAt' | 'mastered' | 'reviewCount' | 'lastReviewedAt'>): Promise<VocabularyBookIdiom> {
  const book = await getVocabularyBook();

  const existing = book.idiomItems.find((i) => i.expression.toLowerCase() === item.expression.toLowerCase());
  if (existing) {
    return existing;
  }

  const newItem: VocabularyBookIdiom = {
    ...item,
    id: crypto.randomUUID?.() || `idiom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    addedAt: Date.now(),
    mastered: false,
    reviewCount: 0,
    lastReviewedAt: 0,
    notes: '',
    tags: [],
  };

  book.idiomItems.push(newItem);
  book.updatedAt = Date.now();

  await setStorageItem(VOCAB_BOOK_KEY, book);
  return newItem;
}

export async function updateVocabularyItem(id: string, updates: Partial<VocabularyBookItem>): Promise<VocabularyBookItem | null> {
  const book = await getVocabularyBook();
  const index = book.vocabularyItems.findIndex((i) => i.id === id);

  if (index === -1) return null;

  book.vocabularyItems[index] = {
    ...book.vocabularyItems[index],
    ...updates,
  };
  book.updatedAt = Date.now();

  await setStorageItem(VOCAB_BOOK_KEY, book);
  return book.vocabularyItems[index];
}

export async function updateIdiomItem(id: string, updates: Partial<VocabularyBookIdiom>): Promise<VocabularyBookIdiom | null> {
  const book = await getVocabularyBook();
  const index = book.idiomItems.findIndex((i) => i.id === id);

  if (index === -1) return null;

  book.idiomItems[index] = {
    ...book.idiomItems[index],
    ...updates,
  };
  book.updatedAt = Date.now();

  await setStorageItem(VOCAB_BOOK_KEY, book);
  return book.idiomItems[index];
}

export async function removeVocabularyItem(id: string): Promise<boolean> {
  const book = await getVocabularyBook();
  const index = book.vocabularyItems.findIndex((i) => i.id === id);

  if (index === -1) return false;

  book.vocabularyItems.splice(index, 1);
  book.updatedAt = Date.now();

  await setStorageItem(VOCAB_BOOK_KEY, book);
  return true;
}

export async function removeIdiomItem(id: string): Promise<boolean> {
  const book = await getVocabularyBook();
  const index = book.idiomItems.findIndex((i) => i.id === id);

  if (index === -1) return false;

  book.idiomItems.splice(index, 1);
  book.updatedAt = Date.now();

  await setStorageItem(VOCAB_BOOK_KEY, book);
  return true;
}

export async function getVocabularyItemById(id: string): Promise<VocabularyBookItem | null> {
  const book = await getVocabularyBook();
  return book.vocabularyItems.find((i) => i.id === id) || null;
}

export async function getIdiomItemById(id: string): Promise<VocabularyBookIdiom | null> {
  const book = await getVocabularyBook();
  return book.idiomItems.find((i) => i.id === id) || null;
}

export async function getItemsDueForReview(): Promise<{ vocabulary: VocabularyBookItem[]; idioms: VocabularyBookIdiom[] }> {
  const book = await getVocabularyBook();
  const now = Date.now();

  const vocabulary = book.vocabularyItems.filter((item) => item.nextReviewDate <= now && !item.mastered);
  const idioms = book.idiomItems.filter((item) => !item.mastered);

  return { vocabulary, idioms };
}

export async function getMasteredItems(): Promise<{ vocabulary: VocabularyBookItem[]; idioms: VocabularyBookIdiom[] }> {
  const book = await getVocabularyBook();

  return {
    vocabulary: book.vocabularyItems.filter((item) => item.mastered),
    idioms: book.idiomItems.filter((item) => item.mastered),
  };
}

export async function searchVocabBook(query: string): Promise<{ vocabulary: VocabularyBookItem[]; idioms: VocabularyBookIdiom[] }> {
  const book = await getVocabularyBook();
  const lowerQuery = query.toLowerCase();

  return {
    vocabulary: book.vocabularyItems.filter(
      (item) =>
        item.word.toLowerCase().includes(lowerQuery) ||
        item.definition.toLowerCase().includes(lowerQuery) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    ),
    idioms: book.idiomItems.filter(
      (item) =>
        item.expression.toLowerCase().includes(lowerQuery) ||
        item.meaning.toLowerCase().includes(lowerQuery) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    ),
  };
}

export async function getVocabBookStats(): Promise<{
  totalVocabulary: number;
  totalIdioms: number;
  masteredVocabulary: number;
  masteredIdioms: number;
  dueToday: number;
}> {
  const book = await getVocabularyBook();
  const { vocabulary, idioms } = await getItemsDueForReview();

  const masteredVocab = book.vocabularyItems.filter((i) => i.mastered).length;
  const masteredIdiom = book.idiomItems.filter((i) => i.mastered).length;

  return {
    totalVocabulary: book.vocabularyItems.length,
    totalIdioms: book.idiomItems.length,
    masteredVocabulary: masteredVocab,
    masteredIdioms: masteredIdiom,
    dueToday: vocabulary.length + idioms.length,
  };
}

export async function clearVocabularyBook(): Promise<void> {
  await setStorageItem(VOCAB_BOOK_KEY, {
    ...DEFAULT_VOCAB_BOOK,
    id: 'default',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
