export const ANALYSIS_SYSTEM_PROMPT = `You are an expert English language analyst specializing in helping Chinese English learners. Your task is to analyze English texts and extract valuable learning points.

All explanations and meanings MUST be written in Chinese (Simplified Chinese).

You MUST respond with valid JSON only, no other text or markdown formatting.`;

export const ANALYSIS_USER_PROMPT = `分析以下英文文本，提取三个类别的学习要点：

1. **习惯用法 (Idioms/Collocations)**: 找出地道的习语表达、短语动词和固定搭配（例如 "running out of time" 而非 "no time"，"make a decision" 而非 "do a decision"）。

2. **核心语法 (Key Syntax)**: 识别复杂或值得学习的句型结构，包括：
   - 倒装句
   - 虚拟语气
   - 定语从句
   - 分词短语
   - 强调句
   - 其他进阶句型

3. **核心词汇 (Core Vocabulary)**: 提取 B1 级别及以上的词汇：
   - 包括 B1、B2、C1、C2 各级别词汇
   - 优先选择在上下文中有学习价值的词汇
   - 适合学术或正式写作的词汇
   - 不要只提取最难的词，也要包含中等难度的实用词汇

返回 JSON 格式，结构如下：
{
  "idioms": [
    {
      "expression": "原文中的短语",
      "meaning": "中文解释",
      "example": "包含该短语的原文句子"
    }
  ],
  "syntax": [
    {
      "sentence": "原文中的复杂句",
      "structure": "语法结构名称（如'定语从句'、'倒装句'）",
      "explanation": "中文语法解析"
    }
  ],
  "vocabulary": [
    {
      "word": "单词",
      "level": "B1/B2/C1/C2",
      "definition": "该语境下的中文释义",
      "context": "包含该单词的原文句子"
    }
  ]
}

重要要求：
- 每个类别提取 5-15 个条目（根据文本长度和丰富程度）
- 所有 meaning、explanation、definition 字段必须使用中文
- example 和 context 字段保留英文原文
- 优先提取对英语学习者最有价值的内容
- 词汇级别要多样化，不要只提取最难的词

待分析文本：
`;

export function buildAnalysisPrompt(
  text: string,
  options?: {
    vocabLevels?: ('B1' | 'B2' | 'C1' | 'C2')[];
    maxIdioms?: number;
    maxSyntax?: number;
    maxVocabulary?: number;
  }
): string {
  const maxLength = 8000;
  const truncatedText = text.length > maxLength ? text.slice(0, maxLength) + '...[truncated]' : text;
  const levels = options?.vocabLevels && options.vocabLevels.length ? options.vocabLevels.join('、') : 'B1、B2、C1、C2';
  const mi = typeof options?.maxIdioms === 'number' ? options!.maxIdioms : 10;
  const ms = typeof options?.maxSyntax === 'number' ? options!.maxSyntax : 10;
  const mv = typeof options?.maxVocabulary === 'number' ? options!.maxVocabulary : 10;
  const constraints =
    `\n附加约束：\n- 词汇仅选择等级为：${levels}\n- 每个类别最多返回：习语${mi}条、语法${ms}条、词汇${mv}条\n`;
  return ANALYSIS_USER_PROMPT + constraints + truncatedText;
}

export function buildSelectionAnalysisPrompt(
  text: string,
  category: 'vocabulary' | 'idioms' | 'syntax'
): string {
  const prompts: Record<string, string> = {
    vocabulary: `分析以下选中的英文文本，提取词汇信息：

文本："${text}"

请返回JSON格式：
{
  "word": "提取的核心单词（如果文本较短，直接使用整个文本）",
  "level": "B1/B2/C1/C2（根据词汇难度）",
  "definition": "该语境下的中文释义",
  "context": "原文句子作为例句"
}

要求：
- 优先提取最有学习价值的单词
- 如果文本是单个单词，直接分析该单词
- definition要结合上下文给出准确释义
- 所有解释使用中文`,

    idioms: `分析以下选中的英文文本，提取习语/短语表达：

文本："${text}"

请返回JSON格式：
{
  "expression": "提取的短语/习语",
  "meaning": "中文解释",
  "example": "原文句子"
}

要求：
- 识别地道的英语表达
- 优先提取短语动词、习语、固定搭配
- 解释要简洁准确
- 所有解释使用中文`,

    syntax: `分析以下选中的英文文本，提取句型/语法结构：

文本："${text}"

请返回JSON格式：
{
  "sentence": "原文句子",
  "structure": "语法结构名称（如'倒装句'、'定语从句'、'分词短语'等）",
  "explanation": "中文语法解析"
}

要求：
- 识别复杂或值得学习的句型
- 解释要清晰易懂
- 所有解释使用中文`,
  };

  return prompts[category] || prompts.vocabulary;
}
