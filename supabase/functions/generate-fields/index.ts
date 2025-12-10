import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `You are an expert English language analyst helping Chinese English learners. Generate learning content for vocabulary entries.

All explanations MUST be in Simplified Chinese.
You MUST respond with valid JSON only, no markdown or other text.`;

interface GenerateRequest {
  entryType: 'idiom' | 'syntax' | 'vocabulary';
  primaryValue: string;
  context?: string;
}

function buildPrompt(req: GenerateRequest): string {
  const { entryType, primaryValue, context } = req;
  const contextInfo = context ? `\n文章标题参考：${context}` : '';

  switch (entryType) {
    case 'idiom':
      return `为以下英语习惯用法/短语生成学习内容：

短语：${primaryValue}${contextInfo}

返回JSON格式：
{
  "meaning": "中文含义解释",
  "example": "一个使用该短语的英文例句"
}

要求：
- meaning 必须是中文
- example 必须是地道的英文句子`;

    case 'syntax':
      return `分析以下英语句子的语法结构：

句子：${primaryValue}${contextInfo}

返回JSON格式：
{
  "structure": "语法结构名称（如'虚拟语气'、'倒装句'、'定语从句'等）",
  "explanation": "该语法结构的中文解析说明"
}

要求：
- structure 用中文表示语法结构名称
- explanation 必须是详细的中文解析`;

    case 'vocabulary':
      return `为以下英语词汇生成学习内容：

词汇：${primaryValue}${contextInfo}

返回JSON格式：
{
  "level": "B1/B2/C1/C2（根据词汇难度判断）",
  "definition": "该词的中文释义",
  "context": "一个包含该词的英文例句"
}

要求：
- level 必须是 B1、B2、C1 或 C2 之一
- definition 必须是中文
- context 必须是地道的英文例句`;
  }
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

    // Parse request body
    const body: GenerateRequest = await req.json();
    const { entryType, primaryValue, context } = body;

    if (!entryType || !primaryValue) {
      return new Response(
        JSON.stringify({ error: 'Missing entryType or primaryValue' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['idiom', 'syntax', 'vocabulary'].includes(entryType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid entryType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get DeepSeek API key
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: 'DeepSeek API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt
    const userPrompt = buildPrompt({ entryType, primaryValue, context });

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
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

    // Parse the response
    let generatedFields;
    try {
      generatedFields = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: generatedFields,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-fields function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

