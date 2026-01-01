'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  showItemCount?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  showItemCount = true,
  className = '',
}: PaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5; // Show max 5 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near start: show 1, 2, 3, 4, ..., last
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end: show 1, ..., last-3, last-2, last-1, last
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Middle: show 1, ..., current-1, current, current+1, ..., last
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Calculate item range
  const itemStart = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : 0;
  const itemEnd = totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : 0;

  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Item count (left side on desktop) */}
      {showItemCount && totalItems && pageSize && (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Showing <span className="font-bold text-gray-900 dark:text-white">{itemStart}</span> to{' '}
          <span className="font-bold text-gray-900 dark:text-white">{itemEnd}</span> of{' '}
          <span className="font-bold text-gray-900 dark:text-white">{totalItems}</span> results
        </p>
      )}

      {/* Pagination controls */}
      <nav className="flex items-center gap-2" role="navigation" aria-label="Pagination">
        {/* First page button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#14B8A6] dark:hover:border-[#14B8A6] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
          aria-label="Go to first page"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#14B8A6] dark:hover:border-[#14B8A6] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
          aria-label="Go to previous page"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <motion.button
                key={page}
                onClick={() => onPageChange(page)}
                whileHover={{ scale: currentPage === page ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  currentPage === page
                    ? 'bg-[#14B8A6] text-white shadow-md shadow-[#14B8A6]/20'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#14B8A6] dark:hover:border-[#14B8A6]'
                }`}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </motion.button>
            )
          )}
        </div>

        {/* Current page indicator (mobile only) */}
        <div className="sm:hidden px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {currentPage} / {totalPages}
          </span>
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#14B8A6] dark:hover:border-[#14B8A6] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
          aria-label="Go to next page"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Last page button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#14B8A6] dark:hover:border-[#14B8A6] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
          aria-label="Go to last page"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </nav>
    </div>
  );
}
