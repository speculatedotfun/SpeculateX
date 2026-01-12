'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function DocsPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setError('');
    fetch('/docs/be-the-market.md', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load docs (${res.status})`);
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading docs:', err);
        setError('Docs failed to load. Please refresh the page. If it still fails, open /docs/be-the-market.md directly to confirm the file is available.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden font-sans">

      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      {/* Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 dark:from-[#14B8A6]/5 dark:to-purple-400/5 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <Header />

      <main className="flex-1 relative z-10 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-12">

        {/* Navigation & Title */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center text-gray-500 hover:text-[#14B8A6] dark:text-gray-400 dark:hover:text-[#14B8A6] font-bold text-sm transition-colors group mb-6"
            >
              <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mr-3 group-hover:border-[#14B8A6] transition-colors shadow-sm">
                <ArrowLeft className="w-4 h-4" />
              </div>
              Back to Home
            </Link>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#14B8A6]/10 rounded-xl text-[#14B8A6]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-[#0f0a2e] dark:text-white tracking-tight">Documentation</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 ml-1">Learn how the protocol works</p>
          </motion.div>
        </div>

        {/* Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[32px] p-8 sm:p-12 shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-white/20 dark:border-gray-700/50"
        >
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-8"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
              </div>
              <div className="h-64 bg-gray-100 dark:bg-gray-700/50 rounded-2xl mt-8"></div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-200 font-bold">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/docs/be-the-market.md"
                  className="inline-flex items-center justify-center rounded-full bg-[#14B8A6] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0D9488] transition-colors"
                >
                  Open raw markdown
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 px-5 py-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          ) : (
            <article className="
              prose prose-lg max-w-none
              text-gray-700 dark:text-gray-200
              prose-headings:font-black prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-[#14B8A6] prose-a:font-bold prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
              prose-li:text-gray-700 dark:prose-li:text-gray-300
              prose-code:text-[#14B8A6] prose-code:bg-[#14B8A6]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-2xl prose-pre:shadow-lg
              prose-blockquote:border-l-4 prose-blockquote:border-[#14B8A6] prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
              prose-li:marker:text-[#14B8A6]
              prose-img:rounded-2xl prose-img:shadow-md
              prose-hr:border-gray-200 dark:prose-hr:border-gray-700
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          )}
        </motion.div>

      </main>
    </div>
  );
}