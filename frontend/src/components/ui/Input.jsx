/**
 * Input — Premium text input with label, helper, error states.
 *
 * Usage:
 *   <Input label="Email" placeholder="you@example.com" />
 *   <Input label="Phone" error="Must be numeric" icon="📱" />
 */

import { forwardRef } from 'react';

const Input = forwardRef(function Input({
  label,
  error,
  helper,
  icon,
  className = '',
  id,
  required,
  ...props
}, ref) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-lg border bg-bg-input text-text-primary',
            'placeholder:text-text-muted/60',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
            'hover:border-border-default',
            icon ? 'pl-10 pr-4' : 'px-4',
            'py-2.5 text-sm',
            error
              ? 'border-danger/50 focus:ring-danger/30 focus:border-danger/50'
              : 'border-border-subtle',
          ].join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          {...props}
        />
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-danger flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${inputId}-helper`} className="text-xs text-text-muted">
          {helper}
        </p>
      )}
    </div>
  );
});

export default Input;
