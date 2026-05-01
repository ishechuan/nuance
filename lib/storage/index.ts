export {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  createStorageKey,
  clearAllStorage,
} from './base';

export {
  getHistoryIndex,
  rebuildHistoryIndex,
  getAnalysisHistory,
  addAnalysisRecord,
  clearAnalysisHistory,
  deleteAnalysisRecord,
  getAnalysisRecordById,
  getAnalysisRecordByUrl,
  getHistoryByDateRange,
  getHistoryByDomain,
  searchHistoryByWord,
  searchHistoryByIdiom,
  getUniqueDomains,
  getUniqueDates,
  saveSyncHistory,
} from './history';

export {
  getVocabularyBook,
  addVocabularyItem,
  addIdiomItem,
  updateVocabularyItem,
  updateIdiomItem,
  removeVocabularyItem,
  removeIdiomItem,
  getVocabularyItemById,
  getIdiomItemById,
  getItemsDueForReview,
  getMasteredItems,
  searchVocabBook,
  getVocabBookStats,
  clearVocabularyBook,
} from './vocab-book';

export {
  getLearningStatistics,
  updateStatisticsAfterAnalysis,
  getStudySessions,
  startStudySession,
  endStudySession,
  getTodayStudyDuration,
  getWeeklyStudySummary,
  rebuildStatistics,
  clearStatistics,
} from './statistics';

export {
  getReminderSettings,
  updateReminderSettings,
  shouldRemindToday,
  markReminderShown,
  clearReminderSettings,
} from './reminder';

export {
  getLearningNotes,
  getNotesByRecordId,
  saveLearningNote,
  deleteLearningNote,
  searchNotes,
  clearLearningNotes,
} from './notes';

export {
  getStyleSettings,
  updateStyleSettings,
  applyStyleSettings,
  clearStyleSettings,
} from './style';

export {
  getOnboardingState,
  updateOnboardingState,
  shouldShowOnboarding,
  dismissOnboarding,
  resetOnboarding,
} from './onboarding';

export {
  getApiKey,
  setApiKey,
  hasApiKey,
  clearApiKey,
} from './api-settings';

export {
  DEFAULT_SETTINGS,
  getSettings,
  setSettings,
  resetSettings,
} from './user-settings';

export {
  DEFAULT_SYNC_SETTINGS,
  getSyncSettings,
  setSyncSettings,
  getConflictQueue,
  setConflictQueue,
  addConflict,
  removeConflict,
  clearConflictQueue,
  getSyncStatus,
} from './sync-settings';
