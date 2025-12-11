'use client';

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
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden font-sans">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
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

      <main className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        
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
          ) : (
            <article className="
              prose prose-lg max-w-none
              prose-headings:font-black prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-[#14B8A6] prose-a:font-bold prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
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