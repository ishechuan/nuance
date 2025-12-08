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

export function buildAnalysisPrompt(text: string): string {
  // Truncate very long texts to avoid token limits
  const maxLength = 8000;
  const truncatedText = text.length > maxLength 
    ? text.slice(0, maxLength) + '...[truncated]' 
    : text;
  
  return ANALYSIS_USER_PROMPT + truncatedText;
}
