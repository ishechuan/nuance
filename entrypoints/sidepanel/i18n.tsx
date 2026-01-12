import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, setSettings } from '@/lib/storage';

type Lang = 'en' | 'zh';

const dict = {
  en: {
    appTitle: 'Nuance',
    history: 'History',
    settings: 'Settings',
    apiKeyWarning: 'Please configure your DeepSeek API key in settings first.',
    noArticle: 'No article loaded',
    noArticleHint: 'Click analyze to extract and analyze the current page',
    analyzePage: 'Analyze Page',
    analyzing: 'Analyzing...',
    tabIdioms: 'Idioms',
    tabSyntax: 'Syntax',
    tabVocabulary: 'Vocabulary',
    ready: 'Ready to Analyze',
    readyHint:
      'Navigate to an English article and click \"Analyze Page\" to extract vocabulary, idioms, and syntax patterns.',
    loadingAnalyzing: 'Analyzing with DeepSeek AI...',
    loadingMayTake: 'This may take 10-30 seconds',
    charactersExtracted: 'characters extracted',
    apiConfig: 'DeepSeek API Configuration',
    apiKeyLabel: 'API Key',
    getApiKeyFrom: 'Get your API key from',
    deepseekPlatform: 'DeepSeek Platform',
    saving: 'Saving...',
    saveApiKey: 'Save API Key',
    analysisPreferences: 'Analysis Preferences',
    vocabularyLevels: 'Vocabulary Levels',
    maxIdioms: 'Max Idioms',
    maxSyntax: 'Max Syntax',
    maxVocabulary: 'Max Vocabulary',
    savePreferences: 'Save Preferences',
    about: 'About Nuance',
    aboutText:
      'Nuance is an AI-powered English learning assistant that helps you extract valuable language patterns from any web article. It analyzes idioms, complex syntax structures, and advanced vocabulary to accelerate your English mastery.',
    versionLabel: 'Version',
    language: 'Language',
    languageEnglish: 'English',
    languageChinese: '中文',
    msgEnterNewKey: 'Please enter a new API key',
    msgApiKeyEmpty: 'API key cannot be empty',
    msgApiKeySaved: 'API key saved successfully!',
    msgApiKeySaveFailed: 'Failed to save API key',
    msgSelectAtLeastOne: 'Please select at least one vocabulary level',
    msgCountsNegative: 'Counts cannot be negative',
    msgCountsTooLarge: 'Counts too large',
    msgPreferencesSaved: 'Preferences saved',
    historyTitle: 'Learning History',
    historyEmpty: 'No learning history yet',
    historyEmptyHint: 'Start analyzing articles to build your learning history',
    search: 'Search...',
    filterByDate: 'Date Filter',
    filterByDomain: 'Domain Filter',
    allDates: 'All Dates',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    allDomains: 'All Domains',
    clearHistory: 'Clear History',
    confirmClear: 'Are you sure you want to clear all history?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    viewDetails: 'View Details',
    openPage: 'Open Page',
    deleteRecord: 'Delete',
    exportJson: 'Export JSON',
    exportCsv: 'Export CSV',
    viewingRecord: 'Viewing Record',
    idiomsCount: 'idioms',
    syntaxCount: 'syntax',
    vocabularyCount: 'vocabulary',
    githubSync: 'GitHub Sync',
    githubSyncDesc: 'Sync your learning history with GitHub Gist for cross-device backup.',
    githubToken: 'GitHub Token',
    createGithubToken: 'Create a token',
    tokenScopes: 'Required scopes:',
    saveToken: 'Save Token',
    gistUrl: 'Gist URL',
    copyUrl: 'Copy URL',
    autoSyncOnAnalyze: 'Auto-sync after each analysis',
    syncUpload: 'Upload',
    syncDownload: 'Download',
    syncBidirectional: 'Sync',
    lastSync: 'Last synced',
    syncTokenEmpty: 'Token cannot be empty',
    syncTokenInvalid: 'Invalid GitHub token',
    syncTokenSaved: 'Token saved successfully',
    syncPushed: (count: string) => `Uploaded ${count} records to Gist`,
    syncPulled: (count: string) => `Downloaded ${count} new records`,
    syncCompleted: 'Sync completed successfully',
    syncFoundExisting: (pushed: string, pulled: string) => `Synced with existing Gist: uploaded ${pushed}, downloaded ${pulled} new records`,
    syncCreatedNew: (count: string) => `Created new Gist and uploaded ${count} records`,
    syncConflictsDetected: (count: string) => `${count} conflicts detected. Please resolve them in History.`,
    syncConflictsPending: (count: string) => `${count} conflicts need to be resolved`,
    syncFailed: 'Sync failed',
    resolveConflicts: 'Resolve Conflicts',
    tabArticles: 'Articles',
    tabSearch: 'Search',
    searchPlaceholder: 'Search words, phrases, idioms...',
    searchEmpty: 'Enter a word or phrase to search',
    searchNoResults: (query: string) => `No results found for "${query}"`,
    searchResultsCount: (query: string, count: string) => `"${query}" found in ${count} articles`,
    matchCount: (count: string) => `${count} matches`,
    matchIdiom: 'Idiom',
    matchSyntax: 'Syntax',
    matchVocabulary: 'Vocab',
    matchMore: (count: string) => `+${count} more`,
    conflictTitle: 'Conflict Detected',
    conflictLocalModified: 'Local modified',
    conflictRemoteModified: 'Remote modified',
    keepLocal: 'Keep Local',
    keepRemote: 'Keep Remote',
    keepAllLocal: 'Keep All Local',
    keepAllRemote: 'Keep All Remote',
    conflictRecord: (title: string) => `"${title}"`,
    conflictsExist: (count: string) => `${count} records have conflicts`,
    resolveAllConflicts: 'Resolve All Conflicts',
  },
  zh: {
    appTitle: 'Nuance',
    history: '历史',
    settings: '设置',
    apiKeyWarning: '请先在设置中配置 DeepSeek API 密钥。',
    noArticle: '尚未加载文章',
    noArticleHint: '点击分析以提取并分析当前页面',
    analyzePage: '分析页面',
    analyzing: '正在分析...',
    tabIdioms: '习语',
    tabSyntax: '句法',
    tabVocabulary: '词汇',
    ready: '准备开始分析',
    readyHint:
      '打开一篇英文文章并点击"分析页面"，即可提取词汇、习语与句法模式。',
    loadingAnalyzing: '正在使用 DeepSeek AI 分析...',
    loadingMayTake: '可能需要 10-30 秒',
    charactersExtracted: '个字符',
    apiConfig: 'DeepSeek API 配置',
    apiKeyLabel: 'API 密钥',
    getApiKeyFrom: '在以下获取 API 密钥',
    deepseekPlatform: 'DeepSeek 平台',
    saving: '正在保存...',
    saveApiKey: '保存 API 密钥',
    analysisPreferences: '分析偏好',
    vocabularyLevels: '词汇等级',
    maxIdioms: '最大习语数',
    maxSyntax: '最大句法数',
    maxVocabulary: '最大词汇数',
    savePreferences: '保存偏好',
    about: '关于 Nuance',
    aboutText:
      'Nuance 是一款 AI 英语学习助手，帮助你从任意网页文章中提取有价值的语言模式。它会分析习语、复杂句法结构与高阶词汇，加速你的英语掌握。',
    versionLabel: '版本',
    language: '语言',
    languageEnglish: 'English',
    languageChinese: '中文',
    msgEnterNewKey: '请输入新的 API 密钥',
    msgApiKeyEmpty: 'API 密钥不能为空',
    msgApiKeySaved: 'API 密钥保存成功！',
    msgApiKeySaveFailed: '保存 API 密钥失败',
    msgSelectAtLeastOne: '请至少选择一个词汇等级',
    msgCountsNegative: '数量不能为负数',
    msgCountsTooLarge: '数量过大',
    msgPreferencesSaved: '偏好已保存',
    historyTitle: '学习历史',
    historyEmpty: '暂无学习历史',
    historyEmptyHint: '开始分析文章来建立你的学习历史',
    search: '搜索...',
    filterByDate: '日期筛选',
    filterByDomain: '域名筛选',
    allDates: '全部日期',
    today: '今天',
    thisWeek: '本周',
    thisMonth: '本月',
    allDomains: '全部域名',
    clearHistory: '清空历史',
    confirmClear: '确定要清空所有历史记录吗？',
    cancel: '取消',
    confirm: '确认',
    viewDetails: '查看详情',
    openPage: '打开页面',
    deleteRecord: '删除',
    exportJson: '导出 JSON',
    exportCsv: '导出 CSV',
    viewingRecord: '查看记录',
    idiomsCount: '个习语',
    syntaxCount: '个句法',
    vocabularyCount: '个词汇',
    githubSync: 'GitHub 同步',
    githubSyncDesc: '使用 GitHub Gist 同步学习历史，实现跨设备备份。',
    githubToken: 'GitHub Token',
    createGithubToken: '创建 Token',
    tokenScopes: '所需权限：',
    saveToken: '保存 Token',
    gistUrl: 'Gist 链接',
    copyUrl: '复制链接',
    autoSyncOnAnalyze: '每次分析后自动同步',
    syncUpload: '上传',
    syncDownload: '下载',
    syncBidirectional: '同步',
    lastSync: '上次同步',
    syncTokenEmpty: 'Token 不能为空',
    syncTokenInvalid: '无效的 GitHub Token',
    syncTokenSaved: 'Token 保存成功',
    syncPushed: (count: string) => `已上传 ${count} 条记录到 Gist`,
    syncPulled: (count: string) => `已下载 ${count} 条新记录`,
    syncCompleted: '同步完成',
    syncFoundExisting: (pushed: string, pulled: string) => `已同步现有 Gist：上传 ${pushed} 条，下载 ${pulled} 条新记录`,
    syncCreatedNew: (count: string) => `已创建新 Gist 并上传 ${count} 条记录`,
    syncConflictsDetected: (count: string) => `检测到 ${count} 个冲突，请在历史记录中解决。`,
    syncConflictsPending: (count: string) => `有待解决的冲突 ${count} 个`,
    syncFailed: '同步失败',
    resolveConflicts: '解决冲突',
    tabArticles: '文章',
    tabSearch: '搜索',
    searchPlaceholder: '搜索单词、短语、习语...',
    searchEmpty: '输入单词或短语进行搜索',
    searchNoResults: (query: string) => `未找到包含 "${query}" 的结果`,
    searchResultsCount: (query: string, count: string) => `"${query}" 在 ${count} 篇文章中找到`,
    matchCount: (count: string) => `${count} 处匹配`,
    matchIdiom: '习语',
    matchSyntax: '句法',
    matchVocabulary: '词汇',
    matchMore: (count: string) => `+${count} 更多`,
    conflictTitle: '检测到冲突',
    conflictLocalModified: '本地已修改',
    conflictRemoteModified: '远程已修改',
    keepLocal: '保留本地',
    keepRemote: '保留远程',
    keepAllLocal: '全部保留本地',
    keepAllRemote: '全部保留远程',
    conflictRecord: (title: string) => `「${title}」`,
    conflictsExist: (count: string) => `${count} 条记录存在冲突`,
    resolveAllConflicts: '解决所有冲突',
  },
} as const;

type DictKey = keyof typeof dict.en;
type DictValue = string | ((arg1: string, arg2?: string) => string);

interface I18nContextValue {
  lang: Lang;
  t: (key: DictKey, arg1?: string, arg2?: string) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  t: (k, arg1, arg2) => {
    const value = dict.en[k];
    if (typeof value === 'function') {
      return value(arg1 || '', arg2 || '');
    }
    return value ?? k;
  },
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    getSettings().then((s) => {
      setLangState(s.language);
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    setSettings({ language: next });
  };

  const t = useMemo(() => {
    const table = dict[lang];
    return (key: DictKey, arg1?: string, arg2?: string) => {
      const value = table[key];
      if (typeof value === 'function') {
        return value(arg1 || '', arg2 || '');
      }
      return value ?? key;
    };
  }, [lang]);

  const value = useMemo(
    () => ({ lang, t, setLang }),
    [lang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
