'use client';

/**
 * GroundSearchSelect
 * A searchable combobox that loads grounds from the API and lets the user
 * pick one by name/location. Returns the numeric ground ID (or null).
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Search, ChevronDown, X, MapPin } from 'lucide-react';

interface GroundOption {
  id: number;
  name: string;
  location: string;
}

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  label?: string;
  /** When true the field is optional and shows a "Clear" option */
  optional?: boolean;
  className?: string;
}

function useAllGrounds() {
  return useQuery({
    queryKey: ['all-grounds-for-select'],
    queryFn: async () => {
      const { data } = await apiClient.get('/futsal/grounds', { params: { limit: 200 } });
      const items: GroundOption[] = Array.isArray(data)
        ? data
        : (data as any)?.items ?? [];
      return items.map((g: any) => ({ id: g.id, name: g.name, location: g.location }));
    },
    staleTime: 60_000,
  });
}

export function GroundSearchSelect({
  value,
  onChange,
  placeholder = 'Search ground…',
  label,
  optional = false,
  className = '',
}: Props) {
  const { data: grounds = [], isLoading } = useAllGrounds();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value != null ? grounds.find((g) => g.id === value) : null;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = query.trim()
    ? grounds.filter(
        (g) =>
          g.name.toLowerCase().includes(query.toLowerCase()) ||
          g.location.toLowerCase().includes(query.toLowerCase())
      )
    : grounds;

  function handleSelect(g: GroundOption) {
    onChange(g.id);
    setOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  }

  function handleToggle() {
    setOpen((o) => !o);
    if (!open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm bg-white dark:bg-gray-700 text-left transition-colors
          ${open
            ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800'
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}
          ${!selected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <MapPin className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
              <span className="truncate font-medium">{selected.name}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs truncate">— {selected.location}</span>
            </>
          ) : (
            <span>{isLoading ? 'Loading…' : placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {optional && selected && (
            <X
              className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={handleClear}
            />
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or location…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {optional && (
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(null); setOpen(false); setQuery(''); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 italic"
                >
                  None (global)
                </button>
              </li>
            )}
            {isLoading ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">Loading grounds…</li>
            ) : filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No grounds found</li>
            ) : (
              filtered.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(g)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors
                      ${g.id === value ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-900 dark:text-white'}`}
                  >
                    <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${g.id === value ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{g.name}</span>
                      <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">{g.location}</span>
                    </span>
                    <span className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0">#{g.id}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
