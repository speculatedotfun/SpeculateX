'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import Header from '@/components/Header';

export default function DocsPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/docs/be-the-market.md')
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading docs:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#14B8A6] dark:hover:text-[#14B8A6] mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        ) : (
          <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-[#0f0a2e] dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-[#14B8A6] dark:prose-a:text-[#14B8A6] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#0f0a2e] dark:prose-strong:text-white prose-code:text-[#14B8A6] dark:prose-code:text-[#14B8A6] prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800 prose-blockquote:border-l-[#14B8A6] prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-table:border-collapse prose-table:border prose-th:border prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-td:border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        )}
      </main>
    </div>
  );
}

