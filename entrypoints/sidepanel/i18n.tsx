import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, setSettings } from '@/lib/storage';
import type { ErrorCode } from '@/lib/messages';
import { CONTEXT_MENU_TITLES } from '@/lib/i18n-shared';

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
    extractedCount: (count: string) => `${count} characters extracted`,
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
    filterPlaceholder: 'Filter by title or URL...',
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
    syncErrTokenMissing: 'GitHub token not configured.',
    syncErrGistMissing: 'Gist not configured. Please save token first.',
    syncErrAutoSyncDisabled: 'Auto-sync is disabled.',
    syncErrRequestFailed: (detail: string) => (detail ? `Sync failed: ${detail}` : 'Sync failed'),
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
    contextMenuAnalyze: CONTEXT_MENU_TITLES.en.main,
    contextMenuAddVocab: CONTEXT_MENU_TITLES.en.vocab,
    contextMenuAddIdiom: CONTEXT_MENU_TITLES.en.idiom,
    contextMenuAddSyntax: CONTEXT_MENU_TITLES.en.syntax,
    analysisResult: 'AI Analysis Result',
    selectedText: 'Selected Text',
    analyzingSelection: 'Analyzing...',
    addTo: (category: string) => `Add to ${category}`,
    customAdd: 'Custom Add',
    analysisFailed: 'Analysis failed',
    errorExtractFailed: 'Failed to extract content',
    errorUnknown: 'Unknown error',
    errNoApiKey: 'API key not configured. Please set your DeepSeek API key in settings.',
    errNoActiveTab: 'No active tab found.',
    errContentScriptUnavailable: 'This page does not allow access (restricted page).',
    errExtractNoArticle: 'Could not extract article content. This page may not contain readable article content.',
    errExtractFailed: (detail: string) => (detail ? `Extraction failed: ${detail}` : 'Extraction failed'),
    errDeepSeekHttp: (detail: string) => (detail ? `DeepSeek request failed: ${detail}` : 'DeepSeek request failed'),
    errDeepSeekEmpty: 'DeepSeek returned empty response.',
    errDeepSeekInvalidJson: 'Failed to parse DeepSeek response.',
    errDeepSeekInvalidFormat: 'Invalid analysis format received from DeepSeek.',
    errDeepSeekFailed: (detail: string) => (detail ? `Analysis failed: ${detail}` : 'Analysis failed'),
    errUnknown: (detail: string) => (detail ? `Something went wrong: ${detail}` : 'Something went wrong'),
    highlightNotFound: 'Text not found on page. The page may have dynamically loaded content.',
    highlightOpenOriginal: 'Opening original page...',
    noMatchingRecords: 'No matching records found',
    timeJustNow: 'Just now',
    timeMinutesAgo: (count: string) => `${count}m ago`,
    timeHoursAgo: (count: string) => `${count}h ago`,
    timeDaysAgo: (count: string) => `${count}d ago`,
    firstTimeSetupTitle: 'Welcome to Nuance!',
    firstTimeSetupDesc: 'Get started by configuring your DeepSeek API key.',
    firstTimeSetupWhy: 'Nuance uses AI to analyze articles and extract language patterns.',
    firstTimeSetupButton: 'Go to Settings',
    firstTimeSetupSkip: 'Skip for now',
    firstTimeSetupStepsTitle: 'Setup steps',
    firstTimeSetupStep1: 'Open your DeepSeek account',
    firstTimeSetupStep2: 'Get your API key from platform',
    firstTimeSetupStep3: 'Paste it in settings - typically costs less than $0.01 per article',
    firstTimeSetupStep4: 'Your data stays private - only article text is sent to AI',
    firstTimeSetupStep5: 'Analysis takes about 10-30 seconds',
    firstTimeSetupTip: 'You can always configure your API key later in Settings.',
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
    extractedCount: (count: string) => `已提取 ${count} 个字符`,
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
    filterPlaceholder: '按标题或 URL 过滤...',
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
    syncErrTokenMissing: '尚未配置 GitHub Token。',
    syncErrGistMissing: '尚未配置 Gist，请先保存 Token。',
    syncErrAutoSyncDisabled: '已关闭自动同步。',
    syncErrRequestFailed: (detail: string) => (detail ? `同步失败：${detail}` : '同步失败'),
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
    contextMenuAnalyze: CONTEXT_MENU_TITLES.zh.main,
    contextMenuAddVocab: CONTEXT_MENU_TITLES.zh.vocab,
    contextMenuAddIdiom: CONTEXT_MENU_TITLES.zh.idiom,
    contextMenuAddSyntax: CONTEXT_MENU_TITLES.zh.syntax,
    analysisResult: 'AI 分析结果',
    selectedText: '选中的文本',
    analyzingSelection: '正在分析...',
    addTo: (category: string) => `添加到 ${category}`,
    customAdd: '自定义添加',
    analysisFailed: '分析失败',
    errorExtractFailed: '提取内容失败',
    errorUnknown: '未知错误',
    errNoApiKey: '尚未配置 API Key，请先在设置中填写 DeepSeek API 密钥。',
    errNoActiveTab: '未找到当前活动标签页。',
    errContentScriptUnavailable: '该页面受限制，扩展无法访问。',
    errExtractNoArticle: '无法提取文章正文，该页面可能不包含可读的文章内容。',
    errExtractFailed: (detail: string) => (detail ? `提取失败：${detail}` : '提取失败'),
    errDeepSeekHttp: (detail: string) => (detail ? `DeepSeek 请求失败：${detail}` : 'DeepSeek 请求失败'),
    errDeepSeekEmpty: 'DeepSeek 返回了空结果。',
    errDeepSeekInvalidJson: '无法解析 DeepSeek 返回内容。',
    errDeepSeekInvalidFormat: 'DeepSeek 返回的分析格式不正确。',
    errDeepSeekFailed: (detail: string) => (detail ? `分析失败：${detail}` : '分析失败'),
    errUnknown: (detail: string) => (detail ? `发生未知错误：${detail}` : '发生未知错误'),
    highlightNotFound: '页面上未找到该文本。页面可能是动态加载的内容。',
    highlightOpenOriginal: '正在打开原文页面...',
    noMatchingRecords: '没有找到匹配的记录',
    timeJustNow: '刚刚',
    timeMinutesAgo: (count: string) => `${count}分钟前`,
    timeHoursAgo: (count: string) => `${count}小时前`,
    timeDaysAgo: (count: string) => `${count}天前`,
    firstTimeSetupTitle: '欢迎使用 Nuance！',
    firstTimeSetupDesc: '配置 DeepSeek API 密钥即可开始使用。',
    firstTimeSetupWhy: 'Nuance 使用 AI 分析文章并提取语言模式。',
    firstTimeSetupButton: '去设置',
    firstTimeSetupSkip: '稍后再说',
    firstTimeSetupStepsTitle: '配置步骤',
    firstTimeSetupStep1: '打开你的 DeepSeek 账户',
    firstTimeSetupStep2: '在平台获取 API 密钥',
    firstTimeSetupStep3: '在设置中粘贴密钥 - 每篇文章通常不到 $0.01',
    firstTimeSetupStep4: '数据保持私密 - 仅文章正文会发送到 AI',
    firstTimeSetupStep5: '分析大约需要 10-30 秒',
    firstTimeSetupTip: '你可以稍后在设置中配置 API Key。',
  },
} as const;

type DictKey = keyof typeof dict.en | keyof typeof dict.zh;
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

export function formatErrorMessage(
  t: (key: DictKey, arg1?: string, arg2?: string) => string,
  code?: ErrorCode,
  detail?: string,
  fallback?: string
): string {
  if (!code) return fallback || (detail ? t('errUnknown', detail) : t('errUnknown'));
  switch (code) {
    case 'NO_API_KEY':
      return t('errNoApiKey');
    case 'NO_ACTIVE_TAB':
      return t('errNoActiveTab');
    case 'CONTENT_SCRIPT_UNAVAILABLE':
      return t('errContentScriptUnavailable');
    case 'EXTRACT_NO_ARTICLE':
      return t('errExtractNoArticle');
    case 'EXTRACT_FAILED':
      return t('errExtractFailed', detail || '');
    case 'DEEPSEEK_HTTP_ERROR':
      return t('errDeepSeekHttp', detail || '');
    case 'DEEPSEEK_EMPTY_RESPONSE':
      return t('errDeepSeekEmpty');
    case 'DEEPSEEK_INVALID_JSON':
      return t('errDeepSeekInvalidJson');
    case 'DEEPSEEK_INVALID_FORMAT':
      return t('errDeepSeekInvalidFormat');
    case 'DEEPSEEK_ANALYSIS_FAILED':
      return t('errDeepSeekFailed', detail || '');
    case 'UNKNOWN_ERROR':
    default:
      return t('errUnknown', detail || fallback || '');
  }
}

export function formatSyncErrorMessage(
  t: (key: DictKey, arg1?: string, arg2?: string) => string,
  code?: 'SYNC_TOKEN_MISSING' | 'SYNC_GIST_MISSING' | 'SYNC_AUTO_SYNC_DISABLED' | 'SYNC_REQUEST_FAILED' | 'SYNC_UNKNOWN',
  detail?: string,
  fallback?: string
): string {
  switch (code) {
    case 'SYNC_TOKEN_MISSING':
      return t('syncErrTokenMissing');
    case 'SYNC_GIST_MISSING':
      return t('syncErrGistMissing');
    case 'SYNC_AUTO_SYNC_DISABLED':
      return t('syncErrAutoSyncDisabled');
    case 'SYNC_REQUEST_FAILED':
    case 'SYNC_UNKNOWN':
      return t('syncErrRequestFailed', detail || fallback || '');
    default:
      return fallback || t('syncFailed');
  }
}
