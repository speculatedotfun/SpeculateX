'use client';

import { AlertTriangle, RefreshCcw, Home, ArrowLeft } from 'lucide-react';
import { Button } from './button';
import Link from 'next/link';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  showRetry?: boolean;
  onRetry?: () => void;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  variant?: 'default' | 'compact' | 'page';
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  showRetry = true,
  onRetry,
  showBackButton = false,
  showHomeButton = false,
  variant = 'default',
}: ErrorStateProps) {
  // Extract error message
  const errorMessage = error
    ? typeof error === 'string'
      ? error
      : error.message || 'An unexpected error occurred'
    : message || 'An unexpected error occurred';

  // Compact variant for inline errors
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            {title}
          </p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
            {errorMessage}
          </p>
        </div>
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <RefreshCcw className="w-3 h-3 mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Page variant for full-page errors
  if (variant === 'page') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {errorMessage}
          </p>

          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && error && typeof error !== 'string' && (
            <details className="mt-4 text-left">
              <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                Technical Details
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-800 dark:text-gray-200 overflow-auto max-h-40">
                {error.stack || error.toString()}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            {showBackButton && (
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            )}

            {showRetry && onRetry && (
              <Button
                onClick={onRetry}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </Button>
            )}

            {showHomeButton && (
              <Link href="/">
                <Button variant={showRetry ? 'outline' : 'default'} className="flex items-center gap-2 w-full sm:w-auto">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant for cards/sections
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Error Icon */}
      <div className="mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Message */}
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
        {errorMessage}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {showRetry && onRetry && (
          <Button onClick={onRetry} size="sm" className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
        )}

        {showHomeButton && (
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
