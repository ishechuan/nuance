import { create } from 'zustand';
import type {
  SentenceTask,
  SentenceFeedback,
  SentenceType,
  FavoriteType,
  StartSentencePracticeResponse,
  SubmitSentenceResponse,
  GetSentenceHintResponse,
} from '@/lib/messages';

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: number;
  // For AI messages
  task?: SentenceTask;
  feedback?: SentenceFeedback;
  hint?: { text: string; example?: string };
  isComplete?: boolean;
}

interface SentencePracticeState {
  isActive: boolean;
  expression: string | null;
  expressionMeaning: string | null;
  expressionType: FavoriteType | null;
  currentTask: SentenceTask | null;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  // Actions
  startPractice: (expression: string, meaning: string, type: FavoriteType) => Promise<void>;
  submitSentence: (sentence: string) => Promise<void>;
  requestHint: () => Promise<void>;
  retryCurrentTask: () => void;
  endPractice: () => void;
  clearError: () => void;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useSentencePracticeStore = create<SentencePracticeState>((set, get) => ({
  isActive: false,
  expression: null,
  expressionMeaning: null,
  expressionType: null,
  currentTask: null,
  chatHistory: [],
  isLoading: false,
  error: null,

  startPractice: async (expression, meaning, type) => {
    set({
      isActive: true,
      expression,
      expressionMeaning: meaning,
      expressionType: type,
      chatHistory: [],
      isLoading: true,
      error: null,
    });

    try {
      const response: StartSentencePracticeResponse = await browser.runtime.sendMessage({
        type: 'START_SENTENCE_PRACTICE',
        expression,
        expressionMeaning: meaning,
        expressionType: type,
      });

      if (!response.success || !response.task) {
        throw new Error(response.error || '启动练习失败');
      }

      const task = response.task;
      const aiMessage: ChatMessage = {
        id: generateId(),
        role: 'ai',
        content: `请基于 "${expression}" 造一个**${task.sentenceTypeLabel}**。\n\n场景：${task.scenario}`,
        timestamp: Date.now(),
        task,
      };

      set({
        currentTask: task,
        chatHistory: [aiMessage],
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '启动练习失败',
      });
    }
  },

  submitSentence: async (sentence) => {
    const { currentTask, expression, expressionMeaning, chatHistory } = get();
    if (!currentTask || !expression || !expressionMeaning) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: sentence,
      timestamp: Date.now(),
    };

    set({
      chatHistory: [...chatHistory, userMessage],
      isLoading: true,
      error: null,
    });

    try {
      const response: SubmitSentenceResponse = await browser.runtime.sendMessage({
        type: 'SUBMIT_SENTENCE',
        taskId: currentTask.taskId,
        expression,
        expressionMeaning,
        sentenceType: currentTask.sentenceType,
        scenario: currentTask.scenario,
        userSentence: sentence,
      });

      if (!response.success) {
        throw new Error(response.error || '提交失败');
      }

      const feedback = response.feedback!;
      let aiContent = '';

      if (feedback.isCorrect) {
        aiContent = `✅ ${feedback.praise || 'Perfect!'}\n\nYour sentence: ${feedback.userSentence}`;
        if (feedback.betterAlternative) {
          aiContent += `\n\nNative speakers might say: ${feedback.betterAlternative}`;
        }
      } else {
        aiContent = `⚠️ Almost there!\n\nYour sentence: ${feedback.userSentence}`;
        if (feedback.corrections && feedback.corrections.length > 0) {
          aiContent += '\n\n修正：';
          feedback.corrections.forEach((c) => {
            aiContent += `\n• ${c.original} → ${c.corrected}\n  ${c.explanation}`;
          });
        }
        if (feedback.betterAlternative) {
          aiContent += `\n\nBetter: ${feedback.betterAlternative}`;
        }
        // 提示用户再试一次
        aiContent += '\n\n👆 请根据上面的修正再试一次，或点击下方的提示按钮获取帮助。';
      }

      const feedbackMessage: ChatMessage = {
        id: generateId(),
        role: 'ai',
        content: aiContent,
        timestamp: Date.now(),
        feedback,
      };

      const newHistory = [...get().chatHistory, feedbackMessage];

      // If correct and there's a next task, add it
      if (feedback.isCorrect && response.nextTask) {
        const nextTask = response.nextTask;
        const nextMessage: ChatMessage = {
          id: generateId(),
          role: 'ai',
          content: `很好！现在把刚才的意思改成**${nextTask.sentenceTypeLabel}**。\n\n场景：${nextTask.scenario}`,
          timestamp: Date.now(),
          task: nextTask,
        };
        newHistory.push(nextMessage);
        set({
          currentTask: nextTask,
          chatHistory: newHistory,
          isLoading: false,
        });
      } else if (response.isComplete) {
        // Practice complete
        const completeMessage: ChatMessage = {
          id: generateId(),
          role: 'ai',
          content: `🎉 太棒了！你已经完成了 "${expression}" 的四种句型练习！\n\n继续保持，多练习才能熟练运用！`,
          timestamp: Date.now(),
          isComplete: true,
        };
        newHistory.push(completeMessage);
        set({
          currentTask: null,
          chatHistory: newHistory,
          isLoading: false,
        });
      } else {
        // Wrong answer, keep current task
        set({
          chatHistory: newHistory,
          isLoading: false,
        });
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '提交失败',
      });
    }
  },

  requestHint: async () => {
    const { currentTask, expression, expressionMeaning, chatHistory } = get();
    if (!currentTask || !expression || !expressionMeaning) return;

    set({ isLoading: true, error: null });

    try {
      const response: GetSentenceHintResponse = await browser.runtime.sendMessage({
        type: 'GET_SENTENCE_HINT',
        expression,
        expressionMeaning,
        sentenceType: currentTask.sentenceType,
        scenario: currentTask.scenario,
      });

      if (!response.success) {
        throw new Error(response.error || '获取提示失败');
      }

      const hintMessage: ChatMessage = {
        id: generateId(),
        role: 'ai',
        content: `💡 提示：${response.hint}\n\n示例：${response.exampleSentence}`,
        timestamp: Date.now(),
        hint: { text: response.hint!, example: response.exampleSentence },
      };

      set({
        chatHistory: [...chatHistory, hintMessage],
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '获取提示失败',
      });
    }
  },

  retryCurrentTask: () => {
    // Just clear error, user can try again
    set({ error: null });
  },

  endPractice: () => {
    set({
      isActive: false,
      expression: null,
      expressionMeaning: null,
      expressionType: null,
      currentTask: null,
      chatHistory: [],
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
