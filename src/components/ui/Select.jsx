/**
 * Select — Searchable dropdown with keyboard navigation.
 *
 * Usage:
 *   <Select
 *     label="Model"
 *     options={[{ value: 'punch', label: 'New Punch' }, ...]}
 *     value={selected}
 *     onChange={setSelected}
 *     searchable
 *   />
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  error,
  required,
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  // Selected label
  const selectedOption = options.find((o) => o.value === value);

  // Filtered list
  const filtered = searchable && search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = useCallback((option) => {
    onChange?.(option.value);
    setIsOpen(false);
    setSearch('');
    setHighlightIndex(-1);
  }, [onChange]);

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          id={selectId}
          className={[
            'w-full flex items-center justify-between',
            'rounded-lg border bg-bg-input text-sm',
            'px-4 py-2.5',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
            'hover:border-border-default',
            isOpen ? 'border-primary/50 ring-2 ring-primary/40' : '',
            error ? 'border-danger/50' : 'border-border-subtle',
          ].join(' ')}
          onClick={() => setIsOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={selectedOption ? 'text-text-primary' : 'text-text-muted/60'}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronIcon open={isOpen} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={[
              'absolute z-50 mt-1 w-full',
              'bg-bg-elevated border border-border-default',
              'rounded-xl shadow-2xl shadow-black/40',
              'overflow-hidden',
              'animate-in fade-in slide-in-from-top-1 duration-150',
            ].join(' ')}
            role="listbox"
          >
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-border-subtle">
                <input
                  ref={inputRef}
                  type="text"
                  className={[
                    'w-full rounded-md border border-border-subtle',
                    'bg-bg-input text-text-primary text-sm',
                    'px-3 py-2',
                    'placeholder:text-text-muted/60',
                    'focus:outline-none focus:border-primary/50',
                  ].join(' ')}
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHighlightIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                />
              </div>
            )}

            {/* Options */}
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-text-muted text-center">
                  No results found
                </div>
              ) : (
                filtered.map((option, i) => (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      'w-full flex items-center justify-between',
                      'px-4 py-2.5 text-sm text-left',
                      'transition-colors duration-100',
                      i === highlightIndex
                        ? 'bg-primary/10 text-primary'
                        : option.value === value
                        ? 'bg-bg-hover text-text-primary'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                    ].join(' ')}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    role="option"
                    aria-selected={option.value === value}
                  >
                    <span>{option.label}</span>
                    {option.value === value && (
                      <span className="text-primary text-xs">✓</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
