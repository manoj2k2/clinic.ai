import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

// Global error handler middleware
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  console.error(`[ERROR] ${err.name}:`, {
    message,
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    details: err.details,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json({
    success: false,
    error: err.name || 'Error',
    message,
    details: process.env.NODE_ENV === 'development' ? err.details : undefined,
    timestamp: new Date().toISOString()
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
}

// Async handler wrapper to catch async errors
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
