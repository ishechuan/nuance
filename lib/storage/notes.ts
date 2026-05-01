import { getStorageItem, setStorageItem, removeStorageItem } from './base';
import type { LearningNote } from '../types';

const NOTES_KEY = 'learning_notes';

export async function getLearningNotes(): Promise<LearningNote[]> {
  return getStorageItem<LearningNote[]>(NOTES_KEY, []);
}

export async function getNotesByRecordId(recordId: string): Promise<LearningNote[]> {
  const notes = await getLearningNotes();
  return notes.filter((n) => n.recordId === recordId);
}

export async function saveLearningNote(note: Partial<LearningNote>): Promise<LearningNote> {
  const notes = await getLearningNotes();

  if (note.id) {
    const index = notes.findIndex((n) => n.id === note.id);
    if (index !== -1) {
      notes[index] = {
        ...notes[index],
        ...note,
        updatedAt: Date.now(),
      };
      await setStorageItem(NOTES_KEY, notes);
      return notes[index];
    }
  }

  const newNote: LearningNote = {
    id: crypto.randomUUID?.() || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    recordId: note.recordId || '',
    articleTitle: note.articleTitle || '',
    articleUrl: note.articleUrl || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: note.content || '',
    tags: note.tags || [],
    highlightedItems: note.highlightedItems || [],
  };

  notes.push(newNote);
  await setStorageItem(NOTES_KEY, notes);
  return newNote;
}

export async function deleteLearningNote(id: string): Promise<boolean> {
  const notes = await getLearningNotes();
  const index = notes.findIndex((n) => n.id === id);

  if (index === -1) return false;

  notes.splice(index, 1);
  await setStorageItem(NOTES_KEY, notes);
  return true;
}

export async function searchNotes(query: string): Promise<LearningNote[]> {
  const notes = await getLearningNotes();
  const lowerQuery = query.toLowerCase();

  return notes.filter(
    (note) =>
      note.content.toLowerCase().includes(lowerQuery) ||
      note.articleTitle.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

export async function clearLearningNotes(): Promise<void> {
  await removeStorageItem(NOTES_KEY);
}
