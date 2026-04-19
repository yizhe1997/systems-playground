'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DashboardPaginationProps {
  page: number;
  totalPages: number;
  totalTrades: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function DashboardPagination({ page, totalPages, totalTrades, pageSize, onPageChange }: DashboardPaginationProps) {
  const safeTotalTrades = Number.isFinite(totalTrades) && totalTrades > 0 ? totalTrades : 0;
  const safeTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  const safePage = Number.isFinite(page) && page > 0 ? Math.min(Math.floor(page), safeTotalPages) : 1;
  const hasData = safeTotalTrades > 0;
  const start = hasData ? (safePage - 1) * safePageSize + 1 : 0;
  const end = hasData ? Math.min(safePage * safePageSize, safeTotalTrades) : 0;

  const getPageItems = () => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }

    if (safePage <= 3) {
      return [1, 2, 3, 4, 'ellipsis-right', safeTotalPages] as const;
    }

    if (safePage >= safeTotalPages - 2) {
      return [1, 'ellipsis-left', safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages] as const;
    }

    return [1, 'ellipsis-left', safePage - 1, safePage, safePage + 1, 'ellipsis-right', safeTotalPages] as const;
  };

  const pageItems = getPageItems();

  return (
    <div className="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest opacity-70">
        Showing {start}-{end} of {safeTotalTrades} trades
      </p>

      <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
        <button
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          className="w-9 h-9 border border-black dark:border-white disabled:opacity-40 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="w-9 h-9 border border-black dark:border-white disabled:opacity-40 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          {pageItems.map((item, index) => {
            if (typeof item === 'string') {
              return (
                <span
                  key={`${item}-${index}`}
                  className="font-mono text-[10px] md:text-xs uppercase tracking-widest opacity-60 px-1"
                >
                  ...
                </span>
              );
            }

            const isActive = item === safePage;

            return (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                className={`w-9 h-9 border font-mono text-[10px] md:text-xs tracking-widest font-bold transition-colors ${
                  isActive
                    ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
          disabled={safePage >= safeTotalPages}
          className="w-9 h-9 border border-black dark:border-white disabled:opacity-40 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safePage >= safeTotalPages}
          className="w-9 h-9 border border-black dark:border-white disabled:opacity-40 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
