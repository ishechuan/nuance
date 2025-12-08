import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const FREE_DAILY_LIMIT = 5;

const ANALYSIS_SYSTEM_PROMPT = `You are an expert English language analyst specializing in helping Chinese English learners. Your task is to analyze English texts and extract valuable learning points.

All explanations and meanings MUST be written in Chinese (Simplified Chinese).

You MUST respond with valid JSON only, no other text or markdown formatting.`;

const ANALYSIS_USER_PROMPT = `分析以下英文文本，提取三个类别的学习要点：

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

interface AnalysisResult {
  idioms: Array<{
    expression: string;
    meaning: string;
    example: string;
  }>;
  syntax: Array<{
    sentence: string;
    structure: string;
    explanation: string;
  }>;
  vocabulary: Array<{
    word: string;
    level: string;
    definition: string;
    context: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile to check if pro
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single();

    const isPro = profile?.is_pro || false;

    // Check daily usage for non-pro users
    if (!isPro) {
      const { data: usageCount } = await supabase
        .rpc('get_daily_usage_count', { p_user_id: user.id });

      if (usageCount >= FREE_DAILY_LIMIT) {
        return new Response(
          JSON.stringify({ 
            error: 'Daily limit reached',
            code: 'DAILY_LIMIT_EXCEEDED',
            message: '您今日的免费次数已用完，请升级Pro版获取无限次数',
            usage: { used: usageCount, limit: FREE_DAILY_LIMIT }
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Parse request body
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid text parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate text if too long
    const maxLength = 8000;
    const truncatedText = text.length > maxLength 
      ? text.slice(0, maxLength) + '...[truncated]' 
      : text;

    // Get DeepSeek API key from secrets
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: 'DeepSeek API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call DeepSeek API
    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: ANALYSIS_USER_PROMPT + truncatedText },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!deepseekResponse.ok) {
      const errorData = await deepseekResponse.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || `DeepSeek API error: ${deepseekResponse.status}` 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const content = deepseekData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from DeepSeek API' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate the response
    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(content);
      if (!analysis.idioms || !analysis.syntax || !analysis.vocabulary) {
        throw new Error('Invalid analysis format');
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse analysis response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log usage (only for non-pro users, but we log for all to track)
    await supabase
      .from('usage_logs')
      .insert({ user_id: user.id });

    // Get updated usage count for response
    const { data: newUsageCount } = await supabase
      .rpc('get_daily_usage_count', { p_user_id: user.id });

    return new Response(
      JSON.stringify({
        success: true,
        data: analysis,
        usage: {
          used: newUsageCount || 1,
          limit: isPro ? null : FREE_DAILY_LIMIT,
          isPro,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

