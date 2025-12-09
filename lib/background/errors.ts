// 基础应用错误
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 认证相关错误
export class AuthError extends AppError {
  constructor(message: string = '请先登录', code: string = 'AUTH_REQUIRED') {
    super(message, code);
    this.name = 'AuthError';
  }
}

// 数据验证错误
export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code);
    this.name = 'ValidationError';
  }
}

// 外部服务错误 (Supabase, Edge Function)
export class ExternalServiceError extends AppError {
  constructor(message: string, code: string = 'EXTERNAL_ERROR') {
    super(message, code);
    this.name = 'ExternalServiceError';
  }
}

// 使用量超限错误
export class UsageLimitError extends AppError {
  constructor(
    message: string = '今日免费次数已用完',
    public usage?: { used: number; limit: number | null; isPro: boolean }
  ) {
    super(message, 'DAILY_LIMIT_EXCEEDED');
    this.name = 'UsageLimitError';
  }
}

