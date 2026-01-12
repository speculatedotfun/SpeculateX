'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, FileText, AlertCircle, ExternalLink } from 'lucide-react';

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
        setError('Documentation failed to load. Please try again.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col relative font-sans bg-[#FAF9FF] dark:bg-[#0f172a] min-h-screen">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-teal-400/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <Header />

      <main className="flex-1 relative z-10 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl p-6 sm:p-8 mb-6 shadow-xl shadow-teal-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Documentation
              </h1>
              <p className="text-teal-100 text-sm">
                Learn how SpeculateX works
              </p>
            </div>
          </div>
          <p className="mt-4 text-white/90 leading-relaxed">
            Explore our comprehensive guides to understand prediction markets, trading mechanics, and how to get started on SpeculateX.
          </p>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-teal-500 dark:hover:border-teal-500 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 transition-colors">
              <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Getting Started</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Learn the basics</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-purple-500 dark:hover:border-purple-500 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">How It Works</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Market mechanics</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-amber-500 dark:hover:border-amber-500 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
              <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Advanced</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pro strategies</p>
          </div>
        </motion.div>

        {/* Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-10 shadow-sm"
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
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Failed to Load</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-full transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          ) : (
            <article className="
              prose prose-lg max-w-none
              text-gray-700 dark:text-gray-300
              prose-headings:font-black prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-h1:text-3xl prose-h1:mb-4 prose-h1:pb-4 prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:flex prose-h2:items-center prose-h2:gap-3
              prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-teal-600 dark:prose-a:text-teal-400 prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
              prose-li:text-gray-700 dark:prose-li:text-gray-300
              prose-code:text-teal-600 dark:prose-code:text-teal-400 prose-code:bg-teal-50 dark:prose-code:bg-teal-900/20 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:shadow-lg prose-pre:border prose-pre:border-gray-700
              prose-blockquote:border-l-4 prose-blockquote:border-teal-500 prose-blockquote:bg-teal-50 dark:prose-blockquote:bg-teal-900/10 prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:my-6
              prose-li:marker:text-teal-500
              prose-img:rounded-xl prose-img:shadow-lg
              prose-hr:border-gray-200 dark:prose-hr:border-gray-700
              prose-table:border-collapse prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:p-3 prose-th:text-left prose-td:p-3 prose-td:border-t prose-td:border-gray-200 dark:prose-td:border-gray-700
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

      </main>
    </div>
  );
}