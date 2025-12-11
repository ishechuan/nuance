import { supabase } from '../client/supabase';
import type {
  StartSentencePracticeResponse,
  SubmitSentenceResponse,
  GetSentenceHintResponse,
  SentenceType,
  FavoriteType,
} from '@/lib/messages';

const FUNCTION_NAME = 'sentence-practice';

export async function startPractice(
  expression: string,
  expressionMeaning: string,
  _expressionType: FavoriteType
): Promise<StartSentencePracticeResponse> {
  
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'start',
      expression,
      expressionMeaning,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to start practice');
  }

  return {
    success: true,
    task: data.task,
  };
}

export async function submitSentence(
  expression: string,
  expressionMeaning: string,
  sentenceType: SentenceType,
  scenario: string,
  userSentence: string
): Promise<SubmitSentenceResponse> {
  
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'submit',
      expression,
      expressionMeaning,
      sentenceType,
      scenario,
      userSentence,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to submit sentence');
  }

  return {
    success: true,
    feedback: data.feedback,
    nextTask: data.nextTask,
    isComplete: data.isComplete,
  };
}

export async function getHint(
  expression: string,
  expressionMeaning: string,
  sentenceType: SentenceType,
  scenario: string
): Promise<GetSentenceHintResponse> {
  
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'hint',
      expression,
      expressionMeaning,
      sentenceType,
      scenario,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to get hint');
  }

  return {
    success: true,
    hint: data.hint,
    exampleSentence: data.exampleSentence,
  };
}
