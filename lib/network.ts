import type { ApiRequestConfig, ApiRequestState } from './types';

const DEFAULT_CONFIG: ApiRequestConfig = {
  timeout: 60000,
  maxRetries: 3,
  retryDelay: 1000,
  retryOnStatusCodes: [429, 500, 502, 503, 504],
};

const activeRequests: Map<string, AbortController> = new Map();
const requestStates: Map<string, ApiRequestState> = new Map();

export function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getRequestState(requestId: string): ApiRequestState | undefined {
  return requestStates.get(requestId);
}

export function cancelRequest(requestId: string): boolean {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort();
    activeRequests.delete(requestId);
    
    const state = requestStates.get(requestId);
    if (state) {
      requestStates.set(requestId, {
        ...state,
        status: 'cancelled',
        endTime: Date.now(),
      });
    }
    return true;
  }
  return false;
}

export function cancelAllRequests(): void {
  for (const [requestId] of activeRequests) {
    cancelRequest(requestId);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt);
}

export interface NetworkRequestOptions {
  config?: Partial<ApiRequestConfig>;
  requestId?: string;
  onProgress?: (progress: number) => void;
}

export interface NetworkResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: 'timeout' | 'cancelled' | 'network' | 'api_error' | 'invalid_key' | 'rate_limit' | 'unknown';
  statusCode?: number;
  retryAfter?: number;
}

export async function makeRequest<T>(
  url: string,
  options: RequestInit & { headers?: Record<string, string> },
  requestOptions?: NetworkRequestOptions
): Promise<NetworkResponse<T>> {
  const config = { ...DEFAULT_CONFIG, ...requestOptions?.config };
  const requestId = requestOptions?.requestId || createRequestId();
  
  let lastError: Error | null = null;
  let lastStatusCode: number | null = null;
  let lastErrorType: NetworkResponse<T>['errorType'] = 'unknown';
  let retryAfter: number | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    activeRequests.set(requestId, controller);

    const state: ApiRequestState = {
      id: requestId,
      status: 'loading',
      progress: 0,
      error: null,
      startTime: Date.now(),
    };
    requestStates.set(requestId, state);

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, config.timeout);

    try {
      requestOptions?.onProgress?.(10);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      requestOptions?.onProgress?.(80);

      if (response.ok) {
        const data = await response.json() as T;
        requestOptions?.onProgress?.(100);
        
        requestStates.set(requestId, {
          ...state,
          status: 'success',
          progress: 100,
          endTime: Date.now(),
        });
        activeRequests.delete(requestId);

        return {
          success: true,
          data,
          statusCode: response.status,
        };
      }

      lastStatusCode = response.status;
      
      if (response.status === 401) {
        lastErrorType = 'invalid_key';
        throw new Error('Invalid API key or unauthorized');
      } else if (response.status === 429) {
        lastErrorType = 'rate_limit';
        const retryAfterHeader = response.headers.get('retry-after');
        retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : null;
        throw new Error('Rate limit exceeded');
      } else if (config.retryOnStatusCodes.includes(response.status)) {
        throw new Error(`API request failed with status ${response.status}`);
      } else {
        lastErrorType = 'api_error';
        throw new Error(`API request failed with status ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      activeRequests.delete(requestId);

      if (error instanceof Error) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          const state = requestStates.get(requestId);
          if (state?.status === 'cancelled') {
            return {
              success: false,
              error: 'Request was cancelled',
              errorType: 'cancelled',
            };
          }
          lastErrorType = 'timeout';
          lastError = new Error('Request timed out');
        }

        if (attempt < config.maxRetries) {
          const delayMs = retryAfter || getRetryDelay(attempt, config.retryDelay);
          requestStates.set(requestId, {
            ...state,
            status: 'loading',
            progress: (attempt + 1) * 30,
          });
          await delay(delayMs);
          continue;
        }
      }
      
      break;
    }
  }

  requestStates.set(requestId, {
    id: requestId,
    status: 'error',
    progress: 0,
    error: lastError?.message || 'Unknown error',
    startTime: requestStates.get(requestId)?.startTime || Date.now(),
    endTime: Date.now(),
  });

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    errorType: lastErrorType,
    statusCode: lastStatusCode || undefined,
    retryAfter: retryAfter || undefined,
  };
}

export function getActiveRequestCount(): number {
  return activeRequests.size;
}

export function clearCompletedRequests(): void {
  const now = Date.now();
  for (const [id, state] of requestStates) {
    if (state.status !== 'loading' && state.endTime && now - state.endTime > 300000) {
      requestStates.delete(id);
    }
  }
}
