import { getStorageItem, setStorageItem } from './base';
import type { LearningStatistics, StudySession } from '../types';
import { getAnalysisHistory } from './history';

const STATISTICS_KEY = 'learning_statistics';
const STUDY_SESSIONS_KEY = 'study_sessions';

const DEFAULT_STATISTICS: LearningStatistics = {
  totalArticlesAnalyzed: 0,
  totalWordsLearned: 0,
  totalIdiomsLearned: 0,
  totalSyntaxLearned: 0,
  streakDays: 0,
  lastStudyDate: 0,
  weeklyProgress: [],
  monthlyProgress: [],
};

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getTodayStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff).getTime();
}

export async function getLearningStatistics(): Promise<LearningStatistics> {
  return getStorageItem<LearningStatistics>(STATISTICS_KEY, DEFAULT_STATISTICS);
}

export async function updateStatisticsAfterAnalysis(
  vocabularyCount: number,
  idiomsCount: number,
  syntaxCount: number
): Promise<void> {
  const stats = await getLearningStatistics();
  const now = Date.now();
  const todayKey = getDateKey(now);
  const monthKey = getMonthKey(now);

  stats.totalArticlesAnalyzed += 1;
  stats.totalWordsLearned += vocabularyCount;
  stats.totalIdiomsLearned += idiomsCount;
  stats.totalSyntaxLearned += syntaxCount;

  const todayStart = getTodayStart();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  if (stats.lastStudyDate >= yesterdayStart && stats.lastStudyDate < todayStart) {
    stats.streakDays += 1;
  } else if (stats.lastStudyDate < yesterdayStart) {
    stats.streakDays = 1;
  }
  stats.lastStudyDate = now;

  let weeklyEntry = stats.weeklyProgress.find((p) => p.date === todayKey);
  if (!weeklyEntry) {
    weeklyEntry = {
      date: todayKey,
      articlesAnalyzed: 0,
      wordsLearned: 0,
      studyDuration: 0,
    };
    stats.weeklyProgress.push(weeklyEntry);
  }
  weeklyEntry.articlesAnalyzed += 1;
  weeklyEntry.wordsLearned += vocabularyCount + idiomsCount;

  const weekStart = getWeekStart();
  stats.weeklyProgress = stats.weeklyProgress.filter((p) => {
    const entryDate = new Date(p.date).getTime();
    return entryDate >= weekStart;
  });

  let monthlyEntry = stats.monthlyProgress.find((p) => p.month === monthKey);
  if (!monthlyEntry) {
    monthlyEntry = {
      month: monthKey,
      articlesAnalyzed: 0,
      wordsLearned: 0,
      activeDays: 0,
    };
    stats.monthlyProgress.push(monthlyEntry);
  }
  monthlyEntry.articlesAnalyzed += 1;
  monthlyEntry.wordsLearned += vocabularyCount + idiomsCount;

  const daysInMonth = new Set(
    (await getAnalysisHistory())
      .filter((r) => getMonthKey(r.timestamp) === monthKey)
      .map((r) => getDateKey(r.timestamp))
  );
  monthlyEntry.activeDays = daysInMonth.size;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsKey = getMonthKey(sixMonthsAgo.getTime());
  stats.monthlyProgress = stats.monthlyProgress.filter((p) => p.month >= sixMonthsKey);

  await setStorageItem(STATISTICS_KEY, stats);
}

export async function getStudySessions(): Promise<StudySession[]> {
  return getStorageItem<StudySession[]>(STUDY_SESSIONS_KEY, []);
}

export async function startStudySession(articleUrl?: string, articleTitle?: string): Promise<StudySession> {
  const session: StudySession = {
    id: crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    endTime: 0,
    articleUrl: articleUrl || '',
    articleTitle: articleTitle || '',
    vocabularyLearned: 0,
    idiomsLearned: 0,
    syntaxLearned: 0,
  };

  const sessions = await getStudySessions();
  sessions.push(session);
  await setStorageItem(STUDY_SESSIONS_KEY, sessions);

  return session;
}

export async function endStudySession(
  sessionId: string,
  vocabularyLearned?: number,
  idiomsLearned?: number,
  syntaxLearned?: number
): Promise<StudySession | null> {
  const sessions = await getStudySessions();
  const index = sessions.findIndex((s) => s.id === sessionId);

  if (index === -1) return null;

  sessions[index] = {
    ...sessions[index],
    endTime: Date.now(),
    vocabularyLearned: vocabularyLearned || sessions[index].vocabularyLearned,
    idiomsLearned: idiomsLearned || sessions[index].idiomsLearned,
    syntaxLearned: syntaxLearned || sessions[index].syntaxLearned,
  };

  await setStorageItem(STUDY_SESSIONS_KEY, sessions);

  const stats = await getLearningStatistics();
  const todayKey = getDateKey(sessions[index].startTime);
  const weekStart = getWeekStart();

  let weeklyEntry = stats.weeklyProgress.find((p) => p.date === todayKey);
  if (weeklyEntry) {
    const duration = (sessions[index].endTime - sessions[index].startTime) / 1000 / 60;
    weeklyEntry.studyDuration += duration;
  }

  stats.weeklyProgress = stats.weeklyProgress.filter((p) => {
    const entryDate = new Date(p.date).getTime();
    return entryDate >= weekStart;
  });

  await setStorageItem(STATISTICS_KEY, stats);

  return sessions[index];
}

export async function getTodayStudyDuration(): Promise<number> {
  const sessions = await getStudySessions();
  const todayStart = getTodayStart();

  const todaySessions = sessions.filter(
    (s) => s.startTime >= todayStart && s.endTime > 0
  );

  return todaySessions.reduce((total, s) => {
    return total + (s.endTime - s.startTime);
  }, 0);
}

export async function getWeeklyStudySummary(): Promise<{
  totalArticles: number;
  totalWords: number;
  totalDuration: number;
  dailyBreakdown: Record<string, { articles: number; words: number; duration: number }>;
}> {
  const stats = await getLearningStatistics();
  const weekStart = getWeekStart();

  const dailyBreakdown: Record<string, { articles: number; words: number; duration: number }> = {};
  let totalArticles = 0;
  let totalWords = 0;
  let totalDuration = 0;

  for (const entry of stats.weeklyProgress) {
    const entryDate = new Date(entry.date).getTime();
    if (entryDate >= weekStart) {
      dailyBreakdown[entry.date] = {
        articles: entry.articlesAnalyzed,
        words: entry.wordsLearned,
        duration: entry.studyDuration,
      };
      totalArticles += entry.articlesAnalyzed;
      totalWords += entry.wordsLearned;
      totalDuration += entry.studyDuration;
    }
  }

  return {
    totalArticles,
    totalWords,
    totalDuration,
    dailyBreakdown,
  };
}

export async function rebuildStatistics(): Promise<LearningStatistics> {
  const history = await getAnalysisHistory();

  const stats: LearningStatistics = {
    totalArticlesAnalyzed: history.length,
    totalWordsLearned: 0,
    totalIdiomsLearned: 0,
    totalSyntaxLearned: 0,
    streakDays: 0,
    lastStudyDate: 0,
    weeklyProgress: [],
    monthlyProgress: [],
  };

  const dailyStats: Record<string, { articles: number; words: number; idioms: number; syntax: number }> = {};
  const monthlyStats: Record<string, { articles: number; words: number; idioms: number; days: Set<string> }> = {};

  for (const record of history) {
    stats.totalWordsLearned += record.analysis.vocabulary.length;
    stats.totalIdiomsLearned += record.analysis.idioms.length;
    stats.totalSyntaxLearned += record.analysis.syntax.length;

    const dateKey = getDateKey(record.timestamp);
    const monthKey = getMonthKey(record.timestamp);

    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = { articles: 0, words: 0, idioms: 0, syntax: 0 };
    }
    dailyStats[dateKey].articles += 1;
    dailyStats[dateKey].words += record.analysis.vocabulary.length;
    dailyStats[dateKey].idioms += record.analysis.idioms.length;

    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = { articles: 0, words: 0, idioms: 0, days: new Set() };
    }
    monthlyStats[monthKey].articles += 1;
    monthlyStats[monthKey].words += record.analysis.vocabulary.length;
    monthlyStats[monthKey].idioms += record.analysis.idioms.length;
    monthlyStats[monthKey].days.add(dateKey);

    if (record.timestamp > stats.lastStudyDate) {
      stats.lastStudyDate = record.timestamp;
    }
  }

  const weekStart = getWeekStart();
  for (const [dateKey, data] of Object.entries(dailyStats)) {
    const entryDate = new Date(dateKey).getTime();
    if (entryDate >= weekStart) {
      stats.weeklyProgress.push({
        date: dateKey,
        articlesAnalyzed: data.articles,
        wordsLearned: data.words + data.idioms,
        studyDuration: 0,
      });
    }
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsKey = getMonthKey(sixMonthsAgo.getTime());

  for (const [monthKey, data] of Object.entries(monthlyStats)) {
    if (monthKey >= sixMonthsKey) {
      stats.monthlyProgress.push({
        month: monthKey,
        articlesAnalyzed: data.articles,
        wordsLearned: data.words + data.idioms,
        activeDays: data.days.size,
      });
    }
  }

  if (stats.lastStudyDate > 0) {
    const sortedDates = Object.keys(dailyStats).sort().reverse();
    let streak = 0;
    let checkDate = getTodayStart();

    for (const dateKey of sortedDates) {
      const entryDate = new Date(dateKey).getTime();
      const dayDiff = Math.floor((checkDate - entryDate) / (24 * 60 * 60 * 1000));

      if (dayDiff <= 1) {
        streak++;
        checkDate = entryDate;
      } else {
        break;
      }
    }

    stats.streakDays = streak;
  }

  await setStorageItem(STATISTICS_KEY, stats);
  return stats;
}

export async function clearStatistics(): Promise<void> {
  await setStorageItem(STATISTICS_KEY, DEFAULT_STATISTICS);
  await setStorageItem(STUDY_SESSIONS_KEY, []);
}
