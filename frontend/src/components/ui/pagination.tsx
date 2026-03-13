'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  page: number;          // 0-based
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  className?: string;
}

const DEFAULT_LIMITS = [10, 20, 50];

export function Pagination({
  page,
  total,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = DEFAULT_LIMITS,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : page * limit + 1;
  const end = Math.min((page + 1) * limit, total);

  // Build visible page numbers around current page
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 3) pages.push('ellipsis');
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 4) pages.push('ellipsis');
    pages.push(totalPages - 1);
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Left: count + per-page */}
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span>
          {total === 0 ? 'No results' : `${start}–${end} of ${total}`}
        </span>
        {onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span>per page</span>
            <select
              value={limit}
              onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(0); }}
              className="h-7 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {limitOptions.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={page === 0}
          className="h-8 w-8 p-0 border-slate-200 dark:border-white/10"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="h-8 w-8 p-0 border-slate-200 dark:border-white/10"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="px-1 text-slate-400 text-sm select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 p-0 text-xs ${
                p === page
                  ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
                  : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              {p + 1}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="h-8 w-8 p-0 border-slate-200 dark:border-white/10"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={page >= totalPages - 1}
          className="h-8 w-8 p-0 border-slate-200 dark:border-white/10"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
