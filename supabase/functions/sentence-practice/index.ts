import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

type SentenceType = 'affirmative' | 'interrogative' | 'negative' | 'exclamatory';
type ActionType = 'start' | 'submit' | 'hint';

const SENTENCE_TYPE_LABELS: Record<SentenceType, string> = {
  affirmative: '肯定句',
  interrogative: '一般疑问句',
  negative: '否定句',
  exclamatory: '感叹句',
};

const SENTENCE_TYPE_ORDER: SentenceType[] = ['affirmative', 'interrogative', 'negative', 'exclamatory'];

// Generate scenario prompt
const generateScenarioPrompt = (expression: string, meaning: string, sentenceType: SentenceType) => `你是一位英语教学专家。请为学生生成一个造句练习场景。

习惯用法：${expression}
含义：${meaning}
要求句型：${SENTENCE_TYPE_LABELS[sentenceType]}

请生成一个具体、生活化的场景，让学生在这个场景下使用该习惯用法造一个${SENTENCE_TYPE_LABELS[sentenceType]}。

返回JSON格式：
{
  "scenario": "用中文描述场景，要具体、有趣、贴近生活。例如：'批评你的室友总是不珍惜你做的家务'",
  "hint": "可选的造句提示，帮助学生理解如何使用该表达"
}

要求：
- scenario 必须是中文，简洁有趣
- 场景要能自然地引导出${SENTENCE_TYPE_LABELS[sentenceType]}
- hint 是可选的，如果表达比较难用可以给提示`;

// Evaluate sentence prompt
const evaluateSentencePrompt = (
  expression: string,
  meaning: string,
  sentenceType: SentenceType,
  scenario: string,
  userSentence: string
) => `你是一位英语教学专家，请评估学生的造句。

习惯用法：${expression}
含义：${meaning}
要求句型：${SENTENCE_TYPE_LABELS[sentenceType]}
场景：${scenario}
学生造句：${userSentence}

请评估学生的造句是否正确使用了该习惯用法，句型是否符合要求。

返回JSON格式：
{
  "isCorrect": true或false,
  "corrections": [
    {
      "original": "学生句子中的错误部分",
      "corrected": "正确的写法",
      "explanation": "中文解释为什么这样改"
    }
  ],
  "betterAlternative": "如果学生的句子正确但不够地道，提供一个更地道的表达（可选）",
  "praise": "如果正确，给一句简短的中文鼓励"
}

评估要点：
1. 是否正确使用了 "${expression}"
2. 句型是否是${SENTENCE_TYPE_LABELS[sentenceType]}
3. 语法是否正确
4. 是否符合场景语境

如果完全正确，corrections 为空数组，isCorrect 为 true。`;

// Generate hint prompt
const generateHintPrompt = (
  expression: string,
  meaning: string,
  sentenceType: SentenceType,
  scenario: string
) => `你是一位英语教学专家。学生在造句时遇到困难，请提供帮助。

习惯用法：${expression}
含义：${meaning}
要求句型：${SENTENCE_TYPE_LABELS[sentenceType]}
场景：${scenario}

请提供一个提示和示例句子帮助学生。

返回JSON格式：
{
  "hint": "中文提示，解释如何在这个场景下使用该表达造${SENTENCE_TYPE_LABELS[sentenceType]}",
  "exampleSentence": "一个符合要求的英文示例句子"
}`;

async function callDeepSeek(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一位专业的英语教学专家。请只返回JSON格式，不要有其他文字。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getNextSentenceType(current: SentenceType): SentenceType | null {
  const currentIndex = SENTENCE_TYPE_ORDER.indexOf(current);
  if (currentIndex === -1 || currentIndex >= SENTENCE_TYPE_ORDER.length - 1) {
    return null;
  }
  return SENTENCE_TYPE_ORDER[currentIndex + 1];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: 'DeepSeek API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body as { action: ActionType };

    // Handle START action
    if (action === 'start') {
      const { expression, expressionMeaning } = body;
      const sentenceType: SentenceType = 'affirmative';
      
      const prompt = generateScenarioPrompt(expression, expressionMeaning, sentenceType);
      const content = await callDeepSeek(deepseekApiKey, prompt);
      const result = JSON.parse(content);

      return new Response(
        JSON.stringify({
          success: true,
          task: {
            taskId: generateTaskId(),
            expression,
            sentenceType,
            sentenceTypeLabel: SENTENCE_TYPE_LABELS[sentenceType],
            scenario: result.scenario,
            hint: result.hint,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle SUBMIT action
    if (action === 'submit') {
      const { expression, expressionMeaning, sentenceType, scenario, userSentence } = body;
      
      const evalPrompt = evaluateSentencePrompt(expression, expressionMeaning, sentenceType, scenario, userSentence);
      const evalContent = await callDeepSeek(deepseekApiKey, evalPrompt);
      const feedback = JSON.parse(evalContent);

      // Get next sentence type
      const nextType = getNextSentenceType(sentenceType);
      let nextTask = null;

      if (nextType && feedback.isCorrect) {
        const nextPrompt = generateScenarioPrompt(expression, expressionMeaning, nextType);
        const nextContent = await callDeepSeek(deepseekApiKey, nextPrompt);
        const nextResult = JSON.parse(nextContent);
        
        nextTask = {
          taskId: generateTaskId(),
          expression,
          sentenceType: nextType,
          sentenceTypeLabel: SENTENCE_TYPE_LABELS[nextType],
          scenario: nextResult.scenario,
          hint: nextResult.hint,
        };
      }

      return new Response(
        JSON.stringify({
          success: true,
          feedback: {
            isCorrect: feedback.isCorrect,
            userSentence,
            corrections: feedback.corrections || [],
            betterAlternative: feedback.betterAlternative,
            praise: feedback.praise,
          },
          nextTask,
          isComplete: feedback.isCorrect && !nextType,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle HINT action
    if (action === 'hint') {
      const { expression, expressionMeaning, sentenceType, scenario } = body;
      
      const prompt = generateHintPrompt(expression, expressionMeaning, sentenceType, scenario);
      const content = await callDeepSeek(deepseekApiKey, prompt);
      const result = JSON.parse(content);

      return new Response(
        JSON.stringify({
          success: true,
          hint: result.hint,
          exampleSentence: result.exampleSentence,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sentence-practice function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
