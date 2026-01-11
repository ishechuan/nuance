import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, setSettings } from '@/lib/storage';

type Lang = 'en' | 'zh';

const dict = {
  en: {
    appTitle: 'Nuance',
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
  },
  zh: {
    appTitle: 'Nuance',
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
      '打开一篇英文文章并点击“分析页面”，即可提取词汇、习语与句法模式。',
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
  },
} as const;

type DictKey = keyof typeof dict.en;

interface I18nContextValue {
  lang: Lang;
  t: (key: DictKey) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  t: (k) => dict.en[k],
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
    return (key: DictKey) => table[key] ?? key;
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
